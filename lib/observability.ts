import type { PoolClient } from "pg";
import { digest } from "./security";
export function metricRoute(path: string) {
  const clean = path.split("?")[0].replace(/^\/api\//, "");
  if (/^(forms|submissions)\/[a-f\d-]{36}$/i.test(clean))
    return clean.split("/")[0] + "/:id";
  if (clean.startsWith("collections/")) return "collections";
  const allowed = [
    "data",
    "health",
    "readiness",
    "cron/maintenance",
    "auth/login",
    "auth/activate",
    "auth/logout",
    "auth/password",
    "checkin",
    "submissions/save",
    "accounts/contacts",
    "events/calendar",
    "activity/history",
    "admin/events",
    "admin/review",
    "admin/forms",
    "admin/credits",
    "admin/reset-points",
    "telemetry",
    "framework",
  ];
  return allowed.includes(clean) ? clean : "other";
}
export async function recordMetric(
  db: PoolClient,
  input: {
    route: string;
    status: number;
    durationMs: number;
    kind: "request" | "client_error" | "server_error";
    fingerprint?: string;
  },
) {
  await db.query(
    "INSERT INTO operational_metrics(route,status,duration_ms,kind,fingerprint)VALUES($1,$2,$3,$4,$5)",
    [
      metricRoute(input.route),
      input.status,
      Math.max(0, Math.min(60000, Math.round(input.durationMs))),
      input.kind,
      input.fingerprint ? digest(input.fingerprint).slice(0, 24) : null,
    ],
  );
}
export async function operationalHealth(db: PoolClient) {
  return (
    await db.query(
      "SELECT count(*) FILTER(WHERE kind='server_error' OR status>=500)::int errors,count(*) FILTER(WHERE kind='client_error')::int client_errors,count(*) FILTER(WHERE kind='request')::int sampled_requests,COALESCE(percentile_cont(0.95) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE kind='request'),0)::int p95_ms FROM operational_metrics WHERE created_at>now()-interval '1 hour'",
    )
  ).rows[0];
}
