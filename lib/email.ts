import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { Resend } from "resend";
const ENCODED_WORD_MAX_BYTES = 39;
const BASE64_LINE_LENGTH = 76;
const MIME_BOUNDARY = "=_SocietyHub_Application_Receipt";
const DEFAULT_FROM = "Student Engineers' Council <no-reply@sec.tamu.edu>";
const DEFAULT_AWS_REGION = "us-east-1";
const SES_CLIENT_MAX_ATTEMPTS = 2;
const SES_CONNECTION_TIMEOUT_MS = 5000;
const SES_REQUEST_TIMEOUT_MS = 10000;
const MAX_SEND_ATTEMPTS = 3;
const THROTTLE_BACKOFF_MS = 1000;
const THROTTLE_PATTERN = /throttl|rate.?limit|too many|rate exceeded/i;
export type Mail = { to: string; subject: string; html: string; body: string };
export function emailDeliveryEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.EMAIL_DELIVERY_ENABLED === "true" &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "production")
  );
}
function isThrottled(error: unknown) {
  return (
    error instanceof Error &&
    THROTTLE_PATTERN.test(`${error.name} ${error.message}`)
  );
}
function cleanHeader(s: string) {
  return s.replace(/[\r\n]+/g, " ").trim();
}
export function encodedHeader(s: string) {
  const chunks: string[] = [];
  let chunk = "";
  for (const c of cleanHeader(s)) {
    if (Buffer.byteLength(chunk + c) > ENCODED_WORD_MAX_BYTES) {
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
      .match(new RegExp(`.{1,${BASE64_LINE_LENGTH}}`, "g"))
      ?.join("\r\n") ?? ""
  );
}
export function rawMessage(mail: Mail, from: string) {
  const clean = cleanHeader(from);
  const match = clean.match(/^(.*?)\s*<([^>]+)>$/);
  const sender = match ? `${encodedHeader(match[1])} <${match[2]}>` : clean;
  return [
    `From: ${sender}`,
    `To: ${cleanHeader(mail.to)}`,
    `Subject: ${encodedHeader(mail.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${MIME_BOUNDARY}"`,
    "",
    `--${MIME_BOUNDARY}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(mail.body),
    "",
    `--${MIME_BOUNDARY}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(mail.html),
    "",
    `--${MIME_BOUNDARY}--`,
    "",
  ].join("\r\n");
}
export async function sendMail(
  mail: Mail,
  idempotencyKey: string,
): Promise<string> {
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
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
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    try {
      if (provider === "ses") {
        const client = new SESClient({
          region: process.env.AWS_REGION || DEFAULT_AWS_REGION,
          maxAttempts: SES_CLIENT_MAX_ATTEMPTS,
          requestHandler: {
            connectionTimeout: SES_CONNECTION_TIMEOUT_MS,
            requestTimeout: SES_REQUEST_TIMEOUT_MS,
          },
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
      if (attempt >= MAX_SEND_ATTEMPTS || !isThrottled(e)) throw e;
      await new Promise((r) => setTimeout(r, attempt * THROTTLE_BACKOFF_MS));
    }
  }
  throw new Error("Email delivery failed.");
}
