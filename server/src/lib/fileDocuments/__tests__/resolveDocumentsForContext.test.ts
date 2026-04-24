import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import {
  EnrichedFile,
  File,
  Jobsite,
  Tender,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { UserRoles } from "@typescript/user";
import { resolveDocumentsForContext } from "..";

let seed: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  seed = await seedDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("resolveDocumentsForContext", () => {
  it("reads old-shape tender.files[] when new-shape tree is empty", async () => {
    const tender = seed.tenderPricing.tender;
    const file = await File.create({
      mimetype: "application/pdf",
      description: "spec.pdf",
      originalFilename: "spec.pdf",
    });
    const enrichedFile = await EnrichedFile.create({
      file: file._id,
      summaryStatus: "ready",
    });
    await Tender.findByIdAndUpdate(tender._id, {
      $push: { files: enrichedFile._id },
    });

    const resolved = await resolveDocumentsForContext({
      scope: "tender",
      entityId: tender._id as any,
    });

    const match = resolved.find((d) => d.documentId.toString() === enrichedFile._id.toString());
    expect(match).toBeDefined();
    expect(match?.source).toBe("legacy-enrichedfile");
    expect(match?.mimetype).toBe("application/pdf");
    expect(match?.originalFilename).toBe("spec.pdf");
  });

  it("reads new-shape FileNodes when tree is populated", async () => {
    // Create a fresh tender and provision its root directly (we don't call
    // Tender.createDocument here to keep the test focused on the new-shape
    // read path).
    const tenderId = new mongoose.Types.ObjectId();
    await createEntityRoot({ namespace: "/tenders", entityId: tenderId });

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });

    const file = await File.create({
      mimetype: "application/pdf",
      originalFilename: "new-spec.pdf",
      storageKey: "new-spec-key",
      size: 1,
    });
    const doc = await DocumentModel.create({ currentFileId: file._id });
    await FileNode.create({
      type: "file",
      name: "new-spec.pdf",
      normalizedName: normalizeNodeName("new-spec.pdf"),
      parentId: tenderRoot!._id,
      documentId: doc._id,
      version: 0,
      sortKey: "0000",
      systemManaged: false,
      isReservedRoot: false,
    });

    const resolved = await resolveDocumentsForContext({
      scope: "tender",
      entityId: tenderId,
    });

    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((d) => d.source === "new-document")).toBe(true);
    expect(resolved.some((d) => d.originalFilename === "new-spec.pdf")).toBe(true);
  });

  it("returns empty array when scope has no documents", async () => {
    const resolved = await resolveDocumentsForContext({
      scope: "jobsite",
      entityId: new mongoose.Types.ObjectId(),
    });
    expect(resolved).toEqual([]);
  });

  describe("jobsite userRole filtering — old shape", () => {
    it("excludes legacy enrichedFiles entries whose minRole exceeds userRole", async () => {
      // Create a jobsite with two enrichedFiles: one at User level, one at ProjectManager level
      const fileUser = await File.create({
        mimetype: "application/pdf",
        originalFilename: "user-level.pdf",
      });
      const filepm = await File.create({
        mimetype: "application/pdf",
        originalFilename: "pm-level.pdf",
      });
      const efUser = await EnrichedFile.create({ file: fileUser._id, summaryStatus: "ready" });
      const efPm = await EnrichedFile.create({ file: filepm._id, summaryStatus: "ready" });

      const jobsiteId = new mongoose.Types.ObjectId();
      await (Jobsite as any).create({
        _id: jobsiteId,
        name: "Test Jobsite Old Shape",
        active: true,
        enrichedFiles: [
          { enrichedFile: efUser._id, minRole: UserRoles.User },
          { enrichedFile: efPm._id, minRole: UserRoles.ProjectManager },
        ],
      });

      // A User-role user should only see the UserRoles.User entry
      const resolved = await resolveDocumentsForContext({
        scope: "jobsite",
        entityId: jobsiteId,
        userRole: UserRoles.User,
      });

      const ids = resolved.map((d) => d.documentId.toString());
      expect(ids).toContain(efUser._id.toString());
      expect(ids).not.toContain(efPm._id.toString());
    });
  });

  describe("jobsite userRole filtering — new shape", () => {
    it("excludes FileNode placements whose minRole exceeds userRole", async () => {
      const jobsiteId = new mongoose.Types.ObjectId();
      await createEntityRoot({ namespace: "/jobsites", entityId: jobsiteId });

      const jobsitesNs = await FileNode.findOne({ name: "jobsites", isReservedRoot: true });
      const jobsiteRoot = await FileNode.findOne({ parentId: jobsitesNs!._id, name: jobsiteId.toString() });

      // File visible to all users (minRole: User)
      const fileUser = await File.create({
        mimetype: "application/pdf",
        originalFilename: "user-visible.pdf",
        storageKey: "user-visible-key",
        size: 1,
      });
      const docUser = await DocumentModel.create({ currentFileId: fileUser._id });
      await FileNode.create({
        type: "file",
        name: "user-visible.pdf",
        normalizedName: normalizeNodeName("user-visible.pdf"),
        parentId: jobsiteRoot!._id,
        documentId: docUser._id,
        minRole: UserRoles.User,
        version: 0,
        sortKey: "0000",
        systemManaged: false,
        isReservedRoot: false,
      });

      // File restricted to PM+ (minRole: ProjectManager)
      const filePm = await File.create({
        mimetype: "application/pdf",
        originalFilename: "pm-only.pdf",
        storageKey: "pm-only-key",
        size: 1,
      });
      const docPm = await DocumentModel.create({ currentFileId: filePm._id });
      await FileNode.create({
        type: "file",
        name: "pm-only.pdf",
        normalizedName: normalizeNodeName("pm-only.pdf"),
        parentId: jobsiteRoot!._id,
        documentId: docPm._id,
        minRole: UserRoles.ProjectManager,
        version: 0,
        sortKey: "0001",
        systemManaged: false,
        isReservedRoot: false,
      });

      // A User-role user should only see the UserRoles.User node
      const resolved = await resolveDocumentsForContext({
        scope: "jobsite",
        entityId: jobsiteId,
        userRole: UserRoles.User,
      });

      expect(resolved.every((d) => d.source === "new-document")).toBe(true);
      const filenames = resolved.map((d) => d.originalFilename);
      expect(filenames).toContain("user-visible.pdf");
      expect(filenames).not.toContain("pm-only.pdf");
    });
  });
});
