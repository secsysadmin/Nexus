CREATE TABLE accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9][a-z0-9._-]{1,39}$'),
 display_name text NOT NULL, role text NOT NULL CHECK (role IN ('society','admin')), password_hash text, enabled boolean NOT NULL DEFAULT true,
 contacts jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX ON sessions(account_id);
CREATE TABLE activation_tokens (token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE login_attempts (key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now());
CREATE TABLE semesters (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL, is_current boolean NOT NULL DEFAULT false, CHECK(ends_on >= starts_on));
CREATE UNIQUE INDEX one_current_semester ON semesters(is_current) WHERE is_current;
CREATE TABLE events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), semester_id uuid NOT NULL REFERENCES semesters(id), name text NOT NULL,
 description text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', category text NOT NULL CHECK(category IN ('PRT','STANDARD','HIGH_IMPACT')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, checkin_open boolean NOT NULL DEFAULT false, checkin_token text NOT NULL,
 created_by uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at > starts_at));
CREATE TABLE credits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES accounts(id), event_id uuid NOT NULL REFERENCES events(id),
 category text NOT NULL CHECK(category IN ('PRT','STANDARD','HIGH_IMPACT')), points integer NOT NULL,
 source text NOT NULL CHECK(source IN ('CHECK_IN','MANUAL')), awarded_by uuid REFERENCES accounts(id), note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 UNIQUE(account_id,event_id), CHECK((category IN ('PRT','STANDARD') AND points=1) OR (category='HIGH_IMPACT' AND points=2)), CHECK(category != 'HIGH_IMPACT' OR source='MANUAL'));
CREATE INDEX ON credits(event_id);
CREATE TABLE forms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), semester_id uuid NOT NULL REFERENCES semesters(id), title text NOT NULL, description text NOT NULL DEFAULT '', kind text NOT NULL CHECK(kind IN ('FUNDING','HIGH_IMPACT')),
 published boolean NOT NULL DEFAULT false, deadline timestamptz, current_version integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE form_versions (form_id uuid NOT NULL REFERENCES forms(id), version integer NOT NULL, questions jsonb NOT NULL, PRIMARY KEY(form_id,version));
CREATE TABLE submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), form_id uuid NOT NULL REFERENCES forms(id), form_version integer NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id),
 answers jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','DENIED')), review_note text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1,
 submitted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(form_id,account_id), FOREIGN KEY(form_id,form_version) REFERENCES form_versions(form_id,version));
CREATE TABLE roster_candidates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_key text UNIQUE NOT NULL, name text NOT NULL, contacts jsonb NOT NULL, source_timestamp text NOT NULL, account_id uuid REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES accounts(id), action text NOT NULL, target_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE admin_allowlist (email text PRIMARY KEY CHECK(email ~ '^[^@]+@tamu\.edu$'), created_at timestamptz NOT NULL DEFAULT now());
