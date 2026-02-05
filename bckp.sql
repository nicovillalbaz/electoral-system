--
-- PostgreSQL database dump
--

\restrict En7QW9Tbgb7spRr4WfzPJM92k832aTRxKTZKdVjIuny6foBoWB235hs8yNvnW0t

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-02-04 19:21:51

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 892 (class 1247 OID 24616)
-- Name: campaign_phase; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.campaign_phase AS ENUM (
    'NORMAL',
    'VOTING',
    'POST'
);


ALTER TYPE public.campaign_phase OWNER TO postgres;

--
-- TOC entry 904 (class 1247 OID 24664)
-- Name: event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_type AS ENUM (
    'PERSON_CREATED',
    'PERSON_UPDATED',
    'VOTE_INTENT_CHANGED',
    'PERSON_CONTACTED',
    'PERSON_MARKED_VOTED',
    'STATION_CHECKIN_CREATED',
    'TAG_ASSIGNED',
    'USER_LOGIN'
);


ALTER TYPE public.event_type OWNER TO postgres;

--
-- TOC entry 901 (class 1247 OID 24656)
-- Name: list_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.list_visibility AS ENUM (
    'PRIVATE',
    'SHARED',
    'PUBLIC'
);


ALTER TYPE public.list_visibility OWNER TO postgres;

--
-- TOC entry 898 (class 1247 OID 24650)
-- Name: station_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.station_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public.station_status OWNER TO postgres;

--
-- TOC entry 895 (class 1247 OID 24636)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'STATION_MANAGER',
    'OPERATOR',
    'VOLUNTEER',
    'VIEWER'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 934 (class 1247 OID 24834)
-- Name: vote_intent; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vote_intent AS ENUM (
    'SURE',
    'PROBABLE',
    'OPPOSITION_INTERNAL',
    'OPPOSITION_PARTY',
    'WONT_VOTE'
);


ALTER TYPE public.vote_intent OWNER TO postgres;

--
-- TOC entry 267 (class 1255 OID 24614)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 73749)
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    is_completed boolean DEFAULT false,
    linked_person_id uuid,
    linked_list_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    priority text DEFAULT 'MEDIUM'::text,
    activity_type text DEFAULT 'VISIT'::text,
    location text,
    assigned_to_user_id uuid
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24754)
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city_id uuid,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 24681)
-- Name: cities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    department_name text NOT NULL
);


ALTER TABLE public.cities OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 41030)
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.events OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24734)
-- Name: global_citizens; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.global_citizens OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 73729)
-- Name: lists; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lists OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 57353)
-- Name: person_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person_tags (
    campaign_id uuid NOT NULL,
    person_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    assigned_by_user_id uuid,
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.person_tags OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24801)
-- Name: persons; Type: TABLE; Schema: public; Owner: postgres
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
    current_vote_intent text DEFAULT 'INDECISO'::text,
    campaign_status text DEFAULT 'NOT_VISITED'::text,
    needs_transport boolean DEFAULT false,
    transport_status text DEFAULT 'PENDING'::text
);


ALTER TABLE public.persons OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 24706)
-- Name: polling_places; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.polling_places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    name text NOT NULL,
    address text
);


ALTER TABLE public.polling_places OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24721)
-- Name: polling_tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.polling_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    polling_place_id uuid NOT NULL,
    number integer NOT NULL
);


ALTER TABLE public.polling_tables OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 41009)
-- Name: station_checkins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    user_id uuid,
    station_id uuid,
    type text NOT NULL,
    details text,
    checkin_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.station_checkins OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24786)
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
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
    section_id integer DEFAULT 0
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 57344)
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24769)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'OPERATOR'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 24691)
-- Name: zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id uuid NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.zones OWNER TO postgres;

--
-- TOC entry 4850 (class 2606 OID 73758)
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 4820 (class 2606 OID 24763)
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 4797 (class 2606 OID 24690)
-- Name: cities cities_department_name_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_department_name_name_key UNIQUE (department_name, name);


