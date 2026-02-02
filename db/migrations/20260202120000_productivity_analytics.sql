-- migrate:up

-- ============================================================
-- PRODUCTIVITY ANALYTICS VIEWS
-- ============================================================
-- These views support productivity metrics:
-- 1. Hours by Labor Type (job_title) per jobsite
-- 2. Tonnes per Hour (T/H) using crew hours calculation
--
-- Key insight: Crew hours = MAX(employee hours) per daily report,
-- not SUM, because all employees on a crew work the same day length.
-- When multiple crews of the same type work on the same jobsite/day,
-- we AVERAGE their crew hours for T/H calculation.

-- ============================================================
-- VIEW: crew_max_hours
-- ============================================================
-- Step 1: Get MAX hours per crew (daily report)
-- Each daily report represents one crew's work day.
-- The crew's working day length = longest employee shift that day.
--
-- Example: Crew A has 4 employees working 8, 9, 10, 10 hours
-- Crew hours = 10 (they all worked together, longest shift defines the day)

CREATE VIEW crew_max_hours AS
SELECT
    ew.jobsite_id,
    ew.work_date,
    ew.daily_report_id,
    ew.crew_type,
    MAX(ew.hours) as crew_hours,
    SUM(ew.hours) as total_man_hours,
    COUNT(DISTINCT ew.employee_id) as employee_count
FROM fact_employee_work ew
INNER JOIN dim_daily_report dr ON dr.id = ew.daily_report_id
WHERE ew.archived_at IS NULL
  AND dr.approved = true
  AND dr.archived = false
GROUP BY ew.jobsite_id, ew.work_date, ew.daily_report_id, ew.crew_type;

-- ============================================================
-- VIEW: crew_hours_by_day
-- ============================================================
-- Step 2: Average crew hours across crews of same type per jobsite/day
-- When multiple crews of the same type work on the same jobsite/day,
-- we average their work day lengths for T/H calculations.
--
-- Example: Jobsite X, Jan 15, two Paving crews:
-- - Crew A: longest shift = 10 hrs
-- - Crew B: longest shift = 9 hrs
-- - Average crew hours = (10 + 9) / 2 = 9.5 hours
-- - Total tonnes = 500 → T/H = 500 / 9.5 = 52.6 T/H

CREATE VIEW crew_hours_by_day AS
SELECT
    jobsite_id,
    work_date,
    crew_type,
    AVG(crew_hours) as avg_crew_hours,
    SUM(total_man_hours) as total_man_hours,
    SUM(employee_count) as total_employees,
    COUNT(*) as crew_count
FROM crew_max_hours
GROUP BY jobsite_id, work_date, crew_type;


-- migrate:down

DROP VIEW IF EXISTS crew_hours_by_day;
DROP VIEW IF EXISTS crew_max_hours;
