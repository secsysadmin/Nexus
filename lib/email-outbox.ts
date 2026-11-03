import type { PoolClient } from "pg";
import { transaction, audit } from "./db";
import { token } from "./security";
import { emailDeliveryEnabled, sendMail, type Mail } from "./email";
import { MAX_EMAIL_ATTEMPTS } from "./domain";
const SEND_LEASE_MINUTES = 2;
const DELIVERY_FAILED_MESSAGE =
  "Delivery failed. SEC can retry after checking email settings.";
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
  const transact = deps.transact ?? transaction;
  const lease = token();
  const item = await transact(
    async (db) =>
      (
        await db.query(
          "UPDATE application_emails SET status='SENDING',attempts=attempts+1,lease_token=$2,lease_until=now()+make_interval(mins => $3),last_error=NULL WHERE id=$1 AND attempts<$4 AND (status IN ('PENDING','FAILED') OR (status='SENDING' AND lease_until<now())) RETURNING *",
          [id, lease, SEND_LEASE_MINUTES, MAX_EMAIL_ATTEMPTS],
        )
      ).rows[0],
  );
  if (!item) return { status: "UNCHANGED" };
  try {
    const providerId = await (deps.send ?? sendMail)(
      {
        to: item.recipient,
        subject: item.subject,
        html: item.html,
        body: item.body,
      },
      item.id,
    );
    await transact(async (db) => {
      await db.query(
        "UPDATE application_emails SET status='SENT',sent_at=now(),provider_id=$3,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
        [id, lease, providerId],
      );
      await audit(
        db,
        null,
        "APPLICATION_CONFIRMATION_SENT",
        item.submission_id,
        { emailId: id },
      );
    });
    return { status: "SENT" };
  } catch (error) {
    console.error(
      `Application email ${id} failed to send: ${error instanceof Error ? error.name : "unknown error"}`,
    );
    await transact(async (db) => {
      await db.query(
        "UPDATE application_emails SET status='FAILED',last_error=$3,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
        [id, lease, DELIVERY_FAILED_MESSAGE],
      );
      await audit(
        db,
        null,
        "APPLICATION_CONFIRMATION_FAILED",
        item.submission_id,
        { emailId: id },
      );
    });
    return { status: "FAILED" };
  }
}
