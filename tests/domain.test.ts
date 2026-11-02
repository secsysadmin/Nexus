import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveEnvironment,
  validateAnswers,
  safeReturn,
  questionsSchema,
  type Question,
} from "../lib/domain";
import { hashPassword, verifyPassword } from "../lib/security";
test("environment guards reject preview to production and local production by default", () => {
  assert.equal(
    resolveEnvironment({ DATABASE_SCHEMA: "nexus_dev", VERCEL_ENV: "preview" }),
    "nexus_dev",
  );
  assert.equal(
    resolveEnvironment({
      DATABASE_SCHEMA: "nexus_prod",
      VERCEL_ENV: "production",
    }),
    "nexus_prod",
  );
  assert.throws(() =>
    resolveEnvironment({
      DATABASE_SCHEMA: "nexus_prod",
      VERCEL_ENV: "preview",
    }),
  );
  assert.throws(() =>
    resolveEnvironment({
      DATABASE_SCHEMA: "nexus_dev",
      VERCEL_ENV: "production",
    }),
  );
  assert.throws(() => resolveEnvironment({ DATABASE_SCHEMA: "public" }));
  assert.throws(() => resolveEnvironment({ DATABASE_SCHEMA: "nexus_prod" }));
});
test("password hashes are salted and verify without storing the password", () => {
  const a = hashPassword("A long society password");
  const b = hashPassword("A long society password");
  assert.notEqual(a, b);
  assert(verifyPassword("A long society password", a));
  assert(!verifyPassword("incorrect", a));
  assert(!verifyPassword("x", "invalid"));
});
test("drafts allow incomplete answers; submission validates required fields, types and choices", () => {
  const q: Question[] = [
    {
      id: "name",
      label: "Society name",
      type: "short",
      required: true,
      options: [],
    },
    {
      id: "choice",
      label: "Choose",
      type: "checkbox",
      required: true,
      options: ["A", "B"],
    },
    {
      id: "budget",
      label: "Budget",
      type: "number",
      required: false,
      options: [],
    },
  ];
  assert.doesNotThrow(() => validateAnswers(q, {}, false));
  assert.throws(() => validateAnswers(q, {}, true));
  assert.throws(() =>
    validateAnswers(q, { name: "Name", choice: ["C"] }, true),
  );
  assert.throws(() => validateAnswers(q, { name: ["unexpected"] }, false));
  assert.throws(() => validateAnswers(q, { unknown: "value" }, false));
  assert.throws(() => validateAnswers(q, { budget: "not a number" }, false));
  assert.doesNotThrow(() =>
    validateAnswers(
      q,
      { name: "Society", choice: ["A"], budget: "1500" },
      true,
    ),
  );
});
test("form IDs must be unique and choices need options", () => {
  assert(
    !questionsSchema.safeParse([
      { id: "a", label: "A", type: "select", required: true, options: [] },
    ]).success,
  );
  assert(
    !questionsSchema.safeParse([
      { id: "a", label: "A", type: "short", required: true },
      { id: "a", label: "B", type: "short", required: true },
    ]).success,
  );
});
test("return URLs cannot redirect off site", () => {
  assert.equal(safeReturn("//evil.test"), "/");
  assert.equal(safeReturn("/\\evil.test"), "/");
  assert.equal(safeReturn("/events"), "/events");
});
