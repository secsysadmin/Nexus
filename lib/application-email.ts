import { z } from "zod";
const RECEIPT_TIME_ZONE = "America/Chicago";
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};
export type ReceiptInput = {
  societyName: string;
  formTitle: string;
  semester: string;
  submissionId: string;
  submittedAt: string;
  resubmission: boolean;
};
export function defaultConfirmationEmail(
  contacts: Record<string, unknown>,
): string {
  const responses = Array.isArray(contacts.responses) ? contacts.responses : [];
  const sorted = [...responses]
    .filter((r) => r && typeof r === "object")
    .sort(
      (a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
    );
  for (const r of sorted) {
    for (const key of ["president", "representative"]) {
      const email = r[key]?.email;
      if (
        typeof email === "string" &&
        z.email().safeParse(email.trim()).success
      )
        return email.trim();
    }
  }
  return "";
}
function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}
function configuredAppOrigin() {
  const configured =
    process.env.SOCIETYHUB_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  if (!URL.canParse(configured)) return "";
  const url = new URL(configured);
  return url.protocol === "https:" ? url.origin : "";
}
export function receiptContent(input: ReceiptInput) {
  const subject = `SocietyHub: ${input.resubmission ? "Updated application received" : "Application received"} — ${input.formTitle.replace(/[\r\n]+/g, " ")}`;
  const when =
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: RECEIPT_TIME_ZONE,
    }).format(new Date(input.submittedAt)) + " CT";
  const title = input.resubmission
    ? "Updated application received"
    : "Application received";
  const lines = [
    `Howdy ${input.societyName}!`,
    `SEC received your ${input.resubmission ? "updated " : ""}application.`,
    `Application: ${input.formTitle}`,
    `Semester: ${input.semester}`,
    `Submitted: ${when}`,
    `Reference: ${input.submissionId}`,
    "This confirms receipt, not approval or a point award. Sign in to SocietyHub to view your application and SEC feedback.",
  ];
  const link = configuredAppOrigin();
  const body = [...lines, ...(link ? [link] : [])].join("\n\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5f1;color:#292623;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:28px 18px"><div style="background:#500000;color:#fff;padding:24px"><strong>SocietyHub · Student Engineers’ Council</strong><h1 style="font-size:24px;margin:14px 0 0">${escape(title)}</h1></div><div style="padding:24px;background:#fff">${lines.map((line) => `<p style="line-height:1.6">${escape(line)}</p>`).join("")}${link ? `<p><a href="${escape(link)}" style="display:inline-block;background:#500000;color:#fff;padding:12px 18px;text-decoration:none">Open SocietyHub</a></p>` : ""}<p style="font-size:12px;color:#68645f">Texas A&amp;M University · Student Engineers’ Council</p></div></div></body></html>`;
  return { subject, body, html };
}
