"use client";
import { useState, useEffect, useRef } from "react";
import { Copy, Check, X, Download, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import type { Event } from "../lib/types";
import { useUnsavedChanges, confirmDiscard } from "./unsaved-changes";
import { checkinStatus, checkinLabel } from "../lib/checkin-status";
import { categories, isOneOf } from "../lib/domain";
import { Button, Panel, Field, FormActions, Pill } from "./ui";
import { when, localDate } from "./format";
export function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false),
    [err, setErr] = useState(false);
  return (
    <div className="copy-link">
      <input
        readOnly
        aria-label="Shareable link"
        value={value}
        onFocus={(e) => e.target.select()}
      />
      <Button
        secondary
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setErr(false);
          } catch {
            setErr(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Copied" : "Copy"}
      </Button>
      {err && <small role="status">Select and copy the link manually.</small>}
    </div>
  );
}
export function EventEditor({
  initial,
  reopening = false,
  busy,
  cancel,
  save,
}: {
  initial: Event | null;
  reopening?: boolean;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [description, setDescription] = useState(initial?.description ?? ""),
    [location, setLocation] = useState(initial?.location ?? ""),
    [category, setCategory] = useState(initial?.category ?? "PRT"),
    [start, setStart] = useState(initial ? localDate(initial.starts_at) : ""),
    [end, setEnd] = useState(initial ? localDate(initial.ends_at) : ""),
    [open, setOpen] = useState(initial?.checkin_open ?? false);
  const [checkinStart, setCheckinStart] = useState(
    initial ? localDate(initial.checkin_starts_at ?? initial.starts_at) : "",
  );
  const [checkinEnd, setCheckinEnd] = useState(
    initial ? localDate(initial.checkin_ends_at ?? initial.ends_at) : "",
  );
  const [windowError, setWindowError] = useState("");
  const { dirty } = useUnsavedChanges(
    JSON.stringify({
      name,
      description,
      location,
      category,
      start,
      end,
      open,
      checkinStart,
      checkinEnd,
    }),
  );
  return (
    <Panel
      title={
        reopening
          ? "Enable event check-in"
          : initial
            ? "Edit event"
            : "Create event"
      }
    >
      {reopening && (
        <p className="section-intro">
          To enable check-in now, set a start time at or before now and an end
          time in the future. Existing QR links and earned points are preserved.
        </p>
      )}
      {windowError && (
        <p className="alert error" role="alert">
          {windowError}
        </p>
      )}
      <form
        className="editor-form"
        data-unsaved-changes={dirty ? "true" : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          setWindowError("");
          if (
            reopening &&
            (Date.parse(checkinStart) > Date.now() ||
              Date.parse(checkinEnd) <= Date.now())
          ) {
            setWindowError(
              "To reopen now, choose a start time at or before now and an end time in the future.",
            );
            return;
          }
          void save({
            id: initial?.id,
            expectedVersion: initial?.revision,
            name,
            description,
            location,
            category,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            checkinStartsAt: new Date(checkinStart || start).toISOString(),
            checkinEndsAt: new Date(checkinEnd || end).toISOString(),
            checkinOpen: reopening || open,
          });
        }}
      >
        <Field label="Event name">
          <input
            autoFocus={!reopening}
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Event category">
            <select
              disabled={!!initial}
              value={category}
              onChange={(e) => {
                if (isOneOf(categories, e.target.value))
                  setCategory(e.target.value);
              }}
            >
              <option value="PRT">PRT · 1 point</option>
              <option value="STANDARD">Standard · 1 point</option>
              <option value="HIGH_IMPACT">High Impact · 2 points</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            maxLength={300}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Event starts"
            hint="Event times appear on the calendar. Enter times in your device’s local timezone."
          >
            <input
              required
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (!checkinStart) setCheckinStart(e.target.value);
              }}
            />
          </Field>
          <Field label="Event ends">
            <input
              required
              type="datetime-local"
              min={start}
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                if (!checkinEnd) setCheckinEnd(e.target.value);
              }}
            />
          </Field>
        </div>
        {category !== "HIGH_IMPACT" && (
          <>
            <p className="section-intro">
              Check-in can open before or stay open after the event. Changing
              this window won’t change the calendar.
            </p>
            <div className="form-grid">
              <Field label="Check-in window starts">
                <input
                  required
                  type="datetime-local"
                  value={checkinStart}
                  onChange={(e) => setCheckinStart(e.target.value)}
                />
              </Field>
              <Field
                label="Check-in window ends"
                hint={
                  reopening ? "Choose an end time in the future." : undefined
                }
              >
                <input
                  required
                  autoFocus={reopening}
                  type="datetime-local"
                  min={checkinStart}
                  value={checkinEnd}
                  onChange={(e) => setCheckinEnd(e.target.value)}
                />
              </Field>
            </div>
            <Button
              secondary
              onClick={() => {
                setCheckinStart(start);
                setCheckinEnd(end);
              }}
            >
              Use event times for check-in
            </Button>
          </>
        )}
        {category !== "HIGH_IMPACT" && !reopening && (
          <fieldset className="checkin-settings">
            <legend>QR and link check-in</legend>
            <label className="checkin-choice">
              <input
                type="radio"
                name="checkin-status"
                checked={open}
                onChange={() => setOpen(true)}
              />
              <span>
                <strong>Enabled</strong>
                <small>
                  Societies can check in only during the check-in window above.
                </small>
              </span>
            </label>
            <label className="checkin-choice">
              <input
                type="radio"
                name="checkin-status"
                checked={!open}
                onChange={() => setOpen(false)}
              />
              <span>
                <strong>Paused</strong>
                <small>
                  The QR code and link will not accept new check-ins.
                </small>
              </span>
            </label>
            <p>
              You can change this here at any time, or use Enable check-in in
              the Events list. Existing attendance is kept.
            </p>
          </fieldset>
        )}
        <FormActions
          busy={busy}
          onCancel={() => {
            if (confirmDiscard()) cancel();
          }}
          label={
            reopening
              ? "Enable check-in"
              : initial
                ? "Save event"
                : "Create event"
          }
        />
      </form>
    </Panel>
  );
}
export function QRPanel({
  event,
  close,
  rotate,
  busy,
}: {
  event: Event;
  close: () => void;
  rotate: () => Promise<boolean>;
  busy: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = dialog.current;
    modal?.showModal();
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  const [qr, setQr] = useState<{ link: string; src: string } | null>(null),
    [error, setError] = useState(""),
    [replacement, setReplacement] = useState<{
      ok: boolean;
      message: string;
    } | null>(null);
  const link = `${window.location.origin}/checkin/${event.id}#token=${event.checkin_token}`;
  const src = qr?.link === link ? qr.src : "";
  const filename = `${
    event.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "event"
  }-check-in.png`;
  useEffect(() => {
    let active = true;
    setError("");
    void QRCode.toDataURL(link, {
      type: "image/png",
      width: 1024,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((src) => {
        if (active) setQr({ link, src });
      })
      .catch(() => {
        if (active)
          setError("Unable to generate QR code. Use the sign-in link below.");
      });
    return () => {
      active = false;
    };
  }, [link]);
  return (
    <dialog
      ref={dialog}
      className="qr-modal"
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
          ),
        ).filter((n) => n.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      aria-label={`Check-in · ${event.name}`}
      onCancel={close}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          close();
      }}
    >
      <Panel
        title={`Check-in · ${event.name}`}
        action={
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close QR panel"
          >
            <X />
          </button>
        }
      >
        <div className="qr-layout">
          {!src && !error && (
            <div
              className="skeleton skeleton-qr"
              role="status"
              aria-label="Preparing QR code"
            />
          )}
          {src && (
            <img
              src={src}
              width={260}
              height={260}
              alt={`Check-in QR code for ${event.name}`}
            />
          )}
          <div>
            <p>Display this QR code at the event or share the sign-in link.</p>
            <p>
              {when(event.checkin_starts_at ?? event.starts_at)} –{" "}
              {when(event.checkin_ends_at ?? event.ends_at)} CT
            </p>
            <Pill
              tone={
                checkinStatus(event) === "OPEN" ? "green" : "neutral"
              }
            >
              {checkinLabel(checkinStatus(event))}
            </Pill>
            {error && <p role="alert">{error}</p>}
            {replacement && (
              <p
                className="qr-feedback"
                role={replacement.ok ? "status" : "alert"}
              >
                {replacement.message}
              </p>
            )}
            <CopyLink value={link} />
            <div className="actions">
              {src && (
                <a className="button" href={src} download={filename}>
                  <Download size={16} aria-hidden="true" />
                  Download PNG
                </a>
              )}
              <a
                className="button secondary"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                Open sign-in link <ExternalLink size={15} />
              </a>
              <Button
                secondary
                disabled={busy}
                onClick={async () => {
                  setReplacement(null);
                  const ok = await rotate();
                  setReplacement({
                    ok,
                    message: ok
                      ? "New link created. Previous links and QR codes no longer work."
                      : "Couldn’t confirm the replacement. Reload the workspace before sharing this QR code.",
                  });
                }}
              >
                Replace link & QR
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </dialog>
  );
}
