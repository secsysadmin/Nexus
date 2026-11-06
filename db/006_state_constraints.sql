ALTER TABLE application_emails ADD CONSTRAINT application_emails_lease_matches_status CHECK((status='SENDING') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)) NOT VALID;
ALTER TABLE application_emails ADD CONSTRAINT application_emails_sent_has_time CHECK(status<>'SENT' OR sent_at IS NOT NULL) NOT VALID;
ALTER TABLE point_cycles ADD CONSTRAINT point_cycles_current_is_open CHECK(is_current = (ended_at IS NULL)) NOT VALID;
