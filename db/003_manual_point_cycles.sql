-- Preserve historical credit while replacing visible semester management with manual resets.
CREATE TABLE point_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 started_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 is_current boolean NOT NULL DEFAULT false,
 created_by uuid REFERENCES accounts(id),
 CHECK(ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX one_current_point_cycle ON point_cycles(is_current) WHERE is_current;
INSERT INTO point_cycles(id,started_at,ended_at,is_current)
 SELECT id,starts_on::timestamp AT TIME ZONE 'America/Chicago',
 CASE WHEN is_current THEN NULL ELSE (ends_on + 1)::timestamp AT TIME ZONE 'America/Chicago' END,is_current
 FROM semesters;
INSERT INTO point_cycles(is_current) SELECT true WHERE NOT EXISTS(SELECT 1 FROM point_cycles WHERE is_current);
CREATE FUNCTION current_point_cycle_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT id FROM point_cycles WHERE is_current
$$;
ALTER TABLE credits ADD COLUMN cycle_id uuid REFERENCES point_cycles(id);
UPDATE credits c SET cycle_id=e.semester_id FROM events e WHERE e.id=c.event_id;
ALTER TABLE credits ALTER COLUMN cycle_id SET NOT NULL;
ALTER TABLE credits ALTER COLUMN cycle_id SET DEFAULT current_point_cycle_id();
CREATE INDEX credits_cycle ON credits(cycle_id,account_id);
