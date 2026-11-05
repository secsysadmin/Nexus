import type { PoolClient } from "pg";
import type { NextRequest } from "next/server";
import { AppError, type Actor } from "./service";
import { audit } from "./db";
import {
  token,
  digest,
  sessionCookie,
  verifyPassword,
  hashPassword,
  passwordNeedsUpgrade,
  dummyPasswordHash,
} from "./security";
const LOGIN_WINDOW_MINUTES = 15;
const CONNECTION_REQUEST_LIMIT = 120;
const CONNECTION_FAILURE_LIMIT = 10;
const ACCOUNT_FAILURE_LIMIT = 50;
const RECORD_ATTEMPT_SQL =
  "INSERT INTO login_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-$2::int*interval '1 minute' THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-$2::int*interval '1 minute' THEN now() ELSE login_attempts.window_start END RETURNING attempts";
export async function recordAttempt(
  db: PoolClient,
  key: string,
): Promise<number> {
  const {
    rows: [r],
  } = await db.query(RECORD_ATTEMPT_SQL, [key, LOGIN_WINDOW_MINUTES]);
  return r.attempts;
}
async function failuresExceeded(
  db: PoolClient,
  key: string,
  limit: number,
): Promise<boolean> {
  const {
    rows: [fail],
  } = await db.query(
    "SELECT attempts,window_start FROM login_attempts WHERE key=$1",
    [key],
  );
  return (
    !!fail &&
    fail.attempts >= limit &&
    Date.now() - Date.parse(fail.window_start) < LOGIN_WINDOW_MINUTES * 60000
  );
}
export async function authenticate(
  db: PoolClient,
  req: NextRequest,
): Promise<Actor> {
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
export async function createSession(db: PoolClient, id: string) {
  const raw = token();
  await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [
    digest(raw),
    id,
  ]);
  return raw;
}
export async function consumeLoginRequest(db: PoolClient, address: string) {
  return (
    (await recordAttempt(db, digest("ip:" + address))) <=
    CONNECTION_REQUEST_LIMIT
  );
}
export async function login(
  db: PoolClient,
  username: string,
  password: string,
  address: string,
) {
  const pair = digest("failure:" + username + ":" + address);
  const accountKey = digest("account-failure:" + username);
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [pair]);
  if (await failuresExceeded(db, pair, CONNECTION_FAILURE_LIMIT))
    return {
      error:
        `Too many failed sign-ins from this connection. Try again in ${LOGIN_WINDOW_MINUTES} minutes or use an SEC setup link.`,
      status: 429,
    };
  if (await failuresExceeded(db, accountKey, ACCOUNT_FAILURE_LIMIT))
    return {
      error:
        `Too many failed sign-ins for this account. Try again in ${LOGIN_WINDOW_MINUTES} minutes or use an SEC setup link.`,
      status: 429,
    };
  const {
    rows: [a],
  } = await db.query("SELECT * FROM accounts WHERE username=$1", [username]);
  const valid = await verifyPassword(
    password,
    a?.password_hash ?? dummyPasswordHash,
  );
  const locked =
    a && valid
      ? (
          await db.query(
            "SELECT password_hash FROM accounts WHERE id=$1 AND enabled FOR UPDATE",
            [a.id],
          )
        ).rows[0]
      : undefined;
  const current =
    !!locked &&
    (locked.password_hash === a.password_hash ||
      (await verifyPassword(password, locked.password_hash)));
  if (!current) {
    await recordAttempt(db, pair);
    await recordAttempt(db, accountKey);
    return { error: "Username or password is incorrect.", status: 401 };
  }
  await db.query("DELETE FROM login_attempts WHERE key=$1", [pair]);
  if (passwordNeedsUpgrade(locked.password_hash))
    await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
      await hashPassword(password),
      a.id,
    ]);
  await audit(db, a.id, "SIGNED_IN", a.id);
  return { raw: await createSession(db, a.id) };
}
export async function redeemActivation(
  db: PoolClient,
  raw: string,
  password: string,
) {
  const {
    rows: [candidate],
  } = await db.query(
    "SELECT account_id FROM activation_tokens WHERE token_hash=$1",
    [digest(raw)],
  );
  if (!candidate)
    throw new AppError(
      "This setup link is invalid or expired. Ask SEC for a new one.",
    );
  await db.query("SELECT id FROM accounts WHERE id=$1 AND enabled FOR UPDATE", [
    candidate.account_id,
  ]);
  const {
    rows: [t],
  } = await db.query(
    "SELECT t.account_id FROM activation_tokens t JOIN accounts a ON a.id=t.account_id WHERE t.token_hash=$1 AND t.expires_at>now() AND a.enabled FOR UPDATE OF t",
    [digest(raw)],
  );
  if (!t)
    throw new AppError(
      "This setup link is invalid or expired. Ask SEC for a new one.",
    );
  await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
    await hashPassword(password),
    t.account_id,
  ]);
  await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
    t.account_id,
  ]);
  await db.query("DELETE FROM sessions WHERE account_id=$1", [t.account_id]);
  await audit(db, t.account_id, "PASSWORD_SET", t.account_id);
  return createSession(db, t.account_id);
}
export async function changePassword(
  db: PoolClient,
  actor: Actor,
  current: string,
  next: string,
) {
  const {
    rows: [a],
  } = await db.query(
    "SELECT password_hash FROM accounts WHERE id=$1 AND enabled FOR UPDATE",
    [actor.id],
  );
  if (!a || !(await verifyPassword(current, a.password_hash)))
    throw new AppError("Current password is incorrect.");
  await db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
    await hashPassword(next),
    actor.id,
  ]);
  await db.query("DELETE FROM sessions WHERE account_id=$1", [actor.id]);
  await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
    actor.id,
  ]);
  await audit(db, actor.id, "PASSWORD_CHANGED", actor.id);
  return { ok: true };
}
