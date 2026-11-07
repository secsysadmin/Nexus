import type { PoolClient } from "pg";
import { ACCOUNT_STATE_SQL, NEEDS_SETUP_SQL } from "./account-state";
import type { Actor } from "./service";
import { AppError } from "./service";
import { groupSocietyRoster } from "./society-roster";
export const collections = [
  "events",
  "forms",
  "submissions",
  "accounts",
  "roster",
] as const;
export type Collection = (typeof collections)[number];
export async function getPage(
  db: PoolClient,
  actor: Actor,
  kind: Collection,
  offset = 0,
  search = "",
) {
  const admin = actor.role === "admin";
  const values: unknown[] = [offset, "%" + search + "%", actor.id, admin];
  let sql = "";
  if (kind === "roster") {
    if (!admin)
      throw new AppError("SEC administrator access is required.", 403);
    const metadata = (
      await db.query(
        "SELECT id,name,source_timestamp,'{}'::jsonb contacts FROM roster_candidates WHERE account_id IS NULL ORDER BY lower(name),id",
      )
    ).rows;
    let groups = groupSocietyRoster(metadata);
    if (search) {
      const ids = new Set(
        (
          await db.query(
            "SELECT id FROM roster_candidates WHERE account_id IS NULL AND (name ILIKE $1 OR contacts::text ILIKE $1)",
            ["%" + search + "%"],
          )
        ).rows.map((r) => r.id),
      );
      groups = groups.filter(
        (g) =>
          g.responses.some((r) => ids.has(r.id)) ||
          g.name.toLowerCase().includes(search.toLowerCase()),
      );
    }
    const selected = groups.slice(offset, offset + 50);
    const ids = selected.flatMap((g) => g.responses.map((r) => r.id));
    const items = ids.length
      ? (
          await db.query(
            "SELECT * FROM roster_candidates WHERE id=ANY($1::uuid[]) ORDER BY lower(name),source_timestamp DESC",
            [ids],
          )
        ).rows
      : [];
    return {
      items,
      hasMore: groups.length > offset + 50,
      nextOffset: offset + selected.length,
    };
  }
  const eventFields = `id,revision,name,description,location,category,starts_at,ends_at,checkin_starts_at,checkin_ends_at,checkin_open${admin ? ",checkin_token" : ""}`;
  if (kind === "events")
    sql = `SELECT ${eventFields} FROM events WHERE (name ILIKE $2) AND ($4 OR $3::uuid IS NOT NULL) ORDER BY starts_at DESC,id LIMIT 51 OFFSET $1`;
  if (kind === "forms")
    sql =
      "SELECT f.id,f.title,f.description,f.kind,f.published,f.deadline,f.current_version,f.created_at,'[]'::jsonb questions FROM forms f WHERE ($4 OR f.published OR EXISTS(SELECT 1 FROM submissions s WHERE s.form_id=f.id AND s.account_id=$3)) AND f.title ILIKE $2 ORDER BY f.created_at DESC,f.id LIMIT 51 OFFSET $1";
  if (kind === "accounts")
    sql =
      `SELECT id,username,display_name,role,enabled,contacts,contact_revision,${ACCOUNT_STATE_SQL} FROM accounts a WHERE ($4 OR id=$3) AND (display_name ILIKE $2 OR username ILIKE $2) ORDER BY display_name,id LIMIT 51 OFFSET $1`;
  if (kind === "submissions")
    sql =
      "SELECT s.id,s.form_id,s.form_version,s.account_id,s.status,s.review_note,s.revision,s.submitted_at,s.updated_at,s.confirmation_email,'{}'::jsonb answers,'[]'::jsonb questions,a.display_name society_name,f.title form_title,email.id confirmation_email_id,email.status confirmation_status,email.attempts confirmation_attempts,email.kind email_kind FROM submissions s JOIN accounts a ON a.id=s.account_id JOIN forms f ON f.id=s.form_id LEFT JOIN LATERAL(SELECT id,status,attempts,kind FROM application_emails WHERE submission_id=s.id ORDER BY submission_revision DESC LIMIT 1) email ON true WHERE ($4 OR s.account_id=$3) AND (f.title ILIKE $2 OR a.display_name ILIKE $2) ORDER BY s.updated_at DESC,s.id LIMIT 51 OFFSET $1";
  const rows = (await db.query(sql, values)).rows;
  return {
    items: rows.slice(0, 50),
    hasMore: rows.length > 50,
    nextOffset: offset + Math.min(rows.length, 50),
  };
}
export async function getCalendarPage(
  db: PoolClient,
  actor: Actor,
  month: string,
  offset: number,
) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`,
    end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const rows = (
    await db.query(
      `SELECT id,revision,name,description,location,category,starts_at,ends_at,checkin_starts_at,checkin_ends_at,checkin_open${actor.role === "admin" ? ",checkin_token" : ""} FROM events WHERE starts_at<($2::date::timestamp AT TIME ZONE 'America/Chicago') AND ends_at>=($1::date::timestamp AT TIME ZONE 'America/Chicago') ORDER BY starts_at,id LIMIT 51 OFFSET $3`,
      [start, end, offset],
    )
  ).rows;
  return {
    items: rows.slice(0, 50),
    hasMore: rows.length > 50,
    nextOffset: offset + Math.min(rows.length, 50),
  };
}
export async function dashboardSummary(db: PoolClient, actor: Actor) {
  const admin = actor.role === "admin";
  const row = (
    await db.query(
      `
    WITH upcoming AS (
      SELECT id,revision,name,description,location,category,starts_at,ends_at,checkin_starts_at,checkin_ends_at,checkin_open${admin ? ",checkin_token" : ""}
      FROM events WHERE ends_at>=now()
    ), pending AS (
      SELECT s.id,s.form_id,s.account_id,s.submitted_at,s.revision,f.title form_title,a.display_name society_name
      FROM submissions s JOIN forms f ON f.id=s.form_id JOIN accounts a ON a.id=s.account_id WHERE s.status='SUBMITTED' AND $1
    ), active AS (
      SELECT id,username,display_name,role,enabled,'{}'::jsonb contacts,contact_revision,${ACCOUNT_STATE_SQL},
        EXISTS(SELECT 1 FROM credits c WHERE c.account_id=a.id AND c.cycle_id=current_point_cycle_id() AND c.category='PRT' AND c.revoked_at IS NULL) prt_met
      FROM accounts a WHERE role='society' AND enabled AND $1
    )
    SELECT jsonb_build_object(
      'preview',jsonb_build_object(
        'upcomingEvents',(SELECT COALESCE(jsonb_agg(r),'[]'::jsonb) FROM (SELECT * FROM upcoming ORDER BY starts_at,id LIMIT 5) r),
        'pendingReviews',(SELECT COALESCE(jsonb_agg(r),'[]'::jsonb) FROM (SELECT * FROM pending ORDER BY submitted_at,id LIMIT 5) r),
        'missingPrt',(SELECT COALESCE(jsonb_agg(r),'[]'::jsonb) FROM (SELECT * FROM active WHERE NOT prt_met ORDER BY display_name,id LIMIT 5) r),
        'awaitingSetup',(SELECT COALESCE(jsonb_agg(r),'[]'::jsonb) FROM (SELECT * FROM active WHERE ${NEEDS_SETUP_SQL} ORDER BY display_name,id LIMIT 5) r)
      ),
      'counts',jsonb_build_object(
        'upcomingEvents',(SELECT count(*) FROM upcoming),
        'pendingReviews',(SELECT count(*) FROM pending),
        'missingPrt',(SELECT count(*) FROM active WHERE NOT prt_met),
        'awaitingSetup',(SELECT count(*) FROM active WHERE ${NEEDS_SETUP_SQL}),
        'activeSocieties',(SELECT count(*) FROM active)
      )
    ) summary`,
      [admin],
    )
  ).rows[0];
  return row.summary;
}
