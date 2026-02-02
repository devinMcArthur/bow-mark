import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { DB } from "./generated-types";

/**
 * PostgreSQL connection pool configuration
 */
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "postgres",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER || "bowmark",
  password: process.env.POSTGRES_PASSWORD || "devpassword",
  database: process.env.POSTGRES_DB || "bowmark_reports",
  max: process.env.NODE_ENV === "production" ? 20 : 10,
});

/**
 * Kysely instance for the reporting database
 *
 * Usage:
 *   import { db } from "./db";
 *
 *   // Fully typed queries
 *   const employees = await db
 *     .selectFrom("dim_employee")
 *     .selectAll()
 *     .execute();
 *
 *   // Joins are type-safe
 *   const workDetails = await db
 *     .selectFrom("fact_employee_work")
 *     .innerJoin("dim_employee", "dim_employee.id", "fact_employee_work.employee_id")
 *     .select(["dim_employee.name", "fact_employee_work.hours"])
 *     .execute();
 */
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`.execute(db);
    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    return false;
  }
}


/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closeConnection(): Promise<void> {
  await db.destroy();
}