--
-- TOC entry 4799 (class 2606 OID 24688)
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 41039)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 4813 (class 2606 OID 24745)
-- Name: global_citizens global_citizens_document_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_document_id_key UNIQUE (document_id);


--
-- TOC entry 4815 (class 2606 OID 24743)
-- Name: global_citizens global_citizens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 73740)
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- TOC entry 4845 (class 2606 OID 57358)
-- Name: person_tags person_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_pkey PRIMARY KEY (campaign_id, person_id, tag_id);


--
-- TOC entry 4831 (class 2606 OID 24814)
-- Name: persons persons_campaign_id_citizen_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_campaign_id_citizen_id_key UNIQUE (campaign_id, citizen_id);


--
-- TOC entry 4833 (class 2606 OID 24812)
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- TOC entry 4805 (class 2606 OID 24713)
-- Name: polling_places polling_places_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_pkey PRIMARY KEY (id);


--
-- TOC entry 4807 (class 2606 OID 24715)
-- Name: polling_places polling_places_zone_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_zone_id_name_key UNIQUE (zone_id, name);


--
-- TOC entry 4809 (class 2606 OID 24726)
-- Name: polling_tables polling_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_pkey PRIMARY KEY (id);


--
-- TOC entry 4811 (class 2606 OID 24728)
-- Name: polling_tables polling_tables_polling_place_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_polling_place_id_number_key UNIQUE (polling_place_id, number);


--
-- TOC entry 4836 (class 2606 OID 41017)
-- Name: station_checkins station_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_pkey PRIMARY KEY (id);


--
-- TOC entry 4826 (class 2606 OID 24795)
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 57352)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4822 (class 2606 OID 24780)
-- Name: users users_campaign_id_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_campaign_id_email_key UNIQUE (campaign_id, email);


--
-- TOC entry 4824 (class 2606 OID 24778)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4801 (class 2606 OID 24700)
-- Name: zones zones_city_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_city_id_name_key UNIQUE (city_id, name);


--
-- TOC entry 4803 (class 2606 OID 24698)
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 1259 OID 81937)
-- Name: idx_activities_assignee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_assignee ON public.activities USING btree (assigned_to_user_id);


--
-- TOC entry 4852 (class 1259 OID 73779)
-- Name: idx_activities_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_campaign ON public.activities USING btree (campaign_id);


--
-- TOC entry 4853 (class 1259 OID 73780)
-- Name: idx_activities_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_date ON public.activities USING btree (due_date);


--
-- TOC entry 4854 (class 1259 OID 81936)
-- Name: idx_activities_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_priority ON public.activities USING btree (priority);


--
-- TOC entry 4855 (class 1259 OID 81935)
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type ON public.activities USING btree (activity_type);


--
-- TOC entry 4839 (class 1259 OID 65541)
-- Name: idx_events_person; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_person ON public.events USING btree (person_id);


--
-- TOC entry 4846 (class 1259 OID 73746)
-- Name: idx_lists_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lists_campaign ON public.lists USING btree (campaign_id);


--
-- TOC entry 4843 (class 1259 OID 57370)
-- Name: idx_person_tags_person; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_person_tags_person ON public.person_tags USING btree (person_id);


--
-- TOC entry 4827 (class 1259 OID 41028)
-- Name: idx_persons_vote_intent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_persons_vote_intent ON public.persons USING btree (campaign_id, current_vote_intent);


--
-- TOC entry 4834 (class 1259 OID 41029)
-- Name: idx_station_checkins_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_station_checkins_campaign ON public.station_checkins USING btree (campaign_id);


--
-- TOC entry 4840 (class 1259 OID 57369)
-- Name: idx_tags_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_campaign ON public.tags USING btree (campaign_id);


