import test from "node:test";
import assert from "node:assert/strict";
import { pointTotals } from "../lib/points";
import type { Credit } from "../lib/types";
test("totals scope to society and current cycle, excluding revoked records", () => {
  const base = {
    account_id: "own",
    cycle_id: "current",
    category: "PRT",
    points: 1,
    revoked_at: null,
  };
  const credits = [
    base,
    { ...base, category: "HIGH_IMPACT", points: 2 },
    { ...base, account_id: "other" },
    { ...base, cycle_id: "old" },
    { ...base, revoked_at: "2026-11-01" },
  ] as Credit[];
  assert.deepEqual(pointTotals(credits, "current", "own"), {
    PRT: 1,
    STANDARD: 0,
    HIGH_IMPACT: 2,
  });
  assert.deepEqual(pointTotals([], "current", "own"), {
    PRT: 0,
    STANDARD: 0,
    HIGH_IMPACT: 0,
  });
});
