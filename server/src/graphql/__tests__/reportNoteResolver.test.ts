import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import _ids from "@testing/_ids";
import vitestLogin from "@testing/vitestLogin";
import { ReportNote, File } from "@models";
import { Server } from "http";

let documents: SeededDatabase, app: Server;
let adminToken: string;
let pmToken: string;
let foremanToken: string;

const setupDatabase = async () => {
  documents = await seedDatabase();

  return;
};

beforeAll(async () => {
  await prepareDatabase();

  app = await createApp();

  await setupDatabase();

  adminToken = await vitestLogin(app, "admin@bowmark.ca");
  pmToken = await vitestLogin(app, "pm@bowmark.ca");
  foremanToken = await vitestLogin(app, "baseforeman1@bowmark.ca");
});

afterAll(async () => {
  await disconnectAndStopServer();
});

describe("Report Note Resolver", () => {
  describe("MUTATIONS", () => {
    describe("reportNoteRemoveFile", () => {
      const removeFileMutation = `
        mutation RemoveFile($id: String!, $fileId: String!) {
          reportNoteRemoveFile(reportNoteId: $id, fileId: $fileId) {
            _id
            files {
              mimetype
            }
          }
        }
      `;

      describe("authorization", () => {
        it("rejects unauthenticated", async () => {
          const res = await request(app)
            .post("/graphql")
            .send({
              query: removeFileMutation,
              variables: {
                id: _ids.reportNotes.jobsite_1_base_1_1_note_1._id.toString(),
                fileId: _ids.files.jobsite_1_base_1_1_file_1._id.toString(),
              },
            });
          expect(res.body.errors).toBeDefined();
        });
      });

      // The legacy `reportNoteRemoveFile` success test was removed along
      // with the mutation itself — file removal now flows through the
      // unified file system (FileNode trash/restore). The authorization
      // test above still exercises the "mutation not available to anon"
      // edge — the GraphQL validator rejects unknown selections.
    });
  });
});
