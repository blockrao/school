-- BASELINE SNAPSHOT — schema structure only, no data. NEVER APPLY THIS FILE.
--
-- Captured with `pg_dump --schema-only --no-owner --no-privileges --schema=public`
-- against DATABASE_URL, via pg_dump 18.4 client / PostgreSQL 17.6 server, on
-- 2026-09-24. Documents the state of the public schema as it existed before this
-- repo started tracking migrations — real, pre-existing production schema, not
-- something this codebase created. Real migrations start from the next timestamped
-- file in this directory (see 20260924160606_readonly_role.sql) and go through
-- scripts/db-migrate.mjs, never this one.

--
-- PostgreSQL database dump
--

\restrict fp1JnVJ04EmYT7Sc8Gu5v8wCSCVToENz5cT0dSOkM3jPqNsUzskDonpt5Br6Ptp

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admission_status AS ENUM (
    'not_announced',
    'upcoming',
    'open',
    'closing_soon',
    'closed',
    'results_out'
);


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'not_started',
    'preparing',
    'awaiting_parent_approval',
    'submitted',
    'fee_pending',
    'interview_scheduled',
    'result_selected',
    'result_waitlisted',
    'result_not_selected',
    'withdrawn'
);


--
-- Name: claim_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.claim_status AS ENUM (
    'unclaimed',
    'pending',
    'claimed',
    'rejected'
);


--
-- Name: consent_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_purpose AS ENUM (
    'account',
    'child_profile',
    'whatsapp_alerts',
    'application_help',
    'document_storage',
    'marketing'
);


--
-- Name: doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.doc_type AS ENUM (
    'birth_certificate',
    'photo_child',
    'photo_parent',
    'address_proof',
    'aadhaar_masked',
    'previous_report_card',
    'transfer_certificate',
    'caste_certificate',
    'income_certificate',
    'medical',
    'other'
);


--
-- Name: form_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.form_mode AS ENUM (
    'online',
    'offline',
    'both',
    'unknown'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'draft',
    'awaiting_payment',
    'paid',
    'in_progress',
    'completed',
    'cancelled',
    'refunded'
);


--
-- Name: record_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.record_status AS ENUM (
    'draft',
    'published',
    'hidden',
    'closed',
    'opt_out'
);


--
-- Name: review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_status AS ENUM (
    'pending',
    'approved',
    'edited',
    'rejected'
);


--
-- Name: school_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.school_gender AS ENUM (
    'coed',
    'boys',
    'girls'
);


--
-- Name: school_management; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.school_management AS ENUM (
    'private_unaided',
    'private_aided',
    'government',
    'central_government',
    'local_body',
    'other'
);


--
-- Name: school_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.school_tier AS ENUM (
    'A',
    'B',
    'C'
);


--
-- Name: seat_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.seat_confidence AS ENUM (
    'confirmed',
    'reported',
    'application_possible'
);


--
-- Name: seat_public_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.seat_public_status AS ENUM (
    'open',
    'limited',
    'waitlist',
    'closed'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'open',
    'in_progress',
    'blocked',
    'done',
    'cancelled'
);


--
-- Name: task_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_type AS ENUM (
    'verify_notice',
    'verify_update',
    'verify_record',
    'call_school',
    'application',
    'claim_review',
    'correction_request',
    'seat_update'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'parent',
    'school_admin',
    'ops',
    'admin'
);


--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_status AS ENUM (
    'unverified',
    'source_verified',
    'ops_verified',
    'school_verified'
);


--
-- Name: audit_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into audit_log(actor, action, entity_table, entity_id, before, after)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;


