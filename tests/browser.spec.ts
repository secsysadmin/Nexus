import { test, expect, type APIRequestContext } from "@playwright/test";
import dotenv from "dotenv";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { hashPassword, token, digest } from "../lib/security";
dotenv.config({ path: ".env.local", quiet: true });
const suffix = randomUUID().slice(0, 8),
  adminName = `qa-sec-${suffix}`,
  societyName = `qa-society-${suffix}`,
  password = token();
let db: pg.Client,
  adminId: string,
  societyId: string,
  otherId: string,
  semesterId: string,
  eventId: string,
  eventToken: string,
  highId: string,
  formId: string;
let provisionId: string | undefined;
const base = process.env.NEXUS_TEST_BASE_URL ?? "http://localhost:3100";
async function post(request: APIRequestContext, path: string, body: unknown) {
  return request.post("/api/" + path, {
    data: body,
    headers: { Origin: base },
  });
}
test.beforeAll(async () => {
  if (process.env.DATABASE_SCHEMA !== "nexus_dev")
    throw new Error("Browser tests may only run against nexus_dev.");
  db = new pg.Client({
    connectionString: process.env.DATABASE_URL!.replace("-pooler.", "."),
  });
  await db.connect();
  await db.query("SET search_path TO nexus_dev,pg_catalog");
  const create = async (username: string, name: string, role: string) =>
    (
      await db.query(
        "INSERT INTO accounts(username,display_name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id",
        [username, name, role, hashPassword(password)],
      )
    ).rows[0].id;
  adminId = await create(adminName, "SEC Browser Test", "admin");
  societyId = await create(
    societyName,
    "Demo Engineering Society · Test data",
    "society",
  );
  otherId = await create(
    `qa-other-${suffix}`,
    "Other society · Test data",
    "society",
  );
  semesterId = (await db.query("SELECT id FROM semesters WHERE is_current"))
    .rows[0].id;
  await db.query(
    "INSERT INTO roster_candidates(source_key,name,contacts,source_timestamp) VALUES($1,$2,$3,$4)",
    [
      suffix,
      "Demo Engineering Society · Test data",
      JSON.stringify({
        president: {
          name: "Test Officer",
          email: "example@example.invalid",
          phone: "",
        },
      }),
      "Test import",
    ],
  );
});
test.afterAll(async () => {
  if (!db) return;
  const ids = [adminId, societyId, otherId, provisionId].filter(Boolean);
  try {
    await db.query("BEGIN");
    await db.query(
      "DELETE FROM credits WHERE account_id=ANY($1::uuid[]) OR event_id IN(SELECT id FROM events WHERE created_by=$2)",
      [ids, adminId],
    );
    await db.query(
      "DELETE FROM submissions WHERE account_id=ANY($1::uuid[]) OR form_id IN(SELECT id FROM forms WHERE created_by=$2)",
      [ids, adminId],
    );
    await db.query(
      "DELETE FROM form_versions WHERE form_id IN(SELECT id FROM forms WHERE created_by=$1)",
      [adminId],
    );
    await db.query("DELETE FROM forms WHERE created_by=$1", [adminId]);
    await db.query("DELETE FROM events WHERE created_by=$1", [adminId]);
    await db.query("DELETE FROM roster_candidates WHERE source_key=$1", [
      suffix,
    ]);
    await db.query("DELETE FROM audit_log WHERE actor_id=ANY($1::uuid[])", [
      ids,
    ]);
    await db.query("DELETE FROM accounts WHERE id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM login_attempts WHERE key=ANY($1::text[])", [
      [
        digest("user:" + adminName),
        digest("user:" + societyName),
        digest("user:" + `qa-other-${suffix}`),
      ],
    ]);
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
});
test("society hub end-to-end: admin, concurrent check-in, drafts, review, QR and responsive views", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    societyContext = await browser.newContext();
  const admin = await adminContext.newPage(),
    society = await societyContext.newPage();
  const errors: string[] = [];
  admin.on("pageerror", (e) => errors.push(e.message));
  society.on("pageerror", (e) => errors.push(e.message));
  await admin.goto("/");
  await admin.getByLabel("Society username", { exact: true }).fill(adminName);
  await admin.getByLabel("Password", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "SEC dashboard" }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Events", exact: true }).click();
  await admin
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  await admin
    .getByLabel("Event name")
    .fill("Presidents’ Round Table · Test data");
  await admin
    .getByLabel("Description", { exact: true })
    .fill("Semester check-in workflow verification.");
  await admin
    .getByLabel("Location", { exact: true })
    .fill("Zachry Engineering Education Complex");
  const local = (n: number) => {
    const d = new Date(Date.now() + n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  await admin.getByLabel("Check-in window starts").fill(local(-3600000));
  await admin.getByLabel("Check-in window ends").fill(local(3600000));
  await admin.getByLabel("Enable check-in within this window").check();
  await admin
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  await expect(
    admin.getByRole("heading", {
      name: "Presidents’ Round Table · Test data",
      exact: true,
    }),
  ).toBeVisible();
  const events = (await (await adminContext.request.get("/api/data")).json())
    .events;
  const event = events.find(
    (e: { name: string }) => e.name === "Presidents’ Round Table · Test data",
  );
  eventId = event.id;
  eventToken = event.checkin_token;
  await admin.getByRole("button", { name: "QR & link", exact: true }).click();
  await expect(
    admin.getByAltText(
      "Check-in QR code for Presidents’ Round Table · Test data",
    ),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Close QR panel" }).click();
  const high = await post(adminContext.request, "admin/events", {
    semesterId,
    name: "Cross-society Engineering Expo · Test data",
    description: "SEC-verified collaboration.",
    location: "Zachry",
    category: "HIGH_IMPACT",
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    endsAt: new Date(Date.now() + 3600000).toISOString(),
    checkinOpen: true,
  });
  expect(high.ok()).toBeTruthy();
  highId = (await high.json()).id;
  await admin
    .getByRole("button", { name: "Applications", exact: true })
    .click();
  await admin
    .getByRole("button", { name: "Create application", exact: true })
    .click();
  await admin
    .getByLabel("Application title")
    .fill("Society Funding Application · Test data");
  await admin
    .getByLabel("Instructions", { exact: true })
    .fill("Tell SEC about your society’s funding request.");
  await admin
    .getByLabel("Question text")
    .fill("What will the funding support?");
  await admin.getByLabel("Answer type").selectOption("long");
  await admin.getByLabel("Publish for societies to view and submit").check();
  await admin
    .getByRole("button", { name: "Save application", exact: true })
    .click();
  await expect(admin.getByRole("status")).toContainText("Application saved.");
  await expect(
    admin.getByRole("heading", {
      name: "Society Funding Application · Test data",
      exact: true,
    }),
  ).toBeVisible();
  const forms = (await (await adminContext.request.get("/api/data")).json())
    .forms;
  formId = forms.find(
    (f: { title: string }) =>
      f.title === "Society Funding Application · Test data",
  ).id;
  await society.goto(`/checkin/${eventId}?token=${eventToken}`);
  await society
    .getByLabel("Society username", { exact: true })
    .fill(societyName);
  await society.getByLabel("Password", { exact: true }).fill(password);
  await society.getByRole("button", { name: "Sign in", exact: true }).click();
  await society.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    society.getByRole("heading", { name: "You’re checked in." }),
  ).toBeVisible();
  await society.getByRole("button", { name: "View dashboard" }).click();
  await expect(
    society.getByText("Semester minimum met", { exact: true }),
  ).toBeVisible();
  const concurrent = await Promise.all(
    Array.from({ length: 12 }, () =>
      post(societyContext.request, "checkin", { eventId, token: eventToken }),
    ),
  );
  for (const r of concurrent) {
    expect(r.ok()).toBeTruthy();
    expect((await r.json()).already).toBe(true);
  }
  const credit = (
    await db.query(
      "SELECT * FROM credits WHERE account_id=$1 AND event_id=$2",
      [societyId, eventId],
    )
  ).rows;
  expect(credit.length).toBe(1);
  expect(credit[0].points).toBe(1);
  const standardResponse = await post(adminContext.request, "admin/events", {
    semesterId,
    name: "Engineering outreach · Test data",
    description: "Concurrent first check-in test.",
    location: "Zachry",
    category: "STANDARD",
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    endsAt: new Date(Date.now() + 3600000).toISOString(),
    checkinOpen: true,
  });
  expect(standardResponse.ok()).toBeTruthy();
  const standard = await standardResponse.json();
  const race = await Promise.all(
    Array.from({ length: 12 }, () =>
      post(societyContext.request, "checkin", {
        eventId: standard.id,
        token: standard.checkin_token,
      }),
    ),
  );
  const raceResults = await Promise.all(
    race.map(async (r) => {
      expect(r.ok()).toBeTruthy();
      return r.json();
    }),
  );
  expect(raceResults.filter((r) => !r.already).length).toBe(1);
  expect(
    (
      await db.query(
        "SELECT count(*)::int count FROM credits WHERE account_id=$1 AND event_id=$2",
        [societyId, standard.id],
      )
    ).rows[0].count,
  ).toBe(1);
  const denied = await post(societyContext.request, "admin/events", {});
  expect(denied.status()).toBe(403);
  const crossOrigin = await societyContext.request.post("/api/auth/logout", {
    data: {},
    headers: { Origin: "https://example.invalid" },
  });
  expect(crossOrigin.status()).toBe(403);
  const highCheck = await post(societyContext.request, "checkin", {
    eventId: highId,
    token: "0".repeat(64),
  });
  expect(highCheck.ok()).toBe(false);
  const manual = await post(adminContext.request, "admin/credits", {
    eventId: highId,
    accountId: societyId,
    note: "Verified collaboration for browser test",
  });
  expect(manual.ok()).toBeTruthy();
  const duplicate = await post(adminContext.request, "admin/credits", {
    eventId: highId,
    accountId: societyId,
    note: "Duplicate must not credit",
  });
  expect(duplicate.status()).toBe(409);
  await society
    .getByRole("button", { name: "Applications", exact: true })
    .click();
  await society.getByRole("button", { name: "Refresh workspace" }).click();
  await society.getByRole("button", { name: "Start application" }).click();
  await society
    .getByLabel("What will the funding support? *", { exact: true })
    .fill("An engineering outreach workshop for our members.");
  await society
    .getByLabel("Confirmation email")
    .fill("officer@example.invalid");
  await society
    .getByRole("button", { name: "Save draft", exact: true })
    .click();
  await expect(society.getByRole("status")).toContainText("Draft saved.");
  await society
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await expect(society.getByRole("status")).toContainText(
    "Application submitted.",
  );
  await mkdir(".impeccable/review", { recursive: true });
  await expect(
    society.getByText(
      "Confirmation email to officer@example.invalid is queued for sending.",
    ),
  ).toBeVisible();
  await society.setViewportSize({ width: 1440, height: 1000 });
  await society.screenshot({
    path: ".impeccable/review/application-email-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await society.setViewportSize({ width: 390, height: 844 });
  expect(
    await society.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await society.screenshot({
    path: ".impeccable/review/application-email-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await society.setViewportSize({ width: 1440, height: 1000 });
  // First-time society setup consumes its token exactly once and the new account is never an admin.
  const provision = await post(adminContext.request, "admin/societies", {
    username: `qa-provision-${suffix}`,
    displayName: "Provisioned test society",
    candidateIds: [],
  });
  const p = await provision.json();
  expect(provision.ok()).toBeTruthy();
  provisionId = (
    await db.query("SELECT id FROM accounts WHERE username=$1", [p.username])
  ).rows[0].id;
  await admin.getByRole("button", { name: "Dashboard", exact: true }).click();
  await admin.getByRole("button", { name: "Refresh workspace" }).click();
  await expect(
    admin.getByRole("region", {
      name: "Applications awaiting review",
      exact: true,
    }),
  ).toHaveAttribute("data-count", "1");
  await expect(
    admin.getByRole("region", { name: "Accounts awaiting setup", exact: true }),
  ).toHaveAttribute("data-count", "1");
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.screenshot({
    path: ".impeccable/review/dashboard-actions-desktop.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1976, height: 1143 });
  await admin.screenshot({
    path: ".impeccable/review/dashboard-actions-user.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  expect(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await admin.screenshot({
    path: ".impeccable/review/dashboard-actions-mobile.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin
    .getByRole("button", {
      name: "Issue setup link for Provisioned test society",
      exact: true,
    })
    .click();
  await expect(
    admin.getByRole("heading", {
      name: `Account setup link for @${p.username}`,
    }),
  ).toBeVisible();
  const setupUrl = await admin.locator(".activation-result input").inputValue();
  p.activation = new URL(setupUrl).searchParams.get("token");
  await admin
    .getByRole("button", { name: "Dismiss link", exact: true })
    .click();
  await admin
    .getByRole("button", {
      name: "Manage Presidents’ Round Table · Test data",
      exact: true,
    })
    .click();
  await expect(admin.getByLabel("Event name")).toHaveValue(
    "Presidents’ Round Table · Test data",
  );
  await admin.getByRole("button", { name: "Dashboard", exact: true }).click();
  await admin
    .getByRole("button", {
      name: "Review next application",
      exact: true,
    })
    .click();
  await expect(
    admin.getByText("An engineering outreach workshop for our members.", {
      exact: true,
    }),
  ).toBeVisible();
  await admin.getByLabel("Review status").selectOption("APPROVED");
  await admin
    .getByLabel("Feedback visible to the society")
    .fill("Approved for this funding cycle.");
  await admin.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(admin.getByRole("status")).toContainText("Review saved.");
  await expect(
    admin.getByRole("heading", { name: "Submitted applications", exact: true }),
  ).toBeVisible();
  const saved = (
    await db.query(
      "SELECT * FROM submissions WHERE form_id=$1 AND account_id=$2",
      [formId, societyId],
    )
  ).rows[0];
  expect(saved.status).toBe("APPROVED");
  expect(
    (
      await db.query(
        "SELECT sum(points)::int points FROM credits WHERE account_id=$1",
        [societyId],
      )
    ).rows[0].points,
  ).toBe(4);
  const activationContext = await browser.newContext();
  const activationPage = await activationContext.newPage();
  await activationPage.goto(`/activate?token=${p.activation}`);
  await activationPage.getByLabel("New password").fill(password);
  await activationPage
    .getByLabel("Confirm password", { exact: true })
    .fill(password);
  await activationPage
    .getByRole("button", { name: "Set password & continue" })
    .click();
  await expect(
    activationPage.getByRole("heading", {
      name: "Hello Provisioned test society",
    }),
  ).toBeVisible();
  const reused = await post(activationContext.request, "auth/activate", {
    token: p.activation,
    password,
  });
  expect(reused.status()).toBe(400);
  const nonAdmin = await post(activationContext.request, "admin/forms", {});
  expect(nonAdmin.status()).toBe(403);
  await activationContext.close();
  // Capture both workspaces at desktop and mobile in the same QA round.
  await mkdir(".impeccable/review", { recursive: true });
  await society.getByRole("button", { name: "Dashboard", exact: true }).click();
  await society.getByRole("button", { name: "Refresh workspace" }).click();
  await expect(society.getByText("approved", { exact: true })).toBeVisible();
  await society.setViewportSize({ width: 1440, height: 1000 });
  await society.screenshot({
    path: ".impeccable/review/society-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await society.setViewportSize({ width: 390, height: 844 });
  expect(
    await society.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await society.screenshot({
    path: ".impeccable/review/society-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await admin.getByRole("button", { name: "Dashboard", exact: true }).click();
  await admin.getByRole("button", { name: "Refresh workspace" }).click();
  await expect(
    admin.getByRole("region", { name: "Accounts awaiting setup", exact: true }),
  ).toHaveAttribute("data-count", "0");
  await expect(
    admin.getByRole("region", {
      name: "Applications awaiting review",
      exact: true,
    }),
  ).toHaveAttribute("data-count", "0");
  await admin.getByText("All society point totals", { exact: true }).click();
  await expect(
    admin.getByRole("heading", {
      name: "Society funding progress",
      exact: true,
    }),
  ).toBeVisible();
  await admin.getByText("All society point totals", { exact: true }).click();
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await admin.screenshot({
    path: ".impeccable/review/admin-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  expect(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await admin.screenshot({
    path: ".impeccable/review/admin-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await expect(admin.locator("#workspace-navigation")).toHaveCSS(
    "visibility",
    "hidden",
  );
  expect(
    await admin.evaluate(() => {
      document
        .querySelectorAll<HTMLElement>(
          "#workspace-navigation a, #workspace-navigation button",
        )
        .forEach((el) => el.focus());
      return document.activeElement?.closest("#workspace-navigation") !== null;
    }),
  ).toBe(false);
  await admin.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    admin.getByRole("button", { name: "Societies", exact: true }),
  ).toBeVisible();
  await expect(
    admin.getByRole("button", { name: "Close sidebar" }),
  ).toBeFocused();
  await expect(
    admin.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await admin.keyboard.press("Escape");
  await expect(
    admin.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await expect(
    admin.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(admin.locator("#workspace-navigation")).toHaveCSS(
    "visibility",
    "hidden",
  );
  expect(errors).toEqual([]);
  await adminContext.close();
  await societyContext.close();
});
