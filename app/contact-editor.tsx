"use client";
import { useState } from "react";
import type { Account } from "../lib/types";
import { defaultConfirmationEmail } from "../lib/application-email";
import { useUnsavedChanges, confirmDiscard } from "./unsaved-changes";
import { Field, Panel, Button } from "./ui";
export default function ContactEditor({
  account,
  busy,
  save,
  cancel,
}: {
  account: Account;
  busy: boolean;
  save: (body: unknown) => Promise<boolean>;
  cancel?: () => void;
}) {
  const current = account.contacts.current as any;
  const latest =
    (Array.isArray(account.contacts.responses)
      ? [...account.contacts.responses].sort(
          (a, b) =>
            (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
        )[0]
      : null) ?? {};
  const person = (key: string) => ({
    name: String((current?.[key] ?? latest[key])?.name ?? ""),
    email: String((current?.[key] ?? latest[key])?.email ?? ""),
    phone: String((current?.[key] ?? latest[key])?.phone ?? ""),
  });
  const [profile, setProfile] = useState({
    president: person("president"),
    representative: person("representative"),
    notificationEmail:
      current?.notificationEmail ?? defaultConfirmationEmail(account.contacts),
  });
  const [revision, setRevision] = useState(account.contact_revision ?? 1);
  const { dirty, markSaved } = useUnsavedChanges(JSON.stringify(profile));
  return (
    <Panel
      title={cancel ? `Contacts · ${account.display_name}` : "Society contacts"}
      action={
        cancel && (
          <Button
            secondary
            disabled={busy}
            onClick={() => {
              if (confirmDiscard()) cancel();
            }}
          >
            Back to societies
          </Button>
        )
      }
    >
      <p className="section-intro">
        Keep your officers and preferred email up to date. An officer’s personal
        email or a society email works. These details are visible only to your
        society and SEC.
      </p>
      <form
        className="editor-form"
        data-unsaved-changes={dirty ? "true" : undefined}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save({ accountId: account.id, revision, profile })) {
            markSaved();
            setRevision((v) => v + 1);
          }
        }}
      >
        {(["president", "representative"] as const).map((key) => (
          <fieldset className="contact-officer" key={key}>
            <legend>
              {key === "president" ? "President" : "SEC representative"}
            </legend>
            <div className="form-grid">
              {(["name", "email", "phone"] as const).map((field) => (
                <Field
                  key={field}
                  label={`${key === "president" ? "President" : "Representative"} ${field}`}
                >
                  <input
                    type={
                      field === "email"
                        ? "email"
                        : field === "phone"
                          ? "tel"
                          : "text"
                    }
                    maxLength={
                      field === "name" ? 150 : field === "email" ? 254 : 50
                    }
                    value={profile[key][field]}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [key]: { ...profile[key], [field]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
        <Field
          label="Preferred notification email"
          hint="New applications will suggest this address. Updates about existing applications go to the email chosen when they were submitted."
        >
          <input
            type="email"
            maxLength={254}
            value={profile.notificationEmail}
            onChange={(e) =>
              setProfile({ ...profile, notificationEmail: e.target.value })
            }
          />
        </Field>
        <p className="section-intro">
          Changing officers? Update these contacts, then ask an SEC chair for a
          new password setup link. Updating contacts does not change account
          access.
        </p>
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save contacts"}
        </Button>
      </form>
    </Panel>
  );
}
