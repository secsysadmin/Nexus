import test from "node:test";
import assert from "node:assert/strict";
import { checkinStatus } from "../lib/checkin-status";
test("check-in distinguishes paused, scheduled, open, and ended without promising access outside its dates", () => {
  const e = {
    checkin_open: true,
    starts_at: "2026-11-03T15:00:00Z",
    ends_at: "2026-11-03T17:00:00Z",
  };
  assert.equal(
    checkinStatus(e, Date.parse("2026-11-03T14:00:00Z")),
    "SCHEDULED",
  );
  assert.equal(
    checkinStatus(e, Date.parse("2026-11-03T16:00:00Z")),
    "OPEN",
  );
  assert.equal(checkinStatus(e, Date.parse(e.ends_at)), "ENDED");
  assert.equal(
    checkinStatus(
      { ...e, checkin_open: false },
      Date.parse("2026-11-03T16:00:00Z"),
    ),
    "PAUSED",
  );
});
