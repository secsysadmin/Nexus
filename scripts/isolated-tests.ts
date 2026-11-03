import dotenv from "dotenv";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { readFile, readdir, rm, mkdir, cp, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
for (const f of [".env.setup.local", ".env.dev.local"])
  if (existsSync(f)) dotenv.config({ path: f, quiet: true });
const adminUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!adminUrl) throw Error("Set DATABASE_ADMIN_URL for isolated tests.");
const runtimeUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? adminUrl;
const schema = "nexus_test_" + randomBytes(6).toString("hex"),
  db = new pg.Client({
    connectionString: adminUrl.replace("-pooler.", "."),
    statement_timeout: 10000,
  });
await db.connect();
let server: ChildProcess | undefined;
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: runtimeUrl,
  NEXUS_DATABASE_URL: runtimeUrl,
  DATABASE_SCHEMA: schema,
  ISOLATED_TEST_DATABASE: "true",
  EMAIL_DELIVERY_ENABLED: "false",
  NEXT_DIST_DIR: ".next-test-" + schema.slice(11),
  CRON_SECRET: randomBytes(32).toString("hex"),
};
const child = (command: string, args: string[], cwd = process.cwd()) =>
  spawn(command, args, { cwd, env, stdio: "inherit", detached: false });
const wait = (p: ChildProcess) =>
  new Promise<number>((resolve) => {
    p.on("error", () => resolve(1));
    p.on("exit", (code) => resolve(code ?? 1));
  });
const stop = async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([wait(server), new Promise((r) => setTimeout(r, 4000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
};
const testApp = "work/test-app-" + schema.slice(11);
let command: ChildProcess | undefined;
let cleaning: Promise<void> | undefined;
const cleanup = () =>
  (cleaning ??= (async () => {
    command?.kill("SIGTERM");
    await stop();
    try {
      await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await db.end();
      await rm(testApp, { recursive: true, force: true });
    }
  })());
process.on("SIGTERM", () => {
  void cleanup().finally(() => process.exit(143));
});
process.on("SIGINT", () => {
  void cleanup().finally(() => process.exit(130));
});
try {
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema},pg_catalog`);
  for (const file of (await readdir("db"))
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort())
    await db.query(await readFile("db/" + file, "utf8"));
  await db.query(
    "INSERT INTO semesters(name,starts_on,ends_on,is_current) VALUES('Test grouping','2026-01-01','2099-12-31',true)",
  );
  const role = decodeURIComponent(new URL(runtimeUrl).username);
  if (!/^[a-zA-Z0-9_]+$/.test(role)) throw Error("Unsupported test role name");
  await db.query(`GRANT USAGE ON SCHEMA ${schema} TO "${role}"`);
  await db.query(
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO "${role}"`,
  );
  await db.query(
    `GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO "${role}"`,
  );

  if (process.argv.includes("--integration")) {
    command = child(process.execPath, [
      "--import",
      "tsx",
      "--test",
      "tests/integration/security.test.ts",
    ]);
  } else {
    await mkdir(testApp, { recursive: true });
    for (const f of [
      "app",
      "lib",
      "public",
      "next.config.ts",
      "tsconfig.json",
      "next-env.d.ts",
      "package.json",
      "instrumentation.ts",
      "instrumentation-client.ts",
    ])
      await cp(f, testApp + "/" + f, { recursive: true });
    await symlink(
      process.cwd() + "/node_modules",
      testApp + "/node_modules",
      "dir",
    );
    env.NEXT_DIST_DIR = ".next";
    const net = createServer();
    await new Promise<void>((r) => net.listen(0, "127.0.0.1", r));
    const port = (net.address() as { port: number }).port;
    await new Promise<void>((r) => net.close(() => r()));
    env.NEXUS_TEST_BASE_URL = "http://localhost:" + port;
    server = child(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--webpack",
        "--port",
        String(port),
      ],
      testApp,
    );
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) break;
      try {
        if (
          (
            await fetch(env.NEXUS_TEST_BASE_URL + "/api/health", {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ready) throw Error("Isolated test server did not start.");
    command = child(process.execPath, [
      "node_modules/@playwright/test/cli.js",
      "test",
      ...process.argv.slice(2),
    ]);
  }
  process.exitCode = await wait(command);
} finally {
  await cleanup();
}
