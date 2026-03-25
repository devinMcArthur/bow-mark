-- migrate:up

-- Add rate_scenario_id to fact_material_shipment so scenario-costed rows are
-- queryable by scenario (parallel to delivered_rate_id for legacy delivered rates).
-- NULL for all legacy (non-scenario) rows.
ALTER TABLE fact_material_shipment
ADD COLUMN rate_scenario_id VARCHAR(24);

COMMENT ON COLUMN fact_material_shipment.rate_scenario_id IS
'Scenario _id (24-char hex) from JobsiteMaterial.scenarios when the shipment is costed via the rate-model scenario system. NULL for legacy cost types.';

-- migrate:down

ALTER TABLE fact_material_shipment DROP COLUMN IF EXISTS rate_scenario_id;
