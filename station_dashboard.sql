-- Create Station Collaborators Table
CREATE TABLE IF NOT EXISTS station_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'JEFE', 'LOGISTICA', 'CHOFER', 'SEGURIDAD'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(station_id, person_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_station_collaborators_station ON station_collaborators(station_id);

-- Ensure persons has assigned_station_id if not already (it should exist per previous context)
-- ALTER TABLE persons ADD COLUMN IF NOT EXISTS assigned_station_id UUID REFERENCES stations(id);
-- INDEX for dashboard query
CREATE INDEX IF NOT EXISTS idx_persons_assigned_station ON persons(assigned_station_id) WHERE assigned_station_id IS NOT NULL;
