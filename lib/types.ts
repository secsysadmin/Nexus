import type { Question, Answers } from "./domain";
export type Account = {
  id: string;
  username: string;
  display_name: string;
  role: "society" | "admin";
  enabled: boolean;
  activated: boolean;
  contact_revision?: number;
  contacts: Record<string, unknown>;
};
export type PointCycle = {
  id: string;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
};
export type Event = {
  id: string;
  revision: number;
  name: string;
  description: string;
  location: string;
  category: "PRT" | "STANDARD" | "HIGH_IMPACT";
  starts_at: string;
  ends_at: string;
  checkin_starts_at?: string;
  checkin_ends_at?: string;
  checkin_open: boolean;
  checkin_token?: string;
};
export type Credit = {
  id: string;
  cycle_id: string;
  account_id: string;
  event_id: string;
  event_name: string;
  category: Event["category"];
  points: number;
  source: string;
  created_at: string;
  revoked_at: string | null;
  society_name: string;
  note: string;
};
export type Form = {
  id: string;
  title: string;
  description: string;
  kind: "FUNDING" | "HIGH_IMPACT";
  published: boolean;
  deadline: string | null;
  current_version: number;
  questions: Question[];
};
export type Submission = {
  email_kind?: "RECEIPT" | "DECISION";
  confirmation_email: string;
  confirmation_email_id?: string;
  confirmation_status?: "PENDING" | "SENDING" | "SENT" | "FAILED" | "UNCERTAIN";
  confirmation_attempts?: number;
  id: string;
  form_id: string;
  form_version: number;
  account_id: string;
  answers: Answers;
  status: string;
  review_note: string;
  revision: number;
  questions: Question[];
  society_name: string;
  form_title: string;
  submitted_at: string;
  updated_at: string;
};
export type Candidate = {
  id: string;
  name: string;
  contacts: Record<string, unknown>;
  source_timestamp: string;
};
export type Audit = {
  id: string;
  actor_name: string;
  action: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};
export type HubData = {
  operations?: {
    errors: number;
    client_errors: number;
    sampled_requests: number;
    p95_ms: number;
  };
  pagination?: Record<string, { hasMore: boolean; nextOffset: number }>;
  dashboardPreview?: {
    upcomingEvents: Event[];
    pendingReviews: Submission[];
    missingPrt: Account[];
    awaitingSetup: Account[];
  };
  dashboardCounts?: {
    upcomingEvents: number;
    pendingReviews: number;
    missingPrt: number;
    awaitingSetup: number;
    activeSocieties: number;
  };
  outboxHealth?: { uncertain: number; exhausted: number; delayed: number };
  historyCount?: number;
  environment: "development" | "production";
  actor: Pick<Account, "id" | "username" | "display_name" | "role">;
  pointCycle: PointCycle;
  events: Event[];
  credits: Credit[];
  forms: Form[];
  submissions: Submission[];
  accounts: Account[];
  roster: Candidate[];
  audit: Audit[];
  allowlist: { email: string }[];
};
