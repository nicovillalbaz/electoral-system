BEGIN;
-- Add assigned_station_id to users to link them to a PC
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS assigned_station_id uuid REFERENCES stations(id);
COMMIT;