--
-- Name: current_role_is(public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_role_is(r public.user_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = r);
$$;


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.role from profiles p where p.user_id = auth.uid();
$$;


--
-- Name: fuzzy_candidates_in_districts(integer[], text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fuzzy_candidates_in_districts(p_district_ids integer[], p_name text, p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, name_en text, address text, pincode text, sim real)
    LANGUAGE sql STABLE
    AS $$
  select id, name_en, address, pincode, similarity(normalize_school_name(name_en), normalize_school_name(p_name))::real as sim
  from schools
  where district_id = any(p_district_ids)
  order by sim desc
  limit p_limit;
$$;


--
-- Name: is_school_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_school_member(sid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from school_members m where m.school_id = sid and m.user_id = auth.uid());
$$;


--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('ops','admin'));
$$;


--
-- Name: normalize_school_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_school_name(input text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  s text;
begin
  s := lower(public.unaccent(coalesce(input, '')));
  s := regexp_replace(s, '\.', '', 'g');
  s := regexp_replace(s, '\msr\s*sec\M', ' ', 'g');
  s := regexp_replace(s, '\msenior secondary\M', ' ', 'g');
  s := regexp_replace(s, '\mpub\M', 'public', 'g');
  s := regexp_replace(s, '\mvidyalay\M', 'vidyalaya', 'g');
  s := regexp_replace(s, '\mintl\M', 'international', 'g');
  s := regexp_replace(s, '\mschool\M', ' ', 'g');
  s := regexp_replace(s, '\mthe\M', ' ', 'g');
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  return trim(s);
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: saras_fuzzy_candidates(integer, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.saras_fuzzy_candidates(p_district_id integer, p_name text, p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, name_en text, sim real)
    LANGUAGE sql STABLE
    AS $$
  select id, name_en, similarity(normalize_school_name(name_en), normalize_school_name(p_name))::real as sim
  from schools
  where district_id = p_district_id
  order by sim desc
  limit p_limit;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admission_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    academic_year text NOT NULL,
    class_code text NOT NULL,
    status public.admission_status DEFAULT 'not_announced'::public.admission_status NOT NULL,
    form_mode public.form_mode DEFAULT 'unknown'::public.form_mode NOT NULL,
    opens_on date,
    closes_on date,
    results_on date,
    dob_from date,
    dob_to date,
    registration_fee numeric(10,2),
    documents_required text[] DEFAULT '{}'::text[],
    form_url text,
    notice_url text,
    selection_notes text,
    seats_total integer,
    verification public.verification_status DEFAULT 'unverified'::public.verification_status NOT NULL,
    last_checked_at timestamp with time zone,
    verified_at timestamp with time zone,
    verified_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    class_label_ambiguous boolean DEFAULT false NOT NULL,
    class_label_note text
);


--
-- Name: admission_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    url text NOT NULL,
    content_hash text NOT NULL,
    storage_path text,
    discovered_at timestamp with time zone DEFAULT now() NOT NULL,
    extraction jsonb,
    extraction_model text,
    extraction_confidence numeric(4,3),
    review public.review_status DEFAULT 'pending'::public.review_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    contains_personal_data boolean DEFAULT false NOT NULL,
    retention_note text,
    page_kind text,
    ai_extraction jsonb,
    promoted_to_golden boolean DEFAULT false NOT NULL,
    CONSTRAINT admission_notices_page_kind_check CHECK ((page_kind = ANY (ARRAY['admission_notice'::text, 'mandatory_disclosure'::text])))
);


--
-- Name: alert_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_deliveries (
    id bigint NOT NULL,
    subscription_id uuid,
    admission_cycle_id uuid,
    kind text NOT NULL,
    template text,
    provider_message_id text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    clicked_at timestamp with time zone,
    failed_reason text
);


--
-- Name: alert_deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_deliveries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_deliveries_id_seq OWNED BY public.alert_deliveries.id;


--
-- Name: alert_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    phone text NOT NULL,
    city_id integer NOT NULL,
    class_codes text[] DEFAULT '{}'::text[] NOT NULL,
    school_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    whatsapp_opt_in_at timestamp with time zone,
    language text DEFAULT 'en'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    utm jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: application_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    child_id uuid NOT NULL,
    product_code text NOT NULL,
    amount_inr numeric(10,2) NOT NULL,
    status public.order_status DEFAULT 'draft'::public.order_status NOT NULL,
    payment_ref text,
    intake jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    school_id uuid NOT NULL,
    admission_cycle_id uuid,
    status public.application_status DEFAULT 'not_started'::public.application_status NOT NULL,
    school_application_no text,
    submitted_at timestamp with time zone,
    next_action text,
    next_action_due date,
    parent_approved_at timestamp with time zone,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor uuid,
    actor_role public.user_role,
    action text NOT NULL,
    entity_table text,
    entity_id uuid,
    before jsonb,
    after jsonb,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id smallint NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_hi text
);


--
-- Name: boards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boards_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boards_id_seq OWNED BY public.boards.id;


--
-- Name: children; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.children (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    first_name text NOT NULL,
    date_of_birth date NOT NULL,
    target_year text,
    target_class text,
    current_school_text text,
    city_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    district_id integer NOT NULL,
    name_en text NOT NULL,
    name_hi text,
    slug text NOT NULL,
    centroid public.geography(Point,4326),
    is_launch boolean DEFAULT false NOT NULL
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: class_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_levels (
    code text NOT NULL,
    sort_order smallint NOT NULL,
    label_en text NOT NULL,
    label_hi text
);


--
-- Name: consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consents (
    id bigint NOT NULL,
    user_id uuid,
    phone text,
    purpose public.consent_purpose NOT NULL,
    notice_version text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    channel text NOT NULL
);


--
-- Name: consents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consents_id_seq OWNED BY public.consents.id;


--
-- Name: content_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id integer,
    kind text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_channels text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: correction_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correction_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    requester text NOT NULL,
    kind text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: data_quality_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_quality_flags (
    id bigint NOT NULL,
    school_id uuid,
    source_record_id bigint,
    rule text NOT NULL,
    field text,
    detail text,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_quality_flags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_quality_flags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_quality_flags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_quality_flags_id_seq OWNED BY public.data_quality_flags.id;


--
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    state_id smallint NOT NULL,
    name_en text NOT NULL,
    name_hi text,
    slug text NOT NULL,
    lgd_code text
);


--
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    kind public.doc_type NOT NULL,
    storage_path text NOT NULL,
    sha256 text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    retain_until date NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    user_id uuid,
    child_id uuid,
    class_code text,
    message text,
    status text DEFAULT 'new'::text NOT NULL,
    billable boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    name text NOT NULL,
    anon_id text,
    user_id uuid,
    city_id integer,
    school_id uuid,
    class_code text,
    props jsonb,
    utm jsonb,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    code text NOT NULL,
    label_en text NOT NULL,
    label_hi text,
    category text
);


