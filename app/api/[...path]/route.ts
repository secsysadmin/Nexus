import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transaction, audit } from "../../../lib/db";
import {
  token,
  digest,
  sessionCookie,
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
import type { PoolClient } from "pg";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const password = z.string().min(12, "Use at least 12 characters.").max(128);
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
async function authenticate(db: PoolClient, req: NextRequest): Promise<Actor> {
  const raw = req.cookies.get(sessionCookie)?.value;
  if (!raw) throw new AppError("Please sign in.", 401);
  const {
    rows: [actor],
  } = await db.query(
    "SELECT a.id,a.username,a.display_name,a.role FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.enabled",
    [digest(raw)],
  );
  if (!actor)
    throw new AppError("Your session has expired. Please sign in again.", 401);
  return actor;
}
async function session(db: PoolClient, id: string) {
  const raw = token();
  await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [
    digest(raw),
    id,
  ]);
  return raw;
}
function withSession(body: unknown, raw: string) {
  const res = json(body);
  res.cookies.set(sessionCookie, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await ctx.params).path.join("/");
    if (req.method === "GET") {
      if (path === "health") return json({ ok: true });
      if (path !== "data") throw new AppError("Not found.", 404);
      return json(
        await transaction(async (db) =>
          getData(db, await authenticate(db, req)),
        ),
      );
    }
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin)
      throw new AppError("Request origin is not allowed.", 403);
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw new AppError("Send JSON.");
    if (Number(req.headers.get("content-length") ?? 0) > 256000)
      throw new AppError("Request is too large.", 413);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 256000)
      throw new AppError("Request is too large.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("Invalid request.");
    }
    if (path === "auth/login") {
      const b = z
        .object({
          username: z.string().trim().toLowerCase().min(2).max(40),
          password: z.string().min(1).max(128),
        })
        .parse(body);
      // The limiter commits independently of authentication failures and works across Vercel instances.
      const address = process.env.VERCEL
        ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown")
        : "local";
      const limited = await transaction(async (db) => {
        let denied = false;
        for (const [key, max] of [
          [digest("user:" + b.username), 10],
          [digest("ip:" + address), 60],
        ] as const) {
          const {
            rows: [r],
          } = await db.query(
            "INSERT INTO login_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING attempts",
            [key],
          );
          if (r.attempts > max) denied = true;
        }
        return denied;
      });
      if (limited)
        throw new AppError(
          "Too many sign-in attempts. Try again in 15 minutes.",
          429,
        );
      const result = await transaction(async (db) => {
        const {
          rows: [a],
        } = await db.query(
          "SELECT * FROM accounts WHERE username=$1 FOR UPDATE",
          [b.username],
        );
        const valid = verifyPassword(
          b.password,
          a?.password_hash ?? "scrypt:dummy:00",
        );
        if (!a || !valid || !a.enabled)
          throw new AppError("Username or password is incorrect.", 401);
        await audit(db, a.id, "SIGNED_IN", a.id);
        return { raw: await session(db, a.id) };
      });
      return withSession({ ok: true }, result.raw);
    }
    if (path === "auth/activate") {
      const b = z
        .object({ token: z.string().length(64), password })
        .parse(body);
      const result = await transaction(async (db) => {
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
        await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
          t.account_id,
        ]);
        await db.query("DELETE FROM sessions WHERE account_id=$1", [
          t.account_id,
        ]);
        await audit(db, t.account_id, "PASSWORD_SET", t.account_id);
        return { raw: await session(db, t.account_id) };
      });
      return withSession({ ok: true }, result.raw);
    }
    const result = await transaction(async (db) => {
      const actor = await authenticate(db, req);
      if (path === "auth/logout") {
        await db.query("DELETE FROM sessions WHERE token_hash=$1", [
          digest(req.cookies.get(sessionCookie)!.value),
        ]);
        return { ok: true };
      }
      if (path === "auth/password") {
        const b = z
          .object({ currentPassword: z.string().min(1).max(128), password })
          .parse(body);
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
        await db.query("DELETE FROM sessions WHERE account_id=$1", [actor.id]);
        await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
          actor.id,
        ]);
        await audit(db, actor.id, "PASSWORD_CHANGED", actor.id);
        return { ok: true };
      }
      if (path === "checkin") return checkIn(db, actor, body);
      if (path === "submissions/save") return saveSubmission(db, actor, body);
      return adminMutation(db, actor, path, body);
    });
    const response = json(result);
    if (path === "auth/logout" || path === "auth/password")
      response.cookies.delete(sessionCookie);
    return response;
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message ?? "Check your input." },
        400,
      );
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "23505")
        return json(
          { error: "That username, semester, or event credit already exists." },
          409,
        );
      if (error.code === "23503")
        return json(
          {
            error:
              "A referenced record no longer exists. Refresh and try again.",
          },
          409,
        );
    }
    console.error(
      "Nexus request failed",
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
}
export const GET = handle;
export const POST = handle;
