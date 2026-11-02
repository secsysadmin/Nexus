ALTER TABLE submissions ADD COLUMN confirmation_email text NOT NULL DEFAULT '';
CREATE TABLE application_emails (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
 submission_revision integer NOT NULL, recipient text NOT NULL, subject text NOT NULL, html text NOT NULL, body text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENDING','SENT','FAILED')),
 attempts integer NOT NULL DEFAULT 0, lease_token text, lease_until timestamptz, provider_id text, last_error text,
 created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, UNIQUE(submission_id,submission_revision)
);
CREATE INDEX application_emails_pending ON application_emails(status,created_at) WHERE status!='SENT';
