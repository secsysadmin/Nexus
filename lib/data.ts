import { type PoolClient } from "pg";
import type { Actor } from "./service";
import { operationalHealth } from "./observability";
import { getPage, dashboardSummary, type Collection } from "./data-pages";
import { outboxHealth } from "./email-outbox";
export async function getData(
  db: PoolClient,
  actor: Actor,
  options: { compact: boolean; view?: string } = { compact: false },
) {
  const admin = actor.role === "admin";
  const pagination: Record<string, { hasMore: boolean; nextOffset: number }> =
    {};
  const page = async (kind: Collection) => {
    const result = await getPage(db, actor, kind);
    pagination[kind] = {
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
    };
    return result.items;
  };
  const {
    rows: [pointCycle],
  } = await db.query(
    "SELECT id,started_at,ended_at,is_current FROM point_cycles WHERE is_current",
  );
  const events = options.compact
    ? await page("events")
    : (
        await db.query(
          `SELECT id,revision,name,description,location,category,starts_at,ends_at,checkin_starts_at,checkin_ends_at,checkin_open${admin ? ",checkin_token" : ""} FROM events ORDER BY starts_at DESC`,
        )
      ).rows;
  const credits = (
    await db.query(
      `SELECT c.*,e.name event_name,a.display_name society_name FROM credits c JOIN events e ON e.id=c.event_id JOIN accounts a ON a.id=c.account_id ${options.compact ? `WHERE c.cycle_id=current_point_cycle_id()${admin ? "" : " AND c.account_id=$1"}` : admin ? "" : "WHERE c.account_id=$1"} ORDER BY c.created_at DESC`,
      admin ? [] : [actor.id],
    )
  ).rows;
  const forms = options.compact
    ? await page("forms")
    : (
        await db.query(
          `SELECT f.id,f.title,f.description,f.kind,f.published,f.deadline,f.current_version,f.created_at,${options.compact ? "'[]'::jsonb questions" : "v.questions"} FROM forms f JOIN form_versions v ON v.form_id=f.id AND v.version=f.current_version ${admin ? "" : "WHERE f.published OR EXISTS(SELECT 1 FROM submissions s WHERE s.form_id=f.id AND s.account_id=$1)"} ORDER BY f.created_at DESC`,
          admin ? [] : [actor.id],
        )
      ).rows;
  const submissions = options.compact
    ? await page("submissions")
    : (
        await db.query(
          `SELECT ${options.compact ? "s.id,s.form_id,s.form_version,s.account_id,s.status,s.review_note,s.revision,s.submitted_at,s.updated_at,s.confirmation_email,'{}'::jsonb answers,'[]'::jsonb questions" : "s.*,v.questions"},a.display_name society_name,f.title form_title,email.id confirmation_email_id,email.status confirmation_status,email.attempts confirmation_attempts,email.kind email_kind FROM submissions s JOIN form_versions v ON v.form_id=s.form_id AND v.version=s.form_version JOIN accounts a ON a.id=s.account_id JOIN forms f ON f.id=s.form_id LEFT JOIN LATERAL (SELECT id,status,attempts,kind FROM application_emails WHERE submission_id=s.id ORDER BY submission_revision DESC LIMIT 1) email ON true ${admin ? "" : "WHERE s.account_id=$1"} ORDER BY s.updated_at DESC`,
          admin ? [] : [actor.id],
        )
      ).rows;
  const accounts = options.compact
    ? await page("accounts")
    : (
        await db.query(
          `SELECT id,username,display_name,role,enabled,contacts,contact_revision,(password_hash IS NOT NULL) activated FROM accounts ${admin ? "" : "WHERE id=$1"} ORDER BY display_name`,
          admin ? [] : [actor.id],
        )
      ).rows;
  const roster =
    admin && (!options.compact || !options.view || options.view === "societies")
      ? options.compact
        ? await page("roster")
        : (
            await db.query(
              "SELECT * FROM roster_candidates WHERE account_id IS NULL ORDER BY lower(name),source_timestamp DESC",
            )
          ).rows
      : [];
  const audit =
    admin && (!options.compact || !options.view || options.view === "settings")
      ? (
          await db.query(
            "SELECT l.*,a.username actor_name FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_id ORDER BY l.created_at DESC LIMIT 100",
          )
        ).rows
      : [];
  const allowlist =
    admin && (!options.compact || !options.view || options.view === "settings")
      ? (await db.query("SELECT email FROM admin_allowlist ORDER BY email"))
          .rows
      : [];
  const historyCount = options.compact
    ? (
        await db.query(
          `SELECT count(*)::int count FROM credits WHERE cycle_id!=current_point_cycle_id()${admin ? "" : " AND account_id=$1"}`,
          admin ? [] : [actor.id],
        )
      ).rows[0].count
    : credits.filter((c) => c.cycle_id !== pointCycle.id).length;
  const summary = options.compact
    ? await dashboardSummary(db, actor)
    : undefined;
  return {
    operations: admin ? await operationalHealth(db) : undefined,
    pagination: options.compact ? pagination : undefined,
    dashboardPreview: summary?.preview,
    dashboardCounts: summary?.counts,
    outboxHealth: admin ? await outboxHealth(db) : undefined,
    historyCount,
    actor,
    pointCycle,
    events,
    credits,
    forms,
    submissions,
    accounts,
    roster,
    audit,
    allowlist,
    environment:
      process.env.DATABASE_SCHEMA === "nexus_prod"
        ? "production"
        : "development",
  };
}

