/**
 * Unit Conversion Constants
 *
 * Constants used for converting between different units of measurement
 * in productivity and reporting calculations.
 *
 * These values are industry standards but can be tweaked if needed
 * for more accurate calculations based on specific material properties.
 */

/**
 * Conversion factor from cubic meters (m³) to tonnes for concrete.
 *
 * Standard ready-mix concrete density ranges from 2.3 to 2.5 tonnes/m³
 * depending on the mix design and aggregate used.
 *
 * - Lightweight concrete: ~1.8 t/m³
 * - Normal weight concrete: 2.3-2.5 t/m³
 * - High-density concrete: 2.6+ t/m³
 *
 * Default of 2.4 t/m³ is a reasonable middle ground for typical mixes.
 */
export const CUBIC_METERS_TO_TONNES = 2.4;

/**
 * Conversion factor from loads to tonnes for tandem dump trucks.
 *
 * Tandem dump trucks typically carry 12-16 tonnes per load depending on:
 * - Truck size and configuration
 * - Material density (asphalt vs gravel vs sand)
 * - Legal weight limits
 *
 * Default of 14 tonnes is a reasonable average for paving operations.
 */
export const TANDEM_TONNES_PER_LOAD = 14;

/**
 * Conversion factor from cubic yards to tonnes for concrete.
 *
 * 1 cubic yard = 0.7646 cubic meters
 * Using concrete density of 2.4 t/m³:
 * 1 yd³ ≈ 1.83 tonnes
 *
 * This is approximate - actual value depends on concrete mix.
 */
export const CUBIC_YARDS_TO_TONNES = 1.83;

export default {
  CUBIC_METERS_TO_TONNES,
  TANDEM_TONNES_PER_LOAD,
  CUBIC_YARDS_TO_TONNES,
};
