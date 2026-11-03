# Society Hub architecture

The browser renders a single responsive workspace, backed by Next.js route handlers. All database access and permission checks run on the server. Vercel uses a small PostgreSQL connection pool against Neon’s pooled endpoint. Runtime URLs never enter a browser bundle.

## Data boundaries

Every operation obtains a connection, begins a transaction, and sets a validated transaction-local search path. `nexus_dev` and `nexus_prod` have independent tables and runtime roles. Setup owns DDL; runtime roles receive only schema usage, table DML, and sequence usage. They cannot alter schemas or read the other environment. The migration table is excluded from runtime grants. Existing schemas in the database are left intact.

## Identity

`accounts` contains society and SEC identities, roles, enabled state, hashed passwords, and imported contact responses. Society usernames are normalized to lowercase. The initial SEC identity uses the same credential mechanism with an admin role. Passwords use asynchronous, versioned scrypt (N=16384, r=8, p=5), upgrading legacy hashes after verified sign-in; sessions and activation tokens are random 256-bit values whose SHA-256 digests are stored in Postgres. Sessions last seven days; activation/reset links last seven days and are single-use. Password changes revoke sessions and outstanding setup tokens. Disabled accounts cannot authenticate or use sessions. Authentication throttling persists in Postgres: a connection request budget is separate from failed username/connection attempts. Successful authentication clears failures. Activation issuance/redemption lock the account and a unique index permits one outstanding token per account.

Every mutation requires same-origin JSON requests. Every authenticated request resolves the current enabled account and its database role from the session. Browser-provided account IDs never control self-service attendance or application ownership. State changes use POST, including check-in; opening a link alone does not change attendance. Audit records identify the shared account; until individual Google admin identities are added, a shared SEC login cannot identify the individual chair.

`admin_allowlist` prepares exact `@tamu.edu` addresses for future Google OAuth. It is explicitly inactive as an authentication method in this release. When OAuth is added, verify Google email verification, exact email whitelist membership, issuer/audience, and link identities by provider subject; do not grant access merely because an email ends in `tamu.edu`.

## Point periods and credit

SEC manually archives the current `point_cycles` row and creates a new period. Shared advisory locks serialize awards against that reset; an expected-cycle guard rejects stale resets. Legacy `semesters` rows remain solely for database compatibility. Events have immutable categories. PRT/Standard check-in requires a valid event token, an enabled event, and the configured time window. Unique `(account_id,event_id)` credit prevents repeat attendance, including after a reset. High Impact awards require SEC verification. Revocation preserves evidence and restoration reuses the original row. Approval never awards points.

## Applications

`forms` contains publication, deadline, category, and semester metadata. Each edit creates an immutable `form_versions` row. A society’s first saved draft captures that question version; subsequent edits to the form do not reinterpret previous answers. `submissions` is unique per form and society and carries status, answers, revision, feedback, and timestamps. Draft saves lock the account and existing submission; their write enforces the expected revision and editable status. Decisions cannot be overwritten by concurrent society saves. Form/event editors carry expected versions and return 409 on stale input. Required fields are enforced on submission, and answer types/choices are checked even in drafts.

A submitted application is read-only to its society until SEC requests changes. An administrator can mark it Under Review, Changes Requested, Approved, or Denied. Feedback is visible to the owning society. Review and form publishing are audited. Old submission question versions remain readable after a form closes. CHANGES_REQUESTED submissions may be revised after the initial deadline or unpublishing; this exception never permits a new initial application.

## Contact import

The original CSV remains outside the repository. `roster_candidates` stores each unique response and original contact values. Source hashes make repeated staging safe. SEC explicitly chooses the responses belonging to one society; creating its account atomically binds those candidates and preserves their original names/timestamps in the account’s contacts. Officers are contact records, not separate login identities.

## Failure containment and verification

Authentication, idempotency, data access, maintenance authentication, and email delivery have separate server modules. Runtime transactions install statement/lock/idle budgets and release or discard clients on failure; the pool handles idle connection errors. Browser requests time out with outcome-unknown guidance for mutations. Event/form creates use persisted request keys, bound to actor/action/body, to replay a lost response without duplicates. Editor navigation warns before discarding changes.

Routine data loads contain current credit and list metadata; question/answer details are authorized on demand and archived attendance is paginated. Expired operational records are cleaned by maintenance. Funding/audit history is retained until SEC defines a retention policy. Compatible CSP and existing security headers apply to page responses.

Unit/fault tests apply the real migrations to in-memory PostgreSQL. Real PostgreSQL tests use two connections to verify both decision/save interleavings, activation rotation/redemption, create deduplication, and cancellation recovery. Playwright uses a disposable source copy, separate port, and random disposable schema. CI runs all suites, TypeScript, build, and dependency audit. Test delivery uses fake providers or is disabled.

## Application email receipts

Submission and outbox content commit atomically. Normal dispatch runs after commit; an authenticated scheduled GitHub Actions job recovers due messages with bounded retries/backoff. Claims are atomic and leases exclude overlapping senders. A provider rejection becomes FAILED; network uncertainty or an expired lease becomes UNCERTAIN. Acceptance acknowledgement is retried separately; a retained provider ID can be reconciled without another send. SEC must acknowledge duplicate risk before retrying uncertain mail. SES cannot guarantee exactly-once external delivery.

Maintenance JWT verification trusts only GitHub’s fixed signing-key endpoint, issuer, production origin audience, immutable repository ID, exact workflow on main, and scheduled/manual triggers. Failure/readiness results make the workflow fail for operator attention. Runtime cleanup affects only expired sessions, tokens, attempt keys, and request-key records. Receipt content excludes application answers.

## Operations workflow update

Migration 005 separates event and check-in timestamps, adds contact revisions, distinguishes decision/receipt outbox jobs, and adds short-lived operational metrics. `data-pages.ts` provides role-scoped metadata pages, complete contact groups, month-based event queries, and independent dashboard aggregates. `contacts.ts` updates current contacts without modifying imported responses. Browser feature editors and shared controls live in separate modules. Production builds verify exact-commit CI before compiling; see the operations runbook for recovery limits and the pending administrator-owned merge rule.
