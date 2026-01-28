-- migrate:up

-- ============================================================
-- DIMENSION TABLES
-- ============================================================

-- dim_employee
-- Stores employee master data, synced from MongoDB Employee collection
CREATE TABLE dim_employee (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES dim_employee(id) ON DELETE CASCADE,
    rate DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_employee_rate_lookup ON dim_employee_rate(employee_id, effective_date);

-- dim_jobsite
-- Stores jobsite master data, synced from MongoDB Jobsite collection
CREATE TABLE dim_jobsite (
    id SERIAL PRIMARY KEY,
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

-- dim_crew
-- Stores crew data, synced from MongoDB Crew collection
CREATE TABLE dim_crew (
    id SERIAL PRIMARY KEY,
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dim_crew_mongo_id ON dim_crew(mongo_id);

-- dim_daily_report
-- Stores daily report header data (degenerate dimension)
CREATE TABLE dim_daily_report (
    id SERIAL PRIMARY KEY,
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    jobsite_id INTEGER NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    crew_id INTEGER NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,
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
-- Pre-joined, pre-calculated employee work entries
CREATE TABLE fact_employee_work (
    id SERIAL PRIMARY KEY,
    mongo_id VARCHAR(24) NOT NULL UNIQUE,
    
    -- Dimension foreign keys
    daily_report_id INTEGER NOT NULL REFERENCES dim_daily_report(id) ON DELETE CASCADE,
    jobsite_id INTEGER NOT NULL REFERENCES dim_jobsite(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES dim_employee(id) ON DELETE CASCADE,
    crew_id INTEGER NOT NULL REFERENCES dim_crew(id) ON DELETE CASCADE,
    
    -- Date dimensions (denormalized for easy filtering/grouping)
    work_date DATE NOT NULL,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    week SMALLINT NOT NULL,
    day_of_week SMALLINT NOT NULL,
    
    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    
    -- Pre-calculated metrics
    hours DECIMAL(10, 2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ) STORED,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) * hourly_rate
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
CREATE INDEX idx_fact_employee_work_year_month ON fact_employee_work(year, month);
CREATE INDEX idx_fact_employee_work_jobsite_year_month ON fact_employee_work(jobsite_id, year, month);

-- migrate:down

DROP TABLE IF EXISTS fact_employee_work;
DROP TABLE IF EXISTS dim_daily_report;
DROP TABLE IF EXISTS dim_crew;
DROP TABLE IF EXISTS dim_jobsite;
DROP TABLE IF EXISTS dim_employee_rate;
DROP TABLE IF EXISTS dim_employee;
