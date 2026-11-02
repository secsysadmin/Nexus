import type { Event } from "./types";
export function centralDay(value: string | number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Chicago",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)!.value)
    .join("-");
}
export function calendarDays(month: string) {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((first + count) / 7) * 7 }, (_, i) =>
    i < first || i >= first + count
      ? null
      : `${month}-${String(i - first + 1).padStart(2, "0")}`,
  );
}
export function calendarEvents(events: Event[]) {
  const windows = events.map((event) => ({
    event,
    start: centralDay(event.starts_at),
    end: centralDay(event.ends_at),
  }));
  return (day: string) =>
    windows
      .filter((w) => w.start <= day && w.end >= day)
      .map((w) => w.event)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}
export function eventsOnDay(events: Event[], day: string) {
  return calendarEvents(events)(day);
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function shiftMonth(month: string, amount: number) {
  const date = new Date(month + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
