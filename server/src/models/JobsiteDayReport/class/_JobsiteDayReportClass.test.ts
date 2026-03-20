
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import { JobsiteDayReport } from "@models";

let documents: SeededDatabase;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("Jobsite Day Report Class", () => {
  describe("BUILD", () => {
    describe("requestBuildForJobsiteDay", () => {
      describe("success", () => {
        test("should successfully build", async () => {
          const jobsiteDayReport =
            await JobsiteDayReport.requestBuildForJobsiteDay(
              documents.jobsites.jobsite_1,
              documents.dailyReports.jobsite_1_base_1_1.date
            );

          expect(jobsiteDayReport).toBeDefined();
        });
      });
    });
  });
});
