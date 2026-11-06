import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { scryptSync } from "node:crypto";
import { adminMutation, saveSubmission, issueActivation } from "../lib/service";
import {
  hashPassword,
  verifyPassword,
  passwordNeedsUpgrade,
} from "../lib/security";
import {
  login,
  consumeLoginRequest,
  redeemActivation,
  changePassword,
} from "../lib/auth";
import { deliverApplicationEmail, runMaintenance } from "../lib/email-outbox";
import { authorizedWorkflowClaims } from "../lib/maintenance-auth";
import {
  getData,
  getFormDetail,
  getSubmissionDetail,
  getHistory,
} from "../lib/data";
async function fixture() {
  const db = new PGlite();
  for (const f of (await readdir("db"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("db/" + f, "utf8"));
  await db.query(
    "INSERT INTO semesters(name,starts_on,ends_on,is_current)VALUES('Internal','2026-01-01','2099-12-31',true)",
  );
  const account = async (name: string, role: string) =>
    (
      await db.query<any>(
        "INSERT INTO accounts(username,display_name,role)VALUES($1,$1,$2)RETURNING *",
        [name, role],
      )
    ).rows[0];
  const admin = await account("sec", "admin"),
    society = await account("society", "society"),
    other = await account("other", "society");
  const form: any = await adminMutation(db as any, admin, "admin/forms", {
    title: "Funding",
    description: "",
    kind: "FUNDING",
    published: true,
    deadline: null,
    questions: [
      { id: "q", label: "Q", type: "short", required: true, options: [] },
    ],
  });
  const transact = async <T>(fn: (db: any) => Promise<T>) => {
    await db.exec("BEGIN");
    try {
      const r = await fn(db);
      await db.exec("COMMIT");
      return r;
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }
  };
  return { db, admin, society, other, form, transact };
}
test("legacy password hashes verify asynchronously and upgrade to the current encoded cost", async () => {
  const salt = "1".repeat(32),
    legacy =
      "scrypt:" +
      salt +
      ":" +
      scryptSync("A legacy society passphrase", salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      }).toString("hex");
  assert(await verifyPassword("A legacy society passphrase", legacy));
  assert(passwordNeedsUpgrade(legacy));
  const hash = await hashPassword("A legacy society passphrase");
  assert(!passwordNeedsUpgrade(hash));
  let timer = false;
  setTimeout(() => (timer = true), 0);
  assert(await verifyPassword("A legacy society passphrase", hash));
  assert(timer);
  assert(!(await verifyPassword("wrong", hash)));
});
test("successful shared-account logins do not consume failures; another connection is not locked out", async () => {
  const f = await fixture();
  try {
    await f.db.query("UPDATE accounts SET password_hash=$1 WHERE id=$2", [
      await hashPassword("Long shared society passphrase"),
      f.society.id,
    ]);
    for (let i = 0; i < 11; i++) {
      assert(await consumeLoginRequest(f.db as any, "campus"));
      assert(
        (
          await login(
            f.db as any,
            f.society.username,
            "Long shared society passphrase",
            "campus",
          )
        ).raw,
      );
    }
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await login(f.db as any, f.society.username, "wrong", "attacker"))
          .status,
        401,
      );
    assert.equal(
      (await login(f.db as any, f.society.username, "wrong", "attacker"))
        .status,
      429,
    );
    assert(
      (
        await login(
          f.db as any,
          f.society.username,
          "Long shared society passphrase",
          "campus",
        )
      ).raw,
    );
  } finally {
    await f.db.close();
  }
});
test("activation rotation and password changes invalidate earlier links and sessions", async () => {
  const f = await fixture();
  try {
    const first = await issueActivation(f.db as any, f.society.id, f.admin.id),
      second = await issueActivation(f.db as any, f.society.id, f.admin.id);
    await assert.rejects(() =>
      redeemActivation(f.db as any, first, "A long replacement passphrase"),
    );
    const raw = await redeemActivation(
      f.db as any,
      second,
      "A long replacement passphrase",
    );
    assert(raw);
    await assert.rejects(() =>
      redeemActivation(f.db as any, second, "A long replacement passphrase"),
    );
    await issueActivation(f.db as any, f.society.id, f.admin.id);
    await changePassword(
      f.db as any,
      f.society,
      "A long replacement passphrase",
      "Another long replacement passphrase",
    );
    assert.equal((await f.db.query("SELECT * FROM sessions")).rows.length, 0);
    assert.equal(
      (await f.db.query("SELECT * FROM activation_tokens")).rows.length,
      0,
    );
  } finally {
    await f.db.close();
  }
});
test("requested revisions remain available after initial deadline/unpublish; new applications remain closed", async () => {
  const f = await fixture();
  try {
    const s = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "initial" },
      submit: true,
      revision: 0,
      confirmationEmail: "officer@example.invalid",
    });
    await adminMutation(f.db as any, f.admin, "admin/review", {
      id: s.id,
      revision: s.revision,
      status: "CHANGES_REQUESTED",
      note: "Please revise",
    });
    await f.db.query(
      "UPDATE forms SET deadline=now()-interval '1 minute',published=false",
    );
    const changed = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "revised" },
      submit: true,
      revision: s.revision + 1,
      confirmationEmail: "officer@example.invalid",
    });
    assert.equal(changed.status, "SUBMITTED");
    await assert.rejects(() =>
      saveSubmission(f.db as any, f.other, {
        formId: f.form.id,
        answers: { q: "initial" },
        submit: true,
        revision: 0,
        confirmationEmail: "other@example.invalid",
      }),
    );
  } finally {
    await f.db.close();
  }
});
test("stale admin edits cannot overwrite current questions or event dates", async () => {
  const f = await fixture();
  try {
    const original = (await getData(f.db as any, f.admin)).forms[0];
    const input = {
      id: original.id,
      expectedVersion: 1,
      title: "Updated",
      description: "",
      kind: "FUNDING",
      published: true,
      deadline: null,
      questions: original.questions,
    };
    await adminMutation(f.db as any, f.admin, "admin/forms", input);
    await assert.rejects(() =>
      adminMutation(f.db as any, f.admin, "admin/forms", {
        ...input,
        title: "Stale",
      }),
    );
    const event: any = await adminMutation(
      f.db as any,
      f.admin,
      "admin/events",
      {
        name: "Event",
        description: "",
        location: "",
        category: "PRT",
        startsAt: new Date(Date.now() - 10000).toISOString(),
        endsAt: new Date(Date.now() + 10000).toISOString(),
        checkinOpen: true,
      },
    );
    await adminMutation(f.db as any, f.admin, "admin/event-checkin", {
      id: event.id,
      expectedVersion: event.revision,
      open: false,
    });
    await assert.rejects(() =>
      adminMutation(f.db as any, f.admin, "admin/events", {
        id: event.id,
        expectedVersion: event.revision,
        name: "Stale",
        description: "",
        location: "",
        category: "PRT",
        startsAt: event.starts_at.toISOString(),
        endsAt: event.ends_at.toISOString(),
        checkinOpen: true,
      }),
    );
  } finally {
    await f.db.close();
  }
});
test("provider acceptance followed by an acknowledgement failure retries recording, not sending", async () => {
  const f = await fixture();
  try {
    const saved = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "A" },
      submit: true,
      revision: 0,
      confirmationEmail: "officer@example.invalid",
    });
    let sends = 0,
      fail = true;
    const wrapped = {
      query: async (sql: string, args: any[]) => {
        if (
          fail &&
          sql.startsWith("UPDATE application_emails SET status='SENT'")
        ) {
          fail = false;
          throw Error("ack failed");
        }
        return f.db.query(sql, args);
      },
    };
    const result = await deliverApplicationEmail(saved.confirmation_email_id, {
      enabled: true,
      transact: async (fn) => fn(wrapped as any),
      send: async () => {
        sends++;
        return "provider-id";
      },
    });
    assert.equal(result.status, "SENT");
    assert.equal(sends, 1);
    assert.equal(
      (await f.db.query<any>("SELECT status FROM application_emails")).rows[0]
        .status,
      "SENT",
    );
  } finally {
    await f.db.close();
  }
});
test("maintenance retries rejected mail, quarantines expired uncertain sends, and reports issues", async () => {
  const f = await fixture();
  try {
    const saved = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "A" },
      submit: true,
      revision: 0,
      confirmationEmail: "officer@example.invalid",
    });
    await f.db.query(
      "UPDATE application_emails SET status='FAILED',next_attempt_at=now()-interval '1 minute'",
    );
    let sends = 0;
    const healthy = await runMaintenance({
      transact: f.transact,
      enabled: true,
      send: async () => {
        sends++;
        return "provider-id";
      },
    });
    assert(healthy.ok);
    assert.equal(sends, 1);
    await f.db.query(
      "UPDATE application_emails SET status='SENDING',lease_token='expired-lease',lease_until=now()-interval '1 minute',accepted_at=NULL,provider_id=NULL WHERE id=$1",
      [saved.confirmation_email_id],
    );
    const uncertain = await runMaintenance({
      transact: f.transact,
      enabled: true,
      send: async () => {
        sends++;
        return "provider-id";
      },
    });
    assert(!uncertain.ok);
    assert.equal(uncertain.uncertain, 1);
    assert.equal(sends, 1);
    await assert.rejects(() =>
      adminMutation(f.db as any, f.admin, "admin/email-retry", {
        id: saved.confirmation_email_id,
      }),
    );
    await adminMutation(f.db as any, f.admin, "admin/email-retry", {
      id: saved.confirmation_email_id,
      acknowledgeDuplicate: true,
    });
  } finally {
    await f.db.close();
  }
});
test("compact refresh omits answer content; detail endpoints preserve ownership", async () => {
  const f = await fixture();
  try {
    const saved = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "Private answer" },
      submit: false,
      revision: 0,
    });
    const compact = await getData(f.db as any, f.admin, { compact: true });
    assert.deepEqual(compact.submissions[0].answers, {});
    assert.deepEqual(compact.forms[0].questions, []);
    assert.equal(
      await getSubmissionDetail(f.db as any, f.other, saved.id),
      null,
    );
    assert.equal(
      (await getSubmissionDetail(f.db as any, f.society, saved.id)).answers.q,
      "Private answer",
    );
    assert(
      (await getFormDetail(f.db as any, f.society, f.form.id))?.form.questions
        .length,
    );
    assert.deepEqual((await getHistory(f.db as any, f.other, 0)).items, []);
  } finally {
    await f.db.close();
  }
});
test("maintenance trust binds immutable repository ID, exact workflow, main branch and allowed trigger", () => {
  const p = {
    repository_id: "1443310145",
    repository: "secsysadmin/Nexus",
    ref: "refs/heads/main",
    workflow_ref:
      "secsysadmin/Nexus/.github/workflows/maintenance.yml@refs/heads/main",
    event_name: "schedule",
  };
  assert(authorizedWorkflowClaims(p));
  for (const patch of [
    { repository_id: "attacker" },
    { ref: "refs/heads/pr" },
    { event_name: "pull_request" },
    { workflow_ref: "other.yml" },
  ])
    assert(!authorizedWorkflowClaims({ ...p, ...patch }));
});
test("persistent acknowledgement outage retains provider acceptance for reconciliation without resending", async () => {
  const f = await fixture();
  try {
    const saved = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "A" },
      submit: true,
      revision: 0,
      confirmationEmail: "officer@example.invalid",
    });
    let sends = 0;
    const wrapped = {
      query: async (sql: string, args: any[]) => {
        if (sql.startsWith("UPDATE application_emails SET status='SENT'"))
          throw Error("ack unavailable");
        return f.db.query(sql, args);
      },
    };
    const result = await deliverApplicationEmail(saved.confirmation_email_id, {
      enabled: true,
      transact: async (fn) => fn(wrapped as any),
      send: async () => {
        sends++;
        return "accepted-id";
      },
    });
    assert.equal(result.status, "UNCERTAIN");
    const row: any = (await f.db.query("SELECT * FROM application_emails"))
      .rows[0];
    assert.equal(row.provider_id, "accepted-id");
    assert(row.accepted_at);
    const health = await runMaintenance({
      enabled: true,
      transact: f.transact,
      send: async () => {
        sends++;
        return "unexpected";
      },
    });
    assert(health.ok);
    assert.equal(sends, 1);
    assert.equal(
      (await f.db.query<any>("SELECT status FROM application_emails")).rows[0]
        .status,
      "SENT",
    );
  } finally {
    await f.db.close();
  }
});

