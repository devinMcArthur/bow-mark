import mongoose from "mongoose";
import {
  Tender,
  File,
  FileNode,
  Document as DocumentModel,
} from "@models";
import { normalizeNodeName } from "@lib/fileTree/reservedRoots";
import { createEntityRoot } from "@lib/fileTree/createEntityRoot";
import type { MigrationOptions, MigrationReport } from "./01-enrichedFiles";

interface TenderFileCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  order: number;
  fileIds: mongoose.Types.ObjectId[];
}

async function ensureFolder(
  parentId: mongoose.Types.ObjectId,
  name: string,
  sortKey: string
): Promise<mongoose.Types.ObjectId> {
  const normalized = normalizeNodeName(name);
  await FileNode.updateOne(
    { parentId, normalizedName: normalized, type: "folder" },
    {
      $setOnInsert: {
        type: "folder",
        name,
        normalizedName: normalized,
        parentId,
        aiManaged: true,
        sortKey,
        isReservedRoot: false,
        version: 0,
        createdAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
  const folder = await FileNode.findOne({
    parentId,
    normalizedName: normalized,
    type: "folder",
  });
  if (!folder) throw new Error(`ensureFolder: could not locate just-upserted folder '${name}'`);
  return folder._id;
}

async function placeFile(
  parentId: mongoose.Types.ObjectId,
  documentId: mongoose.Types.ObjectId,
  baseName: string
): Promise<"placed" | "skipped-collision"> {
  // Idempotent on {parentId, documentId}: if placement already exists, return early.
  const existing = await FileNode.findOne({ parentId, documentId });
  if (existing) return "placed";

  const attempts = [baseName, `${baseName} (${documentId.toString().slice(-6)})`];
  for (const name of attempts) {
    try {
      await FileNode.create({
        type: "file",
        name,
        normalizedName: normalizeNodeName(name),
        parentId,
        documentId,
        aiManaged: false,
        sortKey: "0000",
        isReservedRoot: false,
        version: 0,
      });
      return "placed";
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      if (e?.code !== 11000) throw err;
      // else: duplicate key, try next suffixed name
    }
  }
  return "skipped-collision";
}

/**
 * Legacy tender.files[] + tender.fileCategories[] becomes:
 *  - AI-managed folders under /tenders/<id>/ for each fileCategory (ordered by category.order)
 *  - File placements inside those folders for each fileId in the category
 *  - An "Uncategorized" AI-managed folder for files in tender.files[] not in any category
 *
 * Idempotent: folder upserts by {parentId, normalizedName}; placements checked by
 * {parentId, documentId} before insert.
 */
export async function migrateTenderFiles(
  opts: MigrationOptions
): Promise<MigrationReport> {
  const report: MigrationReport = {
    scanned: 0,
    documentsUpserted: 0,
    enrichmentsUpserted: 0,
    filesBackfilled: 0,
    skipped: 0,
    errors: [],
  };

  const tendersNs = await FileNode.findOne({
    name: "tenders",
    isReservedRoot: true,
  });
  if (!tendersNs) throw new Error("tenders namespace not bootstrapped");

  const cursor = Tender.find().cursor();
  for await (const tender of cursor) {
    report.scanned += 1;
    try {
      if (!opts.dryRun) {
        await createEntityRoot({
          namespace: "/tenders",
          entityId: tender._id,
        });
        const entityRoot = await FileNode.findOne({
          parentId: tendersNs._id,
          name: tender._id.toString(),
        });
        if (!entityRoot) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categories = (((tender as any).fileCategories ?? []) as TenderFileCategory[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allFileIds = (((tender as any).files ?? []) as mongoose.Types.ObjectId[]);

        const categorizedIds = new Set<string>();

        for (const cat of categories) {
          const folderId = await ensureFolder(
            entityRoot._id,
            cat.name,
            String(cat.order).padStart(4, "0")
          );
          for (const fileId of cat.fileIds ?? []) {
            categorizedIds.add(fileId.toString());
            const doc = await DocumentModel.findById(fileId).lean();
            if (!doc) { report.skipped += 1; continue; }
            const file = await File.findById(doc.currentFileId).lean();
            if (!file) { report.skipped += 1; continue; }
            const baseName = file.originalFilename || file.description || "file";
            const outcome = await placeFile(folderId, fileId, baseName);
            if (outcome === "placed") {
              report.documentsUpserted += 1;
            } else {
              report.errors.push({
                enrichedFileId: fileId.toString(),
                message: `name collision in folder '${cat.name}' under tender ${tender._id.toString()}`,
              });
            }
          }
        }

        const uncategorized = allFileIds.filter((id) => !categorizedIds.has(id.toString()));
        if (uncategorized.length > 0) {
          const uncatFolderId = await ensureFolder(
            entityRoot._id,
            "Uncategorized",
            "9999"
          );
          for (const fileId of uncategorized) {
            const doc = await DocumentModel.findById(fileId).lean();
            if (!doc) { report.skipped += 1; continue; }
            const file = await File.findById(doc.currentFileId).lean();
            if (!file) { report.skipped += 1; continue; }
            const baseName = file.originalFilename || file.description || "file";
            const outcome = await placeFile(uncatFolderId, fileId, baseName);
            if (outcome === "placed") {
              report.documentsUpserted += 1;
            } else {
              report.errors.push({
                enrichedFileId: fileId.toString(),
                message: `name collision in Uncategorized under tender ${tender._id.toString()}`,
              });
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({
        enrichedFileId: tender._id.toString(),
        message: msg,
      });
    }
  }

  return report;
}
