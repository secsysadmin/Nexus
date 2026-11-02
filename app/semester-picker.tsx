"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Check } from "lucide-react";
import type { Semester } from "../lib/types";
const dates = (s: Semester) =>
  [s.starts_on, s.ends_on]
    .map((d) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(d)),
    )
    .join(" – ");
export default function SemesterPicker({
  semesters,
  value,
  onChange,
}: {
  semesters: Semester[];
  value: string;
  onChange: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    search = useRef({ text: "", time: 0 });
  const id = useId(),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const selected = semesters.find((s) => s.id === value);
  const show = () => {
    setActive(
      Math.max(
        0,
        semesters.findIndex((s) => s.id === value),
      ),
    );
    setOpen(true);
  };
  const choose = (index: number) => {
    if (semesters[index]) onChange(semesters[index].id);
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);
  return (
    <div className="semester-picker" ref={root}>
      <button
        ref={trigger}
        className="semester-trigger"
        type="button"
        role="combobox"
        aria-label="Viewing semester"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={!semesters.length}
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={(e) => {
          if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "Tab") {
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            if (!open) {
              show();
              if (e.key === "Home") setActive(0);
              if (e.key === "End") setActive(semesters.length - 1);
            } else
              setActive((i) =>
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? semesters.length - 1
                    : (i +
                        (e.key === "ArrowDown" ? 1 : -1) +
                        semesters.length) %
                      semesters.length,
              );
            return;
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) choose(active);
            else show();
            return;
          }
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const now = Date.now();
            search.current = {
              text:
                (now - search.current.time > 700 ? "" : search.current.text) +
                e.key.toLowerCase(),
              time: now,
            };
            const index = semesters.findIndex((s) =>
              s.name.toLowerCase().startsWith(search.current.text),
            );
            if (index >= 0) {
              e.preventDefault();
              setOpen(true);
              setActive(index);
            }
          }
        }}
      >
        <CalendarDays size={16} aria-hidden="true" />
        <span>{selected?.name ?? "Choose semester"}</span>
        {selected?.is_current && <small>Current</small>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${id}-list`}
          className="semester-options"
          role="listbox"
          aria-label="Semesters"
        >
          {semesters.map((s, i) => (
            <div
              id={`${id}-${i}`}
              key={s.id}
              role="option"
              aria-selected={s.id === value}
              className={
                "semester-option" + (i === active ? " highlighted" : "")
              }
              onPointerMove={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <span>
                <strong>{s.name}</strong>
                <small>{dates(s)}</small>
              </span>
              {s.is_current && (
                <span className="semester-current">Current</span>
              )}
              <span className="semester-option-check">
                {s.id === value && <Check size={16} aria-hidden="true" />}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
