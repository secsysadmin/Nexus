import dotenv from "dotenv";
import pg from "pg";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { token, digest } from "../lib/security";
dotenv.config({ path: ".env.setup.local", quiet: true });
if (!process.env.DATABASE_ADMIN_URL)
  throw new Error("Set DATABASE_ADMIN_URL in .env.setup.local.");
const db = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL });
await db.connect();
const migrations = (await readdir("db"))
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort();
const access: string[] = [];
try {
  for (const stage of ["dev", "prod"]) {
    const schema = `nexus_${stage}`,
      role = `nexus_${stage}_app`,
      file = `.env.${stage}.local`;
    let password = token();
    if (existsSync(file)) {
      const old = dotenv.parse(await readFile(file));
      password = decodeURIComponent(new URL(old.DATABASE_URL).password);
    }
    await db.query("BEGIN");
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await db.query(`REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC`);
    const exists = (
      await db.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role])
    ).rowCount;
    if (!exists)
      await db.query(
        `CREATE ROLE ${role} LOGIN NOINHERIT NOCREATEDB NOCREATEROLE PASSWORD '${password}'`,
      );
    else if (!existsSync(file))
      throw new Error(
        `Role ${role} exists but ${file} is missing. Restore its credentials before setup.`,
      );
    await db.query(`SET LOCAL search_path TO ${schema},pg_catalog`);
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of migrations) {
      const version = Number(file.split("_")[0]);
      const migration = await readFile("db/" + file, "utf8");
      const checksum = createHash("sha256").update(migration).digest("hex");
      const {
        rows: [applied],
      } = await db.query(
        "SELECT checksum FROM schema_migrations WHERE version=$1",
        [version],
      );
      if (applied && applied.checksum !== checksum)
        throw new Error("Applied migration checksum changed: " + file);
      if (!applied) {
        await db.query(migration);
        await db.query(
          "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
          [version, checksum],
        );
      }
    }
    await db.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    await db.query(
      `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role}`,
    );
    await db.query(`REVOKE ALL ON ${schema}.schema_migrations FROM ${role}`);
    await db.query(
      `GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`,
    );
    const {
      rows: [account],
    } = await db.query(
      "INSERT INTO accounts(username,display_name,role) VALUES('sec','Student Engineers’ Council','admin') ON CONFLICT(username) DO UPDATE SET username=excluded.username RETURNING id,password_hash",
    );
    if (
      !account.password_hash &&
      !(
        await db.query(
          "SELECT 1 FROM activation_tokens WHERE account_id=$1 AND expires_at>now()",
          [account.id],
        )
      ).rowCount
    ) {
      const raw = token();
      await db.query(
        "INSERT INTO activation_tokens VALUES($1,$2,now()+interval '7 days')",
        [digest(raw), account.id],
      );
      access.push(
        `## ${stage === "dev" ? "Development" : "Production"} SEC account\nUsername: sec\nOne-time setup path: /activate?token=${raw}\n${stage === "dev" ? "Open http://localhost:3000" : "Use your Vercel production domain"} followed by this path. Expires in seven days.\n`,
      );
    }
    const now = new Date();
    const year = now.getUTCFullYear();
    const fall = now.getUTCMonth() >= 6;
    const semName = `${fall ? "Fall" : "Spring"} ${year}`;
    await db.query(
      "INSERT INTO semesters(name,starts_on,ends_on,is_current) SELECT $1,$2,$3,true WHERE NOT EXISTS(SELECT 1 FROM semesters)",
      [
        semName,
        `${year}-${fall ? "07-01" : "01-01"}`,
        `${year}-${fall ? "12-31" : "06-30"}`,
      ],
    );
    await db.query("COMMIT");
    const url = new URL(process.env.DATABASE_ADMIN_URL);
    url.username = role;
    url.password = password;
    if (!url.hostname.includes("-pooler."))
      url.hostname = url.hostname.replace(/\./, "-pooler.");
    url.searchParams.set("sslmode", "verify-full");
    const content = `DATABASE_URL=${url.toString()}\nDATABASE_SCHEMA=${schema}\n`;
    await writeFile(file, content, { mode: 0o600 });
    if (stage === "dev")
      await writeFile(
        ".env.local",
        Object.entries({
          ...dotenv.parse(
            existsSync(".env.local") ? await readFile(".env.local") : "",
          ),
          DATABASE_URL: url.toString(),
          DATABASE_SCHEMA: schema,
        })
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join("\n") + "\n",
        { mode: 0o600 },
      );
    console.log(`Ready: ${schema}, restricted role ${role}`);
  }
  // Confirm both application roles lack access to the opposite environment.
  const { rows } = await db.query(
    "SELECT has_schema_privilege('nexus_dev_app','nexus_prod','USAGE') dev_can_access_prod,has_schema_privilege('nexus_prod_app','nexus_dev','USAGE') prod_can_access_dev",
  );
  if (rows[0].dev_can_access_prod || rows[0].prod_can_access_dev)
    throw new Error("Environment isolation check failed.");
  console.log("Cross-environment schema access denied in both directions.");
  if (access.length) {
    const out = process.env.ACCESS_OUTPUT ?? "work/initial-access.md";
    await mkdir(out.slice(0, out.lastIndexOf("/")) || ".", { recursive: true });
    await writeFile(
      out,
      "# SocietyHub initial account access\n\nKeep these one-time links private. Set a password of at least 15 characters.\n\n" +
        access.join("\n"),
      { mode: 0o600 },
    );
    console.log(
      "Initial account links written to the configured private access file.",
    );
  }
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
