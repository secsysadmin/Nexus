import pg, { type PoolClient } from "pg";
import { resolveEnvironment } from "./domain";
const globalDb = globalThis as unknown as { nexusPool?: pg.Pool };
function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("Database is not configured. See README setup.");
  return (globalDb.nexusPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  }));
}
export async function transaction<T>(
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const schema = resolveEnvironment(process.env);
  const db = await pool().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('search_path',$1,true)", [
      schema + ",pg_catalog",
    ]);
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function audit(
  db: PoolClient,
  actor: string | null,
  action: string,
  target: string | null,
  details: object = {},
) {
  await db.query(
    "INSERT INTO audit_log(actor_id,action,target_id,details) VALUES($1,$2,$3,$4)",
    [actor, action, target, JSON.stringify(details)],
  );
}
