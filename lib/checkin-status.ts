import type { Event } from "./types";
export function checkinStatus(
  event: Pick<Event, "checkin_open" | "starts_at" | "ends_at"> &
    Partial<Pick<Event, "checkin_starts_at" | "checkin_ends_at">>,
  now = Date.now(),
) {
  if (!event.checkin_open) return "Check-in paused";
  if (now < Date.parse(event.checkin_starts_at ?? event.starts_at))
    return "Check-in scheduled";
  if (now >= Date.parse(event.checkin_ends_at ?? event.ends_at))
    return "Check-in ended";
  return "Check-in open";
}
