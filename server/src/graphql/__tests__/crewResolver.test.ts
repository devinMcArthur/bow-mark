import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import jestLogin from "@testing/vitestLogin";
import { Crew } from "@models";
import { CrewCreateData } from "@graphql/resolvers/crew/mutations";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";


let mongoServer: MongoMemoryServer, documents: SeededDatabase, app: Server;
const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  mongoServer = await prepareDatabase();

  app = await createApp();

  await setupDatabase();
});

afterAll(async () => {
  await disconnectAndStopServer(mongoServer);
});

describe("Crew Resolver", () => {
  describe("MUTATIONS", () => {
    describe("crewCreate", () => {
      const crewCreate = `
        mutation CrewCreate($data: CrewCreateData!) {
          crewCreate(data: $data) {
            _id
            name
            type
          }
        }
      `;

      describe("success", () => {
        test("should successfully create a new crew", async () => {
          const token = await jestLogin(app, documents.users.admin_user.email);

          const data: CrewCreateData = {
            name: "New Crew",
            //@ts-expect-error - testing to see if it accepts string
            type: "FormLineSetting",
          };

          const res = await request(app)
            .post("/graphql")
            .send({
              query: crewCreate,
              variables: { data },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.crewCreate).toBeDefined();

          expect(res.body.data.crewCreate.type).toBe(data.type);

          const crew = await Crew.getById(res.body.data.crewCreate._id);

          expect(crew?.name).toBe(data.name);
        });
      });
    });
  });
});
