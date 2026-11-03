# SocietyHub operations

## Production release gate

`vercel.json` runs `npm run build:vercel`. For a production deployment, the gate requires a successful **Security and workflow checks** push run for the exact `VERCEL_GIT_COMMIT_SHA` on main before starting Next.js build. Pending CI waits about ten minutes; missing identity, failed/skipped/cancelled CI, unverifiable checks, or timeout blocks deployment. Preview/local builds do not wait on production CI. CI calls `npm run build` directly, avoiding a circular dependency.

This public repository can verify Actions through the public GitHub API. An optional server-only `GITHUB_CHECKS_TOKEN` with Actions read permission avoids shared unauthenticated rate limits. Never expose it as NEXT_PUBLIC. If verification fails, production stays on its existing successful deployment; retry deployment once CI/API access is healthy.

Merge protection is separate. The repository administrator must require the `verify` check on main; the connected account lacks admin permission. The user explicitly left that repository rule pending. This build gate does not prevent an authorized writer from editing the gate itself.

## Monitoring

API handlers emit a `Server-Timing` header and persist a 10% success sample plus server failures. Frontend monitoring captures bounded error categories, including the React error boundary, only in production and only for authenticated sessions. It never submits exception messages, stack traces, query strings, request bodies, answers, email addresses, or contacts. Telemetry is capped per page session and per account. Unhandled framework failures emit a generic structured event to Vercel server logs. Metrics failures do not break the user request.

**SEC → Settings & audit → Operational health** shows the previous hour’s server errors, browser error categories, sampled request count, and API response-time p95. Low-volume samples should not be treated as a load test. Metrics expire after 14 days.

The external GitHub recovery workflow checks the public homepage and liveness endpoint before authenticated database/outbox recovery. Failed probes, an unhealthy outbox, at least five server failures or ten browser errors in the previous hour fail the run. GitHub schedules may be delayed; this is approximately five-minute monitoring rather than a strict availability SLA. Enable workflow-failure notifications for the responsible operators in their GitHub notification settings. Expected unhealthy maintenance/readiness responses are not counted again as application failures.

## Recovery drill

Run `npm run restore:drill` with owner credentials in ignored `.env.setup.local` and PostgreSQL 18+ client tools on PATH. On this machine the script can also find Homebrew libpq. Set `PG_BIN` to a directory ending in `/` if needed.

The drill:

1. Creates a randomly named isolated database in the existing project.
2. Exports a consistent read-only PostgreSQL snapshot of production.
3. Uses native `pg_dump`/`pg_restore`, without owner/ACL restoration.
4. Compares row counts and content checksums for every restored production table against that same source snapshot.
5. Deletes the disposable database and private dump. It never replaces production, provisions application access to the restored data, resets points, or dispatches email.

The local report is `work/restore-drill-result.json` with private filesystem permissions. It contains counts and verification results, not row contents. A failed cleanup must be investigated before repeating a drill; check for databases named `societyhub_restore_*`. Do not delete a database merely because its name resembles another task’s fixture.

This tests logical recovery within the existing cluster. It does not establish independence from a project/account outage or validate Neon point-in-time recovery settings. Neon CLI currently exposes a personal Vercel organization; this database belongs to SEC Systems. An SEC Systems Neon administrator still needs to confirm the restore-history window, intended recovery point objective, and recovery access. Test an isolated timestamp restore in that organization before calling cloud disaster recovery verified. A previous-period reset is not a backup.

## Email operations

Submission receipts and decision notifications commit with their business change. A failed email never undoes a committed decision. Known rejections retry with backoff; uncertain sends require explicit duplicate-risk acknowledgement. Resend supports provider idempotency keys; SES does not guarantee exactly-once external delivery. Check application email status in its SEC review view and investigate exhausted/uncertain sends before resending. Feedback stays in the authenticated app.

## Deployment and migrations

Apply new numbered migrations with `npm run db:setup` before deploying dependent code. Dev/prod roles and schema checks remain separate. Builds never migrate live data. Older open editors are rejected using revisions; contacts also carry a revision captured when the editor opens. Refresh or explicitly reload before retrying conflicts.
