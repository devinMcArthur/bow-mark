import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { truncateAllPgTables } from "@testing/vitestPgDB";
import { db } from "../../db";
import {
  upsertDimJobsite,
  upsertDimEmployee,
  upsertDimCrew,
} from "../handlers/dimensions";

let documents: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  documents = await seedDatabase();
});

beforeEach(async () => {
  await truncateAllPgTables();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("upsertDimJobsite", () => {
  it("creates a dim_jobsite row on first call", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    const id = await upsertDimJobsite(jobsite);
    expect(id).toBeDefined();

    const row = await db
      .selectFrom("dim_jobsite")
      .selectAll()
      .where("mongo_id", "=", jobsite._id.toString())
      .executeTakeFirst();
    expect(row).toBeDefined();
    expect(row!.name).toBe(jobsite.name);
    expect(row!.jobcode).toBe(jobsite.jobcode);
    expect(row!.active).toBe(jobsite.active);
  });

  it("returns the same id on second call (no duplicate)", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    const id1 = await upsertDimJobsite(jobsite);
    const id2 = await upsertDimJobsite(jobsite);
    expect(id1).toBe(id2);

    const rows = await db
      .selectFrom("dim_jobsite")
      .where("mongo_id", "=", jobsite._id.toString())
      .execute();
    expect(rows.length).toBe(1);
  });

  it("updates the record when called with changed data", async () => {
    const jobsite = documents.jobsites.jobsite_1;
    await upsertDimJobsite(jobsite);

    // Mutate in-memory (do not save to MongoDB)
    const modified = { ...jobsite.toObject(), name: "Updated Jobsite Name" };
    await upsertDimJobsite(modified as any);

    const row = await db
      .selectFrom("dim_jobsite")
      .selectAll()
      .where("mongo_id", "=", jobsite._id.toString())
      .executeTakeFirst();
    expect(row!.name).toBe("Updated Jobsite Name");
  });

  it("handles a jobsite without a jobcode", async () => {
    const jobsite = documents.jobsites.jobsite_3;
    const id = await upsertDimJobsite(jobsite);
    expect(id).toBeDefined();

    const row = await db
      .selectFrom("dim_jobsite")
      .selectAll()
      .where("mongo_id", "=", jobsite._id.toString())
      .executeTakeFirst();
    expect(row).toBeDefined();
    expect(row!.name).toBe(jobsite.name);
  });
});

describe("upsertDimEmployee", () => {
  it("creates a dim_employee row on first call", async () => {
    const employee = documents.employees.base_foreman_1;
    const id = await upsertDimEmployee(employee);
    expect(id).toBeDefined();

    const row = await db
      .selectFrom("dim_employee")
      .selectAll()
      .where("mongo_id", "=", employee._id.toString())
      .executeTakeFirst();
    expect(row).toBeDefined();
    expect(row!.name).toBe(employee.name);
    expect(row!.job_title).toBe(employee.jobTitle);
  });

  it("returns the same id on second call (no duplicate)", async () => {
    const employee = documents.employees.base_foreman_1;
    const id1 = await upsertDimEmployee(employee);
    const id2 = await upsertDimEmployee(employee);
    expect(id1).toBe(id2);

    const rows = await db
      .selectFrom("dim_employee")
      .where("mongo_id", "=", employee._id.toString())
      .execute();
    expect(rows.length).toBe(1);
  });

  it("updates the record when called with changed data", async () => {
    const employee = documents.employees.base_foreman_1;
    await upsertDimEmployee(employee);

    // Mutate in-memory (do not save to MongoDB)
    const modified = {
      ...employee.toObject(),
      name: "Updated Foreman Name",
    };
    await upsertDimEmployee(modified as any);

    const row = await db
      .selectFrom("dim_employee")
      .selectAll()
      .where("mongo_id", "=", employee._id.toString())
      .executeTakeFirst();
    expect(row!.name).toBe("Updated Foreman Name");
  });

  it("syncs employee rates into dim_employee_rate", async () => {
    const employee = documents.employees.base_foreman_1;
    const id = await upsertDimEmployee(employee);

    const rates = await db
      .selectFrom("dim_employee_rate")
      .selectAll()
      .where("employee_id", "=", id)
      .orderBy("effective_date", "asc")
      .execute();

    // base_foreman_1 has 2 rates: $20 (2021-01-01) and $25 (2022-01-01)
    expect(rates.length).toBe(2);
    expect(parseFloat(rates[0].rate)).toBe(20);
    expect(parseFloat(rates[1].rate)).toBe(25);
  });

  it("replaces rates on update (re-syncs all rates)", async () => {
    const employee = documents.employees.base_foreman_1;
    const id = await upsertDimEmployee(employee);

    // Call upsert again — rates should be deleted and re-inserted (same count)
    await upsertDimEmployee(employee);

    const rates = await db
      .selectFrom("dim_employee_rate")
      .where("employee_id", "=", id)
      .execute();
    expect(rates.length).toBe(2);
  });

  it("handles an employee with no rates", async () => {
    const employee = documents.employees.office_admin;
    const id = await upsertDimEmployee(employee);
    expect(id).toBeDefined();

    const rates = await db
      .selectFrom("dim_employee_rate")
      .where("employee_id", "=", id)
      .execute();
    expect(rates.length).toBe(0);
  });
});

describe("upsertDimCrew", () => {
  it("creates a dim_crew row on first call", async () => {
    const crew = documents.crews.base_1;
    const id = await upsertDimCrew(crew);
    expect(id).toBeDefined();

    const row = await db
      .selectFrom("dim_crew")
      .selectAll()
      .where("mongo_id", "=", crew._id.toString())
      .executeTakeFirst();
    expect(row).toBeDefined();
    expect(row!.name).toBe(crew.name);
    expect(row!.type).toBe(crew.type);
  });

  it("returns the same id on second call (no duplicate)", async () => {
    const crew = documents.crews.base_1;
    const id1 = await upsertDimCrew(crew);
    const id2 = await upsertDimCrew(crew);
    expect(id1).toBe(id2);

    const rows = await db
      .selectFrom("dim_crew")
      .where("mongo_id", "=", crew._id.toString())
      .execute();
    expect(rows.length).toBe(1);
  });

  it("updates the record when called with changed data", async () => {
    const crew = documents.crews.base_1;
    await upsertDimCrew(crew);

    // Mutate in-memory (do not save to MongoDB)
    const modified = { ...crew.toObject(), name: "Updated Crew Name" };
    await upsertDimCrew(modified as any);

    const row = await db
      .selectFrom("dim_crew")
      .selectAll()
      .where("mongo_id", "=", crew._id.toString())
      .executeTakeFirst();
    expect(row!.name).toBe("Updated Crew Name");
  });

  it("handles a second crew independently", async () => {
    const crew1 = documents.crews.base_1;
    const crew2 = documents.crews.base_2;

    const id1 = await upsertDimCrew(crew1);
    const id2 = await upsertDimCrew(crew2);

    expect(id1).not.toBe(id2);

    const rows = await db.selectFrom("dim_crew").selectAll().execute();
    expect(rows.length).toBe(2);
  });
});
