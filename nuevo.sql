--
-- PostgreSQL database dump
--

\restrict 6NCKrxheWruQdOUxDmmUIVDmX5XYkYFaPT0KmoGy1rCwTo31SlVlGoxBJuhWpGz

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-02-10 22:52:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- TOC entry 2 (class 3079 OID 24577)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 898 (class 1247 OID 24616)
-- Name: campaign_phase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_phase AS ENUM (
    'NORMAL',
    'VOTING',
    'POST'
);


--
-- TOC entry 964 (class 1247 OID 98323)
-- Name: day_d_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.day_d_status_enum AS ENUM (
    'PENDING',
    'SEARCHING',
    'ON_TRANSIT',
    'ARRIVED',
    'CHECKED_IN',
    'VOTED'
);


--
-- TOC entry 910 (class 1247 OID 24664)
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'PERSON_CREATED',
    'PERSON_UPDATED',
    'VOTE_INTENT_CHANGED',
    'PERSON_CONTACTED',
    'PERSON_MARKED_VOTED',
    'STATION_CHECKIN_CREATED',
    'TAG_ASSIGNED',
    'USER_LOGIN',
    'TAG_REMOVED',
    'INCIDENT_REPORT',
    'USER_PASSWORD_CHANGE',
    'ADMIN_RESET_PASSWORD'
);


--
-- TOC entry 907 (class 1247 OID 24656)
-- Name: list_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.list_visibility AS ENUM (
    'PRIVATE',
    'SHARED',
    'PUBLIC'
);


--
-- TOC entry 904 (class 1247 OID 24650)
-- Name: station_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.station_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- TOC entry 901 (class 1247 OID 24636)
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'STATION_MANAGER',
    'OPERATOR',
    'VOLUNTEER',
    'VIEWER'
);


--
-- TOC entry 940 (class 1247 OID 24834)
-- Name: vote_intent; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vote_intent AS ENUM (
    'SURE',
    'PROBABLE',
    'OPPOSITION_INTERNAL',
    'OPPOSITION_PARTY',
    'WONT_VOTE'
);


--
-- TOC entry 273 (class 1255 OID 24614)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 24754)
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city_id uuid,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    parent_campaign_id uuid
);


--
-- TOC entry 216 (class 1259 OID 24681)
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    department_name text NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 122936)
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    contacted_by_user_id uuid,
    station_id uuid,
    channel text,
    outcome text,
    notes text,
    contact_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 226 (class 1259 OID 41030)
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    actor_user_id uuid,
    title text,
    description text,
    event_type text DEFAULT 'INFO'::text,
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    station_id uuid,
    person_id uuid,
    payload jsonb
);


--
-- TOC entry 220 (class 1259 OID 24734)
-- Name: global_citizens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_citizens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    birthdate date,
    sex text,
    address text,
    party_affiliation text,
    party_affiliation_date date,
    voting_table_id uuid,
    voting_order_number integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone_number text,
    location_department text,
    location_district text,
    location_place text,
    voting_table_number integer
);


--
-- TOC entry 229 (class 1259 OID 73729)
-- Name: lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT 'list'::text,
    filters jsonb NOT NULL,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- TOC entry 232 (class 1259 OID 98336)
-- Name: logistics_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logistics_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text,
    driver_name text,
    vehicle_plate text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    operator_id uuid
);


--
-- TOC entry 234 (class 1259 OID 114698)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    type text NOT NULL,
    link text,
    created_at timestamp with time zone DEFAULT now(),
    campaign_id uuid
);


