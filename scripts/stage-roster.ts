import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { digest } from "../lib/security";
const stage = process.argv.includes("--prod") ? "prod" : "dev";
const file = process.argv.find((x) => x.endsWith(".csv"));
if (!file)
  throw new Error(
    "Usage: npm run roster:stage -- /absolute/contacts.csv --prod",
  );
dotenv.config({ path: `.env.${stage}.local`, quiet: true });
const rows = parse(await readFile(file, "utf8"), {
  columns: true,
  bom: true,
  skip_empty_lines: true,
}) as Record<string, string>[];
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let inserted = 0;
try {
  await db.query("BEGIN");
  await db.query(`SET LOCAL search_path TO nexus_${stage},pg_catalog`);
  for (const r of rows) {
    const name = r["What is your organization's name?"]?.trim();
    if (!name) throw new Error("Missing organization name column.");
    const contacts = {
      president: {
        name: r["President's Name"],
        email:
          r[
            "President's Email Address (fill even if the same from last year) "
          ],
        phone: r["President's Phone Number"],
      },
      representative: {
        name: r["Representative's Name (skip if not applicable)"],
        email: r["Representative's Email Address (skip if not applicable)"],
        phone: r["Representative's Phone Number (skip if not applicable)"],
      },
    };
    const result = await db.query(
      "INSERT INTO roster_candidates(source_key,name,contacts,source_timestamp) VALUES($1,$2,$3,$4) ON CONFLICT(source_key) DO NOTHING",
      [
        digest(JSON.stringify(r)),
        name,
        JSON.stringify(contacts),
        r.Timestamp ?? "",
      ],
    );
    inserted += result.rowCount ?? 0;
  }
  await db.query("COMMIT");
  console.log(
    `Staged ${inserted} new contact responses for SEC review in nexus_${stage}. No society accounts created.`,
  );
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
