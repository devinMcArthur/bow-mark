import request from "supertest";

import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";

import createApp from "../../app";
import jestLogin from "@testing/vitestLogin";
import { ReportNote, File } from "@models";
import { getFile } from "@utils/fileStorage";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "http";
import { AWSError } from "aws-sdk";


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

      describe("success", () => {
        test("should successfully remove file from report note", async () => {
          expect.assertions(7);

          const token = await jestLogin(
            app,
            documents.users.base_foreman_1_user.email
          );

          expect(
            documents.reportNotes.jobsite_1_base_1_1_note_1.files.length
          ).toBe(1);

          const res = await request(app)
            .post("/graphql")
            .send({
              query: removeFileMutation,
              variables: {
                id: documents.reportNotes.jobsite_1_base_1_1_note_1._id,
                fileId: documents.files.jobsite_1_base_1_1_file_1._id,
              },
            })
            .set("Authorization", token);

          expect(res.status).toBe(200);

          expect(res.body.data.reportNoteRemoveFile).toBeDefined();
          const reportNote = res.body.data.reportNoteRemoveFile;

          expect(reportNote.files.length).toBe(0);

          const fetched = await ReportNote.getById(reportNote._id);
          expect(fetched?.files.length).toBe(0);

          const nonExistantFile = await File.getById(
            documents.files.jobsite_1_base_1_1_file_1._id
          );
          expect(nonExistantFile).toBeNull();

          try {
            await getFile(
              documents.files.jobsite_1_base_1_1_file_1._id.toString()
            );
          } catch (e) {
            expect((e as AWSError).code).toBe("NoSuchKey");
          }
        });
      });
    });
  });
});