--
-- Name: featured_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    city_id integer NOT NULL,
    class_codes text[] DEFAULT '{}'::text[],
    placement text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    label text DEFAULT 'Sponsored'::text NOT NULL,
    order_ref uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT featured_placements_label_check CHECK ((label = 'Sponsored'::text))
);


--
-- Name: fee_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    academic_year text NOT NULL,
    class_code text,
    component text NOT NULL,
    amount_min numeric(10,2),
    amount_max numeric(10,2),
    frequency text,
    verification public.verification_status DEFAULT 'unverified'::public.verification_status NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: field_provenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_provenance (
    id bigint NOT NULL,
    entity_table text NOT NULL,
    entity_id uuid NOT NULL,
    field text NOT NULL,
    value jsonb,
    source_id smallint,
    source_record_id bigint,
    evidence_url text,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: field_provenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.field_provenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: field_provenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.field_provenance_id_seq OWNED BY public.field_provenance.id;


--
-- Name: form_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    academic_year text NOT NULL,
    form_url text,
    mapping jsonb NOT NULL,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    customer_type text NOT NULL,
    customer_id uuid NOT NULL,
    amount_inr numeric(10,2) NOT NULL,
    gst_inr numeric(10,2) NOT NULL,
    gstin text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_path text
);


--
-- Name: localities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.localities (
    id integer NOT NULL,
    city_id integer NOT NULL,
    name_en text NOT NULL,
    name_hi text,
    slug text NOT NULL,
    pincodes text[] DEFAULT '{}'::text[],
    centroid public.geography(Point,4326),
    notable_landmarks text[],
    nearby_locality_slugs text[],
    zone text,
    ward_number text,
    ward_name text,
    character_tags text[],
    micro_localities text[],
    description text,
    enrichment_source text
);


--
-- Name: localities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.localities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: localities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.localities_id_seq OWNED BY public.localities.id;


--
-- Name: ops_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.task_type NOT NULL,
    status public.task_status DEFAULT 'open'::public.task_status NOT NULL,
    priority smallint DEFAULT 3 NOT NULL,
    school_id uuid,
    ref_table text,
    ref_id uuid,
    assignee uuid,
    due_at timestamp with time zone,
    payload jsonb,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    code text NOT NULL,
    name text NOT NULL,
    price_inr numeric(10,2) NOT NULL,
    gst_rate numeric(4,2) DEFAULT 18 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    role public.user_role DEFAULT 'parent'::public.user_role NOT NULL,
    full_name text,
    phone text,
    email text,
    language text DEFAULT 'en'::text NOT NULL,
    home_city_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    city_id integer,
    locality_id integer,
    district_id integer,
    name_en text NOT NULL,
    name_hi text,
    name_search tsvector,
    management public.school_management,
    gender public.school_gender,
    medium text[] DEFAULT '{}'::text[],
    min_class text,
    max_class text,
    address text,
    pincode text,
    location public.geography(Point,4326),
    geocode_precision text,
    website text,
    phone text[],
    email text[],
    established_year smallint,
    tier public.school_tier DEFAULT 'B'::public.school_tier NOT NULL,
    status public.record_status DEFAULT 'draft'::public.record_status NOT NULL,
    verification public.verification_status DEFAULT 'unverified'::public.verification_status NOT NULL,
    claim public.claim_status DEFAULT 'unclaimed'::public.claim_status NOT NULL,
    completeness smallint DEFAULT 0 NOT NULL,
    last_verified_at timestamp with time zone,
    next_check_due date,
    about_en text,
    about_hi text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_school_admissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_school_admissions AS
 SELECT s.id AS school_id,
    s.slug,
    s.city_id,
    s.name_en,
    s.name_hi,
    s.tier,
    ac.academic_year,
    ac.class_code,
    ac.status,
    ac.form_mode,
    ac.opens_on,
    ac.closes_on,
    ac.registration_fee,
    ac.form_url,
    ac.last_checked_at,
    ac.verification,
        CASE
            WHEN (ac.closes_on IS NOT NULL) THEN (ac.closes_on - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_close
   FROM (public.schools s
     JOIN public.admission_cycles ac ON ((ac.school_id = s.id)))
  WHERE (s.status = 'published'::public.record_status);


--
-- Name: seat_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    academic_year text NOT NULL,
    class_code text NOT NULL,
    public_status public.seat_public_status NOT NULL,
    range_label text,
    exact_count integer,
    confidence public.seat_confidence NOT NULL,
    mid_session_accepted boolean,
    reported_via text,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone
);


--
-- Name: public_seat_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_seat_status WITH (security_invoker='false') AS
 SELECT school_id,
    academic_year,
    class_code,
    public_status,
    range_label,
    confidence,
    mid_session_accepted,
    reported_at,
    confirmed_at
   FROM public.seat_status;


--
-- Name: sales_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_accounts (
    school_id uuid NOT NULL,
    stage text DEFAULT 'prospect'::text NOT NULL,
    owner uuid,
    last_contact_at timestamp with time zone,
    notes text
);


