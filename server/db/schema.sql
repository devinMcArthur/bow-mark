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

--
-- Name: employee_productivity(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.employee_productivity(p_employee_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(employee_id uuid, employee_name character varying, jobsite_id uuid, jobsite_name character varying, total_hours numeric, total_cost numeric, days_worked bigint, avg_hours_per_day numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ef.employee_id,
        de.name as employee_name,
        ef.jobsite_id,
        dj.name as jobsite_name,
        SUM(ef.hours)::DECIMAL(10,2) as total_hours,
        SUM(ef.total_cost)::DECIMAL(12,2) as total_cost,
        COUNT(DISTINCT ef.work_date) as days_worked,
        (SUM(ef.hours) / NULLIF(COUNT(DISTINCT ef.work_date), 0))::DECIMAL(6,2) as avg_hours_per_day
    FROM fact_employee_work ef
    LEFT JOIN dim_employee de ON de.id = ef.employee_id
    LEFT JOIN dim_jobsite dj ON dj.id = ef.jobsite_id
    WHERE ef.employee_id = p_employee_id
      AND ef.work_date BETWEEN p_start_date AND p_end_date
      AND ef.archived_at IS NULL
    GROUP BY ef.employee_id, de.name, ef.jobsite_id, dj.name
    ORDER BY total_hours DESC;
END;
$$;


--
-- Name: jobsite_comparison(uuid[], date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jobsite_comparison(p_jobsite_ids uuid[], p_start_date date, p_end_date date) RETURNS TABLE(jobsite_id uuid, jobsite_name character varying, jobcode character varying, total_cost numeric, total_revenue numeric, net_income numeric, employee_hours numeric, days_worked bigint, cost_per_day numeric, revenue_per_day numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        fs.jobsite_id,
        fs.jobsite_name,
        fs.jobcode,
        SUM(fs.total_cost)::DECIMAL(12,2) as total_cost,
        SUM(fs.external_revenue + fs.internal_revenue)::DECIMAL(12,2) as total_revenue,
        SUM(fs.net_income)::DECIMAL(12,2) as net_income,
        SUM(fs.employee_hours)::DECIMAL(10,2) as employee_hours,
        COUNT(DISTINCT fs.date) as days_worked,
        (SUM(fs.total_cost) / NULLIF(COUNT(DISTINCT fs.date), 0))::DECIMAL(12,2) as cost_per_day,
        (SUM(fs.external_revenue + fs.internal_revenue) / NULLIF(COUNT(DISTINCT fs.date), 0))::DECIMAL(12,2) as revenue_per_day
    FROM jobsite_daily_financial_summary fs
    WHERE fs.jobsite_id = ANY(p_jobsite_ids)
      AND fs.date BETWEEN p_start_date AND p_end_date
    GROUP BY fs.jobsite_id, fs.jobsite_name, fs.jobcode
    ORDER BY net_income DESC;
END;
$$;


--
-- Name: jobsite_period_summary(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jobsite_period_summary(p_jobsite_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(jobsite_id uuid, jobsite_name character varying, jobcode character varying, period_start date, period_end date, employee_hours numeric, employee_cost numeric, vehicle_hours numeric, vehicle_cost numeric, material_quantity numeric, material_cost numeric, non_costed_material_quantity numeric, trucking_quantity numeric, trucking_hours numeric, trucking_cost numeric, total_cost numeric, external_revenue numeric, internal_revenue numeric, accrual_revenue numeric, external_expense numeric, internal_expense numeric, accrual_expense numeric, net_income numeric, days_worked bigint, has_estimated_costs boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        fs.jobsite_id,
        fs.jobsite_name,
        fs.jobcode,
        p_start_date,
        p_end_date,

        SUM(fs.employee_hours)::DECIMAL(10,2),
        SUM(fs.employee_cost)::DECIMAL(12,2),

        SUM(fs.vehicle_hours)::DECIMAL(10,2),
        SUM(fs.vehicle_cost)::DECIMAL(12,2),

        SUM(fs.material_quantity)::DECIMAL(12,3),
        SUM(fs.material_cost)::DECIMAL(12,2),

        SUM(fs.non_costed_material_quantity)::DECIMAL(12,3),

        SUM(fs.trucking_quantity)::DECIMAL(12,3),
        SUM(fs.trucking_hours)::DECIMAL(10,2),
        SUM(fs.trucking_cost)::DECIMAL(12,2),

        SUM(fs.total_cost)::DECIMAL(12,2),

        SUM(fs.external_revenue)::DECIMAL(12,2),
        SUM(fs.internal_revenue)::DECIMAL(12,2),
        SUM(fs.accrual_revenue)::DECIMAL(12,2),
        SUM(fs.external_expense)::DECIMAL(12,2),
        SUM(fs.internal_expense)::DECIMAL(12,2),
        SUM(fs.accrual_expense)::DECIMAL(12,2),

        SUM(fs.net_income)::DECIMAL(12,2),

        COUNT(DISTINCT fs.date),
        BOOL_OR(fs.has_estimated_costs)

    FROM jobsite_daily_financial_summary fs
    WHERE fs.jobsite_id = p_jobsite_id
      AND fs.date BETWEEN p_start_date AND p_end_date
    GROUP BY fs.jobsite_id, fs.jobsite_name, fs.jobcode;
END;
$$;


--
-- Name: vehicle_utilization(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vehicle_utilization(p_vehicle_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(vehicle_id uuid, vehicle_name character varying, vehicle_code character varying, jobsite_id uuid, jobsite_name character varying, total_hours numeric, total_cost numeric, days_used bigint, avg_hours_per_day numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        vf.vehicle_id,
        dv.name as vehicle_name,
        dv.vehicle_code,
        vf.jobsite_id,
        dj.name as jobsite_name,
        SUM(vf.hours)::DECIMAL(10,2) as total_hours,
        SUM(vf.total_cost)::DECIMAL(12,2) as total_cost,
        COUNT(DISTINCT vf.work_date) as days_used,
        (SUM(vf.hours) / NULLIF(COUNT(DISTINCT vf.work_date), 0))::DECIMAL(6,2) as avg_hours_per_day
    FROM fact_vehicle_work vf
    LEFT JOIN dim_vehicle dv ON dv.id = vf.vehicle_id
    LEFT JOIN dim_jobsite dj ON dj.id = vf.jobsite_id
    WHERE vf.vehicle_id = p_vehicle_id
      AND vf.work_date BETWEEN p_start_date AND p_end_date
      AND vf.archived_at IS NULL
    GROUP BY vf.vehicle_id, dv.name, dv.vehicle_code, vf.jobsite_id, dj.name
    ORDER BY total_hours DESC;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dim_company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_company (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_crew; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_crew (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_daily_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_daily_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    jobsite_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    report_date date NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    payroll_complete boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_employee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    job_title character varying(255),
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_employee_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_employee_rate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    mongo_id character varying(24),
    rate numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_jobsite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_jobsite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    jobcode character varying(100),
    active boolean DEFAULT true NOT NULL,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_jobsite_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_jobsite_material (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    jobsite_id uuid NOT NULL,
    material_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit character varying(50) NOT NULL,
    cost_type character varying(50) NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_jobsite_material_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_jobsite_material_rate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    jobsite_material_id uuid NOT NULL,
    mongo_id character varying(24),
    rate numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    estimated boolean DEFAULT false NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_material (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_vehicle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_vehicle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    name character varying(255) NOT NULL,
    vehicle_code character varying(50) NOT NULL,
    vehicle_type character varying(100) DEFAULT 'General'::character varying NOT NULL,
    is_rental boolean DEFAULT false NOT NULL,
    source_company character varying(255) DEFAULT 'Bow Mark'::character varying NOT NULL,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dim_vehicle_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dim_vehicle_rate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    mongo_id character varying(24),
    rate numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_employee_work; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_employee_work (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    job_title character varying(255) NOT NULL,
    hours numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN (EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) < EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) THEN (((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) + (86400)::numeric) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric)
    ELSE ((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric)
END) STORED,
    hourly_rate numeric(10,2) NOT NULL,
    total_cost numeric(12,2) GENERATED ALWAYS AS (
CASE
    WHEN (EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) < EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) THEN ((((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) + (86400)::numeric) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric) * hourly_rate)
    ELSE (((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric) * hourly_rate)
END) STORED,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_invoice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    jobsite_id uuid NOT NULL,
    company_id uuid NOT NULL,
    invoice_date date NOT NULL,
    direction character varying(10) NOT NULL,
    invoice_type character varying(20) NOT NULL,
    invoice_number character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_material_shipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_material_shipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    jobsite_material_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit character varying(50) NOT NULL,
    rate numeric(10,2) NOT NULL,
    total_cost numeric(12,2) GENERATED ALWAYS AS ((quantity * rate)) STORED,
    estimated boolean DEFAULT false NOT NULL,
    delivered_rate_id character varying(24),
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_non_costed_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_non_costed_material (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    material_name character varying(255) NOT NULL,
    supplier_name character varying(255) NOT NULL,
    shipment_type character varying(255),
    quantity numeric(12,3) NOT NULL,
    unit character varying(50),
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_production; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_production (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    job_title text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit character varying(50) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    description text,
    hours numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN (EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) < EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) THEN (((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) + (86400)::numeric) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric)
    ELSE ((EXTRACT(epoch FROM (end_time AT TIME ZONE 'UTC'::text)) - EXTRACT(epoch FROM (start_time AT TIME ZONE 'UTC'::text))) / (3600)::numeric)
END) STORED,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_trucking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_trucking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    vehicle_id uuid,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    trucking_type character varying(255) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    hours numeric(6,2),
    rate numeric(10,2) NOT NULL,
    rate_type character varying(20) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    vehicle_source character varying(255),
    vehicle_type character varying(100),
    vehicle_code character varying(50),
    trucking_rate_id character varying(24),
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_vehicle_work; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_vehicle_work (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mongo_id character varying(24) NOT NULL,
    daily_report_id uuid NOT NULL,
    jobsite_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    crew_id uuid NOT NULL,
    crew_type character varying(100) NOT NULL,
    work_date date NOT NULL,
    job_title character varying(255),
    hours numeric(10,2) NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    total_cost numeric(12,2) GENERATED ALWAYS AS ((hours * hourly_rate)) STORED,
    archived_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jobsite_all_costs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_all_costs AS
 SELECT f.jobsite_id,
    f.work_date AS date,
    f.crew_type,
    'employee'::text AS cost_type,
    f.employee_id AS entity_id,
    NULL::character varying AS entity_name,
    f.hours AS quantity,
    'hours'::text AS quantity_unit,
    f.hourly_rate AS rate,
    f.total_cost,
    false AS estimated,
    f.daily_report_id
   FROM (public.fact_employee_work f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    f.crew_type,
    'vehicle'::text AS cost_type,
    f.vehicle_id AS entity_id,
    NULL::character varying AS entity_name,
    f.hours AS quantity,
    'hours'::text AS quantity_unit,
    f.hourly_rate AS rate,
    f.total_cost,
    false AS estimated,
    f.daily_report_id
   FROM (public.fact_vehicle_work f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    f.crew_type,
    'material'::text AS cost_type,
    f.jobsite_material_id AS entity_id,
    NULL::character varying AS entity_name,
    f.quantity,
    f.unit AS quantity_unit,
    f.rate,
    f.total_cost,
    f.estimated,
    f.daily_report_id
   FROM (public.fact_material_shipment f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    f.crew_type,
    'non_costed_material'::text AS cost_type,
    NULL::uuid AS entity_id,
    f.material_name AS entity_name,
    f.quantity,
    f.unit AS quantity_unit,
    0 AS rate,
    0 AS total_cost,
    false AS estimated,
    f.daily_report_id
   FROM (public.fact_non_costed_material f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    f.crew_type,
    'trucking'::text AS cost_type,
    NULL::uuid AS entity_id,
    f.trucking_type AS entity_name,
    f.quantity,
    f.rate_type AS quantity_unit,
    f.rate,
    f.total_cost,
    false AS estimated,
    f.daily_report_id
   FROM (public.fact_trucking f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false));


--
-- Name: jobsite_daily_crew_type_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_daily_crew_type_summary AS
 SELECT c.jobsite_id,
    c.date,
    c.crew_type,
    sum(
        CASE
            WHEN (c.cost_type = 'employee'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS employee_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'employee'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS employee_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'vehicle'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS vehicle_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'vehicle'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS vehicle_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'material'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS material_quantity,
    sum(
        CASE
            WHEN (c.cost_type = 'material'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS material_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'non_costed_material'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS non_costed_material_quantity,
    sum(
        CASE
            WHEN (c.cost_type = 'trucking'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS trucking_quantity,
    COALESCE(th.trucking_hours, (0)::numeric) AS trucking_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'trucking'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS trucking_cost,
    sum(c.total_cost) AS total_cost
   FROM (public.jobsite_all_costs c
     LEFT JOIN ( SELECT f.jobsite_id,
            f.work_date,
            f.crew_type,
            sum(COALESCE(f.hours, (0)::numeric)) AS trucking_hours
           FROM (public.fact_trucking f
             JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
          WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
          GROUP BY f.jobsite_id, f.work_date, f.crew_type) th ON (((th.jobsite_id = c.jobsite_id) AND (th.work_date = c.date) AND ((th.crew_type)::text = (c.crew_type)::text))))
  GROUP BY c.jobsite_id, c.date, c.crew_type, th.trucking_hours;


--
-- Name: jobsite_daily_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_daily_summary AS
 SELECT c.jobsite_id,
    c.date,
    dj.name AS jobsite_name,
    dj.jobcode,
    sum(
        CASE
            WHEN (c.cost_type = 'employee'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS employee_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'employee'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS employee_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'vehicle'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS vehicle_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'vehicle'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS vehicle_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'material'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS material_quantity,
    sum(
        CASE
            WHEN (c.cost_type = 'material'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS material_cost,
    sum(
        CASE
            WHEN (c.cost_type = 'non_costed_material'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS non_costed_material_quantity,
    sum(
        CASE
            WHEN (c.cost_type = 'trucking'::text) THEN c.quantity
            ELSE (0)::numeric
        END) AS trucking_quantity,
    COALESCE(th.trucking_hours, (0)::numeric) AS trucking_hours,
    sum(
        CASE
            WHEN (c.cost_type = 'trucking'::text) THEN c.total_cost
            ELSE (0)::numeric
        END) AS trucking_cost,
    sum(c.total_cost) AS total_cost,
    bool_or(c.estimated) AS has_estimated_costs,
    array_agg(DISTINCT c.crew_type) AS crew_types
   FROM ((public.jobsite_all_costs c
     LEFT JOIN public.dim_jobsite dj ON ((dj.id = c.jobsite_id)))
     LEFT JOIN ( SELECT f.jobsite_id,
            f.work_date,
            sum(COALESCE(f.hours, (0)::numeric)) AS trucking_hours
           FROM (public.fact_trucking f
             JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
          WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
          GROUP BY f.jobsite_id, f.work_date) th ON (((th.jobsite_id = c.jobsite_id) AND (th.work_date = c.date))))
  GROUP BY c.jobsite_id, c.date, dj.name, dj.jobcode, th.trucking_hours;


--
-- Name: jobsite_report_issues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_report_issues AS
 SELECT f.jobsite_id,
    f.work_date AS date,
    'EMPLOYEE_RATE_ZERO'::text AS issue_type,
    f.employee_id AS entity_id,
    'dim_employee'::text AS entity_table,
    NULL::character varying AS entity_name,
    count(*) AS occurrence_count
   FROM (public.fact_employee_work f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.hourly_rate = (0)::numeric) AND (f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
  GROUP BY f.jobsite_id, f.work_date, f.employee_id
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    'VEHICLE_RATE_ZERO'::text AS issue_type,
    f.vehicle_id AS entity_id,
    'dim_vehicle'::text AS entity_table,
    NULL::character varying AS entity_name,
    count(*) AS occurrence_count
   FROM (public.fact_vehicle_work f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.hourly_rate = (0)::numeric) AND (f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
  GROUP BY f.jobsite_id, f.work_date, f.vehicle_id
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    'MATERIAL_RATE_ZERO'::text AS issue_type,
    f.jobsite_material_id AS entity_id,
    'dim_jobsite_material'::text AS entity_table,
    NULL::character varying AS entity_name,
    count(*) AS occurrence_count
   FROM (public.fact_material_shipment f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.rate = (0)::numeric) AND (f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
  GROUP BY f.jobsite_id, f.work_date, f.jobsite_material_id
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    'MATERIAL_ESTIMATED_RATE'::text AS issue_type,
    f.jobsite_material_id AS entity_id,
    'dim_jobsite_material'::text AS entity_table,
    NULL::character varying AS entity_name,
    count(*) AS occurrence_count
   FROM (public.fact_material_shipment f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.estimated = true) AND (f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
  GROUP BY f.jobsite_id, f.work_date, f.jobsite_material_id
UNION ALL
 SELECT f.jobsite_id,
    f.work_date AS date,
    'NON_COSTED_MATERIALS'::text AS issue_type,
    NULL::uuid AS entity_id,
    NULL::character varying AS entity_table,
    ((((f.material_name)::text || ' ('::text) || (f.supplier_name)::text) || ')'::text) AS entity_name,
    count(*) AS occurrence_count
   FROM (public.fact_non_costed_material f
     JOIN public.dim_daily_report dr ON ((dr.id = f.daily_report_id)))
  WHERE ((f.archived_at IS NULL) AND (dr.approved = true) AND (dr.archived = false))
  GROUP BY f.jobsite_id, f.work_date, f.material_name, f.supplier_name;


--
-- Name: jobsite_issues_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_issues_summary AS
 SELECT jobsite_id,
    date,
    count(DISTINCT
        CASE
            WHEN (issue_type = 'EMPLOYEE_RATE_ZERO'::text) THEN entity_id
            ELSE NULL::uuid
        END) AS employees_with_zero_rate,
    count(DISTINCT
        CASE
            WHEN (issue_type = 'VEHICLE_RATE_ZERO'::text) THEN entity_id
            ELSE NULL::uuid
        END) AS vehicles_with_zero_rate,
    count(DISTINCT
        CASE
            WHEN (issue_type = 'MATERIAL_RATE_ZERO'::text) THEN entity_id
            ELSE NULL::uuid
        END) AS materials_with_zero_rate,
    count(DISTINCT
        CASE
            WHEN (issue_type = 'MATERIAL_ESTIMATED_RATE'::text) THEN entity_id
            ELSE NULL::uuid
        END) AS materials_with_estimated_rate,
    sum(
        CASE
            WHEN (issue_type = 'NON_COSTED_MATERIALS'::text) THEN occurrence_count
            ELSE (0)::bigint
        END) AS non_costed_material_shipments
   FROM public.jobsite_report_issues
  GROUP BY jobsite_id, date;


--
-- Name: jobsite_daily_financial_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.jobsite_daily_financial_summary AS
 SELECT ds.jobsite_id,
    ds.date,
    ds.jobsite_name,
    ds.jobcode,
    ds.employee_hours,
    ds.employee_cost,
    ds.vehicle_hours,
    ds.vehicle_cost,
    ds.material_quantity,
    ds.material_cost,
    ds.non_costed_material_quantity,
    ds.trucking_quantity,
    ds.trucking_hours,
    ds.trucking_cost,
    ds.total_cost,
    COALESCE(inv.external_revenue, (0)::numeric) AS external_revenue,
    COALESCE(inv.internal_revenue, (0)::numeric) AS internal_revenue,
    COALESCE(inv.accrual_revenue, (0)::numeric) AS accrual_revenue,
    COALESCE(inv.external_expense, (0)::numeric) AS external_expense,
    COALESCE(inv.internal_expense, (0)::numeric) AS internal_expense,
    COALESCE(inv.accrual_expense, (0)::numeric) AS accrual_expense,
    ((COALESCE(inv.external_revenue, (0)::numeric) + COALESCE(inv.internal_revenue, (0)::numeric)) - ((ds.total_cost + COALESCE(inv.external_expense, (0)::numeric)) + COALESCE(inv.internal_expense, (0)::numeric))) AS net_income,
    ds.has_estimated_costs,
    ds.crew_types,
    COALESCE(iss.employees_with_zero_rate, (0)::bigint) AS employees_with_zero_rate,
    COALESCE(iss.vehicles_with_zero_rate, (0)::bigint) AS vehicles_with_zero_rate,
    COALESCE(iss.materials_with_zero_rate, (0)::bigint) AS materials_with_zero_rate,
    COALESCE(iss.materials_with_estimated_rate, (0)::bigint) AS materials_with_estimated_rate,
    COALESCE(iss.non_costed_material_shipments, (0)::numeric) AS non_costed_material_shipments
   FROM ((public.jobsite_daily_summary ds
     LEFT JOIN ( SELECT fact_invoice.jobsite_id,
            fact_invoice.invoice_date AS date,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'revenue'::text) AND ((fact_invoice.invoice_type)::text = 'external'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS external_revenue,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'revenue'::text) AND ((fact_invoice.invoice_type)::text = 'internal'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS internal_revenue,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'revenue'::text) AND ((fact_invoice.invoice_type)::text = 'accrual'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS accrual_revenue,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'expense'::text) AND ((fact_invoice.invoice_type)::text = 'external'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS external_expense,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'expense'::text) AND ((fact_invoice.invoice_type)::text = 'internal'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS internal_expense,
            sum(
                CASE
                    WHEN (((fact_invoice.direction)::text = 'expense'::text) AND ((fact_invoice.invoice_type)::text = 'accrual'::text)) THEN fact_invoice.amount
                    ELSE (0)::numeric
                END) AS accrual_expense
           FROM public.fact_invoice
          GROUP BY fact_invoice.jobsite_id, fact_invoice.invoice_date) inv ON (((inv.jobsite_id = ds.jobsite_id) AND (inv.date = ds.date))))
     LEFT JOIN public.jobsite_issues_summary iss ON (((iss.jobsite_id = ds.jobsite_id) AND (iss.date = ds.date))));


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: dim_company dim_company_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_company
    ADD CONSTRAINT dim_company_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_company dim_company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_company
    ADD CONSTRAINT dim_company_pkey PRIMARY KEY (id);


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
-- Name: dim_jobsite_material dim_jobsite_material_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material
    ADD CONSTRAINT dim_jobsite_material_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_jobsite_material dim_jobsite_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material
    ADD CONSTRAINT dim_jobsite_material_pkey PRIMARY KEY (id);


--
-- Name: dim_jobsite_material_rate dim_jobsite_material_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material_rate
    ADD CONSTRAINT dim_jobsite_material_rate_pkey PRIMARY KEY (id);


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
-- Name: dim_material dim_material_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_material
    ADD CONSTRAINT dim_material_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_material dim_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_material
    ADD CONSTRAINT dim_material_pkey PRIMARY KEY (id);


--
-- Name: dim_vehicle dim_vehicle_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_vehicle
    ADD CONSTRAINT dim_vehicle_mongo_id_key UNIQUE (mongo_id);


--
-- Name: dim_vehicle dim_vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_vehicle
    ADD CONSTRAINT dim_vehicle_pkey PRIMARY KEY (id);


--
-- Name: dim_vehicle_rate dim_vehicle_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_vehicle_rate
    ADD CONSTRAINT dim_vehicle_rate_pkey PRIMARY KEY (id);


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
-- Name: fact_invoice fact_invoice_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_invoice
    ADD CONSTRAINT fact_invoice_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_invoice fact_invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_invoice
    ADD CONSTRAINT fact_invoice_pkey PRIMARY KEY (id);


--
-- Name: fact_material_shipment fact_material_shipment_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_material_shipment fact_material_shipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_pkey PRIMARY KEY (id);


--
-- Name: fact_non_costed_material fact_non_costed_material_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_non_costed_material
    ADD CONSTRAINT fact_non_costed_material_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_non_costed_material fact_non_costed_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_non_costed_material
    ADD CONSTRAINT fact_non_costed_material_pkey PRIMARY KEY (id);


--
-- Name: fact_production fact_production_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_production
    ADD CONSTRAINT fact_production_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_production fact_production_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_production
    ADD CONSTRAINT fact_production_pkey PRIMARY KEY (id);


--
-- Name: fact_trucking fact_trucking_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_trucking fact_trucking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_pkey PRIMARY KEY (id);


--
-- Name: fact_vehicle_work fact_vehicle_work_mongo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_mongo_id_key UNIQUE (mongo_id);


--
-- Name: fact_vehicle_work fact_vehicle_work_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: idx_dim_company_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_company_mongo_id ON public.dim_company USING btree (mongo_id);


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
-- Name: idx_dim_jobsite_material_jobsite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_material_jobsite ON public.dim_jobsite_material USING btree (jobsite_id);


--
-- Name: idx_dim_jobsite_material_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_material_mongo_id ON public.dim_jobsite_material USING btree (mongo_id);


--
-- Name: idx_dim_jobsite_material_rate_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_material_rate_lookup ON public.dim_jobsite_material_rate USING btree (jobsite_material_id, effective_date);


--
-- Name: idx_dim_jobsite_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_jobsite_mongo_id ON public.dim_jobsite USING btree (mongo_id);


--
-- Name: idx_dim_material_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_material_mongo_id ON public.dim_material USING btree (mongo_id);


--
-- Name: idx_dim_vehicle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_vehicle_code ON public.dim_vehicle USING btree (vehicle_code);


--
-- Name: idx_dim_vehicle_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_vehicle_mongo_id ON public.dim_vehicle USING btree (mongo_id);


--
-- Name: idx_dim_vehicle_rate_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dim_vehicle_rate_lookup ON public.dim_vehicle_rate USING btree (vehicle_id, effective_date);


--
-- Name: idx_fact_employee_work_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_daily_report ON public.fact_employee_work USING btree (daily_report_id);


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
-- Name: idx_fact_employee_work_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_employee_work_mongo_id ON public.fact_employee_work USING btree (mongo_id);


--
-- Name: idx_fact_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_invoice_date ON public.fact_invoice USING btree (invoice_date);


--
-- Name: idx_fact_invoice_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_invoice_direction ON public.fact_invoice USING btree (direction);


--
-- Name: idx_fact_invoice_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_invoice_jobsite_date ON public.fact_invoice USING btree (jobsite_id, invoice_date);


--
-- Name: idx_fact_invoice_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_invoice_mongo_id ON public.fact_invoice USING btree (mongo_id);


--
-- Name: idx_fact_material_shipment_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_material_shipment_daily_report ON public.fact_material_shipment USING btree (daily_report_id);


--
-- Name: idx_fact_material_shipment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_material_shipment_date ON public.fact_material_shipment USING btree (work_date);


--
-- Name: idx_fact_material_shipment_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_material_shipment_jobsite_date ON public.fact_material_shipment USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_material_shipment_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_material_shipment_material ON public.fact_material_shipment USING btree (jobsite_material_id);


--
-- Name: idx_fact_material_shipment_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_material_shipment_mongo_id ON public.fact_material_shipment USING btree (mongo_id);


--
-- Name: idx_fact_non_costed_material_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_non_costed_material_daily_report ON public.fact_non_costed_material USING btree (daily_report_id);


--
-- Name: idx_fact_non_costed_material_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_non_costed_material_date ON public.fact_non_costed_material USING btree (work_date);


--
-- Name: idx_fact_non_costed_material_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_non_costed_material_jobsite_date ON public.fact_non_costed_material USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_non_costed_material_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_non_costed_material_mongo_id ON public.fact_non_costed_material USING btree (mongo_id);


--
-- Name: idx_fact_production_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_production_daily_report ON public.fact_production USING btree (daily_report_id);


--
-- Name: idx_fact_production_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_production_date ON public.fact_production USING btree (work_date);


--
-- Name: idx_fact_production_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_production_jobsite_date ON public.fact_production USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_production_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_production_mongo_id ON public.fact_production USING btree (mongo_id);


--
-- Name: idx_fact_trucking_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_trucking_daily_report ON public.fact_trucking USING btree (daily_report_id);


--
-- Name: idx_fact_trucking_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_trucking_date ON public.fact_trucking USING btree (work_date);


--
-- Name: idx_fact_trucking_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_trucking_jobsite_date ON public.fact_trucking USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_trucking_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_trucking_mongo_id ON public.fact_trucking USING btree (mongo_id);


--
-- Name: idx_fact_vehicle_work_daily_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vehicle_work_daily_report ON public.fact_vehicle_work USING btree (daily_report_id);


--
-- Name: idx_fact_vehicle_work_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vehicle_work_date ON public.fact_vehicle_work USING btree (work_date);


--
-- Name: idx_fact_vehicle_work_jobsite_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vehicle_work_jobsite_date ON public.fact_vehicle_work USING btree (jobsite_id, work_date);


--
-- Name: idx_fact_vehicle_work_mongo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vehicle_work_mongo_id ON public.fact_vehicle_work USING btree (mongo_id);


--
-- Name: idx_fact_vehicle_work_vehicle_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vehicle_work_vehicle_date ON public.fact_vehicle_work USING btree (vehicle_id, work_date);


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
-- Name: dim_jobsite_material dim_jobsite_material_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material
    ADD CONSTRAINT dim_jobsite_material_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: dim_jobsite_material dim_jobsite_material_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material
    ADD CONSTRAINT dim_jobsite_material_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.dim_material(id) ON DELETE CASCADE;


--
-- Name: dim_jobsite_material_rate dim_jobsite_material_rate_jobsite_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material_rate
    ADD CONSTRAINT dim_jobsite_material_rate_jobsite_material_id_fkey FOREIGN KEY (jobsite_material_id) REFERENCES public.dim_jobsite_material(id) ON DELETE CASCADE;


--
-- Name: dim_jobsite_material dim_jobsite_material_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_jobsite_material
    ADD CONSTRAINT dim_jobsite_material_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.dim_company(id) ON DELETE CASCADE;


--
-- Name: dim_vehicle_rate dim_vehicle_rate_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dim_vehicle_rate
    ADD CONSTRAINT dim_vehicle_rate_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.dim_vehicle(id) ON DELETE CASCADE;


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
-- Name: fact_invoice fact_invoice_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_invoice
    ADD CONSTRAINT fact_invoice_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.dim_company(id) ON DELETE CASCADE;


--
-- Name: fact_invoice fact_invoice_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_invoice
    ADD CONSTRAINT fact_invoice_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_material_shipment fact_material_shipment_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_material_shipment fact_material_shipment_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_material_shipment fact_material_shipment_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_material_shipment fact_material_shipment_jobsite_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_material_shipment
    ADD CONSTRAINT fact_material_shipment_jobsite_material_id_fkey FOREIGN KEY (jobsite_material_id) REFERENCES public.dim_jobsite_material(id) ON DELETE CASCADE;


--
-- Name: fact_non_costed_material fact_non_costed_material_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_non_costed_material
    ADD CONSTRAINT fact_non_costed_material_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_non_costed_material fact_non_costed_material_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_non_costed_material
    ADD CONSTRAINT fact_non_costed_material_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_non_costed_material fact_non_costed_material_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_non_costed_material
    ADD CONSTRAINT fact_non_costed_material_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_production fact_production_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_production
    ADD CONSTRAINT fact_production_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_production fact_production_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_production
    ADD CONSTRAINT fact_production_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_production fact_production_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_production
    ADD CONSTRAINT fact_production_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_trucking fact_trucking_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_trucking fact_trucking_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_trucking fact_trucking_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_trucking fact_trucking_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_trucking
    ADD CONSTRAINT fact_trucking_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.dim_vehicle(id) ON DELETE SET NULL;


--
-- Name: fact_vehicle_work fact_vehicle_work_crew_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.dim_crew(id) ON DELETE CASCADE;


--
-- Name: fact_vehicle_work fact_vehicle_work_daily_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_daily_report_id_fkey FOREIGN KEY (daily_report_id) REFERENCES public.dim_daily_report(id) ON DELETE CASCADE;


--
-- Name: fact_vehicle_work fact_vehicle_work_jobsite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_jobsite_id_fkey FOREIGN KEY (jobsite_id) REFERENCES public.dim_jobsite(id) ON DELETE CASCADE;


--
-- Name: fact_vehicle_work fact_vehicle_work_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_vehicle_work
    ADD CONSTRAINT fact_vehicle_work_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.dim_vehicle(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260128205200');
