import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { PoolClient } from "pg";
import {
  adminMutation,
  checkIn,
  saveSubmission,
  type Actor,
} from "../lib/service";
import { getData } from "../lib/data";
async function fixture() {
  const db = new PGlite();
  await db.exec(await readFile("db/001_initial.sql", "utf8"));
  const account = async (username: string, role: string) =>
    (
      await db.query<Actor>(
        "INSERT INTO accounts(username,display_name,role) VALUES($1,$1,$2) RETURNING id,username,display_name,role",
        [username, role],
      )
    ).rows[0];
  const admin = await account("sec", "admin"),
    society = await account("aggie-demo", "society"),
    other = await account("other-demo", "society");
  const sem = (
    await db.query<{ id: string }>(
      "INSERT INTO semesters(name,starts_on,ends_on,is_current) VALUES('Fall 2026','2026-07-01','2026-12-31',true) RETURNING id",
    )
  ).rows[0].id;
  return {
    db,
    client: db as unknown as PoolClient,
    admin,
    society,
    other,
    sem,
  };
}
const eventInput = (sem: string, category = "PRT") => ({
  semesterId: sem,
  name: "Test event",
  description: "",
  location: "Zachry",
  category,
  startsAt: new Date(Date.now() - 3600000).toISOString(),
  endsAt: new Date(Date.now() + 3600000).toISOString(),
  checkinOpen: true,
});
test("check-in credits an ESO once and never automatically awards High Impact", async () => {
  const f = await fixture();
  try {
    const e = (await adminMutation(
      f.client,
      f.admin,
      "admin/events",
      eventInput(f.sem),
    )) as Record<string, string>;
    const first = await checkIn(f.client, f.society, {
      eventId: e.id,
      token: e.checkin_token,
    });
    assert.equal(first.already, false);
    const repeat = await checkIn(f.client, f.society, {
      eventId: e.id,
      token: e.checkin_token,
    });
    assert.equal(repeat.already, true);
    assert.equal((await f.db.query("SELECT * FROM credits")).rows.length, 1);
    await assert.rejects(() =>
      checkIn(f.client, f.admin, { eventId: e.id, token: e.checkin_token }),
    );
    await assert.rejects(() =>
      checkIn(f.client, f.other, { eventId: e.id, token: "0".repeat(64) }),
    );
    const high = (await adminMutation(
      f.client,
      f.admin,
      "admin/events",
      eventInput(f.sem, "HIGH_IMPACT"),
    )) as Record<string, string>;
    await assert.rejects(() =>
      checkIn(f.client, f.society, {
        eventId: high.id,
        token: high.checkin_token,
      }),
    );
    await adminMutation(f.client, f.admin, "admin/credits", {
      eventId: high.id,
      accountId: f.society.id,
      note: "Verified collaboration",
    });
    const points = (
      await f.db.query<{ total: number }>(
        "SELECT sum(points)::int total FROM credits",
      )
    ).rows[0].total;
    assert.equal(points, 3);
  } finally {
    await f.db.close();
  }
});
test("closed, outside-window, historical and revoked attendance cannot create credit", async () => {
  const f = await fixture();
  try {
    const e = (await adminMutation(
      f.client,
      f.admin,
      "admin/events",
      eventInput(f.sem),
    )) as Record<string, string>;
    await f.db.query("UPDATE events SET checkin_open=false WHERE id=$1", [
      e.id,
    ]);
    await assert.rejects(() =>
      checkIn(f.client, f.society, { eventId: e.id, token: e.checkin_token }),
    );
    await f.db.query(
      "UPDATE events SET checkin_open=true,ends_at=now()-interval '1 second' WHERE id=$1",
      [e.id],
    );
    await assert.rejects(() =>
      checkIn(f.client, f.society, { eventId: e.id, token: e.checkin_token }),
    );
    await f.db.query(
      "UPDATE events SET ends_at=now()+interval '1 hour' WHERE id=$1",
      [e.id],
    );
    await f.db.query("UPDATE semesters SET is_current=false");
    await assert.rejects(() =>
      checkIn(f.client, f.society, { eventId: e.id, token: e.checkin_token }),
    );
    await f.db.query("UPDATE semesters SET is_current=true");
    await checkIn(f.client, f.society, {
      eventId: e.id,
      token: e.checkin_token,
    });
    await f.db.query("UPDATE credits SET revoked_at=now()");
    await assert.rejects(() =>
      checkIn(f.client, f.society, { eventId: e.id, token: e.checkin_token }),
    );
  } finally {
    await f.db.close();
  }
});
test("society sessions cannot administer or inspect another society submission", async () => {
  const f = await fixture();
  try {
    await assert.rejects(() =>
      adminMutation(f.client, f.society, "admin/events", eventInput(f.sem)),
    );
    const data = await getData(f.client, f.society);
    assert.equal(data.accounts.length, 1);
    assert.equal(data.accounts[0].id, f.society.id);
    assert.equal(data.roster.length, 0);
    assert.equal(data.audit.length, 0);
  } finally {
    await f.db.close();
  }
});
test("form edits preserve existing drafts; revisions prevent officer overwrites; approval awards no points", async () => {
  const f = await fixture();
  try {
    const input = {
      semesterId: f.sem,
      title: "Funding",
      description: "",
      kind: "FUNDING",
      published: true,
      deadline: null,
      questions: [
        {
          id: "purpose",
          label: "Purpose",
          type: "long",
          required: true,
          options: [],
        },
      ],
    };
    const form = (await adminMutation(
      f.client,
      f.admin,
      "admin/forms",
      input,
    )) as { id: string };
    const draft = await saveSubmission(f.client, f.society, {
      formId: form.id,
      answers: {},
      submit: false,
      revision: 0,
    });
    assert.equal(draft.form_version, 1);
    await adminMutation(f.client, f.admin, "admin/forms", {
      ...input,
      id: form.id,
      questions: [
        {
          id: "new",
          label: "New question",
          type: "short",
          required: true,
          options: [],
        },
      ],
    });
    await assert.rejects(() =>
      saveSubmission(f.client, f.society, {
        formId: form.id,
        answers: { purpose: "Funding" },
        submit: true,
        revision: 0,
      }),
    );
    const submitted = await saveSubmission(f.client, f.society, {
      formId: form.id,
      answers: { purpose: "Community workshop" },
      submit: true,
      revision: draft.revision,
    });
    assert.equal(submitted.form_version, 1);
    assert.equal(submitted.status, "SUBMITTED");
    await assert.rejects(() =>
      saveSubmission(f.client, f.society, {
        formId: form.id,
        answers: { purpose: "Change" },
        submit: false,
        revision: submitted.revision,
      }),
    );
    await adminMutation(f.client, f.admin, "admin/review", {
      id: submitted.id,
      status: "CHANGES_REQUESTED",
      note: "Add a budget.",
      revision: submitted.revision,
    });
    const updated = (
      await f.db.query<{ revision: number }>(
        "SELECT revision FROM submissions WHERE id=$1",
        [submitted.id],
      )
    ).rows[0];
    const resubmitted = await saveSubmission(f.client, f.society, {
      formId: form.id,
      answers: { purpose: "Workshop with $100 budget" },
      submit: true,
      revision: updated.revision,
    });
    await adminMutation(f.client, f.admin, "admin/review", {
      id: submitted.id,
      status: "APPROVED",
      note: "Approved",
      revision: resubmitted.revision,
    });
    assert.equal((await f.db.query("SELECT * FROM credits")).rows.length, 0);
    assert.equal((await getData(f.client, f.other)).submissions.length, 0);
  } finally {
    await f.db.close();
  }
});
test("semester changes preserve historical credits and immutable event categories", async () => {
  const f = await fixture();
  try {
    const e = (await adminMutation(
      f.client,
      f.admin,
      "admin/events",
      eventInput(f.sem),
    )) as Record<string, string>;
    await checkIn(f.client, f.society, {
      eventId: e.id,
      token: e.checkin_token,
    });
    const next = (await adminMutation(f.client, f.admin, "admin/semesters", {
      name: "Spring 2027",
      startsOn: "2027-01-01",
      endsOn: "2027-06-30",
      current: true,
    })) as { id: string };
    const data = await getData(f.client, f.society);
    assert.equal(data.credits[0].semester_id, f.sem);
    assert.equal(
      data.credits.filter((c) => c.semester_id === next.id).length,
      0,
    );
    await assert.rejects(() =>
      adminMutation(f.client, f.admin, "admin/events", {
        ...eventInput(f.sem, "STANDARD"),
        id: e.id,
      }),
    );
  } finally {
    await f.db.close();
  }
});