--
-- Name: sales_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_activities (
    id bigint NOT NULL,
    school_id uuid,
    actor uuid,
    kind text,
    outcome text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_activities_id_seq OWNED BY public.sales_activities.id;


--
-- Name: school_affiliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_affiliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    board_id smallint NOT NULL,
    affiliation_no text,
    level text,
    valid_from date,
    valid_to date,
    source_id smallint
);


--
-- Name: school_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    user_id uuid NOT NULL,
    method text NOT NULL,
    evidence jsonb,
    status public.claim_status DEFAULT 'pending'::public.claim_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_facilities (
    school_id uuid NOT NULL,
    facility_code text NOT NULL,
    available boolean NOT NULL,
    notes text
);


--
-- Name: school_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_identifiers (
    school_id uuid NOT NULL,
    scheme text NOT NULL,
    value text NOT NULL
);


--
-- Name: school_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    kind text NOT NULL,
    storage_path text,
    external_url text,
    licence text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_members (
    school_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL
);


--
-- Name: school_slug_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_slug_history (
    school_id uuid NOT NULL,
    city_slug text NOT NULL,
    old_slug text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shortlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shortlists (
    user_id uuid NOT NULL,
    school_id uuid NOT NULL,
    child_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: source_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_records (
    id bigint NOT NULL,
    source_id smallint NOT NULL,
    external_id text NOT NULL,
    payload jsonb NOT NULL,
    content_hash text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    matched_school_id uuid,
    match_confidence numeric(4,3),
    match_method text
);


--
-- Name: source_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_records_id_seq OWNED BY public.source_records.id;


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id smallint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    base_url text,
    licence_note text,
    trust_rank smallint DEFAULT 5 NOT NULL
);


--
-- Name: sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sources_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sources_id_seq OWNED BY public.sources.id;


--
-- Name: states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.states (
    id smallint NOT NULL,
    code text NOT NULL,
    name_en text NOT NULL,
    name_hi text
);


--
-- Name: states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.states_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;


--
-- Name: update_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.update_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    reporter_type text NOT NULL,
    reporter_id uuid,
    contact text,
    message text NOT NULL,
    attachment_path text,
    status public.review_status DEFAULT 'pending'::public.review_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries ALTER COLUMN id SET DEFAULT nextval('public.alert_deliveries_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: boards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards ALTER COLUMN id SET DEFAULT nextval('public.boards_id_seq'::regclass);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents ALTER COLUMN id SET DEFAULT nextval('public.consents_id_seq'::regclass);


--
-- Name: data_quality_flags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_flags ALTER COLUMN id SET DEFAULT nextval('public.data_quality_flags_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: field_provenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_provenance ALTER COLUMN id SET DEFAULT nextval('public.field_provenance_id_seq'::regclass);


--
-- Name: localities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities ALTER COLUMN id SET DEFAULT nextval('public.localities_id_seq'::regclass);


--
-- Name: sales_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_activities ALTER COLUMN id SET DEFAULT nextval('public.sales_activities_id_seq'::regclass);


--
-- Name: source_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_records ALTER COLUMN id SET DEFAULT nextval('public.source_records_id_seq'::regclass);


--
-- Name: sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources ALTER COLUMN id SET DEFAULT nextval('public.sources_id_seq'::regclass);


--
-- Name: states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);


--
-- Name: admission_cycles admission_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_cycles
    ADD CONSTRAINT admission_cycles_pkey PRIMARY KEY (id);


--
-- Name: admission_cycles admission_cycles_school_id_academic_year_class_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_cycles
    ADD CONSTRAINT admission_cycles_school_id_academic_year_class_code_key UNIQUE (school_id, academic_year, class_code);


--
-- Name: admission_notices admission_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_notices
    ADD CONSTRAINT admission_notices_pkey PRIMARY KEY (id);


--
-- Name: admission_notices admission_notices_url_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_notices
    ADD CONSTRAINT admission_notices_url_content_hash_key UNIQUE (url, content_hash);


--
-- Name: alert_deliveries alert_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_pkey PRIMARY KEY (id);


--
-- Name: alert_subscriptions alert_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_subscriptions
    ADD CONSTRAINT alert_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: application_orders application_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_orders
    ADD CONSTRAINT application_orders_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: boards boards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_code_key UNIQUE (code);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: cities cities_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_slug_key UNIQUE (slug);


--
-- Name: class_levels class_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_levels
    ADD CONSTRAINT class_levels_pkey PRIMARY KEY (code);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: content_posts content_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_pkey PRIMARY KEY (id);


--
-- Name: correction_requests correction_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_pkey PRIMARY KEY (id);


--
-- Name: data_quality_flags data_quality_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_flags
    ADD CONSTRAINT data_quality_flags_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: districts districts_state_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_id_slug_key UNIQUE (state_id, slug);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (code);


--
-- Name: featured_placements featured_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_placements
    ADD CONSTRAINT featured_placements_pkey PRIMARY KEY (id);


--
-- Name: fee_items fee_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_pkey PRIMARY KEY (id);


--
-- Name: field_provenance field_provenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_provenance
    ADD CONSTRAINT field_provenance_pkey PRIMARY KEY (id);


--
-- Name: form_mappings form_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_mappings
    ADD CONSTRAINT form_mappings_pkey PRIMARY KEY (id);


--
-- Name: form_mappings form_mappings_school_id_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_mappings
    ADD CONSTRAINT form_mappings_school_id_academic_year_key UNIQUE (school_id, academic_year);


--
-- Name: invoices invoices_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_number_key UNIQUE (number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: localities localities_city_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities
    ADD CONSTRAINT localities_city_id_slug_key UNIQUE (city_id, slug);


--
-- Name: localities localities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities
    ADD CONSTRAINT localities_pkey PRIMARY KEY (id);


--
-- Name: ops_tasks ops_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_tasks
    ADD CONSTRAINT ops_tasks_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (code);


--
-- Name: profiles profiles_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_phone_key UNIQUE (phone);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: sales_accounts sales_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_accounts
    ADD CONSTRAINT sales_accounts_pkey PRIMARY KEY (school_id);


--
-- Name: sales_activities sales_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_activities
    ADD CONSTRAINT sales_activities_pkey PRIMARY KEY (id);


--
-- Name: school_affiliations school_affiliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_affiliations
    ADD CONSTRAINT school_affiliations_pkey PRIMARY KEY (id);


--
-- Name: school_claims school_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_claims
    ADD CONSTRAINT school_claims_pkey PRIMARY KEY (id);


--
-- Name: school_facilities school_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_facilities
    ADD CONSTRAINT school_facilities_pkey PRIMARY KEY (school_id, facility_code);


--
-- Name: school_identifiers school_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_identifiers
    ADD CONSTRAINT school_identifiers_pkey PRIMARY KEY (scheme, value);


--
-- Name: school_media school_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_media
    ADD CONSTRAINT school_media_pkey PRIMARY KEY (id);


--
-- Name: school_members school_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_members
    ADD CONSTRAINT school_members_pkey PRIMARY KEY (school_id, user_id);


--
-- Name: school_slug_history school_slug_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_slug_history
    ADD CONSTRAINT school_slug_history_pkey PRIMARY KEY (city_slug, old_slug);


--
-- Name: schools schools_city_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_city_id_slug_key UNIQUE (city_id, slug);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: seat_status seat_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT seat_status_pkey PRIMARY KEY (id);


--
-- Name: seat_status seat_status_school_id_academic_year_class_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT seat_status_school_id_academic_year_class_code_key UNIQUE (school_id, academic_year, class_code);


--
-- Name: shortlists shortlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_pkey PRIMARY KEY (user_id, school_id);


--
-- Name: source_records source_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_records
    ADD CONSTRAINT source_records_pkey PRIMARY KEY (id);


--
-- Name: source_records source_records_source_id_external_id_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_records
    ADD CONSTRAINT source_records_source_id_external_id_content_hash_key UNIQUE (source_id, external_id, content_hash);


--
-- Name: sources sources_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_code_key UNIQUE (code);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: states states_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_code_key UNIQUE (code);


--
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- Name: update_reports update_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.update_reports
    ADD CONSTRAINT update_reports_pkey PRIMARY KEY (id);


--
-- Name: admission_cycles_academic_year_class_code_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admission_cycles_academic_year_class_code_status_idx ON public.admission_cycles USING btree (academic_year, class_code, status);


--
-- Name: admission_cycles_class_label_ambiguous_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admission_cycles_class_label_ambiguous_idx ON public.admission_cycles USING btree (class_label_ambiguous) WHERE class_label_ambiguous;


--
-- Name: admission_cycles_status_closes_on_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admission_cycles_status_closes_on_idx ON public.admission_cycles USING btree (status, closes_on);


--
-- Name: admission_notices_page_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admission_notices_page_kind_idx ON public.admission_notices USING btree (page_kind, review);


--
-- Name: admission_notices_promotable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admission_notices_promotable_idx ON public.admission_notices USING btree (review, promoted_to_golden) WHERE ((review = ANY (ARRAY['approved'::public.review_status, 'edited'::public.review_status])) AND (NOT promoted_to_golden));


--
-- Name: data_quality_flags_resolved_rule_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_quality_flags_resolved_rule_idx ON public.data_quality_flags USING btree (resolved, rule);


--
-- Name: events_name_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_name_at_idx ON public.events USING btree (name, at);


--
-- Name: field_provenance_entity_table_entity_id_field_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_provenance_entity_table_entity_id_field_created_at_idx ON public.field_provenance USING btree (entity_table, entity_id, field, created_at DESC);


--
-- Name: idx_schools_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_name_trgm ON public.schools USING gin (public.normalize_school_name(name_en) public.gin_trgm_ops);


--
-- Name: ops_tasks_status_kind_priority_due_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ops_tasks_status_kind_priority_due_at_idx ON public.ops_tasks USING btree (status, kind, priority, due_at);


--
-- Name: school_identifiers_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX school_identifiers_school_id_idx ON public.school_identifiers USING btree (school_id);


--
-- Name: schools_city_id_status_tier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_city_id_status_tier_idx ON public.schools USING btree (city_id, status, tier);


--
-- Name: schools_location_gix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_location_gix ON public.schools USING gist (location);


--
-- Name: schools_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_name_trgm ON public.schools USING gin (name_en public.gin_trgm_ops);


--
-- Name: schools_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_search_idx ON public.schools USING gin (name_search);


--
-- Name: source_records_matched_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX source_records_matched_school_id_idx ON public.source_records USING btree (matched_school_id);


--
-- Name: admission_cycles admission_cycles_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admission_cycles_audit AFTER INSERT OR DELETE OR UPDATE ON public.admission_cycles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: applications applications_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER applications_audit AFTER INSERT OR DELETE OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: featured_placements featured_placements_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER featured_placements_audit AFTER INSERT OR DELETE OR UPDATE ON public.featured_placements FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: fee_items fee_items_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fee_items_audit AFTER INSERT OR DELETE OR UPDATE ON public.fee_items FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: school_claims school_claims_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER school_claims_audit AFTER INSERT OR DELETE OR UPDATE ON public.school_claims FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: schools schools_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER schools_audit AFTER INSERT OR DELETE OR UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: seat_status seat_status_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER seat_status_audit AFTER INSERT OR DELETE OR UPDATE ON public.seat_status FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: admission_cycles admission_cycles_class_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_cycles
    ADD CONSTRAINT admission_cycles_class_code_fkey FOREIGN KEY (class_code) REFERENCES public.class_levels(code);


--
-- Name: admission_cycles admission_cycles_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_cycles
    ADD CONSTRAINT admission_cycles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: admission_notices admission_notices_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_notices
    ADD CONSTRAINT admission_notices_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: alert_deliveries alert_deliveries_admission_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_admission_cycle_id_fkey FOREIGN KEY (admission_cycle_id) REFERENCES public.admission_cycles(id);


--
-- Name: alert_deliveries alert_deliveries_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.alert_subscriptions(id) ON DELETE CASCADE;


--
-- Name: alert_subscriptions alert_subscriptions_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_subscriptions
    ADD CONSTRAINT alert_subscriptions_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: alert_subscriptions alert_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_subscriptions
    ADD CONSTRAINT alert_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: application_orders application_orders_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_orders
    ADD CONSTRAINT application_orders_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: application_orders application_orders_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_orders
    ADD CONSTRAINT application_orders_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(code);


--
-- Name: application_orders application_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_orders
    ADD CONSTRAINT application_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);


--
-- Name: applications applications_admission_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_admission_cycle_id_fkey FOREIGN KEY (admission_cycle_id) REFERENCES public.admission_cycles(id);


--
-- Name: applications applications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.application_orders(id) ON DELETE CASCADE;


--
-- Name: applications applications_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: children children_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: children children_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: children children_target_class_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_target_class_fkey FOREIGN KEY (target_class) REFERENCES public.class_levels(code);


--
-- Name: cities cities_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: consents consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: content_posts content_posts_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: correction_requests correction_requests_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: data_quality_flags data_quality_flags_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_flags
    ADD CONSTRAINT data_quality_flags_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: data_quality_flags data_quality_flags_source_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_flags
    ADD CONSTRAINT data_quality_flags_source_record_id_fkey FOREIGN KEY (source_record_id) REFERENCES public.source_records(id);


--
-- Name: districts districts_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- Name: documents documents_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: enquiries enquiries_class_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_class_code_fkey FOREIGN KEY (class_code) REFERENCES public.class_levels(code);


--
-- Name: enquiries enquiries_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: enquiries enquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);


--
-- Name: featured_placements featured_placements_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_placements
    ADD CONSTRAINT featured_placements_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: featured_placements featured_placements_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_placements
    ADD CONSTRAINT featured_placements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: fee_items fee_items_class_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_class_code_fkey FOREIGN KEY (class_code) REFERENCES public.class_levels(code);


--
-- Name: fee_items fee_items_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: field_provenance field_provenance_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_provenance
    ADD CONSTRAINT field_provenance_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: field_provenance field_provenance_source_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_provenance
    ADD CONSTRAINT field_provenance_source_record_id_fkey FOREIGN KEY (source_record_id) REFERENCES public.source_records(id);


--
-- Name: form_mappings form_mappings_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_mappings
    ADD CONSTRAINT form_mappings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: localities localities_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities
    ADD CONSTRAINT localities_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: ops_tasks ops_tasks_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_tasks
    ADD CONSTRAINT ops_tasks_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: profiles profiles_home_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_home_city_id_fkey FOREIGN KEY (home_city_id) REFERENCES public.cities(id);


--
-- Name: sales_accounts sales_accounts_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_accounts
    ADD CONSTRAINT sales_accounts_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: sales_activities sales_activities_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_activities
    ADD CONSTRAINT sales_activities_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: school_affiliations school_affiliations_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_affiliations
    ADD CONSTRAINT school_affiliations_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id);