--
-- TOC entry 4816 (class 1259 OID 24751)
-- Name: ix_global_doc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_global_doc ON public.global_citizens USING btree (document_id);


--
-- TOC entry 4817 (class 1259 OID 24752)
-- Name: ix_global_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_global_name ON public.global_citizens USING btree (last_name, first_name);


--
-- TOC entry 4818 (class 1259 OID 24753)
-- Name: ix_global_table; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_global_table ON public.global_citizens USING btree (voting_table_id);


--
-- TOC entry 4828 (class 1259 OID 24830)
-- Name: ix_persons_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_persons_campaign ON public.persons USING btree (campaign_id);


--
-- TOC entry 4829 (class 1259 OID 24831)
-- Name: ix_persons_voted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_persons_voted ON public.persons USING btree (campaign_id, has_voted);


--
-- TOC entry 4874 (class 2606 OID 81930)
-- Name: activities activities_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);


--
-- TOC entry 4875 (class 2606 OID 73759)
-- Name: activities activities_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4876 (class 2606 OID 73774)
-- Name: activities activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4877 (class 2606 OID 73769)
-- Name: activities activities_linked_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_linked_list_id_fkey FOREIGN KEY (linked_list_id) REFERENCES public.lists(id);


--
-- TOC entry 4878 (class 2606 OID 73764)
-- Name: activities activities_linked_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_linked_person_id_fkey FOREIGN KEY (linked_person_id) REFERENCES public.persons(id);


--
-- TOC entry 4860 (class 2606 OID 24764)
-- Name: campaigns campaigns_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- TOC entry 4868 (class 2606 OID 41040)
-- Name: events events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4869 (class 2606 OID 65536)
-- Name: events events_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- TOC entry 4870 (class 2606 OID 41045)
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- TOC entry 4859 (class 2606 OID 24746)
-- Name: global_citizens global_citizens_voting_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_citizens
    ADD CONSTRAINT global_citizens_voting_table_id_fkey FOREIGN KEY (voting_table_id) REFERENCES public.polling_tables(id);


--
-- TOC entry 4873 (class 2606 OID 73741)
-- Name: lists lists_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4871 (class 2606 OID 57359)
-- Name: person_tags person_tags_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- TOC entry 4872 (class 2606 OID 57364)
-- Name: person_tags person_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- TOC entry 4863 (class 2606 OID 24825)
-- Name: persons persons_assigned_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_assigned_station_id_fkey FOREIGN KEY (assigned_station_id) REFERENCES public.stations(id);


--
-- TOC entry 4864 (class 2606 OID 24815)
-- Name: persons persons_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4865 (class 2606 OID 24820)
-- Name: persons persons_citizen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_citizen_id_fkey FOREIGN KEY (citizen_id) REFERENCES public.global_citizens(id);


--
-- TOC entry 4857 (class 2606 OID 24716)
-- Name: polling_places polling_places_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_places
    ADD CONSTRAINT polling_places_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- TOC entry 4858 (class 2606 OID 24729)
-- Name: polling_tables polling_tables_polling_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polling_tables
    ADD CONSTRAINT polling_tables_polling_place_id_fkey FOREIGN KEY (polling_place_id) REFERENCES public.polling_places(id) ON DELETE CASCADE;


--
-- TOC entry 4866 (class 2606 OID 41018)
-- Name: station_checkins station_checkins_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4867 (class 2606 OID 41023)
-- Name: station_checkins station_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_checkins
    ADD CONSTRAINT station_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4862 (class 2606 OID 24796)
-- Name: stations stations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4861 (class 2606 OID 24781)
-- Name: users users_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4856 (class 2606 OID 24701)
-- Name: zones zones_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


-- Completed on 2026-02-04 19:21:51

--
-- PostgreSQL database dump complete
--

\unrestrict En7QW9Tbgb7spRr4WfzPJM92k832aTRxKTZKdVjIuny6foBoWB235hs8yNvnW0t

