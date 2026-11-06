"use client";
import { useState } from "react";
import {
  ArrowRight,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import type { Form, Submission } from "../lib/types";
import {
  reviewOptions,
  statusLabel,
  type ReviewStatus,
} from "../lib/submission-status";
import {
  formKinds,
  questionTypes,
  isOneOf,
  MAX_EMAIL_ATTEMPTS,
  MAX_QUESTIONS,
  type Question,
  type Answers,
} from "../lib/domain";
import { useUnsavedChanges, confirmDiscard } from "./unsaved-changes";
import { Button, Panel, Field, FormActions, Pill } from "./ui";
import { when, status, localDate } from "./format";
type FormSave = {
  id?: string;
  expectedVersion?: number;
  title: string;
  description: string;
  kind: Form["kind"];
  published: boolean;
  deadline: string | null;
  questions: Question[];
};
type SubmissionSave = {
  formId: string;
  answers: Answers;
  submit: boolean;
  revision: number;
  confirmationEmail: string;
};
export function FormEditor({
  initial,
  busy,
  cancel,
  save,
}: {
  initial: Form | null;
  busy: boolean;
  cancel: () => void;
  save: (b: FormSave) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? ""),
    [description, setDescription] = useState(initial?.description ?? ""),
    [kind, setKind] = useState(initial?.kind ?? "FUNDING"),
    [deadline, setDeadline] = useState(
      initial?.deadline ? localDate(initial.deadline) : "",
    ),
    [questions, setQuestions] = useState<Question[]>(
      initial?.questions ?? [
        {
          id: crypto.randomUUID(),
          label: "",
          type: "short",
          required: true,
          options: [],
        },
      ],
    );
  const update = (i: number, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, offset: number) => {
    setQuestions((q) => {
      const result = [...q];
      [result[i], result[i + offset]] = [result[i + offset], result[i]];
      return result;
    });
  };
  const { dirty } = useUnsavedChanges(
    JSON.stringify({ title, description, kind, deadline, questions }),
  );
  return (
    <Panel
      title={initial ? "Edit application form" : "Create application form"}
    >
      <form
        className="editor-form"
        data-unsaved-changes={dirty ? "true" : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          const publish = submitter
            ? submitter.value === "publish"
            : !!initial?.published;
          void save({
            id: initial?.id,
            expectedVersion: initial?.current_version,
            title,
            description,
            kind,
            published: publish,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            questions: questions.map((q) => ({
              ...q,
              options: ["select", "checkbox"].includes(q.type) ? q.options : [],
            })),
          });
        }}
      >
        <Field label="Application title">
          <input
            required
            autoFocus
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Application type">
            <select
              disabled={!!initial}
              value={kind}
              onChange={(e) => {
                if (isOneOf(formKinds, e.target.value)) setKind(e.target.value);
              }}
            >
              <option value="FUNDING">Society Funding</option>
              <option value="HIGH_IMPACT">
                Cross-collaboration High Impact event approval
              </option>
            </select>
          </Field>
        </div>
        <Field label="Instructions">
          <textarea
            rows={3}
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field
          label="Deadline (optional)"
          hint="Enter in your device’s local timezone."
        >
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <h3>Questions</h3>
        <p>
          Existing drafts and submissions keep their question version. New
          applications use your latest published version.
        </p>
        <div className="question-editor">
          {questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>Question {i + 1}</legend>
              <Field label="Question text">
                <input
                  required
                  value={q.label}
                  maxLength={500}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </Field>
              <div className="form-grid">
                <Field label="Answer type">
                  <select
                    value={q.type}
                    onChange={(e) =>
                      isOneOf(questionTypes, e.target.value) &&
                      update(i, { type: e.target.value })
                    }
                  >
                    <option value="short">Short answer</option>
                    <option value="long">Long answer</option>
                    <option value="select">Single choice</option>
                    <option value="checkbox">Multiple choices</option>
                    <option value="number">Number</option>
                  </select>
                </Field>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => update(i, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
              {["select", "checkbox"].includes(q.type) && (
                <div
                  className="choice-options"
                  role="group"
                  aria-label={`Choices for question ${i + 1}`}
                >
                  {(q.options.length ? q.options : [""]).map(
                    (option, optionIndex, options) => (
                      <div className="choice-option-row" key={optionIndex}>
                        <Field label={`Choice ${optionIndex + 1}`}>
                          <input
                            id={`choice-${q.id}-${optionIndex}`}
                            required
                            maxLength={200}
                            value={option}
                            onChange={(e) =>
                              update(i, {
                                options: options.map((value, index) =>
                                  index === optionIndex
                                    ? e.target.value
                                    : value,
                                ),
                              })
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={options.length === 1}
                          aria-label={`Remove choice ${optionIndex + 1} from question ${i + 1}`}
                          onClick={() => {
                            update(i, {
                              options: options.filter(
                                (_, index) => index !== optionIndex,
                              ),
                            });
                            requestAnimationFrame(() =>
                              document
                                .getElementById(
                                  `choice-${q.id}-${Math.max(0, optionIndex - 1)}`,
                                )
                                ?.focus(),
                            );
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ),
                  )}
                  <Button
                    secondary
                    disabled={q.options.length >= 30}
                    onClick={() => {
                      const options = q.options.length ? q.options : [""];
                      update(i, { options: [...options, ""] });
                      requestAnimationFrame(() =>
                        document
                          .getElementById(`choice-${q.id}-${options.length}`)
                          ?.focus(),
                      );
                    }}
                  >
                    <Plus size={15} /> Add choice
                  </Button>
                  <small>Up to 30 choices, 200 characters each.</small>
                </div>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move question ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move question ${i + 1} down`}
                  disabled={i === questions.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown size={17} />
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={questions.length === 1}
                  onClick={() =>
                    setQuestions(questions.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 size={15} />
                  Remove question
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        <Button
          secondary
          disabled={questions.length >= MAX_QUESTIONS}
          onClick={() =>
            setQuestions([
              ...questions,
              {
                id: crypto.randomUUID(),
                label: "",
                type: "short",
                required: true,
                options: [],
              },
            ])
          }
        >
          <Plus size={16} />
          Add question
        </Button>
        <div className="publication-actions">
          <p>
            {initial?.published
              ? "Save changes to the published form, or unpublish it to return to a draft."
              : "Save a draft to keep a new application private, then publish it here or from the application list."}
          </p>
          <div className="actions">
            {initial?.published ? (
              <>
                <Button type="submit" value="publish" disabled={busy}>
                  Save published changes
                </Button>
                <Button secondary type="submit" value="draft" disabled={busy}>
                  Unpublish and save draft
                </Button>
              </>
            ) : (
              <>
                <Button secondary type="submit" value="draft" disabled={busy}>
                  Save draft
                </Button>
                <Button type="submit" value="publish" disabled={busy}>
                  Publish application
                </Button>
              </>
            )}
            <Button
              secondary
              onClick={() => {
                if (confirmDiscard()) cancel();
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
export function AnswerFields({
  questions,
  answers,
  setAnswers,
  disabled,
}: {
  questions: Question[];
  answers: Answers;
  setAnswers: (a: Answers) => void;
  disabled: boolean;
}) {
  return (
    <div className="answer-fields">
      {questions.map((q) => {
        const value = answers[q.id] ?? (q.type === "checkbox" ? [] : "");
        const set = (v: string | string[]) =>
          setAnswers({ ...answers, [q.id]: v });
        if (q.type === "checkbox")
          return (
            <fieldset className="choice-field" key={q.id}>
              <legend>
                {q.label}
                {q.required ? " *" : ""}
              </legend>
              {q.options.map((option, i) => (
                <label className="check-field" key={i}>
                  <input
                    disabled={disabled}
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option)}
                    onChange={(e) => {
                      const v = Array.isArray(value) ? value : [];
                      set(
                        e.target.checked
                          ? [...v, option]
                          : v.filter((x) => x !== option),
                      );
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          );
        return (
          <Field key={q.id} label={q.label + (q.required ? " *" : "")}>
            {q.type === "long" ? (
              <textarea
                disabled={disabled}
                rows={5}
                maxLength={20000}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            ) : q.type === "select" ? (
              <select
                disabled={disabled}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">Select an option</option>
                {q.options.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                disabled={disabled}
                type={q.type === "number" ? "number" : "text"}
                step="any"
                maxLength={20000}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
export function ApplicationView({
  form,
  defaultEmail,
  existing,
  admin,
  busy,
  cancel,
  save,
}: {
  form: Form;
  defaultEmail: string;
  existing?: Submission;
  admin: boolean;
  busy: boolean;
  cancel: () => void;
  save: (b: SubmissionSave) => Promise<Submission | undefined>;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState(
    existing?.confirmation_email || defaultEmail,
  );
  const [answers, setAnswers] = useState<Answers>(existing?.answers ?? {}),
    [revision, setRevision] = useState(existing?.revision ?? 0),
    [savedAt, setSavedAt] = useState(existing?.updated_at ?? "");
  const closed =
    existing?.status !== "CHANGES_REQUESTED" &&
    (!form.published ||
      !!(form.deadline && Date.parse(form.deadline) < Date.now()));
  const readOnly =
    admin ||
    closed ||
    !!(existing && !["DRAFT", "CHANGES_REQUESTED"].includes(existing.status));
  const questions = existing?.questions ?? form.questions;
  const { dirty, markSaved } = useUnsavedChanges(
    JSON.stringify({ answers, confirmationEmail }),
    !readOnly,
  );
  const persist = async (submit: boolean) => {
    const r = await save({
      formId: form.id,
      answers,
      submit,
      revision,
      confirmationEmail,
    });
    if (r) {
      markSaved();
      setRevision(r.revision);
      setSavedAt(r.updated_at);
    }
  };
  return (
    <Panel
      title={form.title}
      action={
        <Button
          secondary
          onClick={() => {
            if (confirmDiscard()) cancel();
          }}
        >
          Back to applications
        </Button>
      }
    >
      <div className="application-content">
        <p className="section-intro">{form.description}</p>
        <div className="application-meta">
          <Pill
            tone={
              existing?.status === "APPROVED"
                ? "green"
                : existing?.status === "SUBMITTED" ||
                    existing?.status === "UNDER_REVIEW"
                  ? "rose"
                  : "neutral"
            }
          >
            {admin
              ? "Admin preview"
              : existing
                ? status(existing.status)
                : closed
                  ? "Closed"
                  : "Not started"}
          </Pill>
          <small>
            Question version {existing?.form_version ?? form.current_version}
            {form.deadline && ` · Due ${when(form.deadline)} CT`}
          </small>
        </div>
        {existing?.review_note && (
          <div className="review-note">
            <h3>SEC feedback</h3>
            <p>{existing.review_note}</p>
          </div>
        )}
        {form.kind === "HIGH_IMPACT" && (
          <p>Event approval and point awards are separate.</p>
        )}
        {existing &&
        !admin &&
        !["DRAFT", "CHANGES_REQUESTED"].includes(existing.status) ? (
          <div className="application-submitted">
            <section
              className="application-receipt"
              aria-label="Submission details"
            >
              <div>
                <Check size={18} aria-hidden="true" />
                <strong>Application submitted</strong>
              </div>
              {existing.submitted_at && (
                <p>Submitted {when(existing.submitted_at)} CT</p>
              )}
              <ReceiptStatus submission={existing} />
              {!existing.confirmation_status && (
                <p>
                  Confirmation email:{" "}
                  {existing.confirmation_email || "Not provided"}
                </p>
              )}
            </section>
            <h3>Your responses</h3>
            <dl className="application-responses">
              {questions.map((q) => {
                const value = answers[q.id];
                return (
                  <div key={q.id}>
                    <dt>{q.label}</dt>
                    <dd>
                      {Array.isArray(value) ? (
                        value.length ? (
                          <ul>
                            {value.map((option, index) => (
                              <li key={index}>
                                <Check size={15} aria-hidden="true" />
                                {option}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "No answer provided"
                        )
                      ) : (
                        value || "No answer provided"
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : (
          <form
            data-unsaved-changes={dirty ? "true" : undefined}
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              void persist(true);
            }}
          >
            <Field
              label="Confirmation email"
              hint="We’ll send a receipt here when you submit. An officer’s personal email or a society email works."
            >
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                value={confirmationEmail}
                onChange={(e) => setConfirmationEmail(e.target.value)}
                disabled={readOnly || busy}
              />
            </Field>
            <ReceiptStatus submission={existing} />
            <AnswerFields
              questions={questions}
              answers={answers}
              setAnswers={setAnswers}
              disabled={readOnly || busy}
            />
            {!readOnly && (
              <div className="actions">
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => void persist(false)}
                >
                  Save draft
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Submit application"}
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
            {savedAt && <small>Last saved {when(savedAt)} CT</small>}
          </form>
        )}
      </div>
    </Panel>
  );
}
export function ReviewView({
  submission: s,
  retryEmail,
  busy,
  cancel,
  save,
}: {
  submission: Submission;
  retryEmail: (id: string) => Promise<void>;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const options = reviewOptions(s.status);
  const [decision, setDecision] = useState<ReviewStatus | undefined>(
      options.find((option) => option === s.status) ?? options[0],
    ),
    [note, setNote] = useState(s.review_note);
  return (
    <Panel
      title={s.society_name}
      action={
        <Button secondary onClick={cancel}>
          Back to queue
        </Button>
      }
    >
      <h3>{s.form_title}</h3>
      <div className="inline">
        <Pill>{status(s.status)}</Pill>
        <small>
          Question version {s.form_version} · Submitted{" "}
          {s.submitted_at ? when(s.submitted_at) : "—"}
        </small>
      </div>
      <ReceiptStatus submission={s} />
      {!s.confirmation_email && (
        <p className="section-intro">
          This application has no notification address. Its decision will be
          available in SocietyHub.
        </p>
      )}
      {s.confirmation_email_id &&
        s.confirmation_status !== "SENT" &&
        (s.confirmation_attempts ?? 0) < MAX_EMAIL_ATTEMPTS && (
          <Button
            secondary
            disabled={busy}
            onClick={() =>
              s.confirmation_email_id &&
              void retryEmail(s.confirmation_email_id)
            }
          >
            {s.confirmation_status === "UNCERTAIN"
              ? "Review and resend confirmation"
              : s.email_kind === "DECISION"
                ? "Retry decision email"
                : "Retry confirmation email"}
          </Button>
        )}
      <div className="review-answers">
        {s.questions.map((q) => (
          <section key={q.id}>
            <h4>{q.label}</h4>
            <p>
              {Array.isArray(s.answers[q.id])
                ? (s.answers[q.id] as string[]).join(", ")
                : s.answers[q.id] || "No answer provided"}
            </p>
          </section>
        ))}
      </div>
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ id: s.id, status: decision, note, revision: s.revision });
        }}
      >
        <Field label="Review status">
          <select
            value={decision}
            onChange={(e) =>
              setDecision(options.find((option) => option === e.target.value))
            }
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {statusLabel(option)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Feedback visible to the society">
          <textarea
            rows={4}
            required={decision === "CHANGES_REQUESTED"}
            value={note}
            maxLength={5000}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p>Review decisions do not award event points.</p>
        <FormActions busy={busy} onCancel={cancel} label="Save review" />
      </form>
    </Panel>
  );
}
export function ReceiptStatus({ submission: s }: { submission?: Submission }) {
  if (!s?.confirmation_status) return null;
  return (
    <p className="receipt-status">
      {s.confirmation_status === "SENT"
        ? `${s.email_kind === "DECISION" ? "Decision email" : "Confirmation email"} sent to ${s.confirmation_email}.`
        : s.confirmation_status === "UNCERTAIN"
          ? `Your application is saved. Email delivery is unconfirmed; SEC can review its status.`
          : s.confirmation_status === "FAILED"
            ? `Your application is saved. The ${s.email_kind === "DECISION" ? "decision" : "confirmation"} email to ${s.confirmation_email} could not be sent; SEC can retry it.`
            : `${s.email_kind === "DECISION" ? "Decision" : "Confirmation"} email to ${s.confirmation_email} is queued for sending.`}
    </p>
  );
}