--
-- Name: school_affiliations school_affiliations_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_affiliations
    ADD CONSTRAINT school_affiliations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_affiliations school_affiliations_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_affiliations
    ADD CONSTRAINT school_affiliations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: school_claims school_claims_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_claims
    ADD CONSTRAINT school_claims_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: school_claims school_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_claims
    ADD CONSTRAINT school_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);


--
-- Name: school_facilities school_facilities_facility_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_facilities
    ADD CONSTRAINT school_facilities_facility_code_fkey FOREIGN KEY (facility_code) REFERENCES public.facilities(code);


--
-- Name: school_facilities school_facilities_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_facilities
    ADD CONSTRAINT school_facilities_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_identifiers school_identifiers_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_identifiers
    ADD CONSTRAINT school_identifiers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_media school_media_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_media
    ADD CONSTRAINT school_media_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_members school_members_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_members
    ADD CONSTRAINT school_members_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_members school_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_members
    ADD CONSTRAINT school_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: school_slug_history school_slug_history_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_slug_history
    ADD CONSTRAINT school_slug_history_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: schools schools_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: schools schools_locality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_locality_id_fkey FOREIGN KEY (locality_id) REFERENCES public.localities(id);


--
-- Name: schools schools_max_class_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_max_class_fkey FOREIGN KEY (max_class) REFERENCES public.class_levels(code);


