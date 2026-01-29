-- ============================================================
-- Electoral System (PostgreSQL) - Complete DB Structure (v1)
-- Author: generated for Nicolás
-- Notes:
--  - Uses UUIDs (pgcrypto)
--  - Multi-campaign / multi-tenant (campaign_id in all core tables)
--  - Immutable event log (events) + current-state fields on persons
--  - Territory: city -> zone -> neighborhood -> polling_place -> polling_table
--  - Field ops: stations (puestos), station check-ins, anti-duplicate via unique keys
--  - Custom tags + custom lists
--  - Audit-friendly: events + created/updated timestamps + soft-deletes where needed
-- ============================================================

BEGIN;

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------- Helper: updated_at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE campaign_phase AS ENUM ('NORMAL', 'VOTING', 'POST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vote_intent AS ENUM ('SURE', 'PROBABLE', 'UNDECIDED', 'OPPOSITION', 'ABSTAIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'STATION_MANAGER', 'OPERATOR', 'VOLUNTEER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE station_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('OFFICIAL_PADRON', 'PARTY_PADRON', 'CUSTOM_IMPORT', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'PERSON_CREATED',
    'PERSON_UPDATED',
    'VOTE_INTENT_CHANGED',
    'PERSON_CONTACTED',
    'PERSON_MARKED_VOTED',
    'STATION_CHECKIN_CREATED',
    'DUPLICATE_ATTEMPT',
    'LIST_CREATED',
    'LIST_UPDATED',
    'TAG_ASSIGNED',
    'TAG_REMOVED',
    'SOURCE_IMPORTED',
    'SOURCE_ROW_LINKED',
    'USER_LOGIN',
    'USER_LOGOUT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) Campaigns + Users + Access Control
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  status       text NOT NULL DEFAULT 'ACTIVE',
  phase        campaign_phase NOT NULL DEFAULT 'NORMAL',
  starts_at    timestamptz NULL,
  ends_at      timestamptz NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_campaigns_updated
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          user_role NOT NULL DEFAULT 'OPERATOR',
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS ix_users_campaign ON users(campaign_id);
CREATE INDEX IF NOT EXISTS ix_users_campaign_role ON users(campaign_id, role);

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Optional granular permissions (if you want later)
CREATE TABLE IF NOT EXISTS permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,  -- e.g. "PERSON_WRITE", "DASHBOARD_VIEW"
  description text NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role        user_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- ============================================================
-- 2) Territory / Geography
-- ============================================================

CREATE TABLE IF NOT EXISTS cities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);

CREATE INDEX IF NOT EXISTS ix_cities_campaign ON cities(campaign_id);

CREATE TRIGGER trg_cities_updated
BEFORE UPDATE ON cities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  city_id     uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, city_id, name)
);

CREATE INDEX IF NOT EXISTS ix_zones_campaign ON zones(campaign_id);
CREATE INDEX IF NOT EXISTS ix_zones_city ON zones(city_id);

CREATE TRIGGER trg_zones_updated
BEFORE UPDATE ON zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS neighborhoods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  zone_id     uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, zone_id, name)
);

CREATE INDEX IF NOT EXISTS ix_neighborhoods_campaign ON neighborhoods(campaign_id);
CREATE INDEX IF NOT EXISTS ix_neighborhoods_zone ON neighborhoods(zone_id);

CREATE TRIGGER trg_neighborhoods_updated
BEFORE UPDATE ON neighborhoods
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS polling_places (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  zone_id     uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, zone_id, name)
);

CREATE INDEX IF NOT EXISTS ix_polling_places_campaign ON polling_places(campaign_id);
CREATE INDEX IF NOT EXISTS ix_polling_places_zone ON polling_places(zone_id);

CREATE TRIGGER trg_polling_places_updated
BEFORE UPDATE ON polling_places
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS polling_tables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  polling_place_id uuid NOT NULL REFERENCES polling_places(id) ON DELETE CASCADE,
  number          integer NOT NULL CHECK (number > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, polling_place_id, number)
);

CREATE INDEX IF NOT EXISTS ix_polling_tables_campaign ON polling_tables(campaign_id);
CREATE INDEX IF NOT EXISTS ix_polling_tables_place ON polling_tables(polling_place_id);

CREATE TRIGGER trg_polling_tables_updated
BEFORE UPDATE ON polling_tables
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3) Persons (voters) + padron linkage
-- ============================================================

