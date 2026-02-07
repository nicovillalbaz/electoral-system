-- DAY D REBUILD - MASTER MIGRATION
-- Run this to ensure all columns for Day D Control exist.
-- It is safe to run multiple times (idempotent).

-- 1. JSONB for Logistics Requests
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS requests JSONB DEFAULT '[]'::jsonb;

-- 2. Financial/Viatico Fields
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS has_financial_needs BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS financial_needs_fulfilled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS financial_amount NUMERIC(15, 0) DEFAULT 0;

-- 3. Check-in Timestamp (Passed PC)
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS station_checkin_at TIMESTAMP WITH TIME ZONE;

-- 4. Notes/Observations (Persistent text)
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 5. Ensure Day D Status enum exists or is text
-- (Usually handled by code, but ensuring column exists)
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS status_day_d TEXT DEFAULT 'PENDING';

-- 6. Ensure Assigned Station Check
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS assigned_station_id UUID;

-- 7. Ensure Campaign Status
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS campaign_status TEXT DEFAULT 'NOT_VISITED';

-- 8. Add index for faster Day D Grid lookups
CREATE INDEX IF NOT EXISTS idx_persons_day_d_status ON persons(campaign_id, status_day_d);
CREATE INDEX IF NOT EXISTS idx_persons_has_voted ON persons(campaign_id, has_voted);