--
-- Name: schools schools_min_class_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_min_class_fkey FOREIGN KEY (min_class) REFERENCES public.class_levels(code);


--
-- Name: seat_status seat_status_class_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT seat_status_class_code_fkey FOREIGN KEY (class_code) REFERENCES public.class_levels(code);


--
-- Name: seat_status seat_status_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT seat_status_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: shortlists shortlists_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL;


--
-- Name: shortlists shortlists_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: shortlists shortlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: source_records source_records_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_records
    ADD CONSTRAINT source_records_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: update_reports update_reports_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.update_reports
    ADD CONSTRAINT update_reports_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: admission_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_notices ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_notices admission_notices_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admission_notices_staff_all ON public.admission_notices USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_affiliations aff_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aff_public_read ON public.school_affiliations FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.schools s
  WHERE ((s.id = school_affiliations.school_id) AND (s.status = 'published'::public.record_status)))) OR public.is_staff()));


--
-- Name: school_affiliations aff_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aff_staff_write ON public.school_affiliations USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: alert_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_deliveries alert_deliveries_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alert_deliveries_staff_all ON public.alert_deliveries USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: alert_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_subscriptions alerts_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alerts_owner ON public.alert_subscriptions USING (((user_id = auth.uid()) OR public.is_staff())) WITH CHECK (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: application_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.application_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: applications apps_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apps_owner ON public.applications FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.application_orders o
  WHERE ((o.id = applications.order_id) AND (o.user_id = auth.uid())))) OR public.is_staff()));


