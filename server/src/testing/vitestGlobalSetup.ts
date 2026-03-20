import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { MongoDBContainer, StartedMongoDBContainer } from "@testcontainers/mongodb";
import { execSync } from "child_process";
import path from "path";

let pgContainer: InstanceType<typeof PostgreSqlContainer> | null = null;
let mongoContainer: StartedMongoDBContainer | null = null;

export async function setup() {
  // Start MongoDB container (always starts as single-node replica set with
  // --replSet rs0 and rs.initiate() via health check). WiredTiger storage engine
  // is the default for containerised MongoDB, so sessions/transactions work.
  mongoContainer = await new MongoDBContainer("mongo:6").start();

  // The RS member is registered under the container's internal Docker hostname,
  // which isn't resolvable from outside Docker. directConnection=true bypasses
  // RS topology discovery so Mongoose connects to localhost:<mapped_port> directly,
  // without attempting to resolve the container hostname. Sessions and transactions
  // work because the server itself is a RS primary running WiredTiger.
  const mongoPort = mongoContainer.getMappedPort(27017);
  process.env.MONGODB_URI = `mongodb://localhost:${mongoPort}/?directConnection=true`;

  // Start PostgreSQL container.
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
  const migrationsPath = path.resolve(__dirname, "../../../db/migrations");
  const dbUrl = `postgres://bowmark:devpassword@${pgContainer.getHost()}:${pgContainer.getPort()}/bowmark_reports_test?sslmode=disable`;
  execSync(`dbmate --url "${dbUrl}" --migrations-dir "${migrationsPath}" up`, {
    stdio: "inherit",
  });
}

export async function teardown() {
  if (mongoContainer) {
    await mongoContainer.stop();
  }
  if (pgContainer) {
    await pgContainer.stop();
  }
}
