import dotenv from "dotenv";
import pg from "pg";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, chmod, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
dotenv.config({ path: ".env.setup.local", quiet: true });
const raw = process.env.DATABASE_ADMIN_URL;
if (!raw)
  throw Error("DATABASE_ADMIN_URL is required for an isolated restore drill.");
const url = new URL(raw);
url.hostname = url.hostname.replace("-pooler.", ".");
const started = Date.now();
const name = "societyhub_restore_" + randomBytes(6).toString("hex");
const root = "work/restore-" + name.slice(-12);
await mkdir(root, { recursive: true, mode: 0o700 });
await chmod(root, 0o700);
await writeFile(
  root + "/cleanup.json",
  JSON.stringify({
    temporaryDatabase: name,
    createdAt: new Date().toISOString(),
  }),
  { mode: 0o600 },
);
const bin =
  process.env.PG_BIN ??
  (existsSync("/opt/homebrew/opt/libpq/bin/pg_dump")
    ? "/opt/homebrew/opt/libpq/bin/"
    : "");
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGSSLMODE: "verify-full",
  PGSSLROOTCERT: "system",
  PGCONNECT_TIMEOUT: "10",
};
const run = (tool: string, args: string[], extra = {}) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(bin + tool, args, {
      env: { ...env, ...extra },
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 120000,
    });
    let error = "";
    child.stderr.on("data", (b) => (error += b.toString()));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              tool +
                " failed: " +
                error
                  .replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[database URL]")
                  .slice(0, 600),
            ),
          ),
    );
  });
const source = new pg.Client({
  connectionString: url.toString(),
  statement_timeout: 20000,
});
await source.connect();
let restored: pg.Client | undefined;
let created = false;
try {
  await source.query(`CREATE DATABASE ${name}`);
  created = true;
  await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshot = (await source.query("SELECT pg_export_snapshot() snapshot"))
    .rows[0].snapshot;
  const archive = root + "/database.dump";
  await run("pg_dump", [
    "--snapshot=" + snapshot,
    "--format=custom",
    "--lock-wait-timeout=10s",
    "--schema=nexus_prod",
    "--no-owner",
    "--no-acl",
    "--file=" + archive,
  ]);
  await chmod(archive, 0o600);
  await run("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-acl",
    "--dbname=" + name,
    archive,
  ]);
  const target = new URL(url);
  target.pathname = "/" + name;
  restored = new pg.Client({
    connectionString: target.toString(),
    statement_timeout: 20000,
  });
  await restored.connect();
  const tables = (
    await source.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='nexus_prod' ORDER BY tablename",
    )
  ).rows.map((r) => String(r.tablename));
  const results = [];
  for (const table of tables) {
    if (!/^[a-z_]+$/.test(table)) throw Error("Unexpected table identifier");
    const sql = `SELECT count(*)::int count,md5(COALESCE(string_agg(row_json,',' ORDER BY row_json),'')) checksum FROM (SELECT row_to_json(t)::text row_json FROM nexus_prod.${table} t) q`;
    const before = (await source.query(sql)).rows[0],
      after = (await restored.query(sql)).rows[0];
    if (before.count !== after.count || before.checksum !== after.checksum)
      throw Error("Restore verification mismatch for " + table);
    results.push({ table, rows: after.count, verified: true });
  }
  const report = {
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    method: "Native pg_dump/pg_restore into a disposable isolated database",
    tables: results,
    verified: true,
    cloudPitrConfiguration:
      "Not verified: SEC Systems organization access required",
  };
  await writeFile(
    "work/restore-drill-result.json",
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      verified: true,
      tables: results.length,
      rows: results.reduce((n, r) => n + r.rows, 0),
      report: "work/restore-drill-result.json",
    }),
  );
} finally {
  await restored?.end();
  await source.query("ROLLBACK");
  if (created) await source.query(`DROP DATABASE ${name} WITH (FORCE)`);
  await source.end();
  await rm(root, { recursive: true, force: true });
}