test("review decisions atomically queue one notification, preserve decisions on provider failure, and never award points", async () => {
  const f = await fixture();
  try {
    const saved = await saveSubmission(f.db as any, f.society, {
      formId: f.form.id,
      answers: { q: "A" },
      submit: true,
      revision: 0,
      confirmationEmail: "officer@example.invalid",
    });
    const review: any = await adminMutation(
      f.db as any,
      f.admin,
      "admin/review",
      {
        id: saved.id,
        revision: saved.revision,
        status: "CHANGES_REQUESTED",
        note: "Please revise",
      },
    );
    const mail: any = (
      await f.db.query("SELECT * FROM application_emails WHERE id=$1", [
        review.confirmation_email_id,
      ])
    ).rows[0];
    const unchanged: any = await adminMutation(
      f.db as any,
      f.admin,
      "admin/review",
      {
        id: saved.id,
        revision: saved.revision + 1,
        status: "CHANGES_REQUESTED",
        note: "Please revise",
      },
    );
    assert(!unchanged.confirmation_email_id);
    assert.equal(mail.kind, "DECISION");
    assert.equal(mail.recipient, "officer@example.invalid");
    assert.match(mail.subject, /Changes requested/);
    assert(!mail.html.includes("Please revise"));
    await assert.rejects(() =>
      adminMutation(f.db as any, f.admin, "admin/review", {
        id: saved.id,
        revision: saved.revision,
        status: "APPROVED",
        note: "",
      }),
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM application_emails WHERE kind='DECISION'",
        )
      ).rows.length,
      1,
    );
    const sent = await deliverApplicationEmail(mail.id, {
      transact: f.transact,
      enabled: true,
      send: async () => {
        throw Error("rejected");
      },
    });
    assert.equal(sent.status, "FAILED");
    assert.equal(
      (await f.db.query<any>("SELECT status FROM submissions")).rows[0].status,
      "CHANGES_REQUESTED",
    );
    assert.equal((await f.db.query("SELECT * FROM credits")).rows.length, 0);
  } finally {
    await f.db.close();
  }
});
test("event schedule and check-in window are independent; invalid windows are rejected", async () => {
  const f = await fixture();
  try {
    const event: any = await adminMutation(
      f.db as any,
      f.admin,
      "admin/events",
      {
        name: "Earlier event",
        description: "",
        location: "",
        category: "PRT",
        startsAt: new Date(Date.now() - 7200000).toISOString(),
        endsAt: new Date(Date.now() - 3600000).toISOString(),
        checkinStartsAt: new Date(Date.now() - 60000).toISOString(),
        checkinEndsAt: new Date(Date.now() + 60000).toISOString(),
        checkinOpen: true,
      },
    );
    const { checkIn } = await import("../lib/service");
    await checkIn(f.db as any, f.society, {
      eventId: event.id,
      token: event.checkin_token,
    });
    const realNow = Date.now;
    try {
      Date.now = () => new Date(event.checkin_ends_at).getTime();
      await assert.rejects(() =>
        checkIn(f.db as any, f.other, {
          eventId: event.id,
          token: event.checkin_token,
        }),
      );
    } finally {
      Date.now = realNow;
    }
    assert.equal((await f.db.query("SELECT * FROM credits")).rows.length, 1);
    await assert.rejects(() =>
      adminMutation(f.db as any, f.admin, "admin/events", {
        name: "Bad",
        description: "",
        location: "",
        category: "PRT",
        startsAt: new Date(Date.now()).toISOString(),
        endsAt: new Date(Date.now() + 60000).toISOString(),
        checkinStartsAt: new Date(Date.now()).toISOString(),
        checkinEndsAt: new Date(Date.now() - 60000).toISOString(),
        checkinOpen: true,
      }),
    );
  } finally {
    await f.db.close();
  }
});
test("contact updates preserve imported evidence, enforce ownership and reject stale saves", async () => {
  const f = await fixture();
  try {
    const { updateContacts } = await import("../lib/contacts");
    const { defaultConfirmationEmail } = await import(
      "../lib/application-email"
    );
    const original = {
      responses: [{ president: { email: "old@example.invalid" } }],
    };
    await f.db.query("UPDATE accounts SET contacts=$1 WHERE id=$2", [
      JSON.stringify(original),
      f.society.id,
    ]);
    const profile = {
      president: {
        name: "New president",
        email: "new@example.invalid",
        phone: "",
      },
      representative: { name: "Representative", email: "", phone: "" },
      notificationEmail: "preferred@example.invalid",
    };
    const result = await updateContacts(f.db as any, f.society, {
      revision: 1,
      profile,
    });
    assert.deepEqual(result.contacts.responses, original.responses);
    assert.equal(
      defaultConfirmationEmail(result.contacts),
      "preferred@example.invalid",
    );
    await assert.rejects(() =>
      updateContacts(f.db as any, f.other, {
        accountId: f.society.id,
        revision: 2,
        profile,
      }),
    );
    await assert.rejects(() =>
      updateContacts(f.db as any, f.society, { revision: 1, profile }),
    );
    assert.equal(
      (
        await f.db.query<any>(
          "SELECT contact_revision FROM accounts WHERE id=$1",
          [f.society.id],
        )
      ).rows[0].contact_revision,
      2,
    );
  } finally {
    await f.db.close();
  }
});
test("metadata pages preserve global dashboard counts and calendar ignores check-in-only dates", async () => {
  const f = await fixture();
  try {
    const { getPage, getCalendarPage } = await import("../lib/data-pages");
    await f.db.query(
      "INSERT INTO accounts(username,display_name,role) SELECT 'many-'||g,'Many '||g,'society' FROM generate_series(1,60)g",
    );
    await f.db.query(
      "INSERT INTO forms(semester_id,title,description,kind,published,created_by) SELECT (SELECT id FROM semesters LIMIT 1),'Form '||g,'','FUNDING',true,$1 FROM generate_series(1,60)g",
      [f.admin.id],
    );
    const data = await getData(f.db as any, f.admin, {
      compact: true,
      view: "overview",
    });
    assert.equal(data.accounts.length, 50);
    assert(data.pagination?.accounts.hasMore);
    assert.equal(data.dashboardCounts?.activeSocieties, 62);
    assert.equal(data.dashboardCounts?.missingPrt, 62);
    assert.equal(data.dashboardPreview?.missingPrt.length, 5);
    const next = await getPage(f.db as any, f.admin, "accounts", 50);
    assert.equal(next.items.length, 13);
    assert(!next.hasMore);
    const event: any = await adminMutation(
      f.db as any,
      f.admin,
      "admin/events",
      {
        name: "Calendar independence",
        description: "",
        location: "",
        category: "PRT",
        startsAt: "2026-01-10T18:00:00Z",
        endsAt: "2026-01-10T19:00:00Z",
        checkinStartsAt: "2026-02-10T18:00:00Z",
        checkinEndsAt: "2026-02-10T19:00:00Z",
        checkinOpen: true,
      },
    );
    assert(
      (await getCalendarPage(f.db as any, f.society, "2026-01", 0)).items.some(
        (e) => e.id === event.id,
      ),
    );
    assert(
      !(await getCalendarPage(f.db as any, f.society, "2026-02", 0)).items.some(
        (e) => e.id === event.id,
      ),
    );
    const other = await getPage(f.db as any, f.other, "submissions");
    assert.equal(other.items.length, 0);
  } finally {
    await f.db.close();
  }
});
