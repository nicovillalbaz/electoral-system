BEGIN;
-- Add parent_campaign_id to campaigns to link them (Hierarchy)
ALTER TABLE IF EXISTS campaigns ADD COLUMN IF NOT EXISTS parent_campaign_id uuid REFERENCES campaigns(id);
COMMIT;
