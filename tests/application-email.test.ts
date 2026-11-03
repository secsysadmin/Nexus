import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import type { PoolClient } from "pg";
import { adminMutation, saveSubmission, type Actor } from "../lib/service";
import { deliverApplicationEmail } from "../lib/email-outbox";
import {
  defaultConfirmationEmail,
  receiptContent,
} from "../lib/application-email";
import {
  emailDeliveryEnabled,
  encodedHeader,
  rawMessage,
  type Mail,
} from "../lib/email";
async function fixture() {
  const db = new PGlite();
  for (const f of (await readdir("db"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("db/" + f, "utf8"));
  const actor = async (username: string, role: string) =>
    (
      await db.query<Actor>(
        "INSERT INTO accounts(username,display_name,role) VALUES($1,$1,$2) RETURNING id,username,display_name,role",
        [username, role],
      )
    ).rows[0];
  const admin = await actor("sec", "admin"),
    society = await actor("test-society", "society");
  const sem = (
    await db.query<{ id: string }>(
      "INSERT INTO semesters(name,starts_on,ends_on,is_current) VALUES('Fall 2026','2026-07-01','2026-12-31',true) RETURNING id",
    )
  ).rows[0].id;
  const client = db as unknown as PoolClient;
  const form = (await adminMutation(client, admin, "admin/forms", {
    semesterId: sem,
    title: "Funding",
    description: "",
    kind: "FUNDING",
    published: true,
    deadline: null,
    questions: [
      {
        id: "purpose",
        label: "Purpose",
        type: "short",
        required: true,
        options: [],
      },
    ],
  })) as { id: string };
  const transact = async <T>(fn: (db: PoolClient) => Promise<T>) => {
    await db.exec("BEGIN");
    try {
      const r = await fn(client);
      await db.exec("COMMIT");
      return r;
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }
  };
  return { db, client, admin, society, form, transact };
}
const input = (formId: string, submit: boolean, revision = 0) => ({
  formId,
  submit,
  revision,
  answers: { purpose: "Outreach" },
  confirmationEmail: "officer@example.invalid",
});
test("receipt contact defaults use the newest valid contact without emailing all roster responses", () => {
  assert.equal(
    defaultConfirmationEmail({
      responses: [
        { timestamp: "1/1/2026", president: { email: "old@example.invalid" } },
        {
          timestamp: "9/1/2026",
          president: { email: "current@example.invalid" },
          representative: { email: "rep@example.invalid" },
        },
      ],
    }),
    "current@example.invalid",
  );
  assert.equal(
    defaultConfirmationEmail({
      responses: [
        {
          president: { email: "bad" },
          representative: { email: "rep@example.invalid" },
        },
      ],
    }),
    "rep@example.invalid",
  );
  assert.equal(defaultConfirmationEmail({}), "");
});
test("receipt templates escape user content and distinguish receipt from approval", () => {
  const r = receiptContent({
    societyName: "<script>alert(1)</script>",
    formTitle: "Funding\r\nInjected",

    submissionId: "receipt-id",
    submittedAt: "2026-11-02T19:00:00Z",
    resubmission: false,
  });
  assert(!r.html.includes("<script>"));
  assert(r.html.includes("&lt;script&gt;"));
  assert(!r.subject.includes("\n"));
  assert(r.body.includes("not approval or a point award"));
  assert(r.body.includes("receipt-id"));
  const header = encodedHeader("A long subject ".repeat(20) + "— 你好");
  for (const word of header.split("\r\n ")) assert(word.length <= 75);
  const mime = rawMessage(
    { to: "officer@example.invalid", ...r },
    "Student Engineers' Council <no-reply@sec.tamu.edu>",
  );
  assert(mime.includes("multipart/alternative"));
  assert(mime.includes("Content-Type: text/html; charset=UTF-8"));
});
test("email delivery is disabled by default and always disabled in Preview", () => {
  assert(!emailDeliveryEnabled({}));
  assert(
    !emailDeliveryEnabled({
      EMAIL_DELIVERY_ENABLED: "true",
      VERCEL_ENV: "preview",
    }),
  );
  assert(
    emailDeliveryEnabled({
      EMAIL_DELIVERY_ENABLED: "true",
      VERCEL_ENV: "production",
    }),
  );
});
test("drafts enqueue no mail; submit queues one receipt and repeat submit cannot duplicate it", async () => {
  const f = await fixture();
  try {
    const draft = await f.transact((db) =>
      saveSubmission(db, f.society, input(f.form.id, false)),
    );
    assert.equal(
      (await f.db.query("SELECT * FROM application_emails")).rows.length,
      0,
    );
    await assert.rejects(() =>
      f.transact((db) =>
        saveSubmission(db, f.society, {
          ...input(f.form.id, true, draft.revision),
          confirmationEmail: "invalid",
        }),
      ),
    );
    const s = await f.transact((db) =>
      saveSubmission(db, f.society, input(f.form.id, true, draft.revision)),
    );
    assert(s.confirmation_email_id);
    assert.equal(s.confirmation_email, "officer@example.invalid");
    await assert.rejects(() =>
      f.transact((db) =>
        saveSubmission(db, f.society, input(f.form.id, true, s.revision)),
      ),
    );
    assert.equal(
      (await f.db.query("SELECT * FROM application_emails")).rows.length,
      1,
    );
    let sent = 0;
    const send = async (mail: Mail) => {
      sent++;
      assert.equal(mail.to, "officer@example.invalid");
      return "provider-id";
    };
    assert.equal(
      (
        await deliverApplicationEmail(s.confirmation_email_id, {
          transact: f.transact,
          send,
          enabled: true,
        })
      ).status,
      "SENT",
    );
    assert.equal(
      (
        await deliverApplicationEmail(s.confirmation_email_id, {
          transact: f.transact,
          send,
          enabled: true,
        })
      ).status,
      "UNCHANGED",
    );
    assert.equal(sent, 1);
  } finally {
    await f.db.close();
  }
});
test("provider failure preserves submitted application and only SEC can retry", async () => {
  const f = await fixture();
  try {
    const s = await f.transact((db) =>
      saveSubmission(db, f.society, input(f.form.id, true)),
    );
    const failed = await deliverApplicationEmail(s.confirmation_email_id, {
      transact: f.transact,
      enabled: true,
      send: async () => {
        throw new Error("sensitive provider error");
      },
    });
    assert.equal(failed.status, "FAILED");
    assert.equal(
      (
        await f.db.query<{ status: string }>(
          "SELECT status FROM submissions WHERE id=$1",
          [s.id],
        )
      ).rows[0].status,
      "SUBMITTED",
    );
    const item = (
      await f.db.query<{ last_error: string }>(
        "SELECT last_error FROM application_emails",
      )
    ).rows[0];
    assert(!item.last_error.includes("sensitive"));
    await assert.rejects(() =>
      f.transact((db) =>
        adminMutation(db, f.society, "admin/email-retry", {
          id: s.confirmation_email_id,
        }),
      ),
    );
    await f.transact((db) =>
      adminMutation(db, f.admin, "admin/email-retry", {
        id: s.confirmation_email_id,
      }),
    );
    assert.equal(
      (
        await deliverApplicationEmail(s.confirmation_email_id, {
          transact: f.transact,
          enabled: true,
          send: async () => "recovered",
        })
      ).status,
      "SENT",
    );
  } finally {
    await f.db.close();
  }
});
test("disabled delivery leaves the durable receipt queued and sends nothing", async () => {
  const f = await fixture();
  try {
    const s = await f.transact((db) =>
      saveSubmission(db, f.society, input(f.form.id, true)),
    );
    const result = await deliverApplicationEmail(s.confirmation_email_id, {
      transact: f.transact,
      enabled: false,
      send: async () => {
        throw new Error("must not send");
      },
    });
    assert.equal(result.status, "DISABLED");
    assert.equal(
      (
        await f.db.query<{ status: string }>(
          "SELECT status FROM application_emails",
        )
      ).rows[0].status,
      "PENDING",
    );
  } finally {
    await f.db.close();
  }
});

test("overlapping dispatchers cannot send the same receipt twice", async () => {
  const f = await fixture();
  try {
    const s = await f.transact((db) =>
      saveSubmission(db, f.society, input(f.form.id, true)),
    );
    let start!: () => void, release!: () => void;
    const entered = new Promise<void>((r) => (start = r)),
      blocked = new Promise<void>((r) => (release = r));
    let count = 0;
    const first = deliverApplicationEmail(s.confirmation_email_id, {
      transact: f.transact,
      enabled: true,
      send: async () => {
        count++;
        start();
        await blocked;
        return "once";
      },
    });
    await entered;
    const duplicate = await deliverApplicationEmail(s.confirmation_email_id, {
      transact: f.transact,
      enabled: true,
      send: async () => {
        count++;
        return "duplicate";
      },
    });
    assert.equal(duplicate.status, "UNCHANGED");
    release();
    assert.equal((await first).status, "SENT");
    assert.equal(count, 1);
  } finally {
    await f.db.close();
  }
});
