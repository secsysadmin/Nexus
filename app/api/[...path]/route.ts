import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import type { PoolClient } from "pg";
import { deliverApplicationEmail } from "../../../lib/email-outbox";
import { transaction, audit } from "../../../lib/db";
import {
  token,
  digest,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  verifyPassword,
  hashPassword,
} from "../../../lib/security";
import {
  adminMutation,
  checkIn,
  saveSubmission,
  AppError,
  type Actor,
} from "../../../lib/service";
import { getData } from "../../../lib/data";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 256000;
const SECONDS_PER_DAY = 86400;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS_PER_USER = 10;
const MAX_LOGIN_ATTEMPTS_PER_ADDRESS = 60;
const DUMMY_PASSWORD_HASH = "scrypt:dummy:00";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const EMAIL_DISPATCH_PATHS = new Set(["submissions/save", "admin/email-retry"]);
const SESSION_CLEARING_PATHS = new Set(["auth/logout", "auth/password"]);
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH);
const loginInput = z.object({
  username: z.string().trim().toLowerCase().min(2).max(40),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});
const activateInput = z.object({ token: z.string().length(64), password });
const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  password,
});
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function sessionToken(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) throw new AppError("Please sign in.", 401);
  return raw;
}
async function authenticate(db: PoolClient, req: NextRequest): Promise<Actor> {
  const {
    rows: [actor],
  } = await db.query(
    "SELECT a.id,a.username,a.display_name,a.role FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.enabled",
    [digest(sessionToken(req))],
  );
  if (!actor)
    throw new AppError("Your session has expired. Please sign in again.", 401);
  return actor;
}
async function session(db: PoolClient, id: string) {
  const raw = token();
  await db.query(
    "INSERT INTO sessions VALUES($1,$2,now()+make_interval(days => $3))",
    [digest(raw), id, SESSION_TTL_DAYS],
  );
  return raw;
}
function withSession(body: unknown, raw: string) {
  const res = json(body);
  res.cookies.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * SECONDS_PER_DAY,
  });
  return res;
}
async function readJsonBody(req: NextRequest): Promise<unknown> {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new AppError("Request origin is not allowed.", 403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("Send JSON.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    throw new AppError("Request is too large.", 413);
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES)
    throw new AppError("Request is too large.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("Invalid request.");
  }
}
function clientAddress(req: NextRequest) {
  if (!process.env.VERCEL) return "local";
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
async function loginRateLimited(username: string, address: string) {
  return transaction(async (db) => {
    let denied = false;
    for (const [key, max] of [
      [digest("user:" + username), MAX_LOGIN_ATTEMPTS_PER_USER],
      [digest("ip:" + address), MAX_LOGIN_ATTEMPTS_PER_ADDRESS],
    ] as const) {
      const {
        rows: [r],
      } = await db.query(
        "INSERT INTO login_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-make_interval(mins => $2) THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-make_interval(mins => $2) THEN now() ELSE login_attempts.window_start END RETURNING attempts",
        [key, LOGIN_WINDOW_MINUTES],
      );
      if (r.attempts > max) denied = true;
    }
    return denied;
  });
}
async function login(req: NextRequest, body: unknown) {
  const b = loginInput.parse(body);
  if (await loginRateLimited(b.username, clientAddress(req)))
    throw new AppError(
      `Too many sign-in attempts. Try again in ${LOGIN_WINDOW_MINUTES} minutes.`,
      429,
    );
  const raw = await transaction(async (db) => {
    const {
      rows: [a],
    } = await db.query("SELECT * FROM accounts WHERE username=$1 FOR UPDATE", [
      b.username,
    ]);
    const valid = verifyPassword(
      b.password,
      a?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!a || !valid || !a.enabled)
      throw new AppError("Username or password is incorrect.", 401);
    await audit(db, a.id, "SIGNED_IN", a.id);
    return session(db, a.id);
  });
  return withSession({ ok: true }, raw);
}
async function activate(body: unknown) {
  const b = activateInput.parse(body);
  const raw = await transaction(async (db) => {
    const {
      rows: [t],
    } = await db.query(
      "SELECT t.account_id FROM activation_tokens t JOIN accounts a ON a.id=t.account_id WHERE t.token_hash=$1 AND t.expires_at>now() AND a.enabled FOR UPDATE OF t,a",
      [digest(b.token)],
    );
    if (!t)
      throw new AppError(
        "This setup link is invalid or expired. Ask SEC for a new one.",
      );
    await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
      hashPassword(b.password),
      t.account_id,
    ]);
    await revokeCredentials(db, t.account_id);
    await audit(db, t.account_id, "PASSWORD_SET", t.account_id);
    return session(db, t.account_id);
  });
  return withSession({ ok: true }, raw);
}
async function revokeCredentials(db: PoolClient, accountId: string) {
  await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
    accountId,
  ]);
  await db.query("DELETE FROM sessions WHERE account_id=$1", [accountId]);
}
async function changePassword(db: PoolClient, actor: Actor, body: unknown) {
  const b = passwordChangeInput.parse(body);
  const {
    rows: [a],
  } = await db.query(
    "SELECT password_hash FROM accounts WHERE id=$1 FOR UPDATE",
    [actor.id],
  );
  if (!verifyPassword(b.currentPassword, a.password_hash))
    throw new AppError("Current password is incorrect.");
  await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
    hashPassword(b.password),
    actor.id,
  ]);
  await revokeCredentials(db, actor.id);
  await audit(db, actor.id, "PASSWORD_CHANGED", actor.id);
  return { ok: true };
}
async function authenticatedAction(
  db: PoolClient,
  req: NextRequest,
  path: string,
  body: unknown,
): Promise<unknown> {
  const actor = await authenticate(db, req);
  if (path === "auth/logout") {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [
      digest(sessionToken(req)),
    ]);
    return { ok: true };
  }
  if (path === "auth/password") return changePassword(db, actor, body);
  if (path === "checkin") return checkIn(db, actor, body);
  if (path === "submissions/save") return saveSubmission(db, actor, body);
  return adminMutation(db, actor, path, body);
}
function confirmationEmailId(result: unknown) {
  if (typeof result !== "object" || result === null) return undefined;
  if (!("confirmation_email_id" in result)) return undefined;
  const id = result.confirmation_email_id;
  return typeof id === "string" ? id : undefined;
}
function dispatchConfirmationEmail(id: string) {
  after(async () => {
    try {
      await deliverApplicationEmail(id);
    } catch (error) {
      console.error(
        `Confirmation email ${id} dispatch failed; it remains available for retry: ${error instanceof Error ? error.name : "unknown error"}`,
      );
    }
  });
}
async function handleGet(req: NextRequest, path: string) {
  if (path === "health") return json({ ok: true });
  if (path !== "data") throw new AppError("Not found.", 404);
  return json(
    await transaction(async (db) => getData(db, await authenticate(db, req))),
  );
}
async function handlePost(req: NextRequest, path: string) {
  const body = await readJsonBody(req);
  if (path === "auth/login") return login(req, body);
  if (path === "auth/activate") return activate(body);
  const result = await transaction((db) =>
    authenticatedAction(db, req, path, body),
  );
  const emailId = confirmationEmailId(result);
  if (emailId && EMAIL_DISPATCH_PATHS.has(path))
    dispatchConfirmationEmail(emailId);
  const response = json(result);
  if (SESSION_CLEARING_PATHS.has(path)) response.cookies.delete(SESSION_COOKIE);
  return response;
}
function databaseErrorResponse(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  if (error.code === UNIQUE_VIOLATION)
    return json(
      { error: "That username or event credit already exists." },
      409,
    );
  if (error.code === FOREIGN_KEY_VIOLATION)
    return json(
      { error: "A referenced record no longer exists. Refresh and try again." },
      409,
    );
  return null;
}
function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json(
      { error: error.issues[0]?.message ?? "Check your input." },
      400,
    );
  const dbResponse = databaseErrorResponse(error);
  if (dbResponse) return dbResponse;
  console.error(
    "SocietyHub request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return json(
    {
      error:
        "Unable to complete this request. Please try again or contact SEC.",
    },
    500,
  );
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await ctx.params).path.join("/");
    return req.method === "GET"
      ? await handleGet(req, path)
      : await handlePost(req, path);
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
