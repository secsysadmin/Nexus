import { z } from "zod";
export type ReceiptInput = {
  societyName: string;
  formTitle: string;
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
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
export function receiptContent(input: ReceiptInput) {
  const subject = `SocietyHub: ${input.resubmission ? "Updated application received" : "Application received"} — ${input.formTitle.replace(/[\r\n]+/g, " ")}`;
  const when =
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Chicago",
    }).format(new Date(input.submittedAt)) + " CT";
  const title = input.resubmission
    ? "Updated application received"
    : "Application received";
  const lines = [
    `Howdy ${input.societyName}!`,
    `SEC received your ${input.resubmission ? "updated " : ""}application.`,
    `Application: ${input.formTitle}`,
    `Submitted: ${when}`,
    `Reference: ${input.submissionId}`,
    "This confirms receipt, not approval or a point award. Sign in to SocietyHub to view your application and SEC feedback.",
  ];
  // This URL is controlled by server configuration, never the request Host header.
  const configured =
    process.env.SOCIETYHUB_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  let link = "";
  try {
    const u = new URL(configured);
    if (u.protocol === "https:") link = u.origin;
  } catch {
    /* Receipt remains useful without a link. */
  }
  const body = [...lines, ...(link ? [link] : [])].join("\n\n");
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#f7f3f4;color:#211d20;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">Your ${input.resubmission ? "updated " : ""}application is with SEC. Keep this receipt for your records.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #eadfe2;border-radius:12px;overflow:hidden"><tr><td style="padding:28px 32px;border-bottom:1px solid #eadfe2">${link ? `<img src="${escape(link)}/sec-logo.png" width="38" height="38" alt="SEC" style="vertical-align:middle;margin-right:10px;border:0">` : ""}<span style="font-size:21px;font-weight:700;letter-spacing:-.5px;color:#500000;vertical-align:middle">SocietyHub</span></td></tr><tr><td style="padding:32px"><h1 style="font-size:30px;line-height:1.15;letter-spacing:-1px;margin:0 0 24px;font-weight:700">${escape(title)}.</h1><p style="font-size:16px;line-height:1.6;margin:0 0 8px">Howdy, ${escape(input.societyName)}!</p><p style="font-size:15px;line-height:1.65;color:#625b60;margin:0 0 28px">Your ${input.resubmission ? "updated " : ""}application is with the Student Engineers’ Council. Here’s a receipt for your records.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eadfe2;border-bottom:1px solid #eadfe2"><tr><td style="padding:18px 0 6px;font-size:12px;color:#625b60">APPLICATION</td></tr><tr><td style="padding:0 0 20px;font-size:18px;line-height:1.4;font-weight:700">${escape(input.formTitle)}</td></tr><tr><td style="padding:0 0 6px;font-size:12px;color:#625b60">SUBMITTED</td></tr><tr><td style="padding:0 0 20px;font-size:15px;line-height:1.5">${escape(when)}</td></tr></table><p style="font-size:14px;line-height:1.65;color:#625b60;margin:24px 0">This confirms receipt, not approval or a point award. You can view your application and SEC feedback in SocietyHub.</p>${link ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#500000;border-radius:6px"><a href="${escape(link)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;line-height:1.4;font-weight:700;text-decoration:none">View your application &#8594;</a></td></tr></table>` : ""}<p style="font-size:12px;line-height:1.6;color:#625b60;margin:28px 0 0;overflow-wrap:anywhere;word-break:break-all">Reference: ${escape(input.submissionId)}</p></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #eadfe2;background:#fdfafb"><p style="font-size:12px;line-height:1.7;color:#625b60;margin:0">Student Engineers’ Council<br>Texas A&amp;M University${link ? `<br><a href="${escape(link)}" style="color:#500000;text-decoration:underline">${escape(link.replace("https://", ""))}</a>` : ""}</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, body, html };
}
