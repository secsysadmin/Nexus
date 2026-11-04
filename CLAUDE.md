# Nexus — SocietyHub

One Next.js app on Vercel gives Texas A&M engineering student organizations (ESOs) a
semester-by-semester record of attendance and funding points, and a place to apply to SEC. The
public name is SocietyHub; Nexus is internal only. Product scope is in `PRODUCT.md`, the visual
system in `DESIGN.md`, and the data and security model in `docs/architecture.md`.

Stack: Next.js App Router, TypeScript strict with no `any`, raw `pg` against Neon Postgres (no
ORM), server-managed sessions with scrypt passwords, Amazon SES (or Resend) for email. Dev and
prod live in separate schemas (`nexus_dev`, `nexus_prod`) in one Neon database, each with its own
restricted runtime role.

## Commands

- `npm run dev` — Next dev server.
- `npm run build` / `npm run typecheck` — must both pass before any commit.
- `npm test` — workflow and domain tests against in-memory Postgres (PGlite) loading the same
  migrations as Neon.
- `npm run test:e2e` — Playwright against real Next handlers and the dev Neon schema.
- `npm run db:setup` — applies `db/NNN_*.sql` to both schemas using the owner URL in
  `.env.setup.local`, and checks each applied migration's checksum. A migration is never edited
  after it has been applied; a change is a new numbered file, shipped in the same PR as the code
  that needs it.
- `npm run roster:stage -- <csv> [--prod]` — stages the contact CSV. The CSV and its contents
  never enter Git.

## Rules

- Postgres is the source of truth. No state lives only in memory, the browser, or the email
  provider; throttling and sessions are in Postgres too.
- Every database operation goes through `transaction()` in `lib/db.ts`, which sets the
  transaction-local search path. Runtime code never runs DDL and never touches the other
  environment's schema.
- Credit belongs to the ESO. The unique `(account_id, event_id)` constraint is what makes repeat
  and concurrent check-ins idempotent; never a read-then-write across two queries. The server
  derives points from the event category, never from browser input, and High Impact is only
  awarded by an admin with a note.
- Records are preserved, not deleted. Credit removal sets `revoked_at` and restoring it reuses the
  same row; form edits add a new `form_versions` row; a draft keeps the question version it
  started on; past semesters stay readable.
- Every admin mutation (events, credits, forms, reviews, societies, settings) writes an
  `audit_log` row through `audit()` in the same transaction.
- Email goes through the outbox: a request inserts an `application_emails` row in its own
  transaction and sending starts only after commit. Sends claim the row with a lease so a retry
  or an overlapping sender never double-sends, and failed rows stay visible to SEC for retry.
  Delivery is on only in Production.
- Authorization runs on the server for every request, from the session's current enabled
  account and its role (society or SEC admin) and ownership. Browser-provided account ids never
  decide whose attendance or application is touched. Hiding a button is not access control.
- Mutations are same-origin JSON POSTs, including check-in; opening a link never changes state.
- Activation and reset links are single-use, expire, and are stored only as SHA-256 digests.
  Password changes revoke sessions and outstanding tokens.
- The admin allowlist is inactive until Google OAuth ships; never grant access because an email
  ends in `tamu.edu`.
- Contact data, credentials and one-time links never go in committed files, logs, or test
  fixtures.

## Frontend

`DESIGN.md` is the source of truth for color, type, spacing and components; read it before
touching UI. Colors come from the tokens in `app/globals.css` by role, never raw hex in markup.
Status is shown with a label, never a color alone. Plain labels, sentence-case headings, factual
copy.

## Coding rules

Rules, not preferences. Each one is a defect in review.

**Comments**
- Zero comments: no JSDoc, no banner or section-divider comments, no narration inside
  functions, no commented-out code, no TODOs. Code explains itself through names and small
  functions. If a line seems to need a comment, rename the constant or extract a function with
  a descriptive name, then delete the comment.
- The only exception is one line for a genuinely non-obvious external quirk that code cannot
  express: an API limitation or a security invariant (why a query takes a row lock). Keep these
  rare; every one is a deletion candidate in review.
- `/// <reference` and the `"use client"` / `"use server"` pragmas are directives, not comments.

**Types and shape**
- Strict TypeScript, no `any`. No type assertions or non-null assertions except at a typed
  boundary (request bodies, CSV rows, email provider responses, DB rows): parse the payload at
  the fields you read, with zod where it fits, and keep loose shapes out of callers.
- Functions do one thing; extract instead of nesting. No long parameter lists; pass an object.
- No magic values. Point values, windows, TTLs, lease durations, attempt limits, pool sizes and
  page sizes are `SCREAMING_SNAKE_CASE` constants at module scope, or come from env or the DB
  with a named default. Module-level constants sit at the top of the file above the functions,
  never inside a function body.
