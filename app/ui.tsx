"use client";
import { useId, cloneElement, isValidElement, type ReactNode } from "react";
import { Check } from "lucide-react";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const generatedId = useId();
  const control = isValidElement<{
    id?: string;
    required?: boolean;
    "aria-describedby"?: string;
  }>(children)
    ? children
    : null;
  const id = control?.props.id ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor={id}>{label}</label>
        {control?.props.required && !label.endsWith("*") && (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </div>
      {control
        ? cloneElement(control, {
            id,
            "aria-describedby":
              [control.props["aria-describedby"], hintId]
                .filter(Boolean)
                .join(" ") || undefined,
          })
        : children}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function DashboardSection({
  title,
  count,
  emptyText,
  action,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={count ? "dashboard-section" : "dashboard-clear"}
      aria-label={title}
      data-count={count}
    >
      {count ? (
        <>
          <div className="section-head">
            <div className="dashboard-section-title">
              <h2>{title}</h2>
              <span className="dashboard-count" aria-label={`${count} items`}>
                {count}
              </span>
            </div>
            {action}
          </div>
          {children}
        </>
      ) : (
        <>
          <p>
            <Check size={16} aria-hidden="true" />
            {emptyText}
          </p>
          {action}
        </>
      )}
    </section>
  );
}
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  value,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  value?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type={type}
      value={value}
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
export function FormActions({
  busy,
  onCancel,
  label = "Save changes",
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="actions">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
      <Button secondary onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
