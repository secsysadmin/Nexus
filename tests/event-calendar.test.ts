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

test("weekly spans cover a window once, continue across weeks, and keep overlapping events in separate lanes", async () => {
  const { calendarWeekSpans } = await import("../lib/event-calendar");
  const event = (id: string, start: string, end: string) =>
    ({
      id,
      starts_at: start + "T18:00:00Z",
      ends_at: end + "T18:00:00Z",
    }) as Event;
  const events = [
    event("long", "2026-10-30", "2026-11-09"),
    event("overlap", "2026-11-02", "2026-11-03"),
    event("later", "2026-11-05", "2026-11-06"),
  ];
  const days = calendarDays("2026-11");
  const first = calendarWeekSpans(events, days.slice(0, 7));
  assert.equal(first.length, 3);
  const long = first.find((s) => s.event.id === "long")!;
  assert.deepEqual(
    [
      long.startColumn,
      long.endColumn,
      long.continuesBefore,
      long.continuesAfter,
    ],
    [0, 6, true, true],
  );
  assert.notEqual(first[0].lane, first[1].lane);
  assert.equal(first[1].lane, first[2].lane);
  const next = calendarWeekSpans(events, days.slice(7, 14));
  assert.equal(next.length, 1);
  assert.deepEqual(
    [
      next[0].startColumn,
      next[0].endColumn,
      next[0].continuesBefore,
      next[0].continuesAfter,
    ],
    [0, 1, true, false],
  );
  const partial = calendarWeekSpans(
    [event("end", "2026-11-30", "2026-12-02")],
    days.slice(-7),
  );
  assert.deepEqual(
    [partial[0].startColumn, partial[0].endColumn, partial[0].continuesAfter],
    [1, 1, true],
  );
});