--
-- TOC entry 228 (class 1259 OID 57353)
-- Name: person_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_tags (
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    assigned_by_user_id uuid,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 235 (class 1259 OID 122906)
-- Name: person_voted_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_voted_marks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    marked_by_user_id uuid,
    station_id uuid,
    method text,
    notes text,
    marked_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 224 (class 1259 OID 24801)
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    citizen_id uuid NOT NULL,
    assigned_station_id uuid,
    has_voted boolean DEFAULT false,
    is_visited boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    current_vote_intent text DEFAULT 'UNDECIDED'::text,
    campaign_status text DEFAULT 'NOT_VISITED'::text,
    needs_transport boolean DEFAULT false,
    transport_status text DEFAULT 'PENDING'::text,
    exact_address text,
    whatsapp_number text,
    requests jsonb DEFAULT '[]'::jsonb NOT NULL,
    has_financial_needs boolean DEFAULT false,
    financial_needs_fulfilled boolean DEFAULT false,
    financial_amount numeric(15,0) DEFAULT 0,
    deleted_at timestamp without time zone,
    status_day_d public.day_d_status_enum DEFAULT 'PENDING'::public.day_d_status_enum,
    station_checkin_at timestamp with time zone,
    assigned_user_id uuid,
    managing_campaign_id uuid,
    CONSTRAINT requests_is_array CHECK ((jsonb_typeof(requests) = 'array'::text))
);


--
-- TOC entry 218 (class 1259 OID 24706)
-- Name: polling_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polling_places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    name text NOT NULL,
    address text
);


--
-- TOC entry 219 (class 1259 OID 24721)
-- Name: polling_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polling_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    polling_place_id uuid NOT NULL,
    number integer NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 41009)
-- Name: station_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.station_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    recorded_by_user_id uuid,
    station_id uuid,
    type text DEFAULT 'GENERAL'::text NOT NULL,
    details text,
    checkin_at timestamp with time zone DEFAULT now(),
    person_id uuid,
    vote_intent_snapshot text,
    notes text,
    checkin_by_user_id uuid
);


--
-- TOC entry 233 (class 1259 OID 106505)
-- Name: station_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.station_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid NOT NULL,
    person_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 223 (class 1259 OID 24786)
-- Name: stations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    name text NOT NULL,
    status public.station_status DEFAULT 'ACTIVE'::public.station_status,
    created_at timestamp with time zone DEFAULT now(),
    city_id integer DEFAULT 0,
    department_id integer DEFAULT 0,
    zone_id integer DEFAULT 0,
    address text,
    notes text,
    latitude numeric,
    longitude numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    neighborhood_id integer DEFAULT 0,
    section_id integer DEFAULT 0,
    deleted_at timestamp with time zone,
    manager_user_id uuid
);


--
-- TOC entry 227 (class 1259 OID 57344)
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 231 (class 1259 OID 98304)
-- Name: task_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    amount numeric NOT NULL,
    concept text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 230 (class 1259 OID 73749)
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    related_person_id uuid,
    related_list_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    priority text DEFAULT 'MEDIUM'::text,
    task_type text DEFAULT 'VISIT'::text,
    location_text text,
    assigned_user_id uuid,
    location_lat numeric,
    location_lng numeric,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT tasks_task_type_check CHECK ((task_type = ANY (ARRAY['VISIT'::text, 'CALL'::text, 'LOGISTICS'::text, 'FINANCIAL'::text, 'TRANSPORT'::text, 'FOOD'::text, 'OTHER'::text, 'EVENT'::text])))
);


--
-- TOC entry 222 (class 1259 OID 24769)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'OPERATOR'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    deleted_at timestamp without time zone,
    operational_role text,
    assigned_station_id uuid
);


--
-- TOC entry 217 (class 1259 OID 24691)
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id uuid NOT NULL,
    name text NOT NULL
);


--
-- TOC entry 4908 (class 2606 OID 73758)
-- Name: tasks activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 4871 (class 2606 OID 24763)
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 4844 (class 2606 OID 122900)
-- Name: persons check_campaign_status; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.persons
    ADD CONSTRAINT check_campaign_status CHECK ((campaign_status = ANY (ARRAY['NOT_VISITED'::text, 'TO_VISIT'::text, 'CONTACTED'::text, 'VISITED'::text, 'VISITED_PC'::text, 'DO_NOT_DISTURB'::text, 'PENDING'::text, 'NEW'::text, 'CALLED'::text, 'SCANNED'::text, 'NOT_FOUND'::text, 'CHECKED_IN'::text, 'REJECTED'::text]))) NOT VALID;


