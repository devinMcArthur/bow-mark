import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { File } from "@models";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await File.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

describe("File schema extensions", () => {
  it("persists originalFilename, storageKey, size, uploadedAt", async () => {
    const f = await File.create({
      mimetype: "application/pdf",
      originalFilename: "spec.pdf",
      storageKey: "507f1f77bcf86cd799439011",
      size: 12345,
      uploadedAt: new Date("2026-04-21T00:00:00Z"),
    });
    expect(f.originalFilename).toBe("spec.pdf");
    expect(f.storageKey).toBe("507f1f77bcf86cd799439011");
    expect(f.size).toBe(12345);
    expect(f.uploadedAt).toBeInstanceOf(Date);
  });

  it("allows uploadedBy to be optional (legacy records)", async () => {
    const f = await File.create({
      mimetype: "application/pdf",
      originalFilename: "legacy.pdf",
      storageKey: "507f1f77bcf86cd799439012",
      size: 1,
    });
    expect(f.uploadedBy).toBeUndefined();
    expect(f.uploadedAt).toBeInstanceOf(Date);
  });
});
