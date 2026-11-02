import { type PoolClient } from "pg";
import { z } from "zod";
import { audit } from "./db";
import { digest, token } from "./security";
import {
  questionsSchema,
  validateAnswers,
  pointsFor,
  type Question,
  type Answers,
} from "./domain";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Actor = {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "society";
};
const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(200);
const date = z.string().datetime({ offset: true });
export async function issueActivation(
  db: PoolClient,
  accountId: string,
  actor: string | null,
) {
  const raw = token();
  await db.query("DELETE FROM activation_tokens WHERE account_id=$1", [
    accountId,
  ]);
  await db.query(
    "INSERT INTO activation_tokens VALUES($1,$2,now()+interval '7 days')",
    [digest(raw), accountId],
  );
  await audit(db, actor, "ACCOUNT_ACTIVATION_ISSUED", accountId);
  return raw;
}
export async function checkIn(db: PoolClient, actor: Actor, input: unknown) {
  if (actor.role !== "society")
    throw new AppError("Check in with your society account.", 403);
  const b = z
    .object({ eventId: uuid, token: z.string().length(64) })
    .parse(input);
  const {
    rows: [event],
  } = await db.query(
    "SELECT e.*,s.is_current FROM events e JOIN semesters s ON s.id=e.semester_id WHERE e.id=$1 FOR SHARE OF e,s",
    [b.eventId],
  );
  if (!event || event.checkin_token !== b.token)
    throw new AppError(
      "This check-in link is invalid. Ask SEC for the current link.",
    );
  if (event.category === "HIGH_IMPACT")
    throw new AppError("SEC awards High Impact credit manually.");
  const existing = await db.query(
    "SELECT id,revoked_at FROM credits WHERE account_id=$1 AND event_id=$2",
    [actor.id, event.id],
  );
  if (existing.rowCount) {
    if (existing.rows[0].revoked_at)
      throw new AppError(
        "SEC removed this credit. Contact SEC to request a correction.",
      );
    return { already: true, event: event.name, points: 1 };
  }
  if (
    !event.is_current ||
    !event.checkin_open ||
    Date.now() < new Date(event.starts_at).getTime() ||
    Date.now() > new Date(event.ends_at).getTime()
  )
    throw new AppError("Check-in is closed. Contact SEC if you attended.");
  const inserted = await db.query(
    "INSERT INTO credits(account_id,event_id,category,points,source) VALUES($1,$2,$3,1,'CHECK_IN') ON CONFLICT(account_id,event_id) DO NOTHING RETURNING id",
    [actor.id, event.id, event.category],
  );
  if (inserted.rowCount) await audit(db, actor.id, "EVENT_CHECK_IN", event.id);
  return { already: !inserted.rowCount, event: event.name, points: 1 };
}
export async function saveSubmission(
  db: PoolClient,
  actor: Actor,
  input: unknown,
) {
  if (actor.role !== "society")
    throw new AppError("Applications are submitted by societies.", 403);
  const b = z
    .object({
      formId: uuid,
      answers: z.record(
        z.string(),
        z.union([z.string().max(20000), z.array(z.string().max(200)).max(30)]),
      ),
      submit: z.boolean(),
      revision: z.number().int().nonnegative(),
    })
    .parse(input);
  // Serialize society draft writes, including the first save from multiple officers.
  await db.query("SELECT id FROM accounts WHERE id=$1 FOR UPDATE", [actor.id]);
  const {
    rows: [form],
  } = await db.query("SELECT * FROM forms WHERE id=$1 FOR SHARE", [b.formId]);
  if (
    !form ||
    !form.published ||
    (form.deadline && new Date(form.deadline).getTime() < Date.now())
  )
    throw new AppError("This application is closed. Contact SEC for help.");
  const {
    rows: [existing],
  } = await db.query(
    "SELECT * FROM submissions WHERE form_id=$1 AND account_id=$2",
    [form.id, actor.id],
  );
  if (existing && !["DRAFT", "CHANGES_REQUESTED"].includes(existing.status))
    throw new AppError("This application has already been submitted.", 409);
  if ((existing?.revision ?? 0) !== b.revision)
    throw new AppError(
      "Another officer saved changes. Reload the application before editing.",
      409,
    );
  const version = existing?.form_version ?? form.current_version;
  const {
    rows: [fv],
  } = await db.query(
    "SELECT questions FROM form_versions WHERE form_id=$1 AND version=$2",
    [form.id, version],
  );
  try {
    validateAnswers(fv.questions as Question[], b.answers as Answers, b.submit);
  } catch (e) {
    throw new AppError((e as Error).message);
  }
  const {
    rows: [saved],
  } = await db.query(
    `INSERT INTO submissions(form_id,form_version,account_id,answers,status,submitted_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $6 THEN now() ELSE NULL END)
 ON CONFLICT(form_id,account_id) DO UPDATE SET answers=excluded.answers,status=excluded.status,submitted_at=CASE WHEN $6 THEN now() ELSE submissions.submitted_at END,revision=submissions.revision+1,updated_at=now() RETURNING *`,
    [
      form.id,
      version,
      actor.id,
      JSON.stringify(b.answers),
      b.submit ? "SUBMITTED" : (existing?.status ?? "DRAFT"),
      b.submit,
    ],
  );
  await audit(
    db,
    actor.id,
    b.submit ? "APPLICATION_SUBMITTED" : "APPLICATION_DRAFT_SAVED",
    saved.id,
  );
  return saved;
}
export async function adminMutation(
  db: PoolClient,
  actor: Actor,
  path: string,
  input: unknown,
) {
  if (actor.role !== "admin")
    throw new AppError("SEC administrator access is required.", 403);
  switch (path) {
    case "admin/societies": {
      const b = z
        .object({
          username: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9][a-z0-9._-]{1,39}$/),
          displayName: name,
          candidateIds: z.array(uuid).max(100).default([]),
        })
        .parse(input);
      const candidates = b.candidateIds.length
        ? (
            await db.query(
              "SELECT * FROM roster_candidates WHERE id=ANY($1::uuid[]) ORDER BY created_at,id FOR UPDATE",
              [b.candidateIds],
            )
          ).rows
        : [];
      if (
        candidates.length !== b.candidateIds.length ||
        candidates.some((c) => c.account_id)
      )
        throw new AppError(
          "A selected roster row is already assigned. Refresh the roster.",
        );
      const {
        rows: [account],
      } = await db.query(
        "INSERT INTO accounts(username,display_name,role,contacts) VALUES($1,$2,'society',$3) RETURNING id",
        [
          b.username,
          b.displayName,
          JSON.stringify({
            responses: candidates.map((c) => ({
              name: c.name,
              timestamp: c.source_timestamp,
              ...c.contacts,
            })),
          }),
        ],
      );
      if (b.candidateIds.length)
        await db.query(
          "UPDATE roster_candidates SET account_id=$1 WHERE id=ANY($2::uuid[])",
          [account.id, b.candidateIds],
        );
      return {
        activation: await issueActivation(db, account.id, actor.id),
        username: b.username,
      };
    }
    case "admin/activation": {
      const b = z.object({ accountId: uuid }).parse(input);
      const {
        rows: [account],
      } = await db.query("SELECT username FROM accounts WHERE id=$1", [
        b.accountId,
      ]);
      if (!account) throw new AppError("Account not found.", 404);
      return {
        activation: await issueActivation(db, b.accountId, actor.id),
        username: account.username,
      };
    }
    case "admin/account-status": {
      const b = z
        .object({ accountId: uuid, enabled: z.boolean() })
        .parse(input);
      if (b.accountId === actor.id)
        throw new AppError("You cannot disable your own SEC account.");
      const result = await db.query(
        "UPDATE accounts SET enabled=$1 WHERE id=$2 AND role='society' RETURNING id",
        [b.enabled, b.accountId],
      );
      if (!result.rowCount) throw new AppError("Society not found.", 404);
      await db.query("DELETE FROM sessions WHERE account_id=$1", [b.accountId]);
      await audit(db, actor.id, "SOCIETY_STATUS_CHANGED", b.accountId, {
        enabled: b.enabled,
      });
      return { ok: true };
    }
    case "admin/semesters": {
      const b = z
        .object({
          name,
          startsOn: z.string().date(),
          endsOn: z.string().date(),
          current: z.boolean(),
        })
        .refine((x) => x.endsOn >= x.startsOn, {
          message: "Semester end must follow its start.",
        })
        .parse(input);
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext(current_schema()||'semesters'))",
      );
      if (b.current)
        await db.query(
          "UPDATE semesters SET is_current=false WHERE is_current",
        );
      const {
        rows: [s],
      } = await db.query(
        "INSERT INTO semesters(name,starts_on,ends_on,is_current) VALUES($1,$2,$3,$4) RETURNING *",
        [b.name, b.startsOn, b.endsOn, b.current],
      );
      await audit(db, actor.id, "SEMESTER_CREATED", s.id);
      return s;
    }
    case "admin/current-semester": {
      const b = z.object({ id: uuid }).parse(input);
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext(current_schema()||'semesters'))",
      );
      if (
        !(await db.query("SELECT id FROM semesters WHERE id=$1", [b.id]))
          .rowCount
      )
        throw new AppError("Semester not found.", 404);
      await db.query("UPDATE semesters SET is_current=false WHERE is_current");
      await db.query("UPDATE semesters SET is_current=true WHERE id=$1", [
        b.id,
      ]);
      await audit(db, actor.id, "CURRENT_SEMESTER_CHANGED", b.id);
      return { ok: true };
    }
    case "admin/events": {
      const b = z
        .object({
          id: uuid.optional(),
          semesterId: uuid,
          name,
          description: z.string().max(5000),
          location: z.string().max(300),
          category: z.enum(["PRT", "STANDARD", "HIGH_IMPACT"]),
          startsAt: date,
          endsAt: date,
          checkinOpen: z.boolean(),
        })
        .refine((x) => new Date(x.endsAt) > new Date(x.startsAt), {
          message: "Check-in end must follow its start.",
        })
        .parse(input);
      if (b.id) {
        const {
          rows: [old],
        } = await db.query("SELECT * FROM events WHERE id=$1 FOR UPDATE", [
          b.id,
        ]);
        if (!old) throw new AppError("Event not found.", 404);
        if (old.semester_id !== b.semesterId || old.category !== b.category)
          throw new AppError(
            "Semester and category cannot change. Create a new event instead.",
          );
        await db.query(
          "UPDATE events SET name=$1,description=$2,location=$3,starts_at=$4,ends_at=$5,checkin_open=$6 WHERE id=$7",
          [
            b.name,
            b.description,
            b.location,
            b.startsAt,
            b.endsAt,
            b.category === "HIGH_IMPACT" ? false : b.checkinOpen,
            b.id,
          ],
        );
        await audit(db, actor.id, "EVENT_UPDATED", b.id);
        return { ok: true };
      }
      const {
        rows: [event],
      } = await db.query(
        "INSERT INTO events(semester_id,name,description,location,category,starts_at,ends_at,checkin_open,checkin_token,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          b.semesterId,
          b.name,
          b.description,
          b.location,
          b.category,
          b.startsAt,
          b.endsAt,
          b.category === "HIGH_IMPACT" ? false : b.checkinOpen,
          token(),
          actor.id,
        ],
      );
      await audit(db, actor.id, "EVENT_CREATED", event.id);
      return event;
    }
    case "admin/event-checkin": {
      const b = z
        .object({
          id: uuid,
          open: z.boolean(),
          rotate: z.boolean().default(false),
        })
        .parse(input);
      const result = await db.query(
        "UPDATE events SET checkin_open=$1,checkin_token=CASE WHEN $2 THEN $3 ELSE checkin_token END WHERE id=$4 AND category!='HIGH_IMPACT' RETURNING id",
        [b.open, b.rotate, token(), b.id],
      );
      if (!result.rowCount)
        throw new AppError("Check-in event not found.", 404);
      await audit(db, actor.id, "EVENT_CHECKIN_CHANGED", b.id, {
        open: b.open,
        rotated: b.rotate,
      });
      return { ok: true };
    }
    case "admin/credits": {
      const b = z
        .object({
          eventId: uuid,
          accountId: uuid,
          note: z.string().trim().min(1).max(2000),
        })
        .parse(input);
      const {
        rows: [event],
      } = await db.query(
        "SELECT * FROM events WHERE id=$1 AND category='HIGH_IMPACT' FOR SHARE",
        [b.eventId],
      );
      if (!event) throw new AppError("Choose a High Impact event.");
      if (
        !(
          await db.query(
            "SELECT id FROM accounts WHERE id=$1 AND role='society' AND enabled",
            [b.accountId],
          )
        ).rowCount
      )
        throw new AppError("Choose an active society.");
      const {
        rows: [credit],
      } = await db.query(
        "INSERT INTO credits(account_id,event_id,category,points,source,awarded_by,note) VALUES($1,$2,'HIGH_IMPACT',$3,'MANUAL',$4,$5) RETURNING *",
        [b.accountId, event.id, pointsFor(event.category), actor.id, b.note],
      );
      await audit(db, actor.id, "HIGH_IMPACT_AWARDED", credit.id, {
        note: b.note,
      });
      return credit;
    }
    case "admin/credit-status": {
      const b = z
        .object({
          id: uuid,
          revoke: z.boolean(),
          note: z.string().trim().min(1).max(2000),
        })
        .parse(input);
      const r = await db.query(
        "UPDATE credits SET revoked_at=CASE WHEN $1 THEN now() ELSE NULL END WHERE id=$2 RETURNING id",
        [b.revoke, b.id],
      );
      if (!r.rowCount) throw new AppError("Credit not found.", 404);
      await audit(
        db,
        actor.id,
        b.revoke ? "CREDIT_REVOKED" : "CREDIT_RESTORED",
        b.id,
        { note: b.note },
      );
      return { ok: true };
    }
    case "admin/forms": {
      const b = z
        .object({
          id: uuid.optional(),
          semesterId: uuid,
          title: name,
          description: z.string().max(5000),
          kind: z.enum(["FUNDING", "HIGH_IMPACT"]),
          published: z.boolean(),
          deadline: date.nullable(),
          questions: questionsSchema,
        })
        .parse(input);
      let id = b.id,
        version = 1;
      if (id) {
        const {
          rows: [f],
        } = await db.query("SELECT * FROM forms WHERE id=$1 FOR UPDATE", [id]);
        if (!f) throw new AppError("Application not found.", 404);
        if (f.semester_id !== b.semesterId || f.kind !== b.kind)
          throw new AppError("Application semester and type cannot change.");
        version = f.current_version + 1;
        await db.query(
          "UPDATE forms SET title=$1,description=$2,published=$3,deadline=$4,current_version=$5 WHERE id=$6",
          [b.title, b.description, b.published, b.deadline, version, id],
        );
      } else {
        const {
          rows: [f],
        } = await db.query(
          "INSERT INTO forms(semester_id,title,description,kind,published,deadline,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
          [
            b.semesterId,
            b.title,
            b.description,
            b.kind,
            b.published,
            b.deadline,
            actor.id,
          ],
        );
        id = f.id;
      }
      await db.query(
        "INSERT INTO form_versions(form_id,version,questions) VALUES($1,$2,$3)",
        [id, version, JSON.stringify(b.questions)],
      );
      await audit(db, actor.id, "APPLICATION_FORM_SAVED", id!, {
        version,
        published: b.published,
      });
      return { id, version };
    }
    case "admin/review": {
      const b = z
        .object({
          id: uuid,
          status: z.enum([
            "UNDER_REVIEW",
            "CHANGES_REQUESTED",
            "APPROVED",
            "DENIED",
          ]),
          note: z.string().max(5000),
          revision: z.number().int().positive(),
        })
        .parse(input);
      if (b.status === "CHANGES_REQUESTED" && !b.note.trim())
        throw new AppError("Explain the requested changes.");
      const {
        rows: [s],
      } = await db.query(
        "UPDATE submissions SET status=$1,review_note=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND status!='DRAFT' AND revision=$4 RETURNING id",
        [b.status, b.note, b.id, b.revision],
      );
      if (!s)
        throw new AppError("Submission changed. Reload before reviewing.", 409);
      await audit(db, actor.id, "APPLICATION_REVIEWED", b.id, {
        status: b.status,
      });
      return { ok: true };
    }
    case "admin/allowlist": {
      const b = z
        .object({
          email: z
            .string()
            .trim()
            .toLowerCase()
            .email()
            .refine((x) => x.endsWith("@tamu.edu")),
          remove: z.boolean(),
        })
        .parse(input);
      if (b.remove)
        await db.query("DELETE FROM admin_allowlist WHERE email=$1", [b.email]);
      else
        await db.query(
          "INSERT INTO admin_allowlist(email) VALUES($1) ON CONFLICT DO NOTHING",
          [b.email],
        );
      await audit(db, actor.id, "FUTURE_ADMIN_ALLOWLIST_CHANGED", null, {
        email: b.email,
        removed: b.remove,
      });
      return { ok: true };
    }
    default:
      throw new AppError("Action not found.", 404);
  }
}
