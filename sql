-- ============================================================
-- SISTEMA ELECTORAL SAAS - SCHEMA V3.0 (Producción Ready)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función de timestamps
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TIPOS (ENUMS)
CREATE TYPE campaign_phase AS ENUM ('NORMAL', 'VOTING', 'POST');
CREATE TYPE vote_intent AS ENUM ('SURE', 'PROBABLE', 'UNDECIDED', 'OPPOSITION', 'ABSTAIN');
CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'STATION_MANAGER', 'OPERATOR', 'VOLUNTEER', 'VIEWER');
CREATE TYPE station_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE list_visibility AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');
CREATE TYPE event_type AS ENUM (
    'PERSON_CREATED', 'PERSON_UPDATED', 'VOTE_INTENT_CHANGED',
    'PERSON_CONTACTED', 'PERSON_MARKED_VOTED', 'STATION_CHECKIN_CREATED',
    'TAG_ASSIGNED', 'USER_LOGIN'
);

-- ============================================================
-- 1. TERRITORIO (DATOS PÚBLICOS / COMPARTIDOS)
-- ============================================================
-- Esto es común para TODOS. Si creas la "Escuela X", le sirve a todos los candidatos.

CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- "San Lorenzo"
  department_name text NOT NULL, -- "Central"
  UNIQUE(department_name, name)
);

CREATE TABLE zones ( -- TUS SECCIONALES
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL, -- "Seccional 1"
  UNIQUE(city_id, name)
);

CREATE TABLE polling_places ( -- LOCALES DE VOTACIÓN
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name text NOT NULL, -- "Col. Nac. EMD"
  address text,
  UNIQUE(zone_id, name)
);

CREATE TABLE polling_tables ( -- MESAS
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polling_place_id uuid NOT NULL REFERENCES polling_places(id) ON DELETE CASCADE,
  number integer NOT NULL, -- Mesa 101
  UNIQUE(polling_place_id, number)
);

-- ============================================================
-- 2. EL PADRÓN MAESTRO (PERSONAS ÚNICAS)
-- ============================================================

CREATE TABLE global_citizens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  text NOT NULL UNIQUE, -- 🚨 LA CI (Única en todo el sistema)
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  birthdate    date,
  sex          text, -- "M", "F"
  address      text,
  
  -- DATOS POLÍTICOS ESTRUCTURALES
  party_affiliation text, -- NUEVO: "ANR", "PLRA", "SIN AFILIACION"
  party_affiliation_date date, -- "1998-05-20"
  
  voting_table_id uuid REFERENCES polling_tables(id), -- Mesa Oficial (Donde vota)
  voting_order_number integer, -- Orden en el padrón
  
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- Índices para búsqueda ultra-rápida entre millones de registros
CREATE INDEX ix_global_doc ON global_citizens(document_id);
CREATE INDEX ix_global_name ON global_citizens(last_name, first_name);
CREATE INDEX ix_global_table ON global_citizens(voting_table_id);

-- ============================================================
-- 3. CAMPAÑAS (EL CLIENTE)
-- ============================================================

CREATE TABLE campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL, -- "Campaña Concejal Perez"
  city_id      uuid REFERENCES cities(id), -- 🚨 CLAVE: Esto filtra el sistema para no mezclar ciudades
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
  UNIQUE (campaign_id, email)
);

CREATE TABLE stations ( -- Puestos de Comando (PCs) propios de cada campaña
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name          text NOT NULL, 
  status        station_status DEFAULT 'ACTIVE',
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 4. LA FICHA (Conexión Persona-Campaña)
-- ============================================================

CREATE TABLE persons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  citizen_id          uuid NOT NULL REFERENCES global_citizens(id), -- Link al Maestro

  -- Estado Político (Privado y único para esta campaña)
  current_vote_intent vote_intent, 
  assigned_station_id uuid REFERENCES stations(id), -- ¿Tiene PC asignado?
  
  has_voted           boolean DEFAULT false,
  is_visited          boolean DEFAULT false,
  notes               text, 

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  -- UNICIDAD: Una campaña no puede tener 2 veces a la misma CI
  UNIQUE (campaign_id, citizen_id)
);
-- Índices para que el Dashboard vuele
CREATE INDEX ix_persons_campaign ON persons(campaign_id);
CREATE INDEX ix_persons_voted ON persons(campaign_id, has_voted);
CREATE INDEX ix_persons_intent ON persons(campaign_id, current_vote_intent);

-- ============================================================
-- 5. LISTAS, ETIQUETAS Y EVENTOS (Sin cambios mayores)
-- ============================================================
-- (Tablas tags, person_tags, lists, list_members, events iguales a V2.1)
-- Copiar del bloque anterior o avisame si las necesitas repetir aquí.
-- Solo asegúrate de incluir events, lists, tags, etc.
-- ... (Si quieres pego el resto también para que tengas un solo bloque copiar-pegar)

-- Borrar el tipo anterior si ya existía (solo si estás limpiando la DB)
DROP TYPE IF EXISTS vote_intent CASCADE;

CREATE TYPE vote_intent AS ENUM (
    'SURE',                -- Voto Seguro (Te prometió)
    'PROBABLE',            -- Voto Probable (Hay que convencer)
    'UNDECIDED',           -- Indeciso (Ni sí, ni no - Opcional, tú decides si lo usas)
    'OPPOSITION_INTERNAL', -- Otro Candidato (Mismo partido, rival interno)
    'OPPOSITION_PARTY',    -- Oposición (Otro partido)
    'WONT_VOTE'            -- No Vota (Muerto, viaje, preso, impedido)
);

-- Actualizando la lógica de guerra (Intención de Voto)
DROP TYPE IF EXISTS vote_intent CASCADE;

CREATE TYPE vote_intent AS ENUM (
    'SURE',                -- Voto Seguro (Te prometió)
    'PROBABLE',            -- Voto Probable (Hay que convencer)
    'OPPOSITION_INTERNAL', -- Otro Candidato (Mismo partido, tu rival interno - RECUPERABLE)
    'OPPOSITION_PARTY',    -- Oposición (Otro partido - DIFÍCIL)
    'WONT_VOTE'            -- No Vota (Fallecido, Viaje, Preso, etc.)
);

-- Nota: Para el "No Vota", usaremos las etiquetas para especificar la causa:
-- #FALLECIDO, #EXTERIOR, #ENFERMO