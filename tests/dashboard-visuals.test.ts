import test from "node:test";
import assert from "node:assert/strict";
import { pointActivity } from "../lib/dashboard-visuals";
import type { Credit } from "../lib/types";
test("dashboard charts use current, non-revoked awards and bounded weekly buckets", () => {
  const now = Date.parse("2026-11-03T18:00:00Z");
  const credit = (overrides: Partial<Credit>) =>
    ({
      cycle_id: "current",
      category: "PRT",
      points: 1,
      created_at: new Date(now).toISOString(),
      revoked_at: null,
      ...overrides,
    }) as Credit;
  const result = pointActivity(
    [
      credit({}),
      credit({ category: "HIGH_IMPACT", points: 2 }),
      credit({ cycle_id: "old", points: 50 }),
      credit({ revoked_at: "2026-11-03", points: 50 }),
      credit({
        created_at: new Date(now + 1).toISOString(),
        category: "STANDARD",
      }),
      credit({
        created_at: new Date(now - 60 * 86400000).toISOString(),
        category: "STANDARD",
      }),
    ],
    "current",
    now,
  );
  assert.equal(result.weeks.length, 8);
  assert.equal(result.weeks[7].points, 3);
  assert.equal(result.weeks[7].checkins, 2);
  assert.equal(
    result.weeks.reduce((n, w) => n + w.points, 0),
    3,
  );
  assert.deepEqual(result.categories, [1, 2, 2]);
});