--
-- TOC entry 4848 (class 2606 OID 24690)
-- Name: cities cities_department_name_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_department_name_name_key UNIQUE (department_name, name);


--
-- TOC entry 4850 (class 2606 OID 24688)
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- TOC entry 4936 (class 2606 OID 122944)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 41039)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 4864 (class 2606 OID 24745)
-- Name: global_citizens global_citizens_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_document_id_key UNIQUE (document_id);


--
-- TOC entry 4866 (class 2606 OID 24743)
-- Name: global_citizens global_citizens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_pkey PRIMARY KEY (id);


--
-- TOC entry 4906 (class 2606 OID 73740)
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 98346)
-- Name: logistics_tracking logistics_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_tracking
    ADD CONSTRAINT logistics_tracking_pkey PRIMARY KEY (id);


--
-- TOC entry 4931 (class 2606 OID 114707)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4903 (class 2606 OID 57358)
-- Name: person_tags person_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_pkey PRIMARY KEY (campaign_id, person_id, tag_id);


--
-- TOC entry 4934 (class 2606 OID 122914)
-- Name: person_voted_marks person_voted_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_voted_marks
    ADD CONSTRAINT person_voted_marks_pkey PRIMARY KEY (id);


--
-- TOC entry 4887 (class 2606 OID 24814)
-- Name: persons persons_campaign_id_citizen_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_campaign_id_citizen_id_key UNIQUE (campaign_id, citizen_id);


--
-- TOC entry 4889 (class 2606 OID 24812)
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- TOC entry 4856 (class 2606 OID 24713)
-- Name: polling_places polling_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_pkey PRIMARY KEY (id);


--
-- TOC entry 4858 (class 2606 OID 24715)
-- Name: polling_places polling_places_zone_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_zone_id_name_key UNIQUE (zone_id, name);


--
-- TOC entry 4860 (class 2606 OID 24726)
-- Name: polling_tables polling_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 24728)
-- Name: polling_tables polling_tables_polling_place_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_polling_place_id_number_key UNIQUE (polling_place_id, number);


--
-- TOC entry 4894 (class 2606 OID 41017)
-- Name: station_checkins station_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_pkey PRIMARY KEY (id);


--
-- TOC entry 4926 (class 2606 OID 106511)
-- Name: station_collaborators station_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_collaborators
    ADD CONSTRAINT station_collaborators_pkey PRIMARY KEY (id);


--
-- TOC entry 4928 (class 2606 OID 106513)
-- Name: station_collaborators station_collaborators_station_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_collaborators
    ADD CONSTRAINT station_collaborators_station_id_person_id_key UNIQUE (station_id, person_id);


--
-- TOC entry 4878 (class 2606 OID 24795)
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- TOC entry 4900 (class 2606 OID 57352)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 98312)
-- Name: task_expenses task_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_expenses
    ADD CONSTRAINT task_expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 4874 (class 2606 OID 24780)
-- Name: users users_campaign_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_campaign_id_email_key UNIQUE (campaign_id, email);


--
-- TOC entry 4876 (class 2606 OID 24778)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4852 (class 2606 OID 24700)
-- Name: zones zones_city_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_city_id_name_key UNIQUE (city_id, name);


--
-- TOC entry 4854 (class 2606 OID 24698)
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- TOC entry 4909 (class 1259 OID 81937)
-- Name: idx_activities_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_assignee ON public.tasks USING btree (assigned_user_id);


--
-- TOC entry 4910 (class 1259 OID 73779)
-- Name: idx_activities_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_campaign ON public.tasks USING btree (campaign_id);


