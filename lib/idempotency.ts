import type { PoolClient } from "pg";
import { digest } from "./security";
import { AppError, type Actor } from "./service";
export async function idempotentMutation<T>(
  db: PoolClient,
  actor: Actor,
  action: string,
  key: string,
  body: unknown,
  perform: () => Promise<T>,
): Promise<T> {
  if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(key))
    throw new AppError("A valid request key is required.");
  const hash = digest(JSON.stringify(body));
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    actor.id + ":" + key,
  ]);
  const {
    rows: [old],
  } = await db.query(
    "SELECT * FROM mutation_requests WHERE account_id=$1 AND request_key=$2",
    [actor.id, key],
  );
  if (old) {
    if (old.action !== action || old.body_hash !== hash)
      throw new AppError(
        "This request key was already used for different input.",
        409,
      );
    return old.result;
  }
  const result = await perform();
  await db.query(
    "INSERT INTO mutation_requests(account_id,request_key,action,body_hash,result) VALUES($1,$2,$3,$4,$5)",
    [actor.id, key, action, hash, JSON.stringify(result)],
  );
  return result;
}
