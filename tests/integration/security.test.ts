import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { randomUUID } from "node:crypto";
import {
  adminMutation,
  issueActivation,
  saveSubmission,
} from "../../lib/service";
import { redeemActivation } from "../../lib/auth";
import { idempotentMutation } from "../../lib/idempotency";
import { databasePool, transaction } from "../../lib/db";
const schema = process.env.DATABASE_SCHEMA!;
if (
  process.env.ISOLATED_TEST_DATABASE !== "true" ||
  !/^nexus_test_[a-f0-9]{12}$/.test(schema)
)
  throw Error("Dedicated test schema required");
const clients: pg.Client[] = [];
async function connect() {
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL!.replace("-pooler.", "."),
    query_timeout: 12000,
  });
  await db.connect();
  clients.push(db);
  return db;
}
async function tx<T>(db: pg.Client, fn: (db: any) => Promise<T>) {
  await db.query("BEGIN");
  try {
    await db.query(`SET LOCAL search_path TO ${schema},pg_catalog`);
    await db.query("SET LOCAL lock_timeout='3s'");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}
function gate() {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  return { wait, release };
}
test("real PostgreSQL concurrency and recovery invariants", async (t) => {
  try {
    const a = await connect(),
      b = await connect();
    const f = await tx(a, async (db) => {
      const account = async (role: string) =>
        (
          await db.query(
            "INSERT INTO accounts(username,display_name,role)VALUES($1,$1,$2)RETURNING *",
            [randomUUID(), role],
          )
        ).rows[0];
      const admin = await account("admin"),
        society = await account("society");
      const form: any = await adminMutation(db, admin, "admin/forms", {
        title: "Concurrency fixture",
        description: "",
        kind: "FUNDING",
        published: true,
        deadline: null,
        questions: [
          {
            id: "q",
            label: "Answer",
            type: "short",
            required: true,
            options: [],
          },
        ],
      });
      const saved = await saveSubmission(db, society, {
        formId: form.id,
        answers: { q: "original" },
        revision: 0,
        submit: true,
        confirmationEmail: "test@example.invalid",
      });
      await adminMutation(db, admin, "admin/review", {
        id: saved.id,
        revision: saved.revision,
        status: "CHANGES_REQUESTED",
        note: "Revise",
      });
      return { admin, society, form, saved };
    });
    const input = {
      formId: f.form.id,
      answers: { q: "revised" },
      revision: 2,
      submit: false,
    };
    await t.test(
      "society first: SEC decision waits and rejects its stale revision",
      async () => {
        const locked = gate(),
          resume = gate();
        const save = tx(a, (db) =>
          saveSubmission(
            {
              query: async (sql: string, args: any[]) => {
                const result = await db.query(sql, args);
                if (sql.startsWith("SELECT * FROM submissions")) {
                  locked.release();
                  await resume.wait;
                }
                return result;
              },
            } as any,
            f.society,
            input,
          ),
        );
        await locked.wait;
        const decision = tx(b, (db) =>
          adminMutation(db, f.admin, "admin/review", {
            id: f.saved.id,
            revision: 2,
            status: "APPROVED",
            note: "Approve",
          }),
        );
        const checked = assert.rejects(
          decision,
          /changed|updated|revision|reload/i,
        );
        resume.release();
        await save;
        await checked;
      },
    );
    await t.test(
      "SEC first: stale society save cannot overwrite approval",
      async () => {
        await tx(b, (db) =>
          adminMutation(db, f.admin, "admin/review", {
            id: f.saved.id,
            revision: 3,
            status: "APPROVED",
            note: "Approved current answers",
          }),
        );
        await assert.rejects(
          tx(a, (db) =>
            saveSubmission(db, f.society, { ...input, revision: 3 }),
          ),
          /already been submitted|changed/i,
        );
        const row = await tx(
          a,
          async (db) =>
            (
              await db.query("SELECT * FROM submissions WHERE id=$1", [
                f.saved.id,
              ])
            ).rows[0],
        );
        assert.equal(row.status, "APPROVED");
        assert.equal(row.answers.q, "revised");
        assert.equal(row.revision, 4);
      },
    );
    await t.test(
      "concurrent rotations retain one link and redemption is one-use",
      async () => {
        const links = await Promise.all([
          tx(a, (db) => issueActivation(db, f.society.id, f.admin.id)),
          tx(b, (db) => issueActivation(db, f.society.id, f.admin.id)),
        ]);
        const rows: any = await tx(a, (db) =>
          db.query("SELECT * FROM activation_tokens WHERE account_id=$1", [
            f.society.id,
          ]),
        );
        assert.equal(rows.rowCount, 1);
        const { digest } = await import("../../lib/security");
        const valid = links.find((v) => digest(v) === rows.rows[0].token_hash)!;
        const results = await Promise.allSettled([
          tx(a, (db) =>
            redeemActivation(db, valid, "A strong test passphrase 2026"),
          ),
          tx(b, (db) =>
            redeemActivation(db, valid, "A strong test passphrase 2026"),
          ),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      },
    );
    await t.test(
      "lost create response replay does not create a duplicate",
      async () => {
        const key = randomUUID(),
          body = { fixture: true };
        let calls = 0;
        const perform = (db: any) =>
          idempotentMutation(db, f.admin, "fixture", key, body, async () => {
            calls++;
            return { id: randomUUID() };
          });
        const results = await Promise.all([tx(a, perform), tx(b, perform)]);
        assert.equal(calls, 1);
        assert.deepEqual(results[0], results[1]);
        await assert.rejects(
          tx(a, (db) =>
            idempotentMutation(
              db,
              f.admin,
              "fixture",
              key,
              { different: true },
              async () => ({}),
            ),
          ),
          /different input/,
        );
      },
    );
    await t.test(
      "runtime pool bounds queries and recovers after cancellation",
      async () => {
        assert(databasePool().listenerCount("error") > 0);
        await assert.rejects(
          transaction(async (db) => {
            assert.equal(
              (await db.query("SHOW lock_timeout")).rows[0].lock_timeout,
              "3s",
            );
            await db.query("SET LOCAL statement_timeout='50ms'");
            await db.query("SELECT pg_sleep(1)");
          }),
          /statement timeout/,
        );
        assert.equal(
          await transaction(
            async (db) => (await db.query("SELECT 1 value")).rows[0].value,
          ),
          1,
        );
      },
    );
  } finally {
    await Promise.all(clients.map((c) => c.end()));
    await databasePool().end();
  }
});
