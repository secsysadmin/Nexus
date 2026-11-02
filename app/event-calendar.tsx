"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Event, Semester } from "../lib/types";
import { labels } from "../lib/domain";
import {
  calendarDays,
  centralDay,
  calendarEvents,
  calendarWeekSpans,
  shiftDay,
  shiftMonth,
} from "../lib/event-calendar";
const fullDate = (day: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
const when = (time: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(time));
export default function EventCalendar({
  events,
  semester,
  onEdit,
  onQr,
}: {
  events: Event[];
  semester: Semester;
  onEdit?: (event: Event) => void;
  onQr?: (event: Event) => void;
}) {
  const today = centralDay(Date.now()),
    id = useId(),
    focusDay = useRef(false);
  const min = [
    semester.starts_on.slice(0, 7),
    ...events.map((e) => centralDay(e.starts_at).slice(0, 7)),
  ].sort()[0];
  const max = [
    semester.ends_on.slice(0, 7),
    ...events.map((e) => centralDay(e.ends_at).slice(0, 7)),
  ]
    .sort()
    .at(-1)!;
  const initial =
    today.slice(0, 7) < min
      ? min
      : today.slice(0, 7) > max
        ? max
        : today.slice(0, 7);
  const [month, setMonth] = useState(initial),
    [selected, setSelected] = useState(
      initial === today.slice(0, 7) ? today : initial + "-01",
    );
  const onDay = useMemo(() => calendarEvents(events), [events]);
  const days = calendarDays(month),
    dayEvents = onDay(selected);
  useEffect(() => {
    if (focusDay.current) {
      document.getElementById(id + "-" + selected)?.focus();
      focusDay.current = false;
    }
  }, [selected, month, id]);
  const move = (next: string, focus = false) => {
    if (next.slice(0, 7) < min || next.slice(0, 7) > max) return;
    focusDay.current = focus;
    setSelected(next);
    setMonth(next.slice(0, 7));
  };
  return (
    <div className="event-calendar">
      <div className="calendar-toolbar">
        <h3>
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(month + "-01T12:00:00Z"))}
        </h3>
        <div className="actions">
          <button
            className="icon-button"
            aria-label="Previous month"
            disabled={month <= min}
            onClick={() => move(shiftMonth(month, -1) + "-01")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="button secondary"
            disabled={today.slice(0, 7) < min || today.slice(0, 7) > max}
            onClick={() => move(today)}
          >
            This month
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            disabled={month >= max}
            onClick={() => move(shiftMonth(month, 1) + "-01")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <p className="section-intro">
        Bars span each event’s check-in window. Select any day for details.
        Dates and times use Central time.
      </p>
      <div
        className="calendar-grid"
        role="grid"
        aria-label={`${month} event calendar`}
      >
        <div className="calendar-weekdays" role="row">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} role="columnheader">
              {d}
            </div>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => {
          const weekDays = days.slice(week * 7, week * 7 + 7);
          const spans = calendarWeekSpans(events, weekDays);
          const laneCount = Math.max(0, ...spans.map((s) => s.lane + 1));
          return (
            <div
              className="calendar-week"
              role="row"
              key={week}
              style={{ minHeight: Math.max(96, 44 + laneCount * 26) }}
            >
              {days.slice(week * 7, week * 7 + 7).map((day, i) => {
                const found = day ? onDay(day) : [];
                return (
                  <div
                    className={"calendar-cell" + (!day ? " outside" : "")}
                    role="gridcell"
                    aria-selected={day === selected}
                    key={day ?? i}
                  >
                    {day && (
                      <button
                        id={id + "-" + day}
                        className={
                          "calendar-day" + (day === selected ? " selected" : "")
                        }
                        tabIndex={day === selected ? 0 : -1}
                        aria-label={`${fullDate(day)}, ${found.length} ${found.length === 1 ? "event" : "events"}`}
                        aria-current={day === today ? "date" : undefined}
                        onClick={() => setSelected(day)}
                        onKeyDown={(e) => {
                          const offset = (
                            {
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                            } as Record<string, number>
                          )[e.key];
                          if (offset) {
                            e.preventDefault();
                            move(shiftDay(day, offset), true);
                          } else if (e.key === "Home" || e.key === "End") {
                            e.preventDefault();
                            const dow = new Date(
                              day + "T12:00:00Z",
                            ).getUTCDay();
                            move(
                              shiftDay(day, e.key === "Home" ? -dow : 6 - dow),
                              true,
                            );
                          }
                        }}
                      >
                        <span className="calendar-date">
                          {Number(day.slice(-2))}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="calendar-spans" aria-hidden="true">
                {spans.map(
                  ({
                    event,
                    startColumn,
                    endColumn,
                    lane,
                    continuesBefore,
                    continuesAfter,
                  }) => (
                    <div
                      key={event.id}
                      className={
                        "calendar-span category-" +
                        event.category.toLowerCase() +
                        (continuesBefore ? " continues-before" : "") +
                        (continuesAfter ? " continues-after" : "")
                      }
                      style={{
                        gridColumn: `${startColumn + 1} / ${endColumn + 2}`,
                        gridRow: lane + 1,
                      }}
                    >
                      {continuesBefore && <ChevronLeft size={12} />}
                      <span>{event.name}</span>
                      {continuesAfter && <ChevronRight size={12} />}
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="calendar-legend">
        {["PRT", "STANDARD", "HIGH_IMPACT"].map((c) => (
          <span className={"category-" + c.toLowerCase()} key={c}>
            <i />
            {c === "PRT" ? "PRT" : labels[c]}
          </span>
        ))}
      </div>
      <section
        className="calendar-day-details"
        aria-label={`Events on ${fullDate(selected)}`}
      >
        <h3>{fullDate(selected)}</h3>
        {dayEvents.length ? (
          dayEvents.map((event) => (
            <article className="record dashboard-record" key={event.id}>
              <div>
                <strong>{event.name}</strong>
                <small>
                  {labels[event.category]} · {when(event.starts_at)} –{" "}
                  {when(event.ends_at)} CT
                </small>
                <small>{event.location}</small>
                <p>{event.description}</p>
                <small>
                  {event.category === "HIGH_IMPACT"
                    ? "2 points · SEC awards manually"
                    : `1 point · Check-in ${event.checkin_open ? "enabled within its window" : "disabled"}`}
                </small>
              </div>
              {onEdit && (
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => onEdit(event)}
                    aria-label={`Edit ${event.name}`}
                  >
                    Edit event
                  </button>
                  {event.category !== "HIGH_IMPACT" && onQr && (
                    <button
                      className="button secondary"
                      onClick={() => onQr(event)}
                      aria-label={`QR for ${event.name}`}
                    >
                      QR & link
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <p>No events on this date.</p>
        )}
      </section>
    </div>
  );
}
