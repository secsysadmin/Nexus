import test from "node:test";
import assert from "node:assert/strict";
import { pointHistory } from "../lib/point-history";
import type { Credit, Semester } from "../lib/types";
const semester: Semester = {
  id: "fall",
  name: "Fall 2026",
  starts_on: "2026-07-01",
  ends_on: "2026-12-31",
  is_current: true,
};
const credit = (patch: Partial<Credit> = {}): Credit => ({
  id: "credit",
  account_id: "own",
  event_id: "event",
  event_name: "Event",
  semester_id: "fall",
  category: "PRT",
  points: 1,
  source: "CHECK_IN",
  created_at: "2026-09-15T20:00:00Z",
  revoked_at: null,
  society_name: "Society",
  note: "",
  ...patch,
});
test("history uses Central recording month, scopes account/semester, and excludes removed credit", () => {
  const h = pointHistory(
    [
      credit(),
      credit({
        category: "HIGH_IMPACT",
        points: 2,
        created_at: "2026-11-01T00:30:00Z",
      }),
      credit({ account_id: "other" }),
      credit({ semester_id: "spring" }),
      credit({ revoked_at: "2026-10-01" }),
    ],
    semester,
    "own",
    Date.parse("2026-11-02T20:00:00Z"),
  );
  assert.deepEqual(h.totals, { PRT: 1, STANDARD: 0, HIGH_IMPACT: 2 });
  assert.equal(h.eventCount, 2);
  assert.deepEqual(h.months.find((m) => m.key === "2026-10")!.earned, {
    PRT: 0,
    STANDARD: 0,
    HIGH_IMPACT: 2,
  });
  assert.equal(h.months.find((m) => m.key === "2026-09")!.totals.PRT, 1);
  assert.equal(h.lastIndex, 4);
});
test("empty current/future semesters have zero totals and do not project values into future months", () => {
  const h = pointHistory(
    [],
    semester,
    "own",
    Date.parse("2026-11-02T20:00:00Z"),
  );
  assert.equal(h.months.length, 6);
  assert.equal(h.lastIndex, 4);
  assert.deepEqual(h.totals, { PRT: 0, STANDARD: 0, HIGH_IMPACT: 0 });
  assert.equal(
    pointHistory([], semester, "own", Date.parse("2026-06-01T20:00:00Z"))
      .lastIndex,
    -1,
  );
});
test("late SEC credits remain included and extend the history without losing semester totals", () => {
  const h = pointHistory(
    [
      credit({
        created_at: "2027-01-10T20:00:00Z",
        category: "HIGH_IMPACT",
        points: 2,
      }),
    ],
    semester,
    "own",
    Date.parse("2027-01-11T20:00:00Z"),
  );
  assert.equal(h.months.at(-1)!.key, "2027-01");
  assert.equal(h.totals.HIGH_IMPACT, 2);
  assert.equal(h.lastIndex, 6);
});
