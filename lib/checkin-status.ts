import type { Event } from "./types";
export type CheckinStatus = "PAUSED" | "SCHEDULED" | "OPEN" | "ENDED";
const CHECKIN_LABELS: Record<CheckinStatus, string> = {
  PAUSED: "Check-in paused",
  SCHEDULED: "Check-in scheduled",
  OPEN: "Check-in open",
  ENDED: "Check-in ended",
};
export function checkinLabel(status: CheckinStatus): string {
  return CHECKIN_LABELS[status];
}
export function checkinStatus(
  event: Pick<Event, "checkin_open" | "starts_at" | "ends_at"> &
    Partial<Pick<Event, "checkin_starts_at" | "checkin_ends_at">>,
  now = Date.now(),
): CheckinStatus {
  if (!event.checkin_open) return "PAUSED";
  if (now < Date.parse(event.checkin_starts_at ?? event.starts_at))
    return "SCHEDULED";
  if (now >= Date.parse(event.checkin_ends_at ?? event.ends_at))
    return "ENDED";
  return "OPEN";
}
