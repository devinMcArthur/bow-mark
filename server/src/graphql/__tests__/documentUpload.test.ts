import { Readable } from "stream";
import mongoose, { Types } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import {
  File as FileModel,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import DocumentUploadResolver from "@graphql/resolvers/document";
import * as publisher from "../../rabbitmq/publisher";

// Mock storage upload to a no-op so we don't need real DO Spaces creds in test.
vi.mock("@utils/fileStorage", () => ({
  uploadFile: vi.fn(async () => undefined),
  getFile: vi.fn(),
  removeFile: vi.fn(),
  getFileSignedUrl: vi.fn(),
}));

// Suppress unused import warning — Enrichment is available for future use.
void Enrichment;

let resolver: DocumentUploadResolver;
let publishSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
  await FileNode.ensureIndexes();
  resolver = new DocumentUploadResolver();
});

afterAll(async () => {
  await FileNode.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

beforeEach(() => {
  publishSpy = vi
    .spyOn(publisher, "publishEnrichedFileCreated")
    .mockResolvedValue(true);
});

afterEach(() => {
  publishSpy.mockRestore();
});

function makeUpload(opts: {
  filename: string;
  mimetype: string;
  content: string;
}) {
  // graphql-upload's FileUpload shape: a Promise<{filename, mimetype, createReadStream}>
  return Promise.resolve({
    filename: opts.filename,
    mimetype: opts.mimetype,
    encoding: "7bit",
    createReadStream: () => Readable.from([Buffer.from(opts.content)]),
  }) as unknown as any;
}

async function ensureTenderRoot(tenderId: mongoose.Types.ObjectId) {
  await createEntityRoot({ namespace: "/tenders", entityId: tenderId });
  const tendersNs = await FileNode.findOne({
    name: "tenders",
    isReservedRoot: true,
  });
  return FileNode.findOne({
    parentId: tendersNs!._id,
    name: tenderId.toString(),
  });
}

async function ensureDailyReportRoot(id: mongoose.Types.ObjectId) {
  await createEntityRoot({ namespace: "/daily-reports", entityId: id });
  const ns = await FileNode.findOne({
    name: "daily-reports",
    isReservedRoot: true,
  });
  return FileNode.findOne({ parentId: ns!._id, name: id.toString() });
}

describe("uploadDocument", () => {
  it("creates File + Document + FileNode and uploads bytes", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);

    const fn = await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "a.pdf",
        mimetype: "application/pdf",
        content: "pdfbytes",
      }),
    });

    expect(fn.type).toBe("file");
    expect(fn.name).toBe("a.pdf");

    // Prove the triple by walking: fileNode.documentId → Document.currentFileId → File._id.
    const doc = await DocumentModel.findById(
      fn.documentId as Types.ObjectId
    ).lean();
    expect(doc).not.toBeNull();
    const realFile = await FileModel.findById(
      doc!.currentFileId as Types.ObjectId
    ).lean();
    expect(realFile).not.toBeNull();
    expect(realFile!.mimetype).toBe("application/pdf");
    expect(realFile!.originalFilename).toBe("a.pdf");
    expect(realFile!.storageKey).toBe(realFile!._id.toString());
    expect(realFile!.size).toBe(Buffer.from("pdfbytes").length);
  });

  it("publishes enrichment for an enrichable-namespace upload (tender + PDF)", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);
    await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "spec.pdf",
        mimetype: "application/pdf",
        content: "abc",
      }),
    });
    expect(publishSpy).toHaveBeenCalled();
  });

  it("does NOT publish for a /daily-reports/ upload (non-enrichable namespace)", async () => {
    const reportId = new mongoose.Types.ObjectId();
    const root = await ensureDailyReportRoot(reportId);
    await resolver.uploadDocument({
      parentFileNodeId: root!._id.toString(),
      fileUpload: makeUpload({
        filename: "photo.jpg",
        mimetype: "image/jpeg",
        content: "img",
      }),
    });
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("does NOT publish for a non-enrichable MIME type in enrichable namespace", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);
    await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "movie.mp4",
        mimetype: "video/mp4",
        content: "vid",
      }),
    });
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("uses displayName when provided instead of originalFilename", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);
    const fn = await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "raw.pdf",
        mimetype: "application/pdf",
        content: "x",
      }),
      displayName: "Friendly Name",
    });
    expect(fn.name).toBe("Friendly Name");
    // original filename is preserved on File, not on the FileNode.
    const doc = await DocumentModel.findById(
      fn.documentId as Types.ObjectId
    ).lean();
    const file = await FileModel.findById(
      doc!.currentFileId as Types.ObjectId
    ).lean();
    expect(file!.originalFilename).toBe("raw.pdf");
  });

  it("rejects if parent folder is trashed", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);
    const sub = await FileNode.create({
      type: "folder",
      name: "Trashed",
      normalizedName: normalizeNodeName("Trashed"),
      parentId: tenderRoot!._id,
      systemManaged: false,
      sortKey: "5000",
      isReservedRoot: false,
      version: 0,
      deletedAt: new Date(),
    });
    await expect(
      resolver.uploadDocument({
        parentFileNodeId: sub._id.toString(),
        fileUpload: makeUpload({
          filename: "x.pdf",
          mimetype: "application/pdf",
          content: "x",
        }),
      })
    ).rejects.toThrow(/trashed/i);
  });

  it("auto-renames with (N) suffix on sibling-name collision", async () => {
    const tenderId = new mongoose.Types.ObjectId();
    const tenderRoot = await ensureTenderRoot(tenderId);
    const first = await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "dup.pdf",
        mimetype: "application/pdf",
        content: "1",
      }),
    });
    expect(first.name).toBe("dup.pdf");

    const second = await resolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({
        filename: "dup.pdf",
        mimetype: "application/pdf",
        content: "2",
      }),
    });
    // Modern file-manager semantics: collision → auto-rename with (N) suffix.
    expect(second.name).toMatch(/^dup \(\d+\)\.pdf$/);
    expect(second._id.toString()).not.toBe(first._id.toString());

    // Original node is untouched.
    const original = await FileNode.findById(first._id).lean();
    expect(original).not.toBeNull();
    expect(original!.name).toBe("dup.pdf");
  });
});
