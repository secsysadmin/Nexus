import type { HubData } from "./types";

export function dashboardItems(data: HubData, semesterId: string, now: number) {
  const forms = new Set(
    data.forms.filter((f) => f.semester_id === semesterId).map((f) => f.id),
  );
  const events = new Set(
    data.events.filter((e) => e.semester_id === semesterId).map((e) => e.id),
  );
  const prtSocieties = new Set(
    data.credits
      .filter(
        (c) =>
          events.has(c.event_id) &&
          c.category === "PRT" &&
          !c.revoked_at &&
          c.points >= 1,
      )
      .map((c) => c.account_id),
  );
  const societies = data.accounts.filter(
    (a) => a.role === "society" && a.enabled,
  );
  return {
    pendingReviews: data.submissions
      .filter((s) => forms.has(s.form_id) && s.status === "SUBMITTED")
      .sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at)),
    upcomingEvents: data.events
      .filter(
        (e) => e.semester_id === semesterId && Date.parse(e.ends_at) >= now,
      )
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    missingPrt: societies.filter((a) => !prtSocieties.has(a.id)),
    awaitingSetup: societies.filter((a) => !a.activated),
  };
}
