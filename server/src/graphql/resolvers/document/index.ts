import { Arg, Authorized, Mutation, Resolver } from "type-graphql";
import mongoose, { Types } from "mongoose";
import {
  File as FileModel,
  FileNode,
  Document as DocumentModel,
  Enrichment,
} from "@models";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { UploadDocumentInput } from "./types";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { eventfulMutation } from "@lib/eventfulMutation";
import { shouldEnrichNow } from "@lib/enrichmentPolicy";
import { uploadFile } from "@utils/fileStorage";
import getBuffer from "@utils/getBuffer";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";

// Suppress unused import warning — Enrichment is available for future use.
void Enrichment;

/**
 * Surface-scoped document upload. Creates File + Document + FileNode in one
 * transaction, then (post-commit) uploads bytes to storage and publishes an
 * enrichment job if the placement is under an enrichable namespace.
 */
@Resolver()
export default class DocumentUploadResolver {
  @Authorized(["ADMIN", "PM", "USER"])
  @Mutation(() => FileNodeSchema)
  async uploadDocument(
    @Arg("input") input: UploadDocumentInput
  ): Promise<FileNodeSchema> {
    const { parentFileNodeId, fileUpload, displayName } = input;

    if (!mongoose.isValidObjectId(parentFileNodeId)) {
      throw new Error("Invalid parentFileNodeId");
    }

    // Resolve the upload outside the transaction (stream consumption).
    const upload = await fileUpload;
    const buffer = await getBuffer(upload.createReadStream());
    const mimetype = upload.mimetype;
    const originalFilename = upload.filename;
    const size = buffer.length;
    const name = (displayName ?? originalFilename ?? "file").trim() || "file";

    // Validate the parent exists and is a live folder BEFORE the transaction
    // so we fail fast without consuming a transaction slot.
    const parent = await FileNode.findById(parentFileNodeId).lean();
    if (!parent) throw new Error("Parent folder not found");
    if (parent.deletedAt) throw new Error("Parent folder is trashed");
    if (parent.type !== "folder") throw new Error("Parent must be a folder");

    const parentObjectId = new mongoose.Types.ObjectId(parentFileNodeId);

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
            },
          ],
          { session }
        )) as any)[0];

        // 3. Create FileNode placement.
        let fnCreated;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fnCreated = ((await FileNode.create(
            [
              {
                type: "file",
                name,
                normalizedName: normalizeNodeName(name),
                parentId: parentObjectId,
                documentId: docDoc._id,
                aiManaged: false,
                sortKey: "5000",
                isReservedRoot: false,
                version: 0,
              },
            ],
            { session }
          )) as any)[0];
        } catch (err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = err as any;
          if (e?.code === 11000) {
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
          event: null,
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