CREATE TABLE IF NOT EXISTS persons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Unique citizen identifier in your context:
  document_id         text NOT NULL, -- CI / DNI / etc.

  first_name          text NOT NULL,
  last_name           text NOT NULL,

  -- Territory assignment (optional but recommended)
  city_id             uuid NULL REFERENCES cities(id) ON DELETE SET NULL,
  zone_id             uuid NULL REFERENCES zones(id) ON DELETE SET NULL,
  neighborhood_id     uuid NULL REFERENCES neighborhoods(id) ON DELETE SET NULL,

  -- Voting logistics (optional)
  polling_place_id    uuid NULL REFERENCES polling_places(id) ON DELETE SET NULL,
  polling_table_id    uuid NULL REFERENCES polling_tables(id) ON DELETE SET NULL,

  -- Current state (the truth lives in events, but these help dashboards)
  current_vote_intent vote_intent NULL,
  has_voted           boolean NOT NULL DEFAULT false,
  last_contact_at     timestamptz NULL,

  notes               text NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (campaign_id, document_id)
);

CREATE INDEX IF NOT EXISTS ix_persons_campaign_name ON persons(campaign_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS ix_persons_campaign_intent ON persons(campaign_id, current_vote_intent);
CREATE INDEX IF NOT EXISTS ix_persons_campaign_has_voted ON persons(campaign_id, has_voted);
CREATE INDEX IF NOT EXISTS ix_persons_campaign_territory ON persons(campaign_id, city_id, zone_id, neighborhood_id);
CREATE INDEX IF NOT EXISTS ix_persons_campaign_polling ON persons(campaign_id, polling_place_id, polling_table_id);

CREATE TRIGGER trg_persons_updated
BEFORE UPDATE ON persons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4) Stations (Puestos de control) + assignments + check-ins
-- ============================================================

CREATE TABLE IF NOT EXISTS stations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name          text NOT NULL,
  status        station_status NOT NULL DEFAULT 'ACTIVE',

  -- Optional territory scope
  city_id       uuid NULL REFERENCES cities(id) ON DELETE SET NULL,
  zone_id       uuid NULL REFERENCES zones(id) ON DELETE SET NULL,
  neighborhood_id uuid NULL REFERENCES neighborhoods(id) ON DELETE SET NULL,

  address       text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (campaign_id, name)
);

CREATE INDEX IF NOT EXISTS ix_stations_campaign ON stations(campaign_id);
CREATE INDEX IF NOT EXISTS ix_stations_campaign_territory ON stations(campaign_id, city_id, zone_id, neighborhood_id);

CREATE TRIGGER trg_stations_updated
BEFORE UPDATE ON stations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Who works in what station
CREATE TABLE IF NOT EXISTS station_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  station_id  uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, station_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_station_users_station ON station_users(station_id);
CREATE INDEX IF NOT EXISTS ix_station_users_user ON station_users(user_id);

-- A person visiting/checking-in at a station (anti-duplicate key piece)
CREATE TABLE IF NOT EXISTS station_checkins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  station_id      uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,

  checkin_at      timestamptz NOT NULL DEFAULT now(),
  vote_intent_snapshot vote_intent NULL,
  notes           text NULL,

  -- You can decide if "only one checkin per day" or allow multiple.
  -- This unique prevents a person from being "registered twice in the same station" (ever).
  UNIQUE (campaign_id, station_id, person_id)
);

CREATE INDEX IF NOT EXISTS ix_checkins_campaign_time ON station_checkins(campaign_id, checkin_at);
CREATE INDEX IF NOT EXISTS ix_checkins_person_time ON station_checkins(person_id, checkin_at);
CREATE INDEX IF NOT EXISTS ix_checkins_station_time ON station_checkins(station_id, checkin_at);

-- ============================================================
-- 5) Voting Day: mark who has voted (immutable log + current flag)
-- ============================================================

CREATE TABLE IF NOT EXISTS person_voted_marks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  marked_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  station_id      uuid NULL REFERENCES stations(id) ON DELETE SET NULL,

  marked_at       timestamptz NOT NULL DEFAULT now(),
  method          text NULL,   -- "table_operator", "phone_confirm", etc
  notes           text NULL,

  -- At most one "first mark" record; if you want multiple, remove this and use latest in dashboards
  UNIQUE (campaign_id, person_id)
);

CREATE INDEX IF NOT EXISTS ix_voted_marks_campaign_time ON person_voted_marks(campaign_id, marked_at);
CREATE INDEX IF NOT EXISTS ix_voted_marks_person ON person_voted_marks(person_id);

-- ============================================================
-- 6) Tags (customizable) + Tag assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NULL, -- optional UI
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);

