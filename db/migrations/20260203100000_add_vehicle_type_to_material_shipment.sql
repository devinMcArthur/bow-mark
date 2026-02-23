-- migrate:up

-- Add vehicle_type column to fact_material_shipment for load-to-tonne conversions
ALTER TABLE fact_material_shipment
ADD COLUMN vehicle_type VARCHAR(100);

-- Add index for queries filtering by vehicle_type
CREATE INDEX idx_fact_material_shipment_vehicle_type
ON fact_material_shipment(vehicle_type)
WHERE vehicle_type IS NOT NULL;

COMMENT ON COLUMN fact_material_shipment.vehicle_type IS
'Vehicle type from vehicleObject (e.g., "Tandem", "Tri-axle"). Used for load-to-tonne conversions.';

-- migrate:down

DROP INDEX IF EXISTS idx_fact_material_shipment_vehicle_type;
ALTER TABLE fact_material_shipment DROP COLUMN IF EXISTS vehicle_type;
