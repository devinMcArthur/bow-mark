import {
  Arg,
  Authorized,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import mongoose, { Types } from "mongoose";
import {
  File as FileModel,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import { DocumentSchema } from "../../../models/Document/schema";
import { FileClass } from "../../../models/File/class";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { UploadDocumentInput } from "./types";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { resolveUniqueChildName } from "@lib/fileTree/resolveUniqueChildName";
import { eventfulMutation } from "@lib/eventfulMutation";
import { getRequestContext } from "@lib/requestContext";
import { shouldEnrichNow } from "@lib/enrichmentPolicy";
import { uploadFile } from "@utils/fileStorage";
import getBuffer from "@utils/getBuffer";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";

// Suppress unused import warning — Enrichment is available for future use.
void Enrichment;

/**
 * Surface-scoped document upload + read. Creates File + Document + FileNode
 * in one transaction, then (post-commit) uploads bytes to storage and
 * publishes an enrichment job if the placement is under an enrichable
 * namespace. Also exposes `document(id)` for lightweight metadata lookup
 * (used by ChatDrawer to render the document viewer title/mimetype).
 */
@Resolver(() => DocumentSchema)
export default class DocumentUploadResolver {
  /**
   * Populate the underlying File for a Document. Used by the `document(id)`
   * query so callers can read mimetype + filename without a follow-up hop.
   */
  @FieldResolver(() => FileClass, { nullable: true })
  async currentFile(@Root() doc: DocumentSchema): Promise<FileClass | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileId = (doc as any).currentFileId as
      | mongoose.Types.ObjectId
      | string
      | null
      | undefined;
    if (!fileId) return null;
    const file = await FileModel.findById(fileId).lean();
    return (file as unknown as FileClass | null) ?? null;
  }

  /**
   * Fetch a single Document by id with its current File available via the
   * `currentFile` field resolver. For files migrated from the legacy
   * EnrichedFile collection the `_id` is preserved, so links emitted under
   * the old shape still resolve through this query.
   *
   * Auth: any authenticated user — matches the posture of
   * `/api/documents/:id` (JWT-only, no per-file ACL).
   */
  @Authorized()
  @Query(() => DocumentSchema, { nullable: true })
  async document(
    @Arg("id", () => ID) id: string
  ): Promise<DocumentSchema | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await DocumentModel.findById(id).lean();
    return (doc as unknown as DocumentSchema | null) ?? null;
  }

  @Authorized(["ADMIN", "PM", "USER"])
  @Mutation(() => FileNodeSchema)
  async uploadDocument(
    @Arg("input") input: UploadDocumentInput
  ): Promise<FileNodeSchema> {
    const { parentFileNodeId, fileUpload, displayName, systemManaged } = input;

    if (!mongoose.isValidObjectId(parentFileNodeId)) {
      throw new Error("Invalid parentFileNodeId");
    }

    // Resolve the upload outside the transaction (stream consumption).
    const upload = await fileUpload;
    const buffer = await getBuffer(upload.createReadStream());
    const mimetype = upload.mimetype;
    const originalFilename = upload.filename;
    const size = buffer.length;
    // Sanitize the display name. Name comes from either an explicit
    // displayName or the uploaded file's own name — both may contain path
    // separators (uploads via webkitdirectory keep the bare filename, but
    // paranoid defence). Strip slashes/backslashes/control chars, cap
    // length. Empty after sanitization falls back to "file".
    const rawName = (displayName ?? originalFilename ?? "file").trim();
    const sanitized = rawName
      .replace(/[/\\\x00-\x1f]/g, "_")
      .slice(0, 240)
      .trim();
    const name = sanitized || "file";

    // Validate the parent exists and is a live folder BEFORE the transaction
    // so we fail fast without consuming a transaction slot.
    const parent = await FileNode.findById(parentFileNodeId).lean();
    if (!parent) throw new Error("Parent folder not found");
    if (parent.deletedAt) throw new Error("Parent folder is trashed");
    if (parent.type !== "folder") throw new Error("Parent must be a folder");

    const parentObjectId = new mongoose.Types.ObjectId(parentFileNodeId);
    const ctx = getRequestContext();
    const actorId = ctx?.userId
      ? new mongoose.Types.ObjectId(ctx.userId)
      : undefined;

    // Resolve a non-colliding name in the folder. If the desired name is
    // taken by a live sibling, append " (N)" before the extension — e.g.
    // "foo.pdf" → "foo (2).pdf". Callers that really need the literal
    // name (e.g. explicit renames) don't go through this resolver.
    // Race note: two concurrent uploads with the same base name can both
    // land on the same suffix. The unique index is the safety net —
    // whichever loses the race gets the 11000 error below.
    const resolvedName = await resolveUniqueChildName(name, parentObjectId);

    const { fileId, documentId, fileNode } = await eventfulMutation(
      async (session) => {
        // 1. Create File. We bypass the Mongoose enum validator (SupportedMimeTypes)
        //    so that any MIME type can be stored. Raw collection insert is used to
        //    avoid the enum check while still participating in the session.
        const newFileId = new mongoose.Types.ObjectId();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (FileModel.collection as any).insertOne(
          {
            _id: newFileId,
            mimetype,
            originalFilename,
            storageKey: newFileId.toString(),
            size,
            uploadedAt: new Date(),
            createdAt: new Date(),
            schemaVersion: 1,
            ...(actorId ? { uploadedBy: actorId } : {}),
          },
          { session }
        );

        // 2. Create Document referencing the File.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docDoc = ((await DocumentModel.create(
          [
            {
              _id: new mongoose.Types.ObjectId(),
              currentFileId: newFileId,
              enrichmentLocked: false,
              ...(actorId ? { createdBy: actorId } : {}),
            },
          ],
          { session }
        )) as any)[0];

        // 3. Create FileNode placement.
        // Inherit parent folder's minRole so files uploaded into a
        // role-gated folder (e.g. Invoices/) automatically require the
        // same minimum role to view or download. Without this, a file
        // would be visible in FileBrowser via tree queries but direct
        // fetch via `/api/documents/:id` would still succeed since
        // that endpoint checks placement-level minRole.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inheritedMinRole = (parent as any).minRole as
          | number
          | undefined;
        let fnCreated;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fnCreated = ((await FileNode.create(
            [
              {
                type: "file",
                name: resolvedName,
                normalizedName: normalizeNodeName(resolvedName),
                parentId: parentObjectId,
                documentId: docDoc._id,
                systemManaged: !!systemManaged,
                sortKey: "5000",
                isReservedRoot: false,
                version: 0,
                ...(inheritedMinRole != null
                  ? { minRole: inheritedMinRole }
                  : {}),
                ...(actorId ? { createdBy: actorId } : {}),
              },
            ],
            { session }
          )) as any)[0];
        } catch (err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = err as any;
          if (e?.code === 11000) {
            // Only reachable if two concurrent uploads raced past the
            // upfront suffix resolution and landed on the same name.
            throw new Error(
              "A node with this name already exists in this folder"
            );
          }
          throw err;
        }

        return {
          result: {
            fileId: newFileId,
            documentId: docDoc._id,
            fileNode: fnCreated,
          },
          // Emit on the parent folder so any client viewing the folder sees
          // the new file appear. Same entityType/entityId convention as the
          // other FileNode mutations.
          event: {
            type: "fileNode.created",
            actorKind: "user",
            entityType: "FileNode",
            entityId: parentObjectId,
            toVersion: 1,
            diff: { forward: [], inverse: [] },
            metadata: {
              childId: fnCreated._id.toString(),
              name,
              childType: "file",
              mimetype,
              originalFilename,
            },
          },
        };
      }
    );

    // --- Post-commit side effects ---

    // 4. Upload the bytes to storage.
    await uploadFile(fileId.toString(), buffer, mimetype);

    // 5. If the placement is under an enrichable namespace, publish enrichment.
    //    We only call it if the policy says yes.
    if (await shouldEnrichNow(documentId as Types.ObjectId)) {
      await publishEnrichedFileCreated(
        documentId.toString(),
        fileId.toString()
      );
    }

    return fileNode as FileNodeSchema;
  }
}
