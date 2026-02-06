# Productivity Analysis: Job Size vs T/H Relationship

## Summary

Analysis of 216 jobsites reveals a **weak positive correlation (0.195)** between total job tonnage and tonnes per hour (T/H) productivity.

## Key Findings

### T/H by Job Size Bucket

| Size Bucket | Jobs | Avg Tonnes | Avg Crew Hours | Avg T/H |
|-------------|------|------------|----------------|---------|
| < 1,000t | 145 | 390 | 63 | 6.71 |
| 1,000-5,000t | 59 | 1,913 | 232 | 8.65 |
| 5,000-10,000t | 8 | 5,788 | 816 | 7.50 |
| 10,000-25,000t | 4 | 16,130 | 1,804 | 10.92 |

### Statistical Summary

- **Correlation coefficient**: 0.195 (weak positive)
- **Mean T/H**: 7.35
- **Standard deviation**: 2.94
- **Range**: 1.51 - 20.37

## Implications

### Why Larger Jobs Tend to Have Higher T/H

1. **Economies of scale** - Optimized logistics for larger operations
2. **Setup time amortization** - Fixed daily setup/cleanup spread across more tonnes
3. **Job complexity** - Smaller jobs often involve tighter spaces, repairs, patches
4. **Crew assignment** - Experienced crews may be assigned to larger contracts
5. **Material continuity** - Larger jobs have more consistent material flow

### Benchmarking Considerations

**Important**: Comparing a job's T/H to the overall average is misleading because job size significantly impacts achievable productivity.

A small job (<1,000t) with 6.5 T/H may be **performing well** for its size, while a large job (>10,000t) with 8 T/H may be **underperforming** relative to similar jobs.

### Recommended Approach: Size-Adjusted Benchmarking

Instead of comparing to a flat average, jobs should be compared against:
1. **Jobs of similar total tonnage** (size bucket comparison)
2. **Expected T/H curve** based on job size regression
3. **Percentile within size category** (e.g., "top 25% for jobs under 1,000t")

## Unit Conversions Used

- **Tonnes**: Used directly
- **Loads** (tandem trucks): × 14 tonnes/load
- **Cubic meters** (m³): × 2.4 tonnes/m³

Constants defined in: `server/src/constants/UnitConversions.ts`

## Data Source

- PostgreSQL reporting database
- Approved daily reports only
- Excludes archived shipments
- Analysis date: February 2026