--
-- TOC entry 4911 (class 1259 OID 73780)
-- Name: idx_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_date ON public.tasks USING btree (due_date);


--
-- TOC entry 4912 (class 1259 OID 81936)
-- Name: idx_activities_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_priority ON public.tasks USING btree (priority);


--
-- TOC entry 4913 (class 1259 OID 81935)
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type ON public.tasks USING btree (task_type);


--
-- TOC entry 4872 (class 1259 OID 114725)
-- Name: idx_campaigns_parent_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_parent_campaign_id ON public.campaigns USING btree (parent_campaign_id);


--
-- TOC entry 4937 (class 1259 OID 122965)
-- Name: idx_contacts_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_person ON public.contacts USING btree (campaign_id, person_id);


--
-- TOC entry 4897 (class 1259 OID 65541)
-- Name: idx_events_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_person ON public.events USING btree (person_id);


--
-- TOC entry 4904 (class 1259 OID 73746)
-- Name: idx_lists_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lists_campaign ON public.lists USING btree (campaign_id);


--
-- TOC entry 4920 (class 1259 OID 98358)
-- Name: idx_logistics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_campaign ON public.logistics_tracking USING btree (campaign_id);


--
-- TOC entry 4921 (class 1259 OID 98357)
-- Name: idx_logistics_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_person ON public.logistics_tracking USING btree (person_id);


--
-- TOC entry 4929 (class 1259 OID 122890)
-- Name: idx_notifications_campaign_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_campaign_user_read ON public.notifications USING btree (campaign_id, user_id, is_read);


--
-- TOC entry 4901 (class 1259 OID 57370)
-- Name: idx_person_tags_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_tags_person ON public.person_tags USING btree (person_id);


--
-- TOC entry 4932 (class 1259 OID 122935)
-- Name: idx_person_voted_marks_campaign_person; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_person_voted_marks_campaign_person ON public.person_voted_marks USING btree (campaign_id, person_id);


--
-- TOC entry 4879 (class 1259 OID 106525)
-- Name: idx_persons_assigned_station; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_assigned_station ON public.persons USING btree (assigned_station_id) WHERE (assigned_station_id IS NOT NULL);


--
-- TOC entry 4880 (class 1259 OID 114726)
-- Name: idx_persons_assigned_station_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_assigned_station_id ON public.persons USING btree (assigned_station_id);


--
-- TOC entry 4881 (class 1259 OID 98364)
-- Name: idx_persons_day_d_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_day_d_status ON public.persons USING btree (campaign_id, status_day_d);


--
-- TOC entry 4882 (class 1259 OID 98365)
-- Name: idx_persons_has_voted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_has_voted ON public.persons USING btree (campaign_id, has_voted);


--
-- TOC entry 4883 (class 1259 OID 41028)
-- Name: idx_persons_vote_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_persons_vote_intent ON public.persons USING btree (campaign_id, current_vote_intent);


--
-- TOC entry 4890 (class 1259 OID 41029)
-- Name: idx_station_checkins_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_station_checkins_campaign ON public.station_checkins USING btree (campaign_id);


--
-- TOC entry 4891 (class 1259 OID 114727)
-- Name: idx_station_checkins_campaign_station_checkin_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_station_checkins_campaign_station_checkin_at ON public.station_checkins USING btree (campaign_id, station_id, checkin_at);


--
-- TOC entry 4892 (class 1259 OID 114728)
-- Name: idx_station_checkins_person_checkin_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_station_checkins_person_checkin_at ON public.station_checkins USING btree (person_id, checkin_at);


--
-- TOC entry 4924 (class 1259 OID 106524)
-- Name: idx_station_collaborators_station; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_station_collaborators_station ON public.station_collaborators USING btree (station_id);


--
-- TOC entry 4898 (class 1259 OID 57369)
-- Name: idx_tags_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_campaign ON public.tags USING btree (campaign_id);


