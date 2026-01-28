\restrict dbmate

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 18.1

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dim_crew; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_crew (
    id integer NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_crew_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dim_crew_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dim_crew_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dim_crew_id_seq OWNED BY public.dim_crew.id;


--
-- Name: dim_daily_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_daily_report (
    id integer NOT NULL,
    mongo_id character varying(24) NOT NULL,
    jobsite_id integer NOT NULL,
    crew_id integer NOT NULL,
    report_date date NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    payroll_complete boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_daily_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dim_daily_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dim_daily_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dim_daily_report_id_seq OWNED BY public.dim_daily_report.id;


--
-- Name: dim_employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_employee (
    id integer NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    job_title character varying(255),
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dim_employee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dim_employee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dim_employee_id_seq OWNED BY public.dim_employee.id;


--
-- Name: dim_employee_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_employee_rate (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    rate numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_employee_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dim_employee_rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dim_employee_rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dim_employee_rate_id_seq OWNED BY public.dim_employee_rate.id;


--
-- Name: dim_jobsite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_jobsite (
    id integer NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    jobcode character varying(100),
    active boolean DEFAULT true NOT NULL,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_jobsite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dim_jobsite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dim_jobsite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dim_jobsite_id_seq OWNED BY public.dim_jobsite.id;


--
-- Name: fact_employee_work; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_employee_work (
    id integer NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id integer NOT NULL,
    jobsite_id integer NOT NULL,
    employee_id integer NOT NULL,
    crew_id integer NOT NULL,
    work_date date NOT NULL,
    year smallint NOT NULL,
    month smallint NOT NULL,
    week smallint NOT NULL,
    day_of_week smallint NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    job_title character varying(255) NOT NULL,
    hours numeric(10,2) GENERATED ALWAYS AS ((EXTRACT(epoch FROM (end_time - start_time)) / (3600)::numeric)) STORED,
    hourly_rate numeric(10,2) NOT NULL,
    total_cost numeric(12,2) GENERATED ALWAYS AS (((EXTRACT(epoch FROM (end_time - start_time)) / (3600)::numeric) * hourly_rate)) STORED,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_employee_work_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fact_employee_work_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fact_employee_work_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fact_employee_work_id_seq OWNED BY public.fact_employee_work.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: dim_crew id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_crew ALTER COLUMN id SET DEFAULT nextval('public.dim_crew_id_seq'::regclass);


--
-- Name: dim_daily_report id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_daily_report ALTER COLUMN id SET DEFAULT nextval('public.dim_daily_report_id_seq'::regclass);


--
-- Name: dim_employee id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee ALTER COLUMN id SET DEFAULT nextval('public.dim_employee_id_seq'::regclass);


--
-- Name: dim_employee_rate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee_rate ALTER COLUMN id SET DEFAULT nextval('public.dim_employee_rate_id_seq'::regclass);


--
-- Name: dim_jobsite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite ALTER COLUMN id SET DEFAULT nextval('public.dim_jobsite_id_seq'::regclass);


--
-- Name: fact_employee_work id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work ALTER COLUMN id SET DEFAULT nextval('public.fact_employee_work_id_seq'::regclass);


--
-- Name: dim_crew dim_crew_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_crew
    ADD CONSTRAINT dim_crew_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_crew dim_crew_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_crew
    ADD CONSTRAINT dim_crew_pkey PRIMARY KEY (id);


--
-- Name: dim_daily_report dim_daily_report_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_daily_report
    ADD CONSTRAINT dim_daily_report_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_daily_report dim_daily_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_daily_report
    ADD CONSTRAINT dim_daily_report_pkey PRIMARY KEY (id);


--
-- Name: dim_employee dim_employee_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee
    ADD CONSTRAINT dim_employee_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_employee dim_employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee
    ADD CONSTRAINT dim_employee_pkey PRIMARY KEY (id);


--
-- Name: dim_employee_rate dim_employee_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee_rate
    ADD CONSTRAINT dim_employee_rate_pkey PRIMARY KEY (id);


--
-- Name: dim_jobsite dim_jobsite_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite
    ADD CONSTRAINT dim_jobsite_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_jobsite dim_jobsite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite
    ADD CONSTRAINT dim_jobsite_pkey PRIMARY KEY (id);


--
-- Name: fact_employee_work fact_employee_work_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_employee_work fact_employee_work_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: idx_dim_crew_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_crew_mongo_id ON public.dim_crew USING btree (mongo_id);


--
-- Name: idx_dim_daily_report_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_daily_report_date ON public.dim_daily_report USING btree (report_date);


--
-- Name: idx_dim_daily_report_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_daily_report_jobsite_date ON public.dim_daily_report USING btree (jobsite_id, report_date);


--
-- Name: idx_dim_daily_report_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_daily_report_mongo_id ON public.dim_daily_report USING btree (mongo_id);


--
-- Name: idx_dim_employee_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_employee_mongo_id ON public.dim_employee USING btree (mongo_id);


--
-- Name: idx_dim_employee_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_employee_name ON public.dim_employee USING btree (name);


--
-- Name: idx_dim_employee_rate_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_employee_rate_lookup ON public.dim_employee_rate USING btree (employee_id, effective_date);


--
-- Name: idx_dim_jobsite_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_active ON public.dim_jobsite USING btree (active);


--
-- Name: idx_dim_jobsite_jobcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_jobcode ON public.dim_jobsite USING btree (jobcode);


--
-- Name: idx_dim_jobsite_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_mongo_id ON public.dim_jobsite USING btree (mongo_id);


--
-- Name: idx_fact_employee_work_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_date ON public.fact_employee_work USING btree (work_date);


--
-- Name: idx_fact_employee_work_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_employee_date ON public.fact_employee_work USING btree (employee_id, work_date);


--
-- Name: idx_fact_employee_work_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_jobsite_date ON public.fact_employee_work USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_employee_work_jobsite_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_jobsite_year_month ON public.fact_employee_work USING btree (jobsite_id, year, month);


--
-- Name: idx_fact_employee_work_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_mongo_id ON public.fact_employee_work USING btree (mongo_id);


--
-- Name: idx_fact_employee_work_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_year_month ON public.fact_employee_work USING btree (year, month);


--
-- Name: dim_daily_report dim_daily_report_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_daily_report
    ADD CONSTRAINT dim_daily_report_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: dim_daily_report dim_daily_report_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_daily_report
    ADD CONSTRAINT dim_daily_report_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: dim_employee_rate dim_employee_rate_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_employee_rate
    ADD CONSTRAINT dim_employee_rate_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.dim_employee(id) ON DELETE CASCADE;


--
-- Name: fact_employee_work fact_employee_work_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_employee_work fact_employee_work_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_employee_work fact_employee_work_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.dim_employee(id) ON DELETE CASCADE;


--
-- Name: fact_employee_work fact_employee_work_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_employee_work
    ADD CONSTRAINT fact_employee_work_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260128205200');
