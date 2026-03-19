import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";
import path from "path";

let pgContainer: InstanceType<typeof PostgreSqlContainer> | null = null;

export async function setup() {
  // Only start the PG container if we're running tests that need it.
  // Check an env flag set by specific test scripts, or always start it
  // (it won't be used by Layer 1 tests that don't import db/index.ts).
  pgContainer = await new PostgreSqlContainer("postgres:15")
    .withDatabase("bowmark_reports_test")
    .withUsername("bowmark")
    .withPassword("devpassword")
    .start();

  // Set env vars BEFORE any test module is imported.
  // db/index.ts reads these at module load time.
  // JWT_SECRET: required by createJWT (login mutation) and auth middleware.
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-jwt-secret-for-vitest";
  }
  process.env.POSTGRES_HOST = pgContainer.getHost();
  process.env.POSTGRES_PORT = String(pgContainer.getPort());
  process.env.POSTGRES_USER = pgContainer.getUsername();
  process.env.POSTGRES_PASSWORD = pgContainer.getPassword();
  process.env.POSTGRES_DB = pgContainer.getDatabase();

  // Run migrations against the test database.
  // Migrations live at db/migrations/ (repo root), relative to server/.
  const migrationsPath = path.resolve(__dirname, "../../../db/migrations");
  // sslmode=disable: the Testcontainer runs without SSL
  const dbUrl = `postgres://bowmark:devpassword@${pgContainer.getHost()}:${pgContainer.getPort()}/bowmark_reports_test?sslmode=disable`;
  execSync(`dbmate --url "${dbUrl}" --migrations-dir "${migrationsPath}" up`, {
    stdio: "inherit",
  });
}

export async function teardown() {
  if (pgContainer) {
    await pgContainer.stop();
  }
}
