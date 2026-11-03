-- Preserve existing calendar dates and check-in behavior while separating the concepts.
ALTER TABLE events ADD COLUMN checkin_starts_at timestamptz;
ALTER TABLE events ADD COLUMN checkin_ends_at timestamptz;
UPDATE events SET checkin_starts_at=starts_at,checkin_ends_at=ends_at;
ALTER TABLE events ALTER COLUMN checkin_starts_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN checkin_ends_at SET NOT NULL;
ALTER TABLE events ADD CONSTRAINT checkin_window_order CHECK(checkin_ends_at>checkin_starts_at);
-- Legacy/direct fixture inserts inherit event times; app writes both explicitly.
CREATE FUNCTION default_checkin_window() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 NEW.checkin_starts_at=COALESCE(NEW.checkin_starts_at,NEW.starts_at);
 NEW.checkin_ends_at=COALESCE(NEW.checkin_ends_at,NEW.ends_at); RETURN NEW; END$$;
CREATE TRIGGER default_checkin_window BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION default_checkin_window();
ALTER TABLE accounts ADD COLUMN contact_revision integer NOT NULL DEFAULT 1;
ALTER TABLE application_emails ADD COLUMN kind text NOT NULL DEFAULT 'RECEIPT' CHECK(kind IN('RECEIPT','DECISION'));
CREATE INDEX events_calendar_range ON events(starts_at,ends_at);
CREATE INDEX submissions_review_order ON submissions(status,submitted_at);
CREATE TABLE operational_metrics (
 id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
 route text NOT NULL, status integer NOT NULL, duration_ms integer NOT NULL,
 kind text NOT NULL CHECK(kind IN('request','client_error','server_error')),
 fingerprint text
);
CREATE INDEX operational_metrics_recent ON operational_metrics(created_at);
