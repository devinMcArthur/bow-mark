
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { disconnectAndStopServer, prepareDatabase } from "@testing/vitestDB";
import dayjs from "dayjs";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

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

describe("PLAYGROUND", () => {
  test("should test", async () => {
    dayjs.extend(utc);
    dayjs.extend(timezone);

    console.log(dayjs().tz("America/Edmonton").startOf("day").toDate());
  });
});
