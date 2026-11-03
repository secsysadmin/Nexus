import { recordMetric } from "../../../lib/observability";
import { NextRequest, NextResponse, after } from "next/server";
import { maintenanceAuthorized } from "../../../lib/maintenance-auth";
import {
  deliverApplicationEmail,
  runMaintenance,
  outboxHealth,
} from "../../../lib/email-outbox";
import { z } from "zod";
import { transaction } from "../../../lib/db";
import { digest, sessionCookie } from "../../../lib/security";
import {
  authenticate,
  consumeLoginRequest,
  login,
  redeemActivation,
  changePassword,
} from "../../../lib/auth";
import { getPage, getCalendarPage, collections } from "../../../lib/data-pages";
import { updateContacts } from "../../../lib/contacts";
import { idempotentMutation } from "../../../lib/idempotency";
import {
  adminMutation,
  checkIn,
  saveSubmission,
  AppError,
} from "../../../lib/service";
import {
  getData,
  getFormDetail,
  getSubmissionDetail,
  getHistory,
} from "../../../lib/data";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
const password = z.string().min(15, "Use at least 15 characters.").max(128);
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function withSession(body: unknown, raw: string) {
  const res = json(body);
  res.cookies.set(sessionCookie, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await ctx.params).path.join("/");
    if (req.method === "GET") {
      if (path === "health") return json({ ok: true });
      if (path === "cron/maintenance" || path === "readiness") {
        if (!(await maintenanceAuthorized(req.headers.get("authorization"))))
          throw new AppError("Unauthorized.", 401);
        if (path === "cron/maintenance") {
          const result = await runMaintenance();
          return json(result, result.ok ? 200 : 503);
        }
        const health = await transaction(async (db) => {
          await db.query("SELECT 1");
          return outboxHealth(db);
        });
        return json(
          {
            ok: !health.uncertain && !health.exhausted && !health.delayed,
            ...health,
          },
          health.uncertain || health.exhausted || health.delayed ? 503 : 200,
        );
      }

      if (path.startsWith("accounts/")) {
        const id = z.uuid().parse(path.split("/")[1]);
        const account = await transaction(async (db) => {
          const actor = await authenticate(db, req);
          return (
            await db.query(
              "SELECT id,username,display_name,role,enabled,contacts,contact_revision,(password_hash IS NOT NULL) activated FROM accounts WHERE id=$1 AND ($2 OR id=$3)",
              [id, actor.role === "admin", actor.id],
            )
          ).rows[0];
        });
        if (!account) throw new AppError("Not found.", 404);
        return json(account);
      }
      if (path.startsWith("collections/")) {
        const kind = z.enum(collections).parse(path.split("/")[1]);
        const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(1000000)
          .parse(req.nextUrl.searchParams.get("offset") ?? 0);
        const search = z
          .string()
          .max(200)
          .parse(req.nextUrl.searchParams.get("search") ?? "");
        return json(
          await transaction(async (db) =>
            getPage(db, await authenticate(db, req), kind, offset, search),
          ),
        );
      }
      if (path === "events/calendar") {
        const month = z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .parse(req.nextUrl.searchParams.get("month"));
        const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(1000000)
          .parse(req.nextUrl.searchParams.get("offset") ?? 0);
        return json(
          await transaction(async (db) =>
            getCalendarPage(db, await authenticate(db, req), month, offset),
          ),
        );
      }
      if (path.startsWith("events/")) {
        const id = z.uuid().parse(path.split("/")[1]);
        const event = await transaction(async (db) => {
          const actor = await authenticate(db, req);
          return (
            await db.query(
              `SELECT id,revision,name,description,location,category,starts_at,ends_at,checkin_starts_at,checkin_ends_at,checkin_open${actor.role === "admin" ? ",checkin_token" : ""} FROM events WHERE id=$1`,
              [id],
            )
          ).rows[0];
        });
        if (!event) throw new AppError("Not found.", 404);
        return json(event);
      }
      if (path.startsWith("forms/") || path.startsWith("submissions/")) {
        const id = z.string().uuid().parse(path.split("/")[1]);
        const detail = await transaction(async (db) => {
          const actor = await authenticate(db, req);
          return path.startsWith("forms/")
            ? getFormDetail(db, actor, id)
            : getSubmissionDetail(db, actor, id);
        });
        if (!detail) throw new AppError("Not found.", 404);
        return json(detail);
      }
      if (path === "activity/history") {
        const offset = z.coerce
          .number()
          .int()
          .nonnegative()
          .max(1000000)
          .parse(req.nextUrl.searchParams.get("offset") ?? 0);
        return json(
          await transaction(async (db) =>
            getHistory(db, await authenticate(db, req), offset),
          ),
        );
      }
      if (path !== "data") throw new AppError("Not found.", 404);
      return json(
        await transaction(async (db) =>
          getData(db, await authenticate(db, req), {
            compact: true,
            view: z
              .enum([
                "overview",
                "events",
                "applications",
                "activity",
                "societies",
                "reviews",
                "settings",
              ])
              .parse(req.nextUrl.searchParams.get("view") ?? "overview"),
          }),
        ),
      );
    }
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin)
      throw new AppError("Request origin is not allowed.", 403);
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw new AppError("Send JSON.");
    if (Number(req.headers.get("content-length") ?? 0) > 256000)
      throw new AppError("Request is too large.", 413);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 256000)
      throw new AppError("Request is too large.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("Invalid request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AppError("Send a JSON object.");
    if (path === "auth/login") {
      const b = z
        .object({
          username: z.string().trim().toLowerCase().min(2).max(40),
          password: z.string().min(1).max(128),
        })
        .parse(body);
      const address = process.env.VERCEL
        ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown")
        : "local";
      if (!(await transaction((db) => consumeLoginRequest(db, address))))
        throw new AppError(
          "Too many sign-in requests from this connection. Try again later.",
          429,
        );
      const result = await transaction((db) =>
        login(db, b.username, b.password, address),
      );
      if (result.error) throw new AppError(result.error, result.status);
      return withSession({ ok: true }, result.raw!);
    }
    if (path === "auth/activate") {
      const b = z
        .object({ token: z.string().length(64), password })
        .parse(body);
      const raw = await transaction((db) =>
        redeemActivation(db, b.token, b.password),
      );
      return withSession({ ok: true }, raw);
    }
    const result = await transaction(async (db) => {
      const actor = await authenticate(db, req);
      if (path === "auth/logout") {
        await db.query("DELETE FROM sessions WHERE token_hash=$1", [
          digest(req.cookies.get(sessionCookie)!.value),
        ]);
        return { ok: true };
      }
      if (path === "auth/password") {
        const b = z
          .object({ currentPassword: z.string().min(1).max(128), password })
          .parse(body);
        return changePassword(db, actor, b.currentPassword, b.password);
      }
      if (path === "telemetry") {
        const input = z
          .object({
            kind: z.enum(["uncaught", "unhandled_rejection", "react_boundary"]),
          })
          .parse(body);
        const key = digest("telemetry:" + actor.id);
        const count = (
          await db.query(
            "INSERT INTO login_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING attempts",
            [key],
          )
        ).rows[0].attempts;
        if (count <= 10)
          await recordMetric(db, {
            route: "telemetry",
            status: 200,
            durationMs: 0,
            kind: "client_error",
            fingerprint: input.kind,
          });
        return { ok: true };
      }
      if (path === "accounts/contacts") return updateContacts(db, actor, body);
      if (path === "checkin") return checkIn(db, actor, body);
      if (path === "submissions/save") return saveSubmission(db, actor, body);
      const perform = () => adminMutation(db, actor, path, body);
      if (["admin/events", "admin/forms"].includes(path) && !body.id)
        return idempotentMutation(
          db,
          actor,
          path,
          req.headers.get("x-idempotency-key") ?? "",
          body,
          perform,
        );
      return perform();
    });
    if (
      result?.confirmation_email_id &&
      (path === "submissions/save" ||
        path === "admin/email-retry" ||
        path === "admin/review")
    ) {
      const id = result.confirmation_email_id as string;
      after(async () => {
        try {
          await deliverApplicationEmail(id);
        } catch {
          console.error(
            "SocietyHub confirmation dispatch failed; receipt remains available for retry.",
          );
        }
      });
    }
    const response = json(result);
    if (path === "auth/logout" || path === "auth/password")
      response.cookies.delete(sessionCookie);
    return response;
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message ?? "Check your input." },
        400,
      );
    if (error && typeof error === "object" && "code" in error) {
      if (["57014", "55P03", "40P01", "40001"].includes(String(error.code)))
        return json(
          {
            error:
              "The operation could not finish in time. Refresh to check its status before retrying.",
          },
          503,
        );
      if (error.code === "23505")
        return json(
          { error: "That username or event credit already exists." },
          409,
        );
      if (error.code === "23503")
        return json(
          {
            error:
              "A referenced record no longer exists. Refresh and try again.",
          },
          409,
        );
    }
    if (
      error instanceof Error &&
      /timeout|connection|socket|terminated/i.test(error.message)
    )
      return json(
        {
          error:
            "The database is temporarily unavailable. Refresh to check your changes before retrying.",
        },
        503,
      );
    console.error(
      "SocietyHub request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      {
        error:
          "Unable to complete this request. Please try again or contact SEC.",
      },
      500,
    );
  }
}
async function instrumented(
  req: NextRequest,
  ctx: Parameters<typeof handle>[1],
) {
  const started = performance.now();
  const response = await handle(req, ctx);
  const durationMs = performance.now() - started;
  const path = (await ctx.params).path.join("/");
  const expectedHealthFailure =
    ["readiness", "cron/maintenance"].includes(path) && response.status === 503;
  if (
    !expectedHealthFailure &&
    (response.status >= 500 || Math.random() < 0.1)
  ) {
    after(async () => {
      try {
        await transaction((db) =>
          recordMetric(db, {
            route: path,
            status: response.status,
            durationMs,
            kind: response.status >= 500 ? "server_error" : "request",
          }),
        );
      } catch {
        console.error("Operational metric persistence unavailable.");
      }
    });
  }
  response.headers.set("Server-Timing", `app;dur=${Math.round(durationMs)}`);
  return response;
}
export const GET = instrumented;
export const POST = instrumented;