--
-- Name: applications apps_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY apps_staff_write ON public.applications USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_staff_all ON public.audit_log USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

--
-- Name: boards boards_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY boards_public_read ON public.boards FOR SELECT USING (true);


--
-- Name: boards boards_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY boards_staff_write ON public.boards USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: children; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

--
-- Name: children children_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY children_owner ON public.children USING (((parent_id = auth.uid()) OR public.is_staff())) WITH CHECK (((parent_id = auth.uid()) OR public.is_staff()));


--
-- Name: cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

--
-- Name: cities cities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cities_public_read ON public.cities FOR SELECT USING (true);


--
-- Name: cities cities_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cities_staff_write ON public.cities USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_claims claims_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY claims_insert ON public.school_claims FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: school_claims claims_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY claims_self ON public.school_claims FOR SELECT USING (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: school_claims claims_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY claims_staff ON public.school_claims FOR UPDATE USING (public.is_staff());


--
-- Name: class_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: class_levels class_levels_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_levels_public_read ON public.class_levels FOR SELECT USING (true);


--
-- Name: class_levels class_levels_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_levels_staff_write ON public.class_levels USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

--
-- Name: consents consents_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consents_self ON public.consents USING (((user_id = auth.uid()) OR public.is_staff())) WITH CHECK (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: content_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: content_posts content_posts_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_posts_staff_all ON public.content_posts USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: correction_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: correction_requests correction_requests_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY correction_requests_staff_all ON public.correction_requests USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: admission_cycles cycles_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cycles_public_read ON public.admission_cycles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.schools s
  WHERE ((s.id = admission_cycles.school_id) AND (s.status = 'published'::public.record_status)))) OR public.is_staff() OR public.is_school_member(school_id)));


--
-- Name: admission_cycles cycles_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cycles_staff_write ON public.admission_cycles USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: data_quality_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_quality_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: data_quality_flags data_quality_flags_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY data_quality_flags_staff_all ON public.data_quality_flags USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: districts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

--
-- Name: districts districts_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY districts_public_read ON public.districts FOR SELECT USING (true);


--
-- Name: districts districts_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY districts_staff_write ON public.districts USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: documents docs_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY docs_owner ON public.documents USING (((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = documents.child_id) AND (c.parent_id = auth.uid())))) OR public.is_staff())) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = documents.child_id) AND (c.parent_id = auth.uid())))) OR public.is_staff()));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: enquiries enq_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enq_insert ON public.enquiries FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: enquiries enq_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enq_read ON public.enquiries FOR SELECT USING (((user_id = auth.uid()) OR public.is_school_member(school_id) OR public.is_staff()));


