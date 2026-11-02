import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDays,
  centralDay,
  eventsOnDay,
  shiftDay,
  shiftMonth,
} from "../lib/event-calendar";
import type { Event } from "../lib/types";
test("calendar handles leap years, week padding, and year boundaries without local timezone drift", () => {
  const days = calendarDays("2024-02");
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days[4], "2024-02-01");
  assert.equal(days.length % 7, 0);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftDay("2026-11-01", -1), "2026-10-31");
});
test("event calendar includes multi-day check-in windows using Central dates across DST", () => {
  const event = {
    id: "event",
    starts_at: "2026-11-02T05:30:00Z",
    ends_at: "2026-11-03T01:00:00Z",
  } as Event;
  assert.equal(centralDay(event.starts_at), "2026-11-01");
  assert.equal(eventsOnDay([event], "2026-11-01").length, 1);
  assert.equal(eventsOnDay([event], "2026-11-02").length, 1);
  assert.equal(eventsOnDay([event], "2026-11-03").length, 0);
});
