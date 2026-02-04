-- ============================================================
-- SISTEMA ELECTORAL SAAS - SCHEMA MAESTRO V3.1
-- ============================================================

-- 1. CONFIGURACIONES INICIALES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TIPOS DE DATOS (ENUMS TÁCTICOS)
-- Limpiamos versiones anteriores para evitar conflictos
DROP TYPE IF EXISTS vote_intent CASCADE;
DROP TYPE IF EXISTS campaign_phase CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS station_status CASCADE;
DROP TYPE IF EXISTS list_visibility CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;

CREATE TYPE campaign_phase AS ENUM ('NORMAL', 'VOTING', 'POST');

-- Categorías de Voto (Estrategia de Guerra)
CREATE TYPE vote_intent AS ENUM (
    'SURE',                -- Voto Seguro (Nuestro)
    'PROBABLE',            -- Voto Probable (A convencer)
    'OPPOSITION_INTERNAL', -- Rival Interno (Mismo partido, recuperable)
    'OPPOSITION_PARTY',    -- Oposición (Otro partido, difícil)
    'WONT_VOTE',           -- No Vota (Fallecido, Viaje, etc.)
    'UNDECIDED'            -- Indeciso
);

CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'STATION_MANAGER', 'OPERATOR', 'VOLUNTEER', 'VIEWER');
CREATE TYPE station_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE list_visibility AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

CREATE TYPE event_type AS ENUM (
    'PERSON_CREATED', 'PERSON_UPDATED', 'VOTE_INTENT_CHANGED',
    'PERSON_CONTACTED', 'PERSON_MARKED_VOTED', 'STATION_CHECKIN_CREATED',
    'TAG_ASSIGNED', 'USER_LOGIN'
);

-- ============================================================
-- 3. TERRITORIO (DATOS COMPARTIDOS / ESTRUCTURA PAÍS)
-- ============================================================

CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- Ej: "San Lorenzo"
  department_name text NOT NULL, -- Ej: "Central"
  UNIQUE(department_name, name)
);

CREATE TABLE zones ( -- Seccionales / Barrios
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL, -- Ej: "Seccional 1"
  UNIQUE(city_id, name)
);

CREATE TABLE polling_places ( -- Locales de Votación (Escuelas)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name text NOT NULL, -- Ej: "Escuela República del Perú"
  address text,
  UNIQUE(zone_id, name)
);

CREATE TABLE polling_tables ( -- Mesas de Votación
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_place_id uuid NOT NULL REFERENCES polling_places(id) ON DELETE CASCADE,
  number integer NOT NULL, -- Ej: Mesa 101
  UNIQUE(polling_place_id, number)
);

-- ============================================================
-- 4. EL PADRÓN MAESTRO (GLOBAL CITIZENS)
-- ============================================================
-- Aquí viven los 7.000 (o 5 millones) de paraguayos únicos.

CREATE TABLE global_citizens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  text NOT NULL UNIQUE, -- Cédula de Identidad (LLAVE ÚNICA)
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  birthdate    date,
  sex          text,
  address      text,
  
  -- Datos Políticos de Base (Padrón Oficial)
  party_affiliation text, -- "ANR", "PLRA", etc.
  party_affiliation_date date,
  voting_table_id uuid REFERENCES polling_tables(id), -- Donde vota oficialmente
  voting_order_number integer, -- Orden en la lista
  
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices para velocidad extrema
CREATE INDEX ix_global_doc ON global_citizens(document_id);
CREATE INDEX ix_global_name ON global_citizens(last_name, first_name);
CREATE INDEX ix_global_table ON global_citizens(voting_table_id);

-- ============================================================
-- 5. SISTEMA DE CAMPAÑAS (SAAS)
-- ============================================================

CREATE TABLE campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  city_id      uuid REFERENCES cities(id), -- Filtro geográfico automático
  status       text NOT NULL DEFAULT 'ACTIVE',
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          user_role NOT NULL DEFAULT 'OPERATOR',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (campaign_id, email)
);

CREATE TABLE stations ( -- Puestos de Comando (PCs) propios de la campaña
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name          text NOT NULL, -- Ej: "PC Central", "Casa de Doña Juana"
  status        station_status DEFAULT 'ACTIVE',
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 6. LA FICHA DE CAMPAÑA (VINCULACIÓN)
-- ============================================================
-- Aquí es donde cada político guarda SU información privada sobre el ciudadano.

CREATE TABLE persons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  citizen_id          uuid NOT NULL REFERENCES global_citizens(id), -- Link al Maestro

  -- Inteligencia Electoral (Privada)
  current_vote_intent vote_intent, 
  assigned_station_id uuid REFERENCES stations(id), -- PC Asignado
  
  -- Logística Día D
  has_voted           boolean DEFAULT false,
  is_visited          boolean DEFAULT false,
  notes               text, 

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  
  -- REGLA: Un ciudadano solo puede estar 1 vez en cada campaña
  UNIQUE (campaign_id, citizen_id)
);

