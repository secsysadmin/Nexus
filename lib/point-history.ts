import type { Credit, Semester } from "./types";
export const pointCategories = ["PRT", "STANDARD", "HIGH_IMPACT"] as const;
export type PointCategory = (typeof pointCategories)[number];
const monthNumber = (key: string) =>
  Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
function recordedMonth(date: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Chicago",
  }).formatToParts(new Date(date));
  return monthNumber(
    `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`,
  );
}
export function pointHistory(
  credits: Credit[],
  semester: Semester,
  accountId: string,
  now = Date.now(),
) {
  const valid = credits.filter(
    (c) =>
      c.account_id === accountId &&
      c.semester_id === semester.id &&
      !c.revoked_at,
  );
  const recorded = valid.map((c) => ({
    credit: c,
    month: recordedMonth(c.created_at),
  }));
  const start = Math.min(
    monthNumber(semester.starts_on),
    ...recorded.map((r) => r.month),
  );
  const end = Math.max(
    monthNumber(semester.ends_on),
    ...recorded.map((r) => r.month),
  );
  const lastIndex = Math.max(
    Math.min(recordedMonth(new Date(now).toISOString()), end) - start,
    ...recorded.map((r) => r.month - start),
    -1,
  );
  const running = { PRT: 0, STANDARD: 0, HIGH_IMPACT: 0 };
  const months = Array.from({ length: end - start + 1 }, (_, i) => {
    const date = new Date(
      Date.UTC(Math.floor((start + i) / 12), (start + i) % 12, 1),
    );
    const earned = { PRT: 0, STANDARD: 0, HIGH_IMPACT: 0 };
    recorded
      .filter((r) => r.month === start + i)
      .forEach(({ credit: c }) => {
        earned[c.category] += c.points;
        running[c.category] += c.points;
      });
    return {
      key: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
      shortLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      earned,
      totals: { ...running },
    };
  });
  return {
    months,
    lastIndex,
    totals: { ...running },
    eventCount: valid.length,
  };
}
