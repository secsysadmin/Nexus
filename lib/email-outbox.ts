import { operationalHealth } from "./observability";
import type { PoolClient } from "pg";
import { transaction, audit } from "./db";
import { token } from "./security";
import { MAX_EMAIL_ATTEMPTS } from "./domain";
import { emailDeliveryEnabled, sendMail, type Mail } from "./email";
type Transact = <T>(fn: (db: PoolClient) => Promise<T>) => Promise<T>;
export async function deliverApplicationEmail(
  id: string,
  deps: {
    transact?: Transact;
    send?: (mail: Mail, key: string) => Promise<string>;
    enabled?: boolean;
  } = {},
) {
  if (!(deps.enabled ?? emailDeliveryEnabled())) return { status: "DISABLED" };
  const transact = deps.transact ?? transaction,
    lease = token();
  // An expired lease may have reached SES: never blindly resend an uncertain message.
  await transact((db) =>
    db.query(
      "UPDATE application_emails SET status='UNCERTAIN',last_error='Delivery outcome is unknown. Review before resending.',lease_token=NULL,lease_until=NULL WHERE id=$1 AND status='SENDING' AND lease_until<now()",
      [id],
    ),
  );
  const item = await transact(
    async (db) =>
      (
        await db.query(
          "UPDATE application_emails SET status='SENDING',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '2 minutes',last_error=NULL WHERE id=$1 AND attempts<$3 AND next_attempt_at<=now() AND status IN('PENDING','FAILED') RETURNING *",
          [id, lease, MAX_EMAIL_ATTEMPTS],
        )
      ).rows[0],
  );
  if (!item) return { status: "UNCHANGED" };
  let providerId: string;
  try {
    providerId = await (deps.send ?? sendMail)(
      {
        to: item.recipient,
        subject: item.subject,
        html: item.html,
        body: item.body,
      },
      item.id,
    );
  } catch (error) {
    const uncertain = !!(
      error &&
      typeof error === "object" &&
      "deliveryUncertain" in error &&
      error.deliveryUncertain
    );
    await transact(async (db) => {
      const r = await db.query(
        "UPDATE application_emails SET status=$3,last_error=$4,next_attempt_at=now()+least(60,power(2,attempts)) * interval '1 minute',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2 RETURNING id",
        [
          id,
          lease,
          uncertain ? "UNCERTAIN" : "FAILED",
          uncertain
            ? "Delivery outcome is unknown. Review before resending."
            : "Provider rejected delivery. Automatic retry is scheduled.",
        ],
      );
      if (r.rowCount)
        await audit(
          db,
          null,
          uncertain
            ? "APPLICATION_CONFIRMATION_UNCERTAIN"
            : "APPLICATION_CONFIRMATION_FAILED",
          item.submission_id,
          { emailId: id },
        );
    });
    return { status: uncertain ? "UNCERTAIN" : "FAILED" };
  }
  // Provider acceptance and acknowledgement persistence are different failure domains.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const recorded = await transact(async (db) => {
        const r = await db.query(
          "UPDATE application_emails SET status='SENT',sent_at=now(),accepted_at=now(),provider_id=$3,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2 RETURNING id",
          [id, lease, providerId],
        );
        if (r.rowCount)
          await audit(
            db,
            null,
            "APPLICATION_CONFIRMATION_SENT",
            item.submission_id,
            { emailId: id },
          );
        return !!r.rowCount;
      });
      return { status: recorded ? "SENT" : "UNCERTAIN" };
    } catch {
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }
  }
  // Persist the accepted provider ID if the database recovered; never mark accepted mail FAILED.
  try {
    await transact((db) =>
      db.query(
        "UPDATE application_emails SET status='UNCERTAIN',accepted_at=now(),provider_id=$3,last_error='Provider accepted this receipt; acknowledgement needs reconciliation.',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
        [id, lease, providerId],
      ),
    );
  } catch {
    console.error(
      "Receipt accepted; database acknowledgement unavailable. Lease recovery will require review.",
    );
  }
  return { status: "UNCERTAIN" };
}
export async function outboxHealth(db: PoolClient) {
  return (
    await db.query(
      "SELECT count(*) FILTER(WHERE status='UNCERTAIN')::int uncertain,count(*) FILTER(WHERE status IN('PENDING','FAILED') AND attempts>=$1)::int exhausted,count(*) FILTER(WHERE status IN('PENDING','FAILED','SENDING') AND created_at<now()-interval '2 hours')::int delayed FROM application_emails",
      [MAX_EMAIL_ATTEMPTS],
    )
  ).rows[0];
}
export async function runMaintenance(
  deps: {
    transact?: Transact;
    send?: (mail: Mail, key: string) => Promise<string>;
    enabled?: boolean;
  } = {},
) {
  const transact = deps.transact ?? transaction;
  const started = Date.now();
  await transact(async (db) => {
    await db.query(
      "INSERT INTO maintenance_runs(name,last_started_at)VALUES('outbox',now()) ON CONFLICT(name) DO UPDATE SET last_started_at=now()",
    );
    await db.query(
      "UPDATE application_emails SET status='UNCERTAIN',last_error='Delivery outcome is unknown. Review before resending.',lease_token=NULL,lease_until=NULL WHERE status='SENDING' AND lease_until<now()",
    );
    await db.query(
      "UPDATE application_emails SET status='SENT',sent_at=COALESCE(sent_at,accepted_at) WHERE status='UNCERTAIN' AND accepted_at IS NOT NULL AND provider_id IS NOT NULL",
    );
  });
  const ids = await transact(
    async (db) =>
      (
        await db.query(
          "SELECT id FROM application_emails WHERE status IN('PENDING','FAILED') AND attempts<$1 AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 10",
          [MAX_EMAIL_ATTEMPTS],
        )
      ).rows,
  );
  let processed = 0;
  for (const row of ids) {
    if (Date.now() - started > 35000) break;
    await deliverApplicationEmail(row.id, deps);
    processed++;
  }
  const health = await transact(async (db) => {
    await db.query(
      "DELETE FROM sessions WHERE expires_at<now()-interval '1 day'",
    );
    await db.query(
      "DELETE FROM activation_tokens WHERE expires_at<now()-interval '1 day'",
    );
    await db.query(
      "DELETE FROM login_attempts WHERE window_start<now()-interval '1 day'",
    );
    await db.query(
      "DELETE FROM mutation_requests WHERE created_at<now()-interval '30 days'",
    );
    await db.query(
      "DELETE FROM operational_metrics WHERE created_at<now()-interval '14 days'",
    );
    const operations = await operationalHealth(db);
    const health = { ...(await outboxHealth(db)), operations };
    await db.query(
      "UPDATE maintenance_runs SET last_finished_at=now(),details=$1 WHERE name='outbox'",
      [JSON.stringify({ ...health, processed })],
    );
    return health;
  });
  return {
    processed,
    ...health,
    ok:
      !health.uncertain &&
      !health.exhausted &&
      !health.delayed &&
      health.operations.errors < 5 &&
      health.operations.client_errors < 10,
  };
}
