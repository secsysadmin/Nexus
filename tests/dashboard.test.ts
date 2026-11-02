import test from "node:test";
import assert from "node:assert/strict";
import { dashboardItems } from "../lib/dashboard";
import type { HubData } from "../lib/types";
const now = Date.parse("2026-11-02T20:00:00Z");
function fixture(): HubData {
  return {
    accounts: [
      { id: "met", role: "society", enabled: true, activated: true },
      { id: "revoked", role: "society", enabled: true, activated: true },
      { id: "new", role: "society", enabled: true, activated: false },
      { id: "disabled", role: "society", enabled: false, activated: false },
      { id: "sec", role: "admin", enabled: true, activated: false },
    ],
    events: [
      {
        id: "prt",
        semester_id: "fall",
        starts_at: "2026-11-02T19:00:00Z",
        ends_at: "2026-11-02T21:00:00Z",
      },
      {
        id: "future",
        semester_id: "fall",
        starts_at: "2026-11-03T19:00:00Z",
        ends_at: "2026-11-03T21:00:00Z",
      },
      {
        id: "ended",
        semester_id: "fall",
        starts_at: "2026-11-01T19:00:00Z",
        ends_at: "2026-11-01T21:00:00Z",
      },
      {
        id: "old",
        semester_id: "spring",
        starts_at: "2026-11-03T19:00:00Z",
        ends_at: "2026-11-03T21:00:00Z",
      },
    ],
    credits: [
      {
        account_id: "met",
        event_id: "prt",
        category: "PRT",
        points: 1,
        revoked_at: null,
      },
      {
        account_id: "revoked",
        event_id: "prt",
        category: "PRT",
        points: 1,
        revoked_at: "2026-11-02",
      },
      {
        account_id: "new",
        event_id: "old",
        category: "PRT",
        points: 1,
        revoked_at: null,
      },
      {
        account_id: "revoked",
        event_id: "prt",
        category: "STANDARD",
        points: 1,
        revoked_at: null,
      },
    ],
    forms: [
      { id: "fall-form", semester_id: "fall" },
      { id: "spring-form", semester_id: "spring" },
    ],
    submissions: [
      {
        id: "later",
        form_id: "fall-form",
        status: "SUBMITTED",
        submitted_at: "2026-11-02T10:00:00Z",
      },
      {
        id: "first",
        form_id: "fall-form",
        status: "SUBMITTED",
        submitted_at: "2026-11-01T10:00:00Z",
      },
      { id: "draft", form_id: "fall-form", status: "DRAFT" },
      { id: "approved", form_id: "fall-form", status: "APPROVED" },
      { id: "other", form_id: "spring-form", status: "SUBMITTED" },
    ],
  } as HubData;
}
test("dashboard prioritizes oldest submitted applications in the selected semester and future/ongoing events", () => {
  const result = dashboardItems(fixture(), "fall", now);
  assert.deepEqual(
    result.pendingReviews.map((s) => s.id),
    ["first", "later"],
  );
  assert.deepEqual(
    result.upcomingEvents.map((e) => e.id),
    ["prt", "future"],
  );
});
test("PRT follow-up excludes disabled/admin accounts and ignores revoked, wrong-category, and other-semester credit", () => {
  const result = dashboardItems(fixture(), "fall", now);
  assert.deepEqual(
    result.missingPrt.map((a) => a.id),
    ["revoked", "new"],
  );
  assert.deepEqual(
    result.awaitingSetup.map((a) => a.id),
    ["new"],
  );
  assert.deepEqual(
    dashboardItems(fixture(), "spring", now).awaitingSetup.map((a) => a.id),
    ["new"],
  );
});
