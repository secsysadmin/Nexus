import pg, { type PoolClient } from "pg";
import { resolveEnvironment } from "./domain";
const POOL_MAX_CONNECTIONS = 2;
const POOL_IDLE_TIMEOUT_MS = 10000;
const POOL_CONNECT_TIMEOUT_MS = 10000;
declare global {
  var nexusPool: pg.Pool | undefined;
}
function pool() {
  const connectionString =
    process.env.NEXUS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("Database is not configured. See README setup.");
  return (globalThis.nexusPool ??= new pg.Pool({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
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