export async function getFormDetail(db: PoolClient, actor: Actor, id: string) {
  const {
    rows: [form],
  } = await db.query(
    `SELECT f.id,f.title,f.description,f.kind,f.published,f.deadline,f.current_version,f.created_at,v.questions FROM forms f JOIN form_versions v ON v.form_id=f.id AND v.version=f.current_version WHERE f.id=$1 AND ($2 OR f.published OR EXISTS(SELECT 1 FROM submissions s WHERE s.form_id=f.id AND s.account_id=$3))`,
    [id, actor.role === "admin", actor.id],
  );
  if (!form) return null;
  const submissionId = (
    await db.query(
      "SELECT id FROM submissions WHERE form_id=$1 AND account_id=$2",
      [id, actor.id],
    )
  ).rows[0]?.id;
  const submission = submissionId
    ? await getSubmissionDetail(db, actor, submissionId)
    : undefined;
  return { form, submission };
}
export async function getSubmissionDetail(
  db: PoolClient,
  actor: Actor,
  id: string,
) {
  return (
    (
      await db.query(
        `SELECT s.*,v.questions,f.title form_title,a.display_name society_name,email.id confirmation_email_id,email.status confirmation_status,email.attempts confirmation_attempts,email.kind email_kind FROM submissions s JOIN form_versions v ON v.form_id=s.form_id AND v.version=s.form_version JOIN forms f ON f.id=s.form_id JOIN accounts a ON a.id=s.account_id LEFT JOIN LATERAL(SELECT id,status,attempts,kind FROM application_emails WHERE submission_id=s.id ORDER BY submission_revision DESC LIMIT 1) email ON true WHERE s.id=$1 AND ($2 OR s.account_id=$3)`,
        [id, actor.role === "admin", actor.id],
      )
    ).rows[0] ?? null
  );
}
export async function getHistory(db: PoolClient, actor: Actor, offset: number) {
  const rows = (
    await db.query(
      `SELECT c.*,e.name event_name,a.display_name society_name FROM credits c JOIN events e ON e.id=c.event_id JOIN accounts a ON a.id=c.account_id WHERE c.cycle_id!=current_point_cycle_id()${actor.role === "admin" ? "" : " AND c.account_id=$2"} ORDER BY c.created_at DESC,c.id DESC LIMIT 51 OFFSET $1`,
      actor.role === "admin" ? [offset] : [offset, actor.id],
    )
  ).rows;
  return { items: rows.slice(0, 50), hasMore: rows.length > 50 };
}
