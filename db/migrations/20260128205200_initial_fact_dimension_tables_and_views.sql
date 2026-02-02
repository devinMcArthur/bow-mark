-- migrate:up

-- ============================================================
-- DIMENSION TABLES
-- ============================================================

-- dim_employee
-- Stores employee master data, synced from MongoDB Employee collection
CREATE TABLE dim_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    archived_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_employee_mongo_id ON dim_employee(mongo_id);
CREATE INDEX idx_dim_employee_name ON dim_employee(name);

-- dim_employee_rate
-- Stores historical rates for employees (SCD Type 2 - keep all history)
CREATE TABLE dim_employee_rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES dim_employee(id) ON DELETE CASCADE,
    mongo_id VARCHAR(24),
    rate DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_employee_rate_lookup ON dim_employee_rate(employee_id, effective_date);

-- dim_vehicle
-- Stores vehicle/equipment master data, synced from MongoDB Vehicle collection
CREATE TABLE dim_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    vehicle_code VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL DEFAULT 'General',
    is_rental BOOLEAN NOT NULL DEFAULT FALSE,
    source_company VARCHAR(255) NOT NULL DEFAULT 'Bow Mark',
    archived_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_vehicle_mongo_id ON dim_vehicle(mongo_id);
CREATE INDEX idx_dim_vehicle_code ON dim_vehicle(vehicle_code);

-- dim_vehicle_rate
-- Stores historical rates for vehicles (SCD Type 2 - keep all history)
CREATE TABLE dim_vehicle_rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES dim_vehicle(id) ON DELETE CASCADE,
    mongo_id VARCHAR(24),
    rate DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_vehicle_rate_lookup ON dim_vehicle_rate(vehicle_id, effective_date);

-- dim_jobsite
-- Stores jobsite master data, synced from MongoDB Jobsite collection
CREATE TABLE dim_jobsite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    jobcode VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_jobsite_mongo_id ON dim_jobsite(mongo_id);
CREATE INDEX idx_dim_jobsite_jobcode ON dim_jobsite(jobcode);
CREATE INDEX idx_dim_jobsite_active ON dim_jobsite(active);

-- dim_company
-- Stores company/supplier data, synced from MongoDB Company collection
CREATE TABLE dim_company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    archived_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_company_mongo_id ON dim_company(mongo_id);

-- dim_material
-- Stores material catalog data, synced from MongoDB Material collection
CREATE TABLE dim_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    archived_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_material_mongo_id ON dim_material(mongo_id);

