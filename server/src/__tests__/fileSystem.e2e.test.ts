import { Readable } from "stream";
import mongoose, { Types } from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import {
  Tender,
  File as FileModel,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { resolveDocumentsForContext } from "@lib/fileDocuments/resolveDocumentsForContext";
import FileNodeResolver from "@graphql/resolvers/fileNode";
import FileNodeMutationResolver from "@graphql/resolvers/fileNode/mutations";
import DocumentUploadResolver from "@graphql/resolvers/document";
import * as publisher from "../rabbitmq/publisher";

// Stub storage so the mutation doesn't try to hit real DO Spaces.
// (The vitest config also aliases @utils/fileStorage to a no-op mock globally.)
vi.mock("@utils/fileStorage", () => ({
  uploadFile: vi.fn(async () => undefined),
  getFile: vi.fn(),
  removeFile: vi.fn(),
  getFileSignedUrl: vi.fn(),
}));

let queryResolver: FileNodeResolver;
let mutationResolver: FileNodeMutationResolver;
let uploadResolver: DocumentUploadResolver;
let publishSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
  await FileNode.ensureIndexes();
  queryResolver = new FileNodeResolver();
  mutationResolver = new FileNodeMutationResolver();
  uploadResolver = new DocumentUploadResolver();
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

function makeUpload(opts: { filename: string; mimetype: string; content: string }) {
  return Promise.resolve({
    filename: opts.filename,
    mimetype: opts.mimetype,
    encoding: "7bit",
    createReadStream: () => Readable.from([Buffer.from(opts.content)]),
  }) as unknown as any;
}

describe("fileSystem end-to-end: tender upload → enrichment → move → trash → restore", () => {
  it("walks the full lifecycle with every surface behaving as expected", async () => {
    // ── Step 1: Create a Tender. This triggers /tenders/<id>/ per-entity root. ─
    const createdBy = new Types.ObjectId();
    const tender = await (Tender as any).createDocument({
      name: "E2E Smoke Tender",
      jobcode: `E2E-${Date.now()}`,
      description: "End-to-end test",
      createdBy,
    });
    expect(tender).toBeDefined();
    const tenderId = tender._id as Types.ObjectId;

    const tendersNs = await FileNode.findOne({ name: "tenders", isReservedRoot: true });
    expect(tendersNs).not.toBeNull();
    const tenderRoot = await FileNode.findOne({ parentId: tendersNs!._id, name: tenderId.toString() });
    expect(tenderRoot).not.toBeNull();
    expect(tenderRoot!.isReservedRoot).toBe(true);

    // ── Step 2: Upload a PDF via uploadDocument. ───────────────────────────────
    const uploadedFileNode = await uploadResolver.uploadDocument({
      parentFileNodeId: tenderRoot!._id.toString(),
      fileUpload: makeUpload({ filename: "spec.pdf", mimetype: "application/pdf", content: "pdfbytes" }),
    });
    expect(uploadedFileNode.type).toBe("file");
    expect(uploadedFileNode.name).toBe("spec.pdf");
    // The Document was created with a fresh _id (not the File._id).
    const documentId = uploadedFileNode.documentId as Types.ObjectId;
    expect(documentId).toBeDefined();

    // The publisher was called because /tenders/ is enrichable and PDF is in the MIME allowlist.
    expect(publishSpy).toHaveBeenCalled();

    // The Document was created inside the transaction. Confirm it exists.
    const doc = await DocumentModel.findById(documentId).lean();
    expect(doc).not.toBeNull();

    // In the real flow, publishEnrichedFileCreated upserts the Enrichment after
    // a successful RabbitMQ publish. Since we mock the publisher, we create the
    // Enrichment manually to simulate what the publisher would have done.
    const fileNode = await FileNode.findById(uploadedFileNode._id).lean();
    const fileId = (doc as any).currentFileId;
    await Enrichment.create({
      documentId,
      fileId,
      status: "pending",
      attempts: 0,
      processingVersion: 1,
      queuedAt: new Date(),
    });

    const enr = await Enrichment.findOne({ documentId }).lean();
    expect(enr).not.toBeNull();
    expect(enr!.status).toBe("pending");

    // ── Step 3: Simulate consumer processing. ──────────────────────────────────
    // Real handler walks pending → processing → ready with summary/pageIndex.
    // We simulate by direct writes since the real handler needs Anthropic.
    await Enrichment.updateOne(
      { documentId },
      {
        $set: {
          status: "processing",
          processingStartedAt: new Date(),
        },
        $inc: { attempts: 1, processingVersion: 1 },
      }
    );
    await Enrichment.updateOne(
      { documentId },
      {
        $set: {
          status: "ready",
          summary: {
            overview: "A construction specification document.",
            documentType: "Specification",
            keyTopics: ["OPSS-1150", "asphalt", "paving"],
          },
          pageIndex: [{ page: 1, summary: "Title page." }],
          pageCount: 1,
        },
        $unset: { processingStartedAt: "", summaryProgress: "" },
      }
    );

    // ── Step 4: Assert FileNode visible in children + adapter returns doc. ────
    const children = await queryResolver.fileNodeChildren(tenderRoot!._id.toString());
    expect(children.map((c) => c.name)).toContain("spec.pdf");

    const resolved = await resolveDocumentsForContext({ scope: "tender", entityId: tenderId });
    const mine = resolved.find((r) => r.documentId.toString() === documentId.toString());
    expect(mine).toBeDefined();
    expect(mine!.enrichmentStatus).toBe("ready");
    expect(mine!.originalFilename).toBe("spec.pdf");
    // The documentType field nested inside summary:
    expect((mine!.enrichmentSummary as any).documentType).toBe("Specification");

    // ── Step 5: Move the FileNode into a sub-folder. ──────────────────────────
    // Create a sub-folder "Drawings" under the tender root.
    const drawings = await mutationResolver.createFolder(tenderRoot!._id.toString(), "Drawings");
    expect(drawings.name).toBe("Drawings");

    // Move the PDF placement under Drawings.
    const moved = await mutationResolver.moveNode(
      uploadedFileNode._id.toString(),
      drawings._id.toString(),
      uploadedFileNode.version
    );
    expect((moved.parentId as any).toString()).toBe(drawings._id.toString());

    // Breadcrumbs should now walk: / → tenders → <tenderId> → Drawings → spec.pdf.
    const crumbs = await queryResolver.fileNodeBreadcrumbs(moved._id.toString());
    expect(crumbs.map((c) => c.name)).toEqual(["/", "tenders", tenderId.toString(), "Drawings", "spec.pdf"]);

    // Enrichment policy should still hold (we're under /tenders/ with a PDF),
    // but the adapter still resolves the doc.
    const resolvedAfterMove = await resolveDocumentsForContext({ scope: "tender", entityId: tenderId });
    expect(resolvedAfterMove.find((r) => r.documentId.toString() === documentId.toString())).toBeDefined();

    // ── Step 6: Trash the FileNode — disappears from children. ────────────────
    const trashed = await mutationResolver.trashNode(moved._id.toString(), moved.version);
    expect(trashed.deletedAt).toBeTruthy();
    const drawingsChildren = await queryResolver.fileNodeChildren(drawings._id.toString());
    expect(drawingsChildren.map((c) => c.name)).not.toContain("spec.pdf");

    // Adapter should no longer surface the doc (the only placement was trashed).
    const resolvedAfterTrash = await resolveDocumentsForContext({ scope: "tender", entityId: tenderId });
    expect(resolvedAfterTrash.find((r) => r.documentId.toString() === documentId.toString())).toBeUndefined();

    // ── Step 7: Restore — reappears. ──────────────────────────────────────────
    const restored = await mutationResolver.restoreNode(trashed._id.toString(), trashed.version);
    expect(restored.deletedAt).toBeFalsy();
    const drawingsChildrenAfter = await queryResolver.fileNodeChildren(drawings._id.toString());
    expect(drawingsChildrenAfter.map((c) => c.name)).toContain("spec.pdf");
    const resolvedAfterRestore = await resolveDocumentsForContext({ scope: "tender", entityId: tenderId });
    expect(resolvedAfterRestore.find((r) => r.documentId.toString() === documentId.toString())).toBeDefined();
  });
});