--
-- TOC entry 4917 (class 1259 OID 98321)
-- Name: idx_task_expenses_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_expenses_task ON public.task_expenses USING btree (task_id);


--
-- TOC entry 4914 (class 1259 OID 98318)
-- Name: idx_tasks_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_campaign ON public.tasks USING btree (campaign_id);


--
-- TOC entry 4915 (class 1259 OID 98320)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (completed_at) WHERE (completed_at IS NULL);


--
-- TOC entry 4916 (class 1259 OID 98319)
-- Name: idx_tasks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_type ON public.tasks USING btree (task_type);


--
-- TOC entry 4867 (class 1259 OID 24751)
-- Name: ix_global_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_global_doc ON public.global_citizens USING btree (document_id);


--
-- TOC entry 4868 (class 1259 OID 24752)
-- Name: ix_global_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_global_name ON public.global_citizens USING btree (last_name, first_name);


--
-- TOC entry 4869 (class 1259 OID 24753)
-- Name: ix_global_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_global_table ON public.global_citizens USING btree (voting_table_id);


--
-- TOC entry 4884 (class 1259 OID 24830)
-- Name: ix_persons_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_persons_campaign ON public.persons USING btree (campaign_id);


--
-- TOC entry 4885 (class 1259 OID 24831)
-- Name: ix_persons_voted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_persons_voted ON public.persons USING btree (campaign_id, has_voted);


--
-- TOC entry 4962 (class 2606 OID 81930)
-- Name: tasks activities_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_assigned_to_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id);


--
-- TOC entry 4963 (class 2606 OID 73759)
-- Name: tasks activities_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4964 (class 2606 OID 73774)
-- Name: tasks activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4965 (class 2606 OID 73769)
-- Name: tasks activities_linked_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_linked_list_id_fkey FOREIGN KEY (related_list_id) REFERENCES public.lists(id);


--
-- TOC entry 4966 (class 2606 OID 73764)
-- Name: tasks activities_linked_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT activities_linked_person_id_fkey FOREIGN KEY (related_person_id) REFERENCES public.persons(id);


--
-- TOC entry 4942 (class 2606 OID 24764)
-- Name: campaigns campaigns_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- TOC entry 4943 (class 2606 OID 114713)
-- Name: campaigns campaigns_parent_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_parent_campaign_id_fkey FOREIGN KEY (parent_campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4978 (class 2606 OID 122945)
-- Name: contacts contacts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4979 (class 2606 OID 122955)
-- Name: contacts contacts_contacted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_contacted_by_user_id_fkey FOREIGN KEY (contacted_by_user_id) REFERENCES public.users(id);


--
-- TOC entry 4980 (class 2606 OID 122950)
-- Name: contacts contacts_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4981 (class 2606 OID 122960)
-- Name: contacts contacts_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- TOC entry 4956 (class 2606 OID 41040)
-- Name: events events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4957 (class 2606 OID 65536)
-- Name: events events_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- TOC entry 4958 (class 2606 OID 41045)
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- TOC entry 4941 (class 2606 OID 24746)
-- Name: global_citizens global_citizens_voting_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_voting_table_id_fkey FOREIGN KEY (voting_table_id) REFERENCES public.polling_tables(id);


--
-- TOC entry 4961 (class 2606 OID 73741)
-- Name: lists lists_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4968 (class 2606 OID 98347)
-- Name: logistics_tracking logistics_tracking_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_tracking
    ADD CONSTRAINT logistics_tracking_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 98359)
-- Name: logistics_tracking logistics_tracking_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_tracking
    ADD CONSTRAINT logistics_tracking_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- TOC entry 4970 (class 2606 OID 98352)
-- Name: logistics_tracking logistics_tracking_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_tracking
    ADD CONSTRAINT logistics_tracking_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4973 (class 2606 OID 114708)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4959 (class 2606 OID 57359)
