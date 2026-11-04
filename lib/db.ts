import pg, { type PoolClient } from "pg";
import { resolveEnvironment } from "./domain";
const POOL_MAX_CONNECTIONS = 2;
const POOL_IDLE_TIMEOUT_MS = 10000;
const POOL_CONNECT_TIMEOUT_MS = 5000;
const POOL_QUERY_TIMEOUT_MS = 12000;
const POOL_MAX_LIFETIME_SECONDS = 300;
declare global {
  var nexusPool: pg.Pool | undefined;
}
function createPool(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
    query_timeout: POOL_QUERY_TIMEOUT_MS,
    maxLifetimeSeconds: POOL_MAX_LIFETIME_SECONDS,
  });
  pool.on("error", () =>
    console.error(
      "Database idle connection failed; it was removed from the pool.",
    ),
  );
  return pool;
}
export function databasePool() {
  const connectionString =
    process.env.NEXUS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw Error("Database is not configured.");
  return (globalThis.nexusPool ??= createPool(connectionString));
}
export async function transaction<T>(
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const schema = resolveEnvironment(process.env),
    db = await databasePool().connect();
  let discard = false;
  try {
    await db.query("BEGIN");
    await db.query(
      "SELECT set_config('search_path',$1,true),set_config('statement_timeout','10000',true),set_config('lock_timeout','3000',true),set_config('idle_in_transaction_session_timeout','15000',true)",
      [schema + ",pg_catalog"],
    );
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      discard = true;
    }
    if (
      error instanceof Error &&
      /connection|socket|terminated|timeout|query read/i.test(error.message)
    )
      discard = true;
    throw error;
  } finally {
    db.release(discard);
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
