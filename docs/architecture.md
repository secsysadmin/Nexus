# Society Hub architecture

The browser renders a single responsive workspace, backed by Next.js route handlers. All database access and permission checks run on the server. Vercel uses a small PostgreSQL connection pool against Neon’s pooled endpoint. Runtime URLs never enter a browser bundle.

## Data boundaries

Every operation obtains a connection, begins a transaction, and sets a validated transaction-local search path. `nexus_dev` and `nexus_prod` have independent tables and runtime roles. Setup owns DDL; runtime roles receive only schema usage, table DML, and sequence usage. They cannot alter schemas or read the other environment. The migration table is excluded from runtime grants. Existing schemas in the database are left intact.

## Identity

`accounts` contains society and SEC identities, roles, enabled state, hashed passwords, and imported contact responses. Society usernames are normalized to lowercase. The initial SEC identity uses the same credential mechanism with an admin role. Passwords use salted scrypt; sessions and activation tokens are random 256-bit values whose SHA-256 digests are stored in Postgres. Sessions last seven days; activation/reset links last seven days and are single-use. Password changes revoke sessions and outstanding setup tokens. Disabled accounts cannot authenticate or use sessions. Authentication throttling persists in Postgres rather than process memory.

Every mutation requires same-origin JSON requests. Every authenticated request resolves the current enabled account and its database role from the session. Browser-provided account IDs never control self-service attendance or application ownership. State changes use POST, including check-in; opening a link alone does not change attendance. Audit records identify the shared account; until individual Google admin identities are added, a shared SEC login cannot identify the individual chair.

`admin_allowlist` prepares exact `@tamu.edu` addresses for future Google OAuth. It is explicitly inactive as an authentication method in this release. When OAuth is added, verify Google email verification, exact email whitelist membership, issuer/audience, and link identities by provider subject; do not grant access merely because an email ends in `tamu.edu`.

## Semesters and credit

`semesters` has at most one current semester. Events belong to one semester and have an immutable category. Only the current semester accepts self-service check-ins, within the event’s configured window and while enabled. A random event token is shared through its QR/link and can be replaced by SEC.

`credits` is the attendance ledger. Its unique `(account_id,event_id)` constraint makes concurrent check-ins idempotent. The server awards PRT and Standard points from the category, never from browser input. High Impact requires an administrator and a verification note; the database also disallows automatic High Impact awards. Credit removal sets `revoked_at`, preserving the original record; restoration does not create a second credit. Dashboards sum active credits by the event’s semester and category. Switching semesters changes the selected period and preserves past totals. Application approval is never an award trigger.

## Applications

`forms` contains publication, deadline, category, and semester metadata. Each edit creates an immutable `form_versions` row. A society’s first saved draft captures that question version; subsequent edits to the form do not reinterpret previous answers. `submissions` is unique per form and society and carries status, answers, revision, feedback, and timestamps. Draft saves lock the society account, so simultaneous initial saves cannot race. Revision numbers detect stale edits from another officer. Required fields are enforced on submission, and answer types/choices are checked even in drafts.

A submitted application is read-only to its society until SEC requests changes. An administrator can mark it Under Review, Changes Requested, Approved, or Denied. Feedback is visible to the owning society. Review and form publishing are audited. Old submission question versions remain readable after a form closes.

## Contact import

The original CSV remains outside the repository. `roster_candidates` stores each unique response and original contact values. Source hashes make repeated staging safe. SEC explicitly chooses the responses belonging to one society; creating its account atomically binds those candidates and preserves their original names/timestamps in the account’s contacts. Officers are contact records, not separate login identities.

## Verification

The in-memory PostgreSQL workflow suite loads the same SQL migration as Neon and tests category rules, duplicate and revoked attendance, closed and historical windows, authorization, form versions, revision conflicts, review/resubmission, and semester history. Playwright exercises real Next.js handlers against development Neon, including simultaneous requests, SEC authorization, one-time activation, and responsive layouts. Generated fixtures and browser artifacts are excluded from production and Git.

## Application email receipts

Migration 002 adds the submission confirmation address and `application_emails` outbox. A submit transaction stores the exact receipt content and a unique submission/revision job. Sending starts only after the transaction commits. A lease and atomic claim exclude overlapping senders, and a sent job is never claimed again. Failures retain the submitted application and a generic delivery error for SEC retry. The transport reuses Delphi’s SES/Resend selection and MIME/throttling behavior; mail credentials live outside Git and are enabled only in Production. Receipts include application title, society name, semester, submission time, and reference; they exclude answers. A pending/failed latest receipt can be retried by SEC from the submission review screen. Society sessions cannot retry or inspect another society’s receipts.
