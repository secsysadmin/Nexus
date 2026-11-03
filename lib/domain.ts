import { z } from "zod";
export const MAX_ANSWER_LENGTH = 20000;
export const MAX_OPTION_LENGTH = 200;
export const MAX_OPTIONS = 30;
export const MAX_QUESTIONS = 50;
const HIGH_IMPACT_POINTS = 2;
const STANDARD_POINTS = 1;
export const MAX_EMAIL_ATTEMPTS = 5;
export const categories = ["PRT", "STANDARD", "HIGH_IMPACT"] as const;
export const formKinds = ["FUNDING", "HIGH_IMPACT"] as const;
export const questionTypes = [
  "short",
  "long",
  "select",
  "checkbox",
  "number",
] as const;
export function isOneOf<T extends string>(
  options: readonly T[],
  value: string,
): value is T {
  return options.some((option) => option === value);
}
export const labels: Record<string, string> = {
  PRT: "Presidents’ Round Table",
  STANDARD: "Standard Event",
  HIGH_IMPACT: "High Impact Event",
};
export const pointsFor = (category: string) =>
  category === "HIGH_IMPACT" ? HIGH_IMPACT_POINTS : STANDARD_POINTS;
export const questionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    label: z.string().trim().min(1).max(500),
    type: z.enum(questionTypes),
    required: z.boolean(),
    options: z
      .array(z.string().trim().min(1).max(MAX_OPTION_LENGTH))
      .max(MAX_OPTIONS)
      .default([]),
  })
  .refine(
    (q) => !["select", "checkbox"].includes(q.type) || q.options.length > 0,
    { message: "Choice questions need options" },
  );
export const questionsSchema = z
  .array(questionSchema)
  .min(1)
  .max(MAX_QUESTIONS)
  .refine((q) => new Set(q.map((x) => x.id)).size === q.length, {
    message: "Question IDs must be unique",
  });
export type Question = z.infer<typeof questionSchema>;
export type Answers = Record<string, string | string[]>;
export function validateAnswers(
  questions: Question[],
  answers: Answers,
  submit: boolean,
) {
  for (const key of Object.keys(answers))
    if (!questions.some((q) => q.id === key))
      throw new Error("An answer references an unknown question.");
  for (const q of questions) {
    const v = answers[q.id];
    const empty =
      v === undefined || (typeof v === "string" ? !v.trim() : v.length === 0);
    if (submit && q.required && empty)
      throw new Error(`Please complete: ${q.label}`);
    if (empty) continue;
    if (q.type === "checkbox") {
      if (!Array.isArray(v) || v.some((x) => !q.options.includes(x)))
        throw new Error(`Choose valid options for ${q.label}`);
    } else {
      if (typeof v !== "string")
        throw new Error(`Invalid answer for ${q.label}`);
      if (v.length > MAX_ANSWER_LENGTH)
        throw new Error("An answer is too long.");
      if (q.type === "select" && !q.options.includes(v))
        throw new Error(`Choose a valid option for ${q.label}`);
      if (q.type === "number" && !Number.isFinite(Number(v)))
        throw new Error(`${q.label} must be a number.`);
    }
  }
}
export function resolveEnvironment(env: Record<string, string | undefined>) {
  const schema = env.DATABASE_SCHEMA;
  if (schema !== "nexus_dev" && schema !== "nexus_prod")
    throw new Error("DATABASE_SCHEMA must be nexus_dev or nexus_prod.");
  if (env.VERCEL_ENV === "production" && schema !== "nexus_prod")
    throw new Error("Production must use nexus_prod.");
  if (
    env.VERCEL_ENV &&
    env.VERCEL_ENV !== "production" &&
    schema !== "nexus_dev"
  )
    throw new Error("Preview/development must use nexus_dev.");
  if (
    !env.VERCEL_ENV &&
    schema === "nexus_prod" &&
    env.ALLOW_PRODUCTION_DATABASE !== "true"
  )
    throw new Error(
      "Local production database access requires ALLOW_PRODUCTION_DATABASE=true.",
    );
  return schema;
}
