--
-- PostgreSQL database dump
--

\restrict nARU6zv1YOzTxlLZYSS5lnICJkf8dpcRCyR305lebqoMXPuqbOb5WcKc77lpB32

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Name: bookingstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bookingstatus AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_SALON',
    'COMPLETED',
    'NO_SHOW'
);


--
-- Name: consentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consentstatus AS ENUM (
    'granted',
    'revoked',
    'expired'
);


--
-- Name: consenttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consenttype AS ENUM (
    'terms_of_service',
    'privacy_policy',
    'data_processing',
    'marketing_emails',
    'marketing_sms',
    'marketing_push',
    'cookies_functional',
    'cookies_analytics',
    'cookies_marketing',
    'geolocation',
    'third_party_sharing'
);


--
-- Name: dayofweek; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dayofweek AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);


--
-- Name: paymentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentstatus AS ENUM (
    'PENDING',
    'PAID',
    'REFUNDED',
    'FAILED'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'SALON_OWNER',
    'MASTER',
    'CLIENT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    request_method character varying(10),
    request_path character varying(500),
    request_ip character varying(45),
    user_agent text,
    status_code integer,
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    salon_id integer NOT NULL,
    master_id integer NOT NULL,
    service_id integer NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status public.bookingstatus NOT NULL,
    price double precision NOT NULL,
    payment_status public.paymentstatus NOT NULL,
    payment_method character varying(50),
    client_notes text,
    salon_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    salon_id integer,
    message text NOT NULL,
    is_read integer,
    created_at timestamp without time zone
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: consent_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    consent_type public.consenttype NOT NULL,
    action character varying(50) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    ip_address character varying(45),
    user_agent character varying(500),
    document_version character varying(50),
    notes text
);


--
-- Name: consent_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consent_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consent_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consent_history_id_seq OWNED BY public.consent_history.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    salon_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    request_path character varying(500) NOT NULL,
    request_method character varying(10) NOT NULL,
    request_body_hash character varying(64),
    response_status integer,
    response_body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: idempotency_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.idempotency_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: idempotency_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.idempotency_keys_id_seq OWNED BY public.idempotency_keys.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    user_id integer,
    phone character varying(20) NOT NULL,
    success integer DEFAULT 0 NOT NULL,
    failure_reason character varying(200),
    request_ip character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: master_day_offs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_day_offs (
    id integer NOT NULL,
    master_id integer NOT NULL,
    date date NOT NULL,
    reason character varying(200)
);


--
-- Name: master_day_offs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_day_offs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_day_offs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_day_offs_id_seq OWNED BY public.master_day_offs.id;


--
-- Name: master_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_schedules (
    id integer NOT NULL,
    master_id integer NOT NULL,
    day_of_week public.dayofweek NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_start time without time zone,
    break_end time without time zone,
    is_active boolean
);


--
-- Name: master_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_schedules_id_seq OWNED BY public.master_schedules.id;


--
-- Name: masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.masters (
    id integer NOT NULL,
    salon_id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20),
    description text,
    specialization text,
    experience_years integer,
    rating double precision,
    reviews_count integer,
    avatar_url character varying(500),
    portfolio text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    created_by integer,
    updated_by integer,
    user_id integer
);


--
-- Name: masters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.masters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: masters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.masters_id_seq OWNED BY public.masters.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    booking_id integer,
    type character varying NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    is_read integer,
    sent_at timestamp without time zone,
    scheduled_for timestamp without time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id integer NOT NULL,
    code character varying NOT NULL,
    salon_id integer,
    discount_type character varying NOT NULL,
    discount_value double precision NOT NULL,
    min_booking_amount double precision,
    valid_from timestamp without time zone,
    valid_until timestamp without time zone,
    usage_limit integer,
    times_used integer,
    is_active integer,
    created_at timestamp without time zone
);


--
-- Name: promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promo_codes_id_seq OWNED BY public.promo_codes.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    client_id integer NOT NULL,
    salon_id integer NOT NULL,
    master_id integer NOT NULL,
    rating double precision NOT NULL,
    comment text,
    photos text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: salons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salons (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    address character varying(300) NOT NULL,
    phone character varying(20) NOT NULL,
    latitude double precision,
    longitude double precision,
    rating double precision,
    reviews_count integer,
    logo_url character varying(500),
    photos text,
    is_verified boolean,
    is_active boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    external_photo_url character varying(500),
    created_by integer,
    updated_by integer,
    rejection_reason text,
    approved_at timestamp with time zone,
    approved_by integer
);


--
-- Name: salons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salons_id_seq OWNED BY public.salons.id;