-- Name: person_tags person_tags_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- TOC entry 4960 (class 2606 OID 57364)
-- Name: person_tags person_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- TOC entry 4974 (class 2606 OID 122915)
-- Name: person_voted_marks person_voted_marks_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_voted_marks
    ADD CONSTRAINT person_voted_marks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4975 (class 2606 OID 122925)
-- Name: person_voted_marks person_voted_marks_marked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_voted_marks
    ADD CONSTRAINT person_voted_marks_marked_by_user_id_fkey FOREIGN KEY (marked_by_user_id) REFERENCES public.users(id);


--
-- TOC entry 4976 (class 2606 OID 122920)
-- Name: person_voted_marks person_voted_marks_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_voted_marks
    ADD CONSTRAINT person_voted_marks_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4977 (class 2606 OID 122930)
-- Name: person_voted_marks person_voted_marks_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_voted_marks
    ADD CONSTRAINT person_voted_marks_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- TOC entry 4948 (class 2606 OID 24825)
-- Name: persons persons_assigned_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_assigned_station_id_fkey FOREIGN KEY (assigned_station_id) REFERENCES public.stations(id);


--
-- TOC entry 4949 (class 2606 OID 114688)
-- Name: persons persons_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id);


--
-- TOC entry 4950 (class 2606 OID 24815)
-- Name: persons persons_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4951 (class 2606 OID 24820)
-- Name: persons persons_citizen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_citizen_id_fkey FOREIGN KEY (citizen_id) REFERENCES public.global_citizens(id);


--
-- TOC entry 4952 (class 2606 OID 114718)
-- Name: persons persons_managing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_managing_campaign_id_fkey FOREIGN KEY (managing_campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4939 (class 2606 OID 24716)
-- Name: polling_places polling_places_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- TOC entry 4940 (class 2606 OID 24729)
-- Name: polling_tables polling_tables_polling_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_polling_place_id_fkey FOREIGN KEY (polling_place_id) REFERENCES public.polling_places(id) ON DELETE CASCADE;


--
-- TOC entry 4953 (class 2606 OID 41018)
-- Name: station_checkins station_checkins_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4954 (class 2606 OID 106498)
-- Name: station_checkins station_checkins_checkin_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_checkin_by_user_id_fkey FOREIGN KEY (checkin_by_user_id) REFERENCES public.users(id);


--
-- TOC entry 4955 (class 2606 OID 41023)
-- Name: station_checkins station_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_user_id_fkey FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id);


--
-- TOC entry 4971 (class 2606 OID 106519)
-- Name: station_collaborators station_collaborators_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_collaborators
    ADD CONSTRAINT station_collaborators_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 4972 (class 2606 OID 106514)
-- Name: station_collaborators station_collaborators_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.station_collaborators
    ADD CONSTRAINT station_collaborators_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;


--
-- TOC entry 4946 (class 2606 OID 24796)
-- Name: stations stations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4947 (class 2606 OID 114693)
-- Name: stations stations_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.users(id);


--
-- TOC entry 4967 (class 2606 OID 98313)
-- Name: task_expenses task_expenses_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_expenses
    ADD CONSTRAINT task_expenses_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 4944 (class 2606 OID 122901)
-- Name: users users_assigned_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_assigned_station_id_fkey FOREIGN KEY (assigned_station_id) REFERENCES public.stations(id);


--
-- TOC entry 4945 (class 2606 OID 24781)
-- Name: users users_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4938 (class 2606 OID 24701)
-- Name: zones zones_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_campaign ON events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(campaign_id, created_at DESC);


-- Completed on 2026-02-10 22:52:16

--
-- PostgreSQL database dump complete
--

\unrestrict 6NCKrxheWruQdOUxDmmUIVDmX5XYkYFaPT0KmoGy1rCwTo31SlVlGoxBJuhWpGz