- No IIFEs and no `typeof import("…")` type imports.
- In `.tsx`: props use a named type declared at the top of the file, not an inline annotation;
  React 19 refs go on that props type as `ref?: React.Ref<…>`, never `forwardRef`; no inline
  `style={{}}` where a class or stylesheet works.
- Kebab-case file names. Match the surrounding file's style when editing it.

**Structure**
- `app/` holds routes, pages and components; `lib/` holds domain logic, queries, security and
  email; `db/` holds numbered SQL migrations; `scripts/` holds setup tooling.
- Dependencies point one way: page/route → service → domain → `db`. Components never import
  `lib/db.ts` or run queries, and domain code never imports React or Next.
- One module per concern. `app/hub.tsx` and `lib/service.ts` are already oversized: new work
  goes in its own module instead of growing them, and a change that has to touch them anyway
  extracts the piece it touches.
- Make illegal states unrepresentable. Statuses are discriminated unions in TypeScript and
  check constraints in Postgres; never a set of optional fields or booleans where only some
  combinations are valid.
- Validate and parse at the boundary (route handler, CSV import, script entry) into typed domain
  values; code past the boundary trusts its types and doesn't re-check.
- No pass-through wrappers. A function that only forwards its arguments to another function
  gets inlined.

**Reuse**
- Grep for the canonical example (an existing module) before writing pattern-shaped code, and
  mirror it exactly, defaults and quirks included.
- Shared logic lives in one place: session and role checks, audit logging, outbox enqueueing,
  CSV parsing and export, error-to-response mapping.
- Default to the durable option over the shortcut.

**Errors and responses**
- Never `catch {}` into silence. A catch returns a typed error value, rethrows, or logs and
  produces a user-visible response.
- Every request path responds. A DB, email, or validation failure is a visible error, never a
  hung request or a silent success.
- Logs go through `console.error` / `console.warn` for failures with the identifying id in the
  message, and `console.debug` for everything else. No `console.log` in `app/` or `lib/`. Never
  log passwords, tokens, setup or reset links, contact details, or full payloads.

**Non-negotiables (easy to violate, always checked)**
- Server-side authorization by role and ownership on every route.
- Nothing that validates secrets runs at import time. The DB pool and email clients are built
  lazily on first call, because `next build` imports every route.
- The credit, preservation, audit and outbox rules above.

**Scope and verification**
- Change only what the task needs: no cosmetic cleanups in touched files, no repo-wide
  refactors to make verification pass.
- `npm run typecheck`, `npm run build` and `npm test` before finishing. Run checks through the
  package scripts, never one-off substitutes, and never `echo` a success marker. A pre-existing
  failure you did not cause gets raised, not worked around.
- A failing check gets its cause fixed: never skip it, loosen it, or special-case around it.
- Test the real path first (against the dev schema) before writing stubs, and confirm a test is
  needed before writing one. Every hand-off includes the local steps to verify it.
- Before every push, a code-reviewer subagent reviews the diff for dead code, rule violations
  and edge cases. Read the whole batch of findings, group them by root cause, and fix each cause
  once.
- Never commit or push without an explicit instruction. Single-line conventional-commit
  messages (`feat:`, `fix:`, `perf:`, `chore:`, `refactor:`, `docs:`, `test:`), lowercase after
  the colon, aiming under 50 chars, saying what changed (not why), no ticket ids, no body, no
  trailing period.
- Worktrees live at `.claude/worktrees/<name>` (gitignored).
- "Reset" or "clean" tooling replays the flow; it never deletes data.

## Audit rubric (flag these)

Each is a defect to fix, not a preference:

1. Any comment beyond the single-line external-quirk exception: banners, narration, JSDoc.
2. Commented-out code or TODOs.
3. `any`, type assertions, or non-null assertions outside a typed boundary.
4. Functions doing several things, deep nesting, long parameter lists.
5. Duplicated logic (session checks, audit logging, outbox enqueueing, CSV handling, error
   mapping).
6. Magic numbers or meaningful bare string literals (points, TTLs, lease durations, limits).
7. Swallowed errors, or a failure path that does not end in a visible response.
8. Dead code, unused exports/imports/params, env vars in `.env.example` nothing reads.
9. A route missing a server-side role or ownership check.
10. A client constructed or a required secret read at module top level.
11. A credit awarded outside the unique constraint, a deleted record that should be revoked or
    versioned, an admin mutation without an audit row, or an email sent outside the outbox.
12. Secrets, passwords, tokens, setup links, or contact data in code, logs, comments, or
    committed files.
13. `console.log` in `app/` or `lib/`; module constants declared mid-file or inside functions;
    IIFEs; `typeof import()` types; inline `.tsx` props types, `forwardRef`, or avoidable inline
    styles.
14. A dependency pointing the wrong way (a component importing `db`, domain code importing
    React), or new code added to an oversized module instead of its own.
15. A state the types or schema allow but the domain doesn't, validation after the boundary, or
    pass-through wrappers.
16. UI that departs from `DESIGN.md`.