CREATE INDEX IF NOT EXISTS ix_tags_campaign ON tags(campaign_id);

CREATE TRIGGER trg_tags_updated
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS person_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, person_id, tag_id)
);

CREATE INDEX IF NOT EXISTS ix_person_tags_person ON person_tags(person_id);
CREATE INDEX IF NOT EXISTS ix_person_tags_tag ON person_tags(tag_id);

-- ============================================================
-- 7) Custom Lists (politician creates segments from padron) + membership
-- ============================================================

CREATE TABLE IF NOT EXISTS lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NULL,
  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);

CREATE INDEX IF NOT EXISTS ix_lists_campaign ON lists(campaign_id);

CREATE TRIGGER trg_lists_updated
BEFORE UPDATE ON lists
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS list_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  list_id     uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  added_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, list_id, person_id)
);

CREATE INDEX IF NOT EXISTS ix_list_members_list ON list_members(list_id);
CREATE INDEX IF NOT EXISTS ix_list_members_person ON list_members(person_id);

-- ============================================================
-- 8) Sources / Padron Imports (to track where the person came from)
-- ============================================================

CREATE TABLE IF NOT EXISTS sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type        source_type NOT NULL,
  name        text NOT NULL,
  imported_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_sources_campaign ON sources(campaign_id);
CREATE INDEX IF NOT EXISTS ix_sources_campaign_type ON sources(campaign_id, type);

-- Row-level import data (optional; can be huge. keep it if you want traceability)
CREATE TABLE IF NOT EXISTS source_rows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  external_key text NULL,         -- row id from file/padron if any
  document_id  text NULL,
  raw          jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_source_rows_source ON source_rows(source_id);
CREATE INDEX IF NOT EXISTS ix_source_rows_campaign_doc ON source_rows(campaign_id, document_id);

-- Link imported row -> person
CREATE TABLE IF NOT EXISTS source_row_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_row_id uuid NOT NULL REFERENCES source_rows(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  linked_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (campaign_id, source_row_id),
  UNIQUE (campaign_id, person_id, source_row_id)
);

CREATE INDEX IF NOT EXISTS ix_source_row_links_person ON source_row_links(person_id);

-- ============================================================
-- 9) Events (immutable audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type   event_type NOT NULL,
  timestamp    timestamptz NOT NULL DEFAULT now(),

  actor_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  person_id    uuid NULL REFERENCES persons(id) ON DELETE SET NULL,
  station_id   uuid NULL REFERENCES stations(id) ON DELETE SET NULL,

  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_events_campaign_time ON events(campaign_id, timestamp);
CREATE INDEX IF NOT EXISTS ix_events_campaign_type_time ON events(campaign_id, event_type, timestamp);
CREATE INDEX IF NOT EXISTS ix_events_campaign_person_time ON events(campaign_id, person_id, timestamp);
CREATE INDEX IF NOT EXISTS ix_events_campaign_station_time ON events(campaign_id, station_id, timestamp);

-- ============================================================
-- 10) Optional: Contact attempts / visits (politician: who talked to whom)
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id      uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  contacted_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  station_id     uuid NULL REFERENCES stations(id) ON DELETE SET NULL,

  contact_at     timestamptz NOT NULL DEFAULT now(),
  channel        text NULL, -- "visit", "call", "whatsapp"
  outcome        text NULL, -- "positive", "neutral", "negative"
  notes          text NULL,

  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_contacts_campaign_time ON contacts(campaign_id, contact_at);
CREATE INDEX IF NOT EXISTS ix_contacts_person_time ON contacts(person_id, contact_at);

-- ============================================================
-- 11) Views for dashboards (optional but useful)
-- ============================================================

-- Votes by intent (current state)
CREATE OR REPLACE VIEW v_dashboard_intent AS
SELECT
  campaign_id,
  current_vote_intent,
  COUNT(*) AS persons_count
FROM persons
GROUP BY campaign_id, current_vote_intent;

-- Voted vs not voted
CREATE OR REPLACE VIEW v_dashboard_voted AS
SELECT
  campaign_id,
  has_voted,
  COUNT(*) AS persons_count
FROM persons
GROUP BY campaign_id, has_voted;

COMMIT;

-- ============================================================
-- After running this:
-- 1) Create a campaign + admin user (manual or via your app)
-- 2) Start building screens:
--    - Login
--    - Dashboard (territory + intent + voted)
--    - Persons search + details (timeline from events)
--    - Stations + check-ins
--    - Voting day mode (mark voted + missing by neighborhood)
--    - Tags + Lists
-- ============================================================