--
-- Name: enquiries enq_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enq_staff ON public.enquiries FOR UPDATE USING ((public.is_staff() OR public.is_school_member(school_id)));


--
-- Name: enquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert ON public.events FOR INSERT WITH CHECK (true);


--
-- Name: events events_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_staff_read ON public.events FOR SELECT USING (public.is_staff());


--
-- Name: school_facilities fac_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fac_public_read ON public.school_facilities FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.schools s
  WHERE ((s.id = school_facilities.school_id) AND (s.status = 'published'::public.record_status)))) OR public.is_staff()));


--
-- Name: school_facilities fac_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fac_staff_write ON public.school_facilities USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: facilities facilities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY facilities_public_read ON public.facilities FOR SELECT USING (true);


--
-- Name: facilities facilities_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY facilities_staff_write ON public.facilities USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: featured_placements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.featured_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: featured_placements featured_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY featured_public_read ON public.featured_placements FOR SELECT USING ((((CURRENT_DATE >= starts_on) AND (CURRENT_DATE <= ends_on)) OR public.is_staff()));


--
-- Name: featured_placements featured_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY featured_staff ON public.featured_placements USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: fee_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_items fees_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fees_public_read ON public.fee_items FOR SELECT USING (((verification = ANY (ARRAY['ops_verified'::public.verification_status, 'school_verified'::public.verification_status])) OR public.is_staff()));


--
-- Name: fee_items fees_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fees_staff_write ON public.fee_items USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: field_provenance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.field_provenance ENABLE ROW LEVEL SECURITY;

--
-- Name: field_provenance field_provenance_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY field_provenance_staff_all ON public.field_provenance USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: form_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.form_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: form_mappings form_mappings_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY form_mappings_staff_all ON public.form_mappings USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_staff ON public.invoices USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: localities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;

--
-- Name: localities localities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY localities_public_read ON public.localities FOR SELECT USING (true);


--
-- Name: localities localities_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY localities_staff_write ON public.localities USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_media media_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_public_read ON public.school_media FOR SELECT USING ((approved OR public.is_staff()));


--
-- Name: school_media media_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_staff_write ON public.school_media USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_members members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_read ON public.school_members FOR SELECT USING (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: school_members members_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_staff ON public.school_members USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: ops_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: ops_tasks ops_tasks_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ops_tasks_staff_all ON public.ops_tasks USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: application_orders orders_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_owner ON public.application_orders FOR SELECT USING (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: application_orders orders_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_staff_write ON public.application_orders USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_public_read ON public.products FOR SELECT USING (true);


--
-- Name: products products_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_staff_write ON public.products USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_self ON public.profiles FOR SELECT USING (((user_id = auth.uid()) OR public.is_staff()));


--
-- Name: profiles profiles_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (role = 'parent'::public.user_role)));


--
-- Name: profiles profiles_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND (role = public.current_user_role())));


--
-- Name: update_reports reports_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_insert ON public.update_reports FOR INSERT WITH CHECK (true);


--
-- Name: update_reports reports_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_staff ON public.update_reports FOR SELECT USING (public.is_staff());


--
-- Name: update_reports reports_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_staff_update ON public.update_reports FOR UPDATE USING (public.is_staff());


--
-- Name: sales_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_accounts sales_accounts_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_accounts_staff_all ON public.sales_accounts USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: sales_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_activities sales_activities_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_activities_staff_all ON public.sales_activities USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_affiliations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_affiliations ENABLE ROW LEVEL SECURITY;

--
-- Name: school_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: school_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: school_identifiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_identifiers ENABLE ROW LEVEL SECURITY;

--
-- Name: school_identifiers school_identifiers_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_identifiers_staff_all ON public.school_identifiers USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: school_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_media ENABLE ROW LEVEL SECURITY;

--
-- Name: school_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

--
-- Name: school_slug_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_slug_history ENABLE ROW LEVEL SECURITY;

--
-- Name: school_slug_history school_slug_history_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_slug_history_staff_all ON public.school_slug_history USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: schools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

--
-- Name: schools schools_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_public_read ON public.schools FOR SELECT USING (((status = 'published'::public.record_status) OR public.is_staff() OR public.is_school_member(id)));


--
-- Name: schools schools_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_staff_write ON public.schools USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: seat_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seat_status ENABLE ROW LEVEL SECURITY;

--
-- Name: seat_status seats_staff_or_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seats_staff_or_member ON public.seat_status FOR SELECT USING ((public.is_staff() OR public.is_school_member(school_id)));


--
-- Name: seat_status seats_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seats_staff_write ON public.seat_status USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: shortlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

--
-- Name: shortlists shortlists_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shortlists_owner ON public.shortlists USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: source_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;

--
-- Name: source_records source_records_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY source_records_staff_all ON public.source_records USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- Name: sources sources_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sources_staff_all ON public.sources USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

--
-- Name: states states_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY states_public_read ON public.states FOR SELECT USING (true);


--
-- Name: states states_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY states_staff_write ON public.states USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: update_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.update_reports ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict fp1JnVJ04EmYT7Sc8Gu5v8wCSCVToENz5cT0dSOkM3jPqNsUzskDonpt5Br6Ptp