-- dim_jobsite_material
-- Stores jobsite-specific material configuration with supplier and costing
CREATE TABLE dim_jobsite_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES dim_material(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES dim_company(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_type VARCHAR(50) NOT NULL, -- 'rate', 'deliveredRate', 'invoice'
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_jobsite_material_mongo_id ON dim_jobsite_material(mongo_id);
CREATE INDEX idx_dim_jobsite_material_jobsite ON dim_jobsite_material(jobsite_id);

-- dim_jobsite_material_rate
-- Stores rates for jobsite materials (may be estimated)
CREATE TABLE dim_jobsite_material_rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jobsite_material_id UUID NOT NULL REFERENCES dim_jobsite_material(id) ON DELETE CASCADE,
    mongo_id VARCHAR(24),
    rate DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    estimated BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_jobsite_material_rate_lookup ON dim_jobsite_material_rate(jobsite_material_id, effective_date);

-- dim_crew
-- Stores crew data, synced from MongoDB Crew collection
--
-- DESIGN NOTE (SCD consideration for crew_type):
-- Crew type (Paving/Concrete) is denormalized onto fact tables for query performance.
-- This is a snapshot of the crew's type at the time of sync, NOT a lookup.
--
-- If a crew's type changes:
-- - Historical fact records retain the OLD type (arguably correct - reflects reality at time of work)
-- - New fact records get the NEW type
-- - Reports filtering by crew_type will split the crew's data at the change point
--
-- Future consideration: If crew type changes become common or cause reporting issues,
-- consider one of these approaches:
-- 1. SCD Type 2 on dim_crew (add effective_date, is_current columns)
-- 2. Backfill script to update historical facts when crew type changes
-- 3. Always join to dim_crew for current type (loses historical accuracy but gains consistency)
--
-- For now, crew type changes are rare enough that this is acceptable.
-- Revisit if business requirements change.
--
CREATE TABLE dim_crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_crew_mongo_id ON dim_crew(mongo_id);

-- dim_daily_report
-- Stores daily report header data (degenerate dimension)
CREATE TABLE dim_daily_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    payroll_complete BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_daily_report_mongo_id ON dim_daily_report(mongo_id);
CREATE INDEX idx_dim_daily_report_date ON dim_daily_report(report_date);
CREATE INDEX idx_dim_daily_report_jobsite_date ON dim_daily_report(jobsite_id, report_date);

-- ============================================================
-- FACT TABLES
-- ============================================================

-- fact_employee_work
-- Individual employee work entries with time tracking
CREATE TABLE fact_employee_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES dim_employee(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,

    -- Denormalized crew type for fast filtering
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    job_title VARCHAR(255) NOT NULL,

    -- Pre-calculated metrics
    -- Handle overnight shifts: if end_time < start_time, add 24 hours (86400 seconds)
    -- Use AT TIME ZONE 'UTC' to make the expression immutable
    hours DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE
            WHEN EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) < EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC')) THEN
                (EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) + 86400 - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600
            ELSE
                (EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600
        END
    ) STORED,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        CASE
            WHEN EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) < EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC')) THEN
                ((EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) + 86400 - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600) * hourly_rate
            ELSE
                ((EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600) * hourly_rate
        END
    ) STORED,

    -- Soft delete tracking
    archived_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_employee_work_mongo_id ON fact_employee_work(mongo_id);
CREATE INDEX idx_fact_employee_work_date ON fact_employee_work(work_date);
CREATE INDEX idx_fact_employee_work_jobsite_date ON fact_employee_work(jobsite_id, work_date);
CREATE INDEX idx_fact_employee_work_employee_date ON fact_employee_work(employee_id, work_date);
CREATE INDEX idx_fact_employee_work_daily_report ON fact_employee_work(daily_report_id);

-- fact_vehicle_work
-- Individual vehicle/equipment work entries
CREATE TABLE fact_vehicle_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES dim_vehicle(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,

    -- Denormalized crew type for fast filtering
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Work tracking (VehicleWork uses hours directly, not start/end time)
    job_title VARCHAR(255),
    hours DECIMAL(10, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (hours * hourly_rate) STORED,

    -- Soft delete tracking
    archived_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_vehicle_work_mongo_id ON fact_vehicle_work(mongo_id);
CREATE INDEX idx_fact_vehicle_work_date ON fact_vehicle_work(work_date);
CREATE INDEX idx_fact_vehicle_work_jobsite_date ON fact_vehicle_work(jobsite_id, work_date);
CREATE INDEX idx_fact_vehicle_work_vehicle_date ON fact_vehicle_work(vehicle_id, work_date);
CREATE INDEX idx_fact_vehicle_work_daily_report ON fact_vehicle_work(daily_report_id);

-- fact_material_shipment
-- Material deliveries with costing (for materials with jobsite configuration)
CREATE TABLE fact_material_shipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    jobsite_material_id UUID NOT NULL REFERENCES dim_jobsite_material(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,

    -- Denormalized crew type
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Shipment tracking
    quantity DECIMAL(12, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * rate) STORED,

    -- Rate metadata
    estimated BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_rate_id VARCHAR(24), -- References specific delivered rate if applicable

    -- Soft delete tracking
    archived_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_material_shipment_mongo_id ON fact_material_shipment(mongo_id);
CREATE INDEX idx_fact_material_shipment_date ON fact_material_shipment(work_date);
CREATE INDEX idx_fact_material_shipment_jobsite_date ON fact_material_shipment(jobsite_id, work_date);
CREATE INDEX idx_fact_material_shipment_material ON fact_material_shipment(jobsite_material_id);
CREATE INDEX idx_fact_material_shipment_daily_report ON fact_material_shipment(daily_report_id);

-- fact_non_costed_material
-- Material shipments without jobsite material configuration (no costing)
CREATE TABLE fact_non_costed_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,

    -- Denormalized crew type
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Material info (no formal material reference)
    material_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    shipment_type VARCHAR(255),

    -- Quantity only (no costing)
    quantity DECIMAL(12, 3) NOT NULL,
    unit VARCHAR(50),

    -- Soft delete tracking
    archived_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_non_costed_material_mongo_id ON fact_non_costed_material(mongo_id);
CREATE INDEX idx_fact_non_costed_material_date ON fact_non_costed_material(work_date);
CREATE INDEX idx_fact_non_costed_material_jobsite_date ON fact_non_costed_material(jobsite_id, work_date);
CREATE INDEX idx_fact_non_costed_material_daily_report ON fact_non_costed_material(daily_report_id);

-- fact_trucking
-- Trucking costs derived from material shipments with vehicle/trucking info
CREATE TABLE fact_trucking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE, -- Source material_shipment mongo_id

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES dim_vehicle(id) ON DELETE SET NULL, -- Optional, may be external

    -- Denormalized crew type
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Trucking details
    trucking_type VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    hours DECIMAL(6, 2), -- Only for hourly rate type
    rate DECIMAL(10, 2) NOT NULL,
    rate_type VARCHAR(20) NOT NULL, -- 'Hour' or 'Load'
    total_cost DECIMAL(12, 2) NOT NULL, -- Calculated based on rate_type

    -- Vehicle info (denormalized for external/rental trucks)
    vehicle_source VARCHAR(255),
    vehicle_type VARCHAR(100),
    vehicle_code VARCHAR(50),

    -- Rate reference
    trucking_rate_id VARCHAR(24), -- References jobsite trucking rate config

    -- Soft delete tracking
    archived_at TIMESTAMPTZ,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_trucking_mongo_id ON fact_trucking(mongo_id);
CREATE INDEX idx_fact_trucking_date ON fact_trucking(work_date);
CREATE INDEX idx_fact_trucking_jobsite_date ON fact_trucking(jobsite_id, work_date);
CREATE INDEX idx_fact_trucking_daily_report ON fact_trucking(daily_report_id);

-- fact_production
-- Production/output records (tonnes placed, areas paved, etc.)
CREATE TABLE fact_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    daily_report_id UUID NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,

    -- Denormalized crew type
    crew_type VARCHAR(100) NOT NULL,

    -- Date (use EXTRACT for year/month/week/day filtering)
    work_date DATE NOT NULL,

    -- Production tracking
    job_title TEXT NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    description TEXT,

    -- Calculated duration (handle overnight: if end_time < start_time, add 24 hours)
    -- Use AT TIME ZONE 'UTC' to make the expression immutable
    hours DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE
            WHEN EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) < EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC')) THEN
                (EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) + 86400 - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600
            ELSE
                (EXTRACT(EPOCH FROM (end_time AT TIME ZONE 'UTC')) - EXTRACT(EPOCH FROM (start_time AT TIME ZONE 'UTC'))) / 3600
        END
    ) STORED,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_production_mongo_id ON fact_production(mongo_id);
CREATE INDEX idx_fact_production_date ON fact_production(work_date);
CREATE INDEX idx_fact_production_jobsite_date ON fact_production(jobsite_id, work_date);
CREATE INDEX idx_fact_production_daily_report ON fact_production(daily_report_id);

-- fact_invoice
-- Revenue and expense invoices linked to jobsites
CREATE TABLE fact_invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(24) NOT NULL UNIQUE,

    -- Dimension foreign keys
    jobsite_id UUID NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES dim_company(id) ON DELETE CASCADE,

    -- Date (use EXTRACT for year/month filtering)
    invoice_date DATE NOT NULL,

    -- Classification
    direction VARCHAR(10) NOT NULL, -- 'revenue' or 'expense'
    invoice_type VARCHAR(20) NOT NULL, -- 'external', 'internal', 'accrual'

    -- Invoice details
    invoice_number VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,

    -- Sync metadata
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_invoice_mongo_id ON fact_invoice(mongo_id);
CREATE INDEX idx_fact_invoice_date ON fact_invoice(invoice_date);
CREATE INDEX idx_fact_invoice_jobsite_date ON fact_invoice(jobsite_id, invoice_date);
CREATE INDEX idx_fact_invoice_direction ON fact_invoice(direction);

-- ============================================================
-- VIEWS
-- ============================================================

-- Unified cost view for reports that need "all costs"
-- Includes all fact tables for comprehensive reporting
-- IMPORTANT: Only includes data from APPROVED daily reports to match MongoDB behavior
CREATE VIEW jobsite_all_costs AS
SELECT
    f.jobsite_id,
    f.work_date as date,
    f.crew_type,
    'employee' as cost_type,
    f.employee_id as entity_id,
    NULL::varchar as entity_name,
    f.hours as quantity,
    'hours' as quantity_unit,
    f.hourly_rate as rate,
    f.total_cost,
    FALSE as estimated,
    f.daily_report_id
FROM fact_employee_work f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false

UNION ALL

SELECT
    f.jobsite_id,
    f.work_date as date,
    f.crew_type,
    'vehicle' as cost_type,
    f.vehicle_id as entity_id,
    NULL::varchar as entity_name,
    f.hours as quantity,
    'hours' as quantity_unit,
    f.hourly_rate as rate,
    f.total_cost,
    FALSE as estimated,
    f.daily_report_id
FROM fact_vehicle_work f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false

UNION ALL

SELECT
    f.jobsite_id,
    f.work_date as date,
    f.crew_type,
    'material' as cost_type,
    f.jobsite_material_id as entity_id,
    NULL::varchar as entity_name,
    f.quantity,
    f.unit as quantity_unit,
    f.rate,
    f.total_cost,
    f.estimated,
    f.daily_report_id
FROM fact_material_shipment f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false

UNION ALL

SELECT
    f.jobsite_id,
    f.work_date as date,
    f.crew_type,
    'non_costed_material' as cost_type,
    NULL::uuid as entity_id,
    f.material_name as entity_name,
    f.quantity,
    f.unit as quantity_unit,
    0 as rate,
    0 as total_cost,
    FALSE as estimated,
    f.daily_report_id
FROM fact_non_costed_material f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false

UNION ALL

SELECT
    f.jobsite_id,
    f.work_date as date,
    f.crew_type,
    'trucking' as cost_type,
    NULL::uuid as entity_id,
    f.trucking_type as entity_name,
    f.quantity,
    f.rate_type as quantity_unit,
    f.rate,
    f.total_cost,
    FALSE as estimated,
    f.daily_report_id
FROM fact_trucking f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false;


-- Daily summary view (replaces JobsiteDayReport.summary)
-- Includes all metrics from OnSiteSummaryReportClass
CREATE VIEW jobsite_daily_summary AS
SELECT
    c.jobsite_id,
    c.date,
    dj.name as jobsite_name,
    dj.jobcode,

    -- Employee metrics
    SUM(CASE WHEN cost_type = 'employee' THEN quantity ELSE 0 END) as employee_hours,
    SUM(CASE WHEN cost_type = 'employee' THEN total_cost ELSE 0 END) as employee_cost,

    -- Vehicle metrics
    SUM(CASE WHEN cost_type = 'vehicle' THEN quantity ELSE 0 END) as vehicle_hours,
    SUM(CASE WHEN cost_type = 'vehicle' THEN total_cost ELSE 0 END) as vehicle_cost,

    -- Material metrics (costed)
    SUM(CASE WHEN cost_type = 'material' THEN quantity ELSE 0 END) as material_quantity,
    SUM(CASE WHEN cost_type = 'material' THEN total_cost ELSE 0 END) as material_cost,

    -- Non-costed material metrics
    SUM(CASE WHEN cost_type = 'non_costed_material' THEN quantity ELSE 0 END) as non_costed_material_quantity,

    -- Trucking metrics
    SUM(CASE WHEN cost_type = 'trucking' THEN quantity ELSE 0 END) as trucking_quantity,
    COALESCE(th.trucking_hours, 0) as trucking_hours,
    SUM(CASE WHEN cost_type = 'trucking' THEN total_cost ELSE 0 END) as trucking_cost,

    -- Totals
    SUM(total_cost) as total_cost,

    -- Flags
    BOOL_OR(estimated) as has_estimated_costs,

    -- Crew types present
    ARRAY_AGG(DISTINCT crew_type) as crew_types

FROM jobsite_all_costs c
LEFT JOIN dim_jobsite dj ON dj.id = c.jobsite_id
-- Trucking hours need separate aggregation since they're not in jobsite_all_costs quantity
-- Only include approved daily reports
LEFT JOIN (
    SELECT f.jobsite_id, f.work_date, SUM(COALESCE(f.hours, 0)) as trucking_hours
    FROM fact_trucking f
    INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
    WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
    GROUP BY f.jobsite_id, f.work_date
) th ON th.jobsite_id = c.jobsite_id AND th.work_date = c.date
GROUP BY c.jobsite_id, c.date, dj.name, dj.jobcode, th.trucking_hours;


-- Daily summary by crew type (replaces crewTypeSummaries)
CREATE VIEW jobsite_daily_crew_type_summary AS
SELECT
    c.jobsite_id,
    c.date,
    c.crew_type,

    -- Employee metrics
    SUM(CASE WHEN cost_type = 'employee' THEN quantity ELSE 0 END) as employee_hours,
    SUM(CASE WHEN cost_type = 'employee' THEN total_cost ELSE 0 END) as employee_cost,

    -- Vehicle metrics
    SUM(CASE WHEN cost_type = 'vehicle' THEN quantity ELSE 0 END) as vehicle_hours,
    SUM(CASE WHEN cost_type = 'vehicle' THEN total_cost ELSE 0 END) as vehicle_cost,

    -- Material metrics (costed)
    SUM(CASE WHEN cost_type = 'material' THEN quantity ELSE 0 END) as material_quantity,
    SUM(CASE WHEN cost_type = 'material' THEN total_cost ELSE 0 END) as material_cost,

    -- Non-costed material metrics
    SUM(CASE WHEN cost_type = 'non_costed_material' THEN quantity ELSE 0 END) as non_costed_material_quantity,

    -- Trucking metrics
    SUM(CASE WHEN cost_type = 'trucking' THEN quantity ELSE 0 END) as trucking_quantity,
    COALESCE(th.trucking_hours, 0) as trucking_hours,
    SUM(CASE WHEN cost_type = 'trucking' THEN total_cost ELSE 0 END) as trucking_cost,

    -- Totals
    SUM(total_cost) as total_cost

FROM jobsite_all_costs c
LEFT JOIN (
    SELECT f.jobsite_id, f.work_date, f.crew_type, SUM(COALESCE(f.hours, 0)) as trucking_hours
    FROM fact_trucking f
    INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
    WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
    GROUP BY f.jobsite_id, f.work_date, f.crew_type
) th ON th.jobsite_id = c.jobsite_id AND th.work_date = c.date AND th.crew_type = c.crew_type
GROUP BY c.jobsite_id, c.date, c.crew_type, th.trucking_hours;


-- Report issues view (replaces JobsiteReportBaseClass.issues)
-- Computes data quality issues that need attention
-- Only includes data from APPROVED daily reports
CREATE VIEW jobsite_report_issues AS

-- Employees with zero rate
SELECT
    f.jobsite_id,
    f.work_date as date,
    'EMPLOYEE_RATE_ZERO' as issue_type,
    f.employee_id as entity_id,
    'dim_employee' as entity_table,
    NULL::varchar as entity_name,
    COUNT(*) as occurrence_count
FROM fact_employee_work f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.hourly_rate = 0 AND f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
GROUP BY f.jobsite_id, f.work_date, f.employee_id

UNION ALL

-- Vehicles with zero rate
SELECT
    f.jobsite_id,
    f.work_date as date,
    'VEHICLE_RATE_ZERO' as issue_type,
    f.vehicle_id as entity_id,
    'dim_vehicle' as entity_table,
    NULL::varchar as entity_name,
    COUNT(*) as occurrence_count
FROM fact_vehicle_work f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.hourly_rate = 0 AND f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
GROUP BY f.jobsite_id, f.work_date, f.vehicle_id

UNION ALL

-- Materials with zero rate
SELECT
    f.jobsite_id,
    f.work_date as date,
    'MATERIAL_RATE_ZERO' as issue_type,
    f.jobsite_material_id as entity_id,
    'dim_jobsite_material' as entity_table,
    NULL::varchar as entity_name,
    COUNT(*) as occurrence_count
FROM fact_material_shipment f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.rate = 0 AND f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
GROUP BY f.jobsite_id, f.work_date, f.jobsite_material_id

UNION ALL

-- Materials with estimated rate
SELECT
    f.jobsite_id,
    f.work_date as date,
    'MATERIAL_ESTIMATED_RATE' as issue_type,
    f.jobsite_material_id as entity_id,
    'dim_jobsite_material' as entity_table,
    NULL::varchar as entity_name,
    COUNT(*) as occurrence_count
FROM fact_material_shipment f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.estimated = true AND f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
GROUP BY f.jobsite_id, f.work_date, f.jobsite_material_id

UNION ALL

-- Non-costed materials (grouped by material_name + supplier_name)
SELECT
    f.jobsite_id,
    f.work_date as date,
    'NON_COSTED_MATERIALS' as issue_type,
    NULL::uuid as entity_id,
    NULL::varchar as entity_table,
    f.material_name || ' (' || f.supplier_name || ')' as entity_name,
    COUNT(*) as occurrence_count
FROM fact_non_costed_material f
INNER JOIN dim_daily_report dr ON dr.id = f.daily_report_id
WHERE f.archived_at IS NULL AND dr.approved = true AND dr.archived = false
GROUP BY f.jobsite_id, f.work_date, f.material_name, f.supplier_name;


-- Issues summary by jobsite and date range (for period reports)
CREATE VIEW jobsite_issues_summary AS
SELECT
    jobsite_id,
    date,
    COUNT(DISTINCT CASE WHEN issue_type = 'EMPLOYEE_RATE_ZERO' THEN entity_id END) as employees_with_zero_rate,
    COUNT(DISTINCT CASE WHEN issue_type = 'VEHICLE_RATE_ZERO' THEN entity_id END) as vehicles_with_zero_rate,
    COUNT(DISTINCT CASE WHEN issue_type = 'MATERIAL_RATE_ZERO' THEN entity_id END) as materials_with_zero_rate,
    COUNT(DISTINCT CASE WHEN issue_type = 'MATERIAL_ESTIMATED_RATE' THEN entity_id END) as materials_with_estimated_rate,
    SUM(CASE WHEN issue_type = 'NON_COSTED_MATERIALS' THEN occurrence_count ELSE 0 END) as non_costed_material_shipments
FROM jobsite_report_issues
GROUP BY jobsite_id, date;


-- Daily financial summary with invoices (full replacement for JobsiteDayReport)
CREATE VIEW jobsite_daily_financial_summary AS
SELECT
    ds.jobsite_id,
    ds.date,
    ds.jobsite_name,
    ds.jobcode,

    -- Employee metrics
    ds.employee_hours,
    ds.employee_cost,

    -- Vehicle metrics
    ds.vehicle_hours,
    ds.vehicle_cost,

    -- Material metrics
    ds.material_quantity,
    ds.material_cost,

    -- Non-costed material metrics
    ds.non_costed_material_quantity,

    -- Trucking metrics
    ds.trucking_quantity,
    ds.trucking_hours,
    ds.trucking_cost,

    -- Total operational cost
    ds.total_cost,

    -- Revenue (from invoices)
    COALESCE(inv.external_revenue, 0) as external_revenue,
    COALESCE(inv.internal_revenue, 0) as internal_revenue,
    COALESCE(inv.accrual_revenue, 0) as accrual_revenue,

    -- Expenses (from invoices, separate from operational costs)
    COALESCE(inv.external_expense, 0) as external_expense,
    COALESCE(inv.internal_expense, 0) as internal_expense,
    COALESCE(inv.accrual_expense, 0) as accrual_expense,

    -- Calculated fields
    (COALESCE(inv.external_revenue, 0) + COALESCE(inv.internal_revenue, 0))
        - (ds.total_cost + COALESCE(inv.external_expense, 0) + COALESCE(inv.internal_expense, 0))
        as net_income,

    -- Flags and metadata
    ds.has_estimated_costs,
    ds.crew_types,

    -- Issue counts (from issues summary)
    COALESCE(iss.employees_with_zero_rate, 0) as employees_with_zero_rate,
    COALESCE(iss.vehicles_with_zero_rate, 0) as vehicles_with_zero_rate,
    COALESCE(iss.materials_with_zero_rate, 0) as materials_with_zero_rate,
    COALESCE(iss.materials_with_estimated_rate, 0) as materials_with_estimated_rate,
    COALESCE(iss.non_costed_material_shipments, 0) as non_costed_material_shipments

FROM jobsite_daily_summary ds
LEFT JOIN (
    SELECT
        jobsite_id,
        invoice_date as date,
        SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'external' THEN amount ELSE 0 END) as external_revenue,
        SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'internal' THEN amount ELSE 0 END) as internal_revenue,
        SUM(CASE WHEN direction = 'revenue' AND invoice_type = 'accrual' THEN amount ELSE 0 END) as accrual_revenue,
        SUM(CASE WHEN direction = 'expense' AND invoice_type = 'external' THEN amount ELSE 0 END) as external_expense,
        SUM(CASE WHEN direction = 'expense' AND invoice_type = 'internal' THEN amount ELSE 0 END) as internal_expense,
        SUM(CASE WHEN direction = 'expense' AND invoice_type = 'accrual' THEN amount ELSE 0 END) as accrual_expense
    FROM fact_invoice
    GROUP BY jobsite_id, invoice_date
) inv ON inv.jobsite_id = ds.jobsite_id AND inv.date = ds.date
LEFT JOIN jobsite_issues_summary iss ON iss.jobsite_id = ds.jobsite_id AND iss.date = ds.date;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Flexible period summary (replaces Month/Year report hierarchy)
CREATE OR REPLACE FUNCTION jobsite_period_summary(
    p_jobsite_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    jobsite_id UUID,
    jobsite_name VARCHAR(255),
    jobcode VARCHAR(100),
    period_start DATE,
    period_end DATE,

    -- Employee metrics
    employee_hours DECIMAL(10,2),
    employee_cost DECIMAL(12,2),

    -- Vehicle metrics
    vehicle_hours DECIMAL(10,2),
    vehicle_cost DECIMAL(12,2),

    -- Material metrics
    material_quantity DECIMAL(12,3),
    material_cost DECIMAL(12,2),

    -- Non-costed material
    non_costed_material_quantity DECIMAL(12,3),

    -- Trucking metrics
    trucking_quantity DECIMAL(12,3),
    trucking_hours DECIMAL(10,2),
    trucking_cost DECIMAL(12,2),

    -- Total cost
    total_cost DECIMAL(12,2),

    -- Revenue & Expenses (invoices)
    external_revenue DECIMAL(12,2),
    internal_revenue DECIMAL(12,2),
    accrual_revenue DECIMAL(12,2),
    external_expense DECIMAL(12,2),
    internal_expense DECIMAL(12,2),
    accrual_expense DECIMAL(12,2),

    -- Calculated
    net_income DECIMAL(12,2),

    -- Metadata
    days_worked BIGINT,
    has_estimated_costs BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql;


-- Multi-jobsite comparison for a period
CREATE OR REPLACE FUNCTION jobsite_comparison(
    p_jobsite_ids UUID[],
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    jobsite_id UUID,
    jobsite_name VARCHAR(255),
    jobcode VARCHAR(100),
    total_cost DECIMAL(12,2),
    total_revenue DECIMAL(12,2),
    net_income DECIMAL(12,2),
    employee_hours DECIMAL(10,2),
    days_worked BIGINT,
    cost_per_day DECIMAL(12,2),
    revenue_per_day DECIMAL(12,2)
) AS $$
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
$$ LANGUAGE plpgsql;


-- Employee productivity across jobsites
CREATE OR REPLACE FUNCTION employee_productivity(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR(255),
    jobsite_id UUID,
    jobsite_name VARCHAR(255),
    total_hours DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    days_worked BIGINT,
    avg_hours_per_day DECIMAL(6,2)
) AS $$
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
$$ LANGUAGE plpgsql;


-- Vehicle utilization across jobsites
CREATE OR REPLACE FUNCTION vehicle_utilization(
    p_vehicle_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    vehicle_id UUID,
    vehicle_name VARCHAR(255),
    vehicle_code VARCHAR(50),
    jobsite_id UUID,
    jobsite_name VARCHAR(255),
    total_hours DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    days_used BIGINT,
    avg_hours_per_day DECIMAL(6,2)
) AS $$
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
$$ LANGUAGE plpgsql;


-- migrate:down

DROP FUNCTION IF EXISTS vehicle_utilization;
DROP FUNCTION IF EXISTS employee_productivity;
DROP FUNCTION IF EXISTS jobsite_comparison;
DROP FUNCTION IF EXISTS jobsite_period_summary;

DROP VIEW IF EXISTS jobsite_daily_financial_summary;
DROP VIEW IF EXISTS jobsite_issues_summary;
DROP VIEW IF EXISTS jobsite_report_issues;
DROP VIEW IF EXISTS jobsite_daily_crew_type_summary;
DROP VIEW IF EXISTS jobsite_daily_summary;
DROP VIEW IF EXISTS jobsite_all_costs;

DROP TABLE IF EXISTS fact_invoice;
DROP TABLE IF EXISTS fact_production;
DROP TABLE IF EXISTS fact_trucking;
DROP TABLE IF EXISTS fact_non_costed_material;
DROP TABLE IF EXISTS fact_material_shipment;
DROP TABLE IF EXISTS fact_vehicle_work;
DROP TABLE IF EXISTS fact_employee_work;
DROP TABLE IF EXISTS dim_daily_report;
DROP TABLE IF EXISTS dim_crew;
DROP TABLE IF EXISTS dim_jobsite_material_rate;
DROP TABLE IF EXISTS dim_jobsite_material;
DROP TABLE IF EXISTS dim_material;
DROP TABLE IF EXISTS dim_company;
DROP TABLE IF EXISTS dim_jobsite;
DROP TABLE IF EXISTS dim_vehicle_rate;
DROP TABLE IF EXISTS dim_vehicle;
DROP TABLE IF EXISTS dim_employee_rate;
DROP TABLE IF EXISTS dim_employee;
