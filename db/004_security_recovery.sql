-- Keep a single current setup/reset link, including on concurrent issuance.
DELETE FROM activation_tokens a USING activation_tokens b
 WHERE a.account_id=b.account_id AND (a.expires_at,a.token_hash)<(b.expires_at,b.token_hash);
CREATE UNIQUE INDEX activation_one_per_account ON activation_tokens(account_id);
ALTER TABLE events ADD COLUMN revision integer NOT NULL DEFAULT 1;
CREATE TABLE mutation_requests (
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 request_key uuid NOT NULL, action text NOT NULL, body_hash text NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,request_key)
);
ALTER TABLE application_emails DROP CONSTRAINT application_emails_status_check;
ALTER TABLE application_emails ADD CONSTRAINT application_emails_status_check CHECK(status IN('PENDING','SENDING','SENT','FAILED','UNCERTAIN'));
-- Older FAILED records did not distinguish provider rejection from lost acknowledgements.
UPDATE application_emails SET status='UNCERTAIN',last_error='Legacy delivery failure requires review before resending.' WHERE status='FAILED';
ALTER TABLE application_emails ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE application_emails ADD COLUMN accepted_at timestamptz;
CREATE TABLE maintenance_runs (name text PRIMARY KEY,last_started_at timestamptz,last_finished_at timestamptz,details jsonb NOT NULL DEFAULT '{}');
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX activation_expiry ON activation_tokens(expires_at);
