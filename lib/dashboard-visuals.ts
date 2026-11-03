import type { Credit } from "./types";
export function pointActivity(credits: Credit[], cycleId: string, now: number) {
  const day = 86400000;
  // Rolling seven-day buckets avoid locale/DST boundary ambiguity.
  const end = now + 1;
  const start = end - 56 * day;
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    start: start + i * 7 * day,
    points: 0,
    checkins: 0,
  }));
  const categories = [0, 0, 0];
  for (const credit of credits) {
    if (credit.revoked_at || credit.cycle_id !== cycleId) continue;
    const category = ["PRT", "STANDARD", "HIGH_IMPACT"].indexOf(
      credit.category,
    );
    if (category >= 0) categories[category] += credit.points;
    const at = Date.parse(credit.created_at);
    if (at >= start && at < end) {
      const week = weeks[Math.floor((at - start) / (7 * day))];
      week.points += credit.points;
      week.checkins++;
    }
  }
  return { weeks, categories };
}
