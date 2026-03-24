BEGIN;

ALTER TABLE station_checkins
  ADD COLUMN IF NOT EXISTS date_bucket date;

UPDATE station_checkins
SET date_bucket = COALESCE(date_bucket, checkin_at::date, CURRENT_DATE)
WHERE date_bucket IS NULL;

ALTER TABLE station_checkins
  ALTER COLUMN date_bucket SET DEFAULT CURRENT_DATE;

ALTER TABLE station_checkins
  ALTER COLUMN date_bucket SET NOT NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id, station_id, person_id, date_bucket
      ORDER BY checkin_at ASC, id ASC
    ) AS rn
  FROM station_checkins
)
DELETE FROM station_checkins sc
USING ranked r
WHERE sc.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'station_checkins_campaign_station_person_date_bucket_key'
      AND conrelid = 'station_checkins'::regclass
  ) THEN
    ALTER TABLE station_checkins
      ADD CONSTRAINT station_checkins_campaign_station_person_date_bucket_key
      UNIQUE (campaign_id, station_id, person_id, date_bucket);
  END IF;
END $$;

COMMIT;
