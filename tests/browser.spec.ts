import { test, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { hashPassword, token, digest } from "../lib/security";
// The test runner injects an isolated schema; never load developer credentials.
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
    headers: { Origin: base, "X-Idempotency-Key": randomUUID() },
  });
}
test.beforeAll(async () => {
  if (
    process.env.ISOLATED_TEST_DATABASE !== "true" ||
    !/^nexus_test_[a-f0-9]{12}$/.test(process.env.DATABASE_SCHEMA ?? "")
  )
    throw new Error("Run npm run test:e2e to use an isolated test database.");
  db = new pg.Client({
    connectionString: process.env.DATABASE_URL!.replace("-pooler.", "."),
    statement_timeout: 10000,
    query_timeout: 12000,
  });
  await db.connect();
  await db.query(
    `SET search_path TO ${process.env.DATABASE_SCHEMA},pg_catalog`,
  );
  const create = async (username: string, name: string, role: string) =>
    (
      await db.query(
        "INSERT INTO accounts(username,display_name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id",
        [username, name, role, await hashPassword(password)],
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
  await admin.getByLabel("Event starts", { exact: true }).fill(local(-3600000));
  await admin.getByLabel("Event ends", { exact: true }).fill(local(3600000));
  await admin.getByLabel("Check-in window starts").fill(local(-3600000));
  await admin.getByLabel("Check-in window ends").fill(local(3600000));
  await admin.getByRole("radio", { name: /^Enabled/ }).check();
  await admin.screenshot({
    path: ".impeccable/review/event-time-editor-desktop.png",
    fullPage: true,
  });
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
  const downloaded = admin.waitForEvent("download");
  await admin.getByRole("link", { name: "Download PNG", exact: true }).click();
  const png = await downloaded;
  const pngPath = await png.path();
  expect(pngPath).toBeTruthy();
  const pngBytes = await readFile(pngPath!);
  expect(pngBytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(pngBytes.readUInt32BE(16)).toBe(1024);
  expect(png.suggestedFilename()).toMatch(/check-in\.png$/);
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.evaluate(() => window.scrollTo(0, 0));
  await admin.screenshot({
    path: ".impeccable/review/qr-download-desktop.png",
    fullPage: true,
  });
  await expect(
    admin.getByRole("dialog", {
      name: "Check-in · Presidents’ Round Table · Test data",
    }),
  ).toBeVisible();
  await admin.keyboard.press("Escape");
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await expect(
    admin.getByRole("button", { name: "QR & link", exact: true }),
  ).toBeFocused();
  await admin.getByRole("button", { name: "QR & link", exact: true }).click();
  await admin.getByRole("button", { name: "Close QR panel" }).click();
  await admin.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(
    admin.getByRole("grid", { name: /event calendar/ }),
  ).toBeVisible();
  const today = admin.locator('.calendar-day[aria-current="date"]');
  await today.focus();
  await today.press("ArrowRight");
  await admin
    .locator('.calendar-cell[aria-selected="true"] button')
    .press("ArrowLeft");
  await expect(
    admin
      .locator(".calendar-day-details")
      .getByText("Presidents’ Round Table · Test data", { exact: true }),
  ).toBeVisible();
  await admin.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await admin.screenshot({
    path: ".impeccable/review/events-calendar-desktop.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  expect(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await admin.screenshot({
    path: ".impeccable/review/events-calendar-mobile.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.getByRole("button", { name: "List", exact: true }).click();

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
  await admin.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await admin.screenshot({
    path: ".impeccable/review/application-publication-editor.png",
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(admin.getByRole("status")).toContainText("Draft saved.");
  await expect(admin.getByText("Draft", { exact: true })).toBeVisible();
  await admin.evaluate(() => window.scrollTo(0, 0));
  await admin.screenshot({
    path: ".impeccable/review/application-draft-list.png",
    fullPage: true,
  });
  await admin
    .getByRole("button", {
      name: "Publish Society Funding Application · Test data",
      exact: true,
    })
    .click();
  await expect(admin.getByRole("status")).toContainText(
    "Application published.",
  );
  await expect(admin.getByText("Published", { exact: true })).toBeVisible();
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
  await society.goto(`/checkin/${eventId}#token=${eventToken}`);
  await society
    .getByLabel("Society username", { exact: true })
    .fill(societyName);
  await society.getByLabel("Password", { exact: true }).fill(password);
  await society.getByRole("button", { name: "Sign in", exact: true }).click();
  await society.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    society.getByRole("heading", { name: "You’re checked in." }),
  ).toBeFocused();
  await society.getByRole("button", { name: "View dashboard" }).click();
  await expect(society.getByText("Minimum met", { exact: true })).toBeVisible();
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
  await activationPage.goto(`/activate#token=${p.activation}`);
  await activationPage.getByLabel("New password").fill(password);
  await activationPage
    .getByLabel("Confirm password", { exact: true })
    .fill(password);
  await activationPage
    .getByRole("button", { name: "Set password & continue" })
    .click();
  await expect(
    activationPage.getByRole("heading", {
      name: "Hello, Provisioned test society",
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
  await expect(admin.locator(".mobile-menu")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
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

test("manual point controls replace semester picker; administrative activity disclosure", async ({
  page,
}) => {
  await page.route("**/api/data*", (route) =>
    route.fulfill({
      json: {
        actor: {
          id: "visual",
          username: "sec",
          display_name: "Test SEC",
          role: "admin",
        },
        pointCycle: {
          id: "fall",
          started_at: "2026-07-01T05:00:00Z",
          ended_at: null,
          is_current: true,
        },
        legacyContainers: [
          {
            id: "fall",
            name: "Fall 2026",
            starts_on: "2026-07-01",
            ends_on: "2026-12-31",
            is_current: true,
          },
          {
            id: "spring",
            name: "Spring 2026",
            starts_on: "2026-01-01",
            ends_on: "2026-06-30",
            is_current: false,
          },
        ],
        events: [],
        forms: [],
        accounts: [],
        credits: [],
        submissions: [],
        roster: [],
        audit: [
          {
            id: 1,
            actor_name: "sec",
            action: "EVENT_CREATED",
            created_at: "2026-11-02T20:00:00Z",
            details: {},
          },
        ],
        allowlist: [],
        environment: "development",
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("combobox", { name: "Viewing semester" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Settings & audit", exact: true })
    .click();
  const disclosure = page.locator(".audit-disclosure");
  await expect(disclosure).not.toHaveAttribute("open");
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(disclosure.locator(".record-list")).toBeVisible();
  await disclosure.locator("summary").press("Enter");
  await expect(disclosure.locator(".record-list")).toBeHidden();
});

test("QR replacement feedback stays inside the modal on failure and success", async ({
  page,
}) => {
  let replaced = false;
  const event = {
    id: "qr-test",
    semester_id: "fall",
    name: "QR feedback · Test data",
    category: "PRT",
    description: "Test fixture",
    location: "Test workspace",
    starts_at: "2026-11-02T21:00:00Z",
    ends_at: "2026-11-09T22:00:00Z",
    checkin_open: true,
    checkin_token: "a".repeat(64),
  };
  await page.route("**/api/data*", (r) =>
    r.fulfill({
      json: {
        actor: {
          id: "sec",
          username: "sec",
          display_name: "SEC · Test data",
          role: "admin",
        },
        pointCycle: {
          id: "fall",
          started_at: "2026-07-01T05:00:00Z",
          ended_at: null,
          is_current: true,
        },
        legacyContainers: [
          {
            id: "fall",
            name: "Fall 2026",
            starts_on: "2026-07-01",
            ends_on: "2026-12-31",
            is_current: true,
          },
        ],
        events: [
          { ...event, checkin_token: (replaced ? "b" : "a").repeat(64) },
        ],
        accounts: [],
        credits: [],
        forms: [],
        submissions: [],
        roster: [],
        audit: [],
        allowlist: [],
        environment: "development",
      },
    }),
  );
  await page.route("**/api/admin/event-checkin", (r) =>
    replaced
      ? r.fulfill({ json: { ok: true } })
      : r.fulfill({
          status: 503,
          json: { error: "Test provider unavailable" },
        }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByRole("button", { name: "QR & link", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("link", { name: "Download PNG" }).waitFor();
  const colors = await modal.getByRole("img").evaluate(async (node) => {
    const image = node as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < bytes.length; i += 4)
      colors.add(`${bytes[i]},${bytes[i + 1]},${bytes[i + 2]},${bytes[i + 3]}`);
    return [...colors].sort();
  });
  expect(colors).toEqual(["0,0,0,255", "255,255,255,255"]);

  await modal.getByRole("button", { name: "Replace link & QR" }).click();
  await expect(modal.getByRole("alert")).toContainText(
    "Couldn’t confirm the replacement",
  );
  await page.screenshot({
    path: ".impeccable/review/qr-modal-failure-desktop.png",
  });
  const oldImage = await modal.getByRole("img").getAttribute("src");
  replaced = true;
  await modal.getByRole("button", { name: "Replace link & QR" }).click();
  await expect(modal.locator(".qr-feedback[role=status]")).toContainText(
    "Previous links and QR codes no longer work",
  );
  await expect(modal.getByRole("img")).not.toHaveAttribute("src", oldImage!);
  await page.screenshot({
    path: ".impeccable/review/qr-modal-success-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/qr-modal-success-mobile.png",
  });
  await expect(modal).toBeVisible();
  expect(await modal.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
    true,
  );
});

test("mobile navigation protects focus and roster filters preserve explicit selections", async ({
  page,
}) => {
  await page.route("**/api/data*", (route) =>
    route.fulfill({
      json: {
        actor: {
          id: "sec",
          username: "sec",
          display_name: "SEC accessibility fixture",
          role: "admin",
        },
        pointCycle: {
          id: "fall",
          started_at: "2026-07-01T05:00:00Z",
          ended_at: null,
          is_current: true,
        },
        legacyContainers: [
          {
            id: "fall",
            name: "Fall 2026",
            starts_on: "2026-07-01",
            ends_on: "2026-12-31",
            is_current: true,
          },
        ],
        events: [],
        forms: [],
        accounts: [],
        credits: [],
        submissions: [],
        audit: [],
        allowlist: [],
        environment: "development",
        roster: [
          {
            id: "gamma-two",
            name: "GAMMA ENGINEERING SOCIETY",
            source_timestamp: "11/02/2026",
            contacts: {
              president: {
                name: "Second Officer",
                email: "gamma-two@example.invalid",
              },
            },
          },
          {
            id: "gamma",
            name: "Gamma Engineering Society",
            source_timestamp: "11/01/2026",
            contacts: {
              president: {
                name: "Gamma President",
                email: "gamma@example.invalid",
              },
            },
          },
          {
            id: "delta",
            name: "Delta Engineering Society",
            source_timestamp: "11/02/2026",
            contacts: {
              president: {
                name: "Delta President",
                email: "delta@example.invalid",
              },
            },
          },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("heading", { name: "SEC dashboard" }).waitFor();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeVisible();
  expect(
    await page.locator(".main").evaluate((n) => (n as HTMLElement).inert),
  ).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .locator(".sidebar")
        .evaluate((n) => n.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect(
    await page.locator(".main").evaluate((n) => (n as HTMLElement).inert),
  ).toBe(false);
  await menu.click();
  await page.getByRole("button", { name: "Societies", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search contact roster" });
  await search.fill("Gamma");
  await expect(page.locator(".roster-row")).toHaveCount(1);
  await page.locator(".roster-row").getByRole("checkbox").check();
  await search.fill("Delta");
  await expect(page.locator(".roster-toolbar")).toContainText(
    "2 responses selected",
  );
  await search.fill("");
  await expect(
    page
      .locator(".roster-row")
      .filter({ hasText: "Gamma Engineering Society" })
      .getByRole("checkbox"),
  ).toBeChecked();
  await page
    .locator(".roster-row")
    .filter({ hasText: "gamma@example.invalid" })
    .locator("summary")
    .click();
  await expect(
    page.getByRole("link", { name: "gamma@example.invalid" }),
  ).toHaveAttribute("href", "mailto:gamma@example.invalid");
  await expect(
    page.getByRole("link", { name: "gamma-two@example.invalid", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add society", exact: true }).click();
  const username = page.getByRole("textbox", {
    name: "Society username",
    exact: true,
  });
  await expect(username).toHaveAttribute("aria-describedby", /.+/);
  await expect(username).toHaveAccessibleDescription(/lowercase letters/);
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toHaveCount(0);
  expect(
    await page.locator(".main").evaluate((n) => (n as HTMLElement).inert),
  ).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("manual reset is explicit, preserves history, and event check-in can reopen with the same link", async ({
  page,
}) => {
  let starts = new Date(Date.now() - 3600000).toISOString();
  let current = "initial",
    open = true,
    end = new Date(Date.now() + 3600000).toISOString();
  const event = () => ({
    id: "demo",
    name: "Reopening test event",
    description: "",
    location: "Zachry",
    category: "PRT",
    starts_at: starts,
    ends_at: end,
    checkin_open: open,
    checkin_token: "0".repeat(64),
  });
  const dataset = () => ({
    actor: { id: "sec", username: "sec", display_name: "SEC", role: "admin" },
    pointCycle: {
      id: current,
      started_at: new Date().toISOString(),
      ended_at: null,
      is_current: true,
    },
    events: [event()],
    forms: [],
    accounts: [],
    credits: [
      {
        id: "credit",
        cycle_id: "initial",
        account_id: "society",
        society_name: "Test Society",
        event_name: "Previous event",
        event_id: "old",
        points: 1,
        category: "PRT",
        source: "CHECK_IN",
        created_at: new Date().toISOString(),
        revoked_at: null,
      },
    ],
    submissions: [],
    roster: [],
    audit: [],
    allowlist: [],
    environment: "development",
  });
  await page.route("**/api/data*", (r) => r.fulfill({ json: dataset() }));
  await page.route("**/api/activity/history?*", (r) =>
    r.fulfill({ json: { items: dataset().credits, hasMore: false } }),
  );
  await page.route("**/api/admin/reset-points", (r) => {
    expect(r.request().postDataJSON()).toEqual({
      currentCycleId: "initial",
      confirmation: "RESET POINTS",
    });
    current = "next";
    return r.fulfill({ json: { id: current } });
  });
  await page.route("**/api/admin/event-checkin", (r) => {
    open = r.request().postDataJSON().open;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/admin/events", (r) => {
    const body = r.request().postDataJSON();
    expect(typeof body.checkinOpen).toBe("boolean");
    end = body.checkinEndsAt ?? body.endsAt;
    open = body.checkinOpen;
    return r.fulfill({ json: { id: "demo" } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Settings & audit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset all society points", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Reset all society points?" });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "Reset points", exact: true }),
  ).toBeDisabled();
  await modal.getByLabel("Type RESET POINTS to confirm").fill("RESET POINTS");
  await modal
    .getByRole("button", { name: "Reset points", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole("button", { name: "Attendance & points", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No attendance recorded", exact: true }),
  ).toBeVisible();
  await page.locator(".history-disclosure summary").click();
  await expect(page.getByText("Previous event", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("radio", { name: /^Paused/ }).check();
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enable check-in", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("radio", { name: /^Enabled/ }).check();
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause check-in", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Pause check-in", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable check-in", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enable check-in", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause check-in", exact: true }),
  ).toBeVisible();
  open = false;
  starts = new Date(Date.now() + 3600000).toISOString();
  end = new Date(Date.now() + 7200000).toISOString();
  await page
    .getByRole("button", { name: "Refresh workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable check-in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enable event check-in" }),
  ).toHaveCount(0);
  await expect(page.locator(".event-details")).toContainText(
    "Check-in scheduled",
  );
  starts = new Date(Date.now() - 3600000).toISOString();
  open = false;
  end = new Date(Date.now() - 60000).toISOString();
  await page
    .getByRole("button", { name: "Refresh workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable check-in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enable event check-in" }),
  ).toBeVisible();
  const local = new Date(Date.now() + 3600000);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  await page
    .getByLabel("Check-in window ends", { exact: true })
    .fill(local.toISOString().slice(0, 16));
  await page
    .getByRole("button", { name: "Enable check-in", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause check-in", exact: true }),
  ).toBeVisible();
});

test("workspace skeleton announces loading and the desktop login footer stays on one line", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/api/data*", async (route) => {
    await gate;
    await route.fulfill({ status: 401, json: { error: "Please sign in." } });
  });
  await page.setViewportSize({ width: 1976, height: 1280 });
  await page.goto("/");
  await expect(
    page.getByRole("main", { name: "Loading SocietyHub" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status")).toHaveText("Loading your workspace…");
  release();
  await page.getByRole("heading", { name: "Welcome to SocietyHub" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1976, 1440, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    const footer = page.locator(".auth-description");
    expect(
      await footer.evaluate(
        (n) =>
          n.getBoundingClientRect().height <=
          parseFloat(getComputedStyle(n).lineHeight) + 1,
      ),
    ).toBe(true);
  }
});

test("stale admin edits preserve input, offer reload, and warn before discarding work", async ({
  page,
}) => {
  const event = {
    id: randomUUID(),
    revision: 1,
    name: "Original event",
    description: "",
    location: "Zachry",
    category: "PRT",
    starts_at: new Date(Date.now() - 60000).toISOString(),
    ends_at: new Date(Date.now() + 3600000).toISOString(),
    checkin_open: true,
    checkin_token: "0".repeat(64),
  };
  const dataset = () => ({
    actor: { id: "sec", username: "sec", display_name: "SEC", role: "admin" },
    pointCycle: {
      id: "current",
      started_at: new Date().toISOString(),
      ended_at: null,
      is_current: true,
    },
    events: [event],
    credits: [],
    forms: [],
    submissions: [],
    accounts: [],
    roster: [],
    audit: [],
    allowlist: [],
    environment: "development",
  });
  await page.route("**/api/data*", (r) => r.fulfill({ json: dataset() }));
  await page.route("**/api/events/" + event.id, (r) =>
    r.fulfill({ json: event }),
  );
  await page.route("**/api/admin/events", (r) => {
    expect(r.request().postDataJSON().expectedVersion).toBe(1);
    event.revision = 2;
    event.name = "Latest saved event";
    return r.fulfill({
      status: 409,
      json: { error: "This event changed. Reload before saving." },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Event name", { exact: true }).fill("My unsaved edit");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Applications", exact: true }).click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "My unsaved edit",
  );
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.locator(".alert.error[role='alert']")).toContainText(
    "This event changed",
  );
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "My unsaved edit",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Reload saved version", exact: true })
    .click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "Latest saved event",
  );
});

test("society contacts save, stay private, and stale changes require a deliberate reload", async ({
  browser,
}) => {
  const societyContext = await browser.newContext(),
    adminContext = await browser.newContext();
  const page = await societyContext.newPage();
  try {
    expect(
      (
        await post(societyContext.request, "auth/login", {
          username: societyName,
          password,
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await post(adminContext.request, "auth/login", {
          username: adminName,
          password,
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Account settings", exact: true })
      .click();
    await page
      .getByLabel("President name", { exact: true })
      .fill("Current Officer");
    await page
      .getByLabel("President email", { exact: true })
      .fill("officer@example.invalid");
    await page
      .getByLabel("Preferred notification email", { exact: true })
      .fill("preferred@example.invalid");
    await page
      .getByRole("button", { name: "Save contacts", exact: true })
      .click();
    await expect(
      page.getByText("Society contacts updated.", { exact: true }),
    ).toBeVisible();
    const own = await (await societyContext.request.get("/api/data")).json();
    const account = own.accounts.find((a: any) => a.id === societyId);
    expect(account.contact_revision).toBe(2);
    expect(own.accounts).toHaveLength(1);
    const deepLinkSubmission =
      own.submissions.find((s: any) => s.status === "APPROVED") ??
      own.submissions[0];
    const denied = await societyContext.request.get("/api/accounts/" + otherId);
    expect(denied.status()).toBe(404);
    const updated = await post(adminContext.request, "accounts/contacts", {
      accountId: societyId,
      revision: 2,
      profile: {
        ...account.contacts.current,
        president: {
          ...account.contacts.current.president,
          name: "SEC corrected contact",
        },
      },
    });
    expect(updated.ok()).toBe(true);
    await page
      .getByLabel("President name", { exact: true })
      .fill("My unsaved change");
    await page
      .getByRole("button", { name: "Save contacts", exact: true })
      .click();
    await expect(page.locator(".alert.error")).toContainText(
      "contacts changed",
    );
    await expect(
      page.getByLabel("President name", { exact: true }),
    ).toHaveValue("My unsaved change");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Reload saved version", exact: true })
      .click();
    await expect(
      page.getByLabel("President name", { exact: true }),
    ).toHaveValue("SEC corrected contact");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: ".impeccable/review/contact-settings-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: ".impeccable/review/contact-settings-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (deepLinkSubmission) {
      await page.goto("/?submission=" + deepLinkSubmission.id);
      await expect(
        page.getByRole("button", { name: "Back to applications", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".application-content")).toContainText(
        "submitted",
      );
    }
  } finally {
    await societyContext.close();
    await adminContext.close();
  }
});

test("theme follows the device, persists an explicit choice, and keeps password controls usable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/api/data**", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in required" } }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Password", { exact: true }).fill("a-private-password");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Switch to dark mode", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
