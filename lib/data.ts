import { type PoolClient } from "pg";
import type { Actor } from "./service";
export async function getData(db: PoolClient, actor: Actor) {
  const admin = actor.role === "admin";
  const semesters = (
    await db.query("SELECT * FROM semesters ORDER BY starts_on DESC")
  ).rows;
  const events = (
    await db.query(
      `SELECT id,semester_id,name,description,location,category,starts_at,ends_at,checkin_open${admin ? ",checkin_token" : ""} FROM events ORDER BY starts_at DESC`,
    )
  ).rows;
  const credits = (
    await db.query(
      `SELECT c.*,e.name event_name,e.semester_id,a.display_name society_name FROM credits c JOIN events e ON e.id=c.event_id JOIN accounts a ON a.id=c.account_id ${admin ? "" : "WHERE c.account_id=$1"} ORDER BY c.created_at DESC`,
      admin ? [] : [actor.id],
    )
  ).rows;
  const forms = (
    await db.query(
      `SELECT f.*,v.questions FROM forms f JOIN form_versions v ON v.form_id=f.id AND v.version=f.current_version ${admin ? "" : "WHERE f.published OR EXISTS(SELECT 1 FROM submissions s WHERE s.form_id=f.id AND s.account_id=$1)"} ORDER BY f.created_at DESC`,
      admin ? [] : [actor.id],
    )
  ).rows;
  const submissions = (
    await db.query(
      `SELECT s.*,v.questions,a.display_name society_name,f.title form_title,email.id confirmation_email_id,email.status confirmation_status,email.attempts confirmation_attempts FROM submissions s JOIN form_versions v ON v.form_id=s.form_id AND v.version=s.form_version JOIN accounts a ON a.id=s.account_id JOIN forms f ON f.id=s.form_id LEFT JOIN LATERAL (SELECT id,status,attempts FROM application_emails WHERE submission_id=s.id ORDER BY submission_revision DESC LIMIT 1) email ON true ${admin ? "" : "WHERE s.account_id=$1"} ORDER BY s.updated_at DESC`,
      admin ? [] : [actor.id],
    )
  ).rows;
  const accounts = (
    await db.query(
      `SELECT id,username,display_name,role,enabled,contacts,(password_hash IS NOT NULL) activated FROM accounts ${admin ? "" : "WHERE id=$1"} ORDER BY display_name`,
      admin ? [] : [actor.id],
    )
  ).rows;
  const roster = admin
    ? (
        await db.query(
          "SELECT * FROM roster_candidates WHERE account_id IS NULL ORDER BY lower(name),source_timestamp DESC",
        )
      ).rows
    : [];
  const audit = admin
    ? (
        await db.query(
          "SELECT l.*,a.username actor_name FROM audit_log l LEFT JOIN accounts a ON a.id=l.actor_id ORDER BY l.created_at DESC LIMIT 100",
        )
      ).rows
    : [];
  const allowlist = admin
    ? (await db.query("SELECT email FROM admin_allowlist ORDER BY email")).rows
    : [];
  return {
    actor,
    semesters,
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