--
-- Name: service_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_masters (
    id integer NOT NULL,
    service_id integer NOT NULL,
    master_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: service_masters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_masters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_masters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_masters_id_seq OWNED BY public.service_masters.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    salon_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    price double precision NOT NULL,
    duration_minutes integer NOT NULL,
    category character varying(100),
    is_active boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    created_by integer,
    updated_by integer,
    is_home_service boolean DEFAULT false NOT NULL
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    id integer NOT NULL,
    master_id integer NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    is_booked boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: time_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_slots_id_seq OWNED BY public.time_slots.id;


--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_consents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    consent_type public.consenttype NOT NULL,
    status public.consentstatus DEFAULT 'granted'::public.consentstatus NOT NULL,
    document_version character varying(50),
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    expires_at timestamp with time zone,
    ip_address character varying(45),
    user_agent character varying(500),
    consent_method character varying(50),
    consent_text text
);


--
-- Name: user_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_consents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_consents_id_seq OWNED BY public.user_consents.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(100),
    name character varying(100) NOT NULL,
    hashed_password character varying(200) NOT NULL,
    role public.userrole NOT NULL,
    is_active boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_shifts (
    id integer NOT NULL,
    master_id integer NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: work_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_shifts_id_seq OWNED BY public.work_shifts.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: consent_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_history ALTER COLUMN id SET DEFAULT nextval('public.consent_history_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: idempotency_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys ALTER COLUMN id SET DEFAULT nextval('public.idempotency_keys_id_seq'::regclass);


--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- Name: master_day_offs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_day_offs ALTER COLUMN id SET DEFAULT nextval('public.master_day_offs_id_seq'::regclass);


--
-- Name: master_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_schedules ALTER COLUMN id SET DEFAULT nextval('public.master_schedules_id_seq'::regclass);


--
-- Name: masters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters ALTER COLUMN id SET DEFAULT nextval('public.masters_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: promo_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes ALTER COLUMN id SET DEFAULT nextval('public.promo_codes_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: salons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons ALTER COLUMN id SET DEFAULT nextval('public.salons_id_seq'::regclass);


--
-- Name: service_masters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_masters ALTER COLUMN id SET DEFAULT nextval('public.service_masters_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: time_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots ALTER COLUMN id SET DEFAULT nextval('public.time_slots_id_seq'::regclass);


--
-- Name: user_consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents ALTER COLUMN id SET DEFAULT nextval('public.user_consents_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_shifts ALTER COLUMN id SET DEFAULT nextval('public.work_shifts_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: consent_history consent_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_history
    ADD CONSTRAINT consent_history_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- Name: master_day_offs master_day_offs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_day_offs
    ADD CONSTRAINT master_day_offs_pkey PRIMARY KEY (id);


--
-- Name: master_schedules master_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_schedules
    ADD CONSTRAINT master_schedules_pkey PRIMARY KEY (id);


--
-- Name: masters masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters
    ADD CONSTRAINT masters_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: salons salons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT salons_pkey PRIMARY KEY (id);


--
-- Name: service_masters service_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_masters
    ADD CONSTRAINT service_masters_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- Name: favorites unique_user_salon_favorite; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT unique_user_salon_favorite UNIQUE (user_id, salon_id);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_shifts work_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_shifts
    ADD CONSTRAINT work_shifts_pkey PRIMARY KEY (id);


--
-- Name: idx_bookings_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_client ON public.bookings USING btree (client_id);


--
-- Name: idx_bookings_master_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_master_start ON public.bookings USING btree (master_id, start_at);


--
-- Name: idx_bookings_no_overlap; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_no_overlap ON public.bookings USING btree (master_id, start_at) WHERE (status <> ALL (ARRAY['CANCELLED_BY_CLIENT'::public.bookingstatus, 'CANCELLED_BY_SALON'::public.bookingstatus]));


--
-- Name: idx_bookings_salon_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_salon_start ON public.bookings USING btree (salon_id, start_at);


--
-- Name: idx_salons_verified_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salons_verified_active ON public.salons USING btree (is_verified, is_active) WHERE ((is_verified = true) AND (is_active = true));


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: ix_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_bookings_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bookings_id ON public.bookings USING btree (id);


--
-- Name: ix_bookings_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bookings_start_at ON public.bookings USING btree (start_at);


--
-- Name: ix_chat_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_chat_messages_id ON public.chat_messages USING btree (id);


--
-- Name: ix_consent_history_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_consent_history_timestamp ON public.consent_history USING btree ("timestamp");


--
-- Name: ix_consent_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_consent_history_user_id ON public.consent_history USING btree (user_id);


--
-- Name: ix_favorites_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_favorites_id ON public.favorites USING btree (id);


--
-- Name: ix_idempotency_key_path_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_idempotency_key_path_method ON public.idempotency_keys USING btree (key, request_path, request_method);


--
-- Name: ix_idempotency_keys_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_idempotency_keys_key ON public.idempotency_keys USING btree (key);


--
-- Name: ix_login_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_logs_created_at ON public.login_logs USING btree (created_at);


--
-- Name: ix_login_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_logs_id ON public.login_logs USING btree (id);


--
-- Name: ix_login_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_logs_user_id ON public.login_logs USING btree (user_id);


--
-- Name: ix_master_day_offs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_master_day_offs_date ON public.master_day_offs USING btree (date);


--
-- Name: ix_master_day_offs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_master_day_offs_id ON public.master_day_offs USING btree (id);


--
-- Name: ix_master_day_offs_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_master_day_offs_master_id ON public.master_day_offs USING btree (master_id);


--
-- Name: ix_master_schedules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_master_schedules_id ON public.master_schedules USING btree (id);


--
-- Name: ix_master_schedules_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_master_schedules_master_id ON public.master_schedules USING btree (master_id);


--
-- Name: ix_masters_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_masters_id ON public.masters USING btree (id);


--
-- Name: ix_masters_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_masters_user_id ON public.masters USING btree (user_id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_promo_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_promo_codes_code ON public.promo_codes USING btree (code);


--
-- Name: ix_promo_codes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promo_codes_id ON public.promo_codes USING btree (id);


--
-- Name: ix_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: ix_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: ix_reviews_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_id ON public.reviews USING btree (id);


--
-- Name: ix_salons_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_salons_id ON public.salons USING btree (id);


--
-- Name: ix_salons_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_salons_name ON public.salons USING btree (name);


--
-- Name: ix_service_masters_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_service_masters_id ON public.service_masters USING btree (id);


--
-- Name: ix_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_services_category ON public.services USING btree (category);


--
-- Name: ix_services_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_services_id ON public.services USING btree (id);


--
-- Name: ix_services_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_services_title ON public.services USING btree (title);


--
-- Name: ix_time_slots_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_time_slots_id ON public.time_slots USING btree (id);


--
-- Name: ix_time_slots_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_time_slots_start_at ON public.time_slots USING btree (start_at);


--
-- Name: ix_user_consents_consent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_consents_consent_type ON public.user_consents USING btree (consent_type);


--
-- Name: ix_user_consents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_consents_user_id ON public.user_consents USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_is_deleted ON public.users USING btree (is_deleted);


--
-- Name: ix_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_phone ON public.users USING btree (phone);


--
-- Name: ix_work_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_shifts_date ON public.work_shifts USING btree (date);


--
-- Name: ix_work_shifts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_shifts_id ON public.work_shifts USING btree (id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: bookings bookings_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: chat_messages chat_messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: chat_messages chat_messages_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: consent_history consent_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_history
    ADD CONSTRAINT consent_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bookings fk_bookings_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_bookings_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bookings fk_bookings_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_bookings_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: masters fk_masters_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters
    ADD CONSTRAINT fk_masters_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: masters fk_masters_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters
    ADD CONSTRAINT fk_masters_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: masters fk_masters_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters
    ADD CONSTRAINT fk_masters_user_id FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: salons fk_salons_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT fk_salons_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: salons fk_salons_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT fk_salons_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: services fk_services_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: services fk_services_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: login_logs login_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: master_day_offs master_day_offs_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_day_offs
    ADD CONSTRAINT master_day_offs_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: master_schedules master_schedules_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_schedules
    ADD CONSTRAINT master_schedules_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: masters masters_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.masters
    ADD CONSTRAINT masters_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: notifications notifications_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: promo_codes promo_codes_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: reviews reviews_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: reviews reviews_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: salons salons_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT salons_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: salons salons_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT salons_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: service_masters service_masters_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_masters
    ADD CONSTRAINT service_masters_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: service_masters service_masters_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_masters
    ADD CONSTRAINT service_masters_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: services services_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: time_slots time_slots_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- Name: user_consents user_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: work_shifts work_shifts_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_shifts
    ADD CONSTRAINT work_shifts_master_id_fkey FOREIGN KEY (master_id) REFERENCES public.masters(id);


--
-- PostgreSQL database dump complete
--

\unrestrict nARU6zv1YOzTxlLZYSS5lnICJkf8dpcRCyR305lebqoMXPuqbOb5WcKc77lpB32