CREATE INDEX ix_persons_campaign ON persons(campaign_id);
CREATE INDEX ix_persons_voted ON persons(campaign_id, has_voted);
CREATE INDEX ix_persons_intent ON persons(campaign_id, current_vote_intent);

-- ============================================================
-- 7. HERRAMIENTAS (ETIQUETAS, LISTAS, EVENTOS)
-- ============================================================

-- Etiquetas (Tags)
CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text NOT NULL, -- "#Lider", "#Transporte"
  color       text,
  UNIQUE (campaign_id, name)
);

CREATE TABLE person_tags (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (person_id, tag_id)
);

-- Listas Inteligentes
CREATE TABLE lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  visibility  list_visibility NOT NULL DEFAULT 'SHARED',
  created_by_user_id uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE list_members (
  list_id     uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  added_at    timestamptz DEFAULT now(),
  PRIMARY KEY (list_id, person_id)
);

-- Auditoría y Eventos
CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type   event_type NOT NULL,
  timestamp    timestamptz DEFAULT now(),
  actor_user_id uuid REFERENCES users(id),
  person_id    uuid REFERENCES persons(id),
  station_id   uuid REFERENCES stations(id),
  payload      jsonb DEFAULT '{}'::jsonb
);

-- Control de Asistencia (Check-ins en PCs)
CREATE TABLE station_checkins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  station_id     uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  person_id      uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  recorded_by_user_id uuid REFERENCES users(id),
  checkin_at     timestamptz NOT NULL DEFAULT now(),
  notes          text
);

-- Triggers de actualización automática
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_persons_updated BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_global_updated BEFORE UPDATE ON global_citizens FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. MÓDULO 3: ACTIVIDADES Y AGENDA
-- ============================================================

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE task_type AS ENUM ('VISIT', 'CALL', 'EVENT', 'LOGISTICS');

CREATE TABLE tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  priority        task_priority NOT NULL DEFAULT 'MEDIUM',
  task_type       task_type NOT NULL DEFAULT 'VISIT',
  
  -- Fechas
  due_date        timestamptz,
  completed_at    timestamptz,
  
  -- Asignación
  assigned_user_id uuid REFERENCES users(id),
  created_by      uuid REFERENCES users(id),
  
  -- Vinculación (Polymorphic-ish logic specific to our domain)
  related_person_id uuid REFERENCES persons(id) ON DELETE SET NULL,
  related_list_id   uuid REFERENCES lists(id) ON DELETE SET NULL,
  
  location_text   text,
  location_lat    double precision,
  location_lng    double precision,
  
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 9. MÓDULO 5: TRANSPORTE (UBER ELECTORAL)
-- ============================================================

CREATE TYPE transport_status AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE transport_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Pasajero
  person_id       uuid NOT NULL REFERENCES persons(id),
  pickup_address  text,
  pickup_lat      double precision,
  pickup_lng      double precision,
  
  -- Destino (Generalmente es su Polling Place, pero guardamos por si acaso)
  destination_address text,
  
  -- Estado
  status          transport_status NOT NULL DEFAULT 'PENDING',
  driver_user_id  uuid REFERENCES users(id), -- Chofer asignado
  
  requested_at    timestamptz DEFAULT now(),
  completed_at    timestamptz,
  
  notes           text
);

-- ============================================================
-- 10. MÓDULO 7: CONTROL DÍA D (SALA DE GUERRA)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE voting_status AS ENUM ('PENDING', 'SEARCHING', 'ON_TRANSIT', 'ARRIVED', 'CHECKED_IN', 'VOTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extensiones a la tabla Persons
ALTER TABLE persons ADD COLUMN IF NOT EXISTS status_day_d voting_status DEFAULT 'PENDING';
ALTER TABLE persons ADD COLUMN IF NOT EXISTS logistics_flag boolean DEFAULT false;

-- Tracking de Logística (Trazabilidad)
CREATE TABLE IF NOT EXISTS logistics_tracking (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  
  -- Estado reportado
  status          voting_status NOT NULL,
  
  -- Contexto
  vehicle_id      uuid, -- Opcional, si tenemos tabla de vehículos
  operator_id     uuid REFERENCES users(id), -- Quién hizo el cambio
  
  metadata        jsonb DEFAULT '{}'::jsonb, -- Coordenadas GPS, etc.
  
  recorded_at     timestamptz DEFAULT now()
);

-- La Celda Discreta (Incentivos)
-- SEGURIDAD: Solo visible para usuarios con permiso especial
CREATE TABLE IF NOT EXISTS incentives_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  
  incentive_type  text NOT NULL, -- 'viatico', 'combustible', 'snack'
  amount          decimal(10, 2) DEFAULT 0,
  
  delivered_by    uuid REFERENCES users(id),
  delivered_at    timestamptz DEFAULT now(),
  
  notes           text
);

-- Índices para el tablero de alta velocidad
CREATE INDEX IF NOT EXISTS ix_persons_day_d_status ON persons(campaign_id, status_day_d);
CREATE INDEX IF NOT EXISTS ix_logistics_tracking_person ON logistics_tracking(person_id, recorded_at DESC);

