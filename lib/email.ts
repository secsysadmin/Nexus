// Adapted from SysAd/Delphi/lib/email.ts: SES/Resend selection, MIME encoding,
// authenticated sender, and throttling retries. Registration-specific content is excluded.
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { Resend } from "resend";
export type Mail = { to: string; subject: string; html: string; body: string };
export function emailDeliveryEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.EMAIL_DELIVERY_ENABLED === "true" &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "production")
  );
}
function cleanHeader(s: string) {
  return s.replace(/[\r\n]+/g, " ").trim();
}
export function encodedHeader(s: string) {
  const chunks: string[] = [];
  let chunk = "";
  for (const c of cleanHeader(s)) {
    if (Buffer.byteLength(chunk + c) > 39) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += c;
  }
  if (chunk) chunks.push(chunk);
  return chunks
    .map((x) => `=?UTF-8?B?${Buffer.from(x).toString("base64")}?=`)
    .join("\r\n ");
}
function base64Body(s: string) {
  return (
    Buffer.from(s)
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") ?? ""
  );
}
export function rawMessage(mail: Mail, from: string) {
  const clean = cleanHeader(from);
  const match = clean.match(/^(.*?)\s*<([^>]+)>$/);
  const sender = match ? `${encodedHeader(match[1])} <${match[2]}>` : clean;
  const boundary = "=_SocietyHub_Application_Receipt";
  return [
    `From: ${sender}`,
    `To: ${cleanHeader(mail.to)}`,
    `Subject: ${encodedHeader(mail.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(mail.body),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(mail.html),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
export async function sendMail(
  mail: Mail,
  idempotencyKey: string,
): Promise<string> {
  const from =
    process.env.EMAIL_FROM ||
    "Student Engineers' Council <no-reply@sec.tamu.edu>";
  const provider =
    process.env.EMAIL_PROVIDER ||
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? "ses"
      : "resend");
  if (
    provider === "ses" &&
    (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
  )
    throw new Error("Email provider is not configured.");
  if (provider === "resend" && !process.env.RESEND_API_KEY)
    throw new Error("Email provider is not configured.");
  if (!["ses", "resend"].includes(provider))
    throw new Error("Unsupported email provider.");
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (provider === "ses") {
        const client = new SESClient({
          region: process.env.AWS_REGION || "us-east-1",
          maxAttempts: 2,
          requestHandler: { connectionTimeout: 5000, requestTimeout: 10000 },
        });
        try {
          const response = await client.send(
            new SendRawEmailCommand({
              Source: from,
              Destinations: [mail.to],
              RawMessage: { Data: Buffer.from(rawMessage(mail, from)) },
            }),
          );
          if (!response.MessageId)
            throw new Error("Provider returned no message ID.");
          return response.MessageId;
        } finally {
          client.destroy();
        }
      }
      const { data, error } = await new Resend(
        process.env.RESEND_API_KEY,
      ).emails.send(
        {
          from,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.body,
        },
        { idempotencyKey },
      );
      if (error)
        throw Object.assign(new Error(error.message), { name: error.name });
      if (!data?.id) throw new Error("Provider returned no message ID.");
      return data.id;
    } catch (e) {
      const err = e as Error;
      if (
        attempt >= 3 ||
        !/throttl|rate.?limit|too many|rate exceeded/i.test(
          err.name + " " + err.message,
        )
      )
        throw e;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error("Email delivery failed.");
}
