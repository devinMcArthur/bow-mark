import {
  Tender,
  TenderClass,
  TenderDocument,
  Conversation,
  File,
  JobsiteClass,
  Jobsite,
  EnrichedFile,
  FileNode,
} from "@models";
import { FileNodeSchema } from "../../../models/FileNode/schema";
import { roleWeight } from "../fileNode";
import { UserRoles } from "@typescript/user";
import { IContext } from "@typescript/graphql";
import { Id } from "@typescript/models";
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { TenderCreateData, TenderUpdateData, TenderAddFileData } from "./mutations";
import { publishEnrichedFileCreated } from "../../../rabbitmq/publisher";
import { isDocument } from "@typegoose/typegoose";
import mongoose from "mongoose";
import { generateTenderSummary, scheduleTenderSummary } from "../../../lib/generateTenderSummary";

@Resolver(() => TenderClass)
export default class TenderResolver {
  @FieldResolver(() => JobsiteClass, { nullable: true })
  async jobsite(@Root() tender: TenderDocument) {
    if (!tender.jobsite) return null;
    return Jobsite.getById(tender.jobsite.toString());
  }

  /**
   * Flat list of every file placed under this tender's FileNode tree,
   * regardless of sub-folder. Replaces the legacy `tender.files` array as
   * the source of truth — derived from the FileNode tree so newly
   * uploaded files appear automatically. The `files` field stays around
   * for now for the pricing-sheet docRef display path, which will migrate
   * to `documents` in a follow-up sweep.
   */
  @FieldResolver(() => [FileNodeSchema])
  async documents(
    @Root() tender: TenderDocument,
    @Ctx() ctx: IContext
  ): Promise<FileNodeSchema[]> {
    // Find the tender's per-entity reserved root: /tenders/<id>.
    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
      parentId: { $ne: null },
    }).lean();
    if (!tendersNs) return [];
    const entityRoot = await FileNode.findOne({
      parentId: tendersNs._id,
      name: tender._id.toString(),
      isReservedRoot: true,
    }).lean();
    if (!entityRoot) return [];

    const docs = await FileNode.aggregate([
      { $match: { _id: entityRoot._id } },
      {
        $graphLookup: {
          from: "filenodes",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentId",
          as: "desc",
        },
      },
      { $unwind: "$desc" },
      {
        $match: {
          "desc.type": "file",
          "desc.deletedAt": null,
          "desc.documentId": { $exists: true },
        },
      },
      { $replaceRoot: { newRoot: "$desc" } },
      { $sort: { sortKey: 1, name: 1 } },
    ]);

    // Per-file access: drop rows whose minRole exceeds the viewer's. The
    // tender page itself is PM/Admin-gated, but a PM shouldn't see files
    // explicitly marked Admin-only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewerRole = (ctx.user as any)?.role ?? UserRoles.User;
    const viewerWeight = roleWeight(viewerRole);
    return (docs as FileNodeSchema[]).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n) => (n as any).minRole == null || roleWeight((n as any).minRole) <= viewerWeight
    );
  }

  @Authorized(["ADMIN", "PM"])
  @Query(() => TenderClass, { nullable: true })
  async tender(@Arg("id", () => ID) id: Id) {
    return Tender.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Query(() => [TenderClass])
  async tenders() {
    return Tender.getList();
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderCreate(@Arg("data") data: TenderCreateData, @Ctx() context: IContext) {
    const tender = await Tender.createDocument({
      ...data,
      createdBy: context.user!._id.toString(),
    });
    await tender.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderUpdate(@Arg("id", () => ID) id: Id, @Arg("data") data: TenderUpdateData) {
    const tender = await Tender.getById(id, { throwError: true });
    await tender!.updateFields(data as any);
    await tender!.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderAddFile(@Arg("id", () => ID) id: Id, @Arg("data") data: TenderAddFileData) {
    const tender = await Tender.getById(id, { throwError: true });
    const file = await File.getById(data.fileId, { throwError: true });

    // Create a standalone EnrichedFile document for this file
    const enrichedFile = await EnrichedFile.createDocument(
      file!._id.toString(),
      data.documentType
    );
    await enrichedFile.save();

    // Push the EnrichedFile ref onto the tender
    tender!.files.push(enrichedFile._id as any);
    await tender!.save();

    // Publish for async summarization
    await publishEnrichedFileCreated(enrichedFile._id.toString(), file!._id.toString());

    return Tender.getById(tender!._id.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRemoveFile(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    tender!.files = (tender!.files as any[]).filter(
      (f: any) => f.toString() !== fileObjectId.toString()
    ) as any;
    await tender!.save();

    // Delete the standalone EnrichedFile document
    await EnrichedFile.findByIdAndDelete(fileObjectId);

    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRetrySummary(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const enrichedFile = await EnrichedFile.findById(fileObjectId);
    if (!enrichedFile) throw new Error("File not found");

    await EnrichedFile.findByIdAndUpdate(fileObjectId, {
      $set: { summaryStatus: "pending" },
      $unset: { summaryError: "" },
    });

    if (!enrichedFile.file) throw new Error("EnrichedFile has no file ref");
    const fileId = isDocument(enrichedFile.file)
      ? enrichedFile.file._id.toString()
      : enrichedFile.file.toString();

    const published = await publishEnrichedFileCreated(fileObjectId.toString(), fileId);
    if (!published) {
      throw new Error("Failed to queue file for processing — please try again");
    }

    return Tender.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderDeleteNote(
    @Arg("id", () => ID) id: Id,
    @Arg("noteId", () => ID) noteId: Id
  ) {
    await (Tender as any).findByIdAndUpdate(id, {
      $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId.toString()) } },
    });
    scheduleTenderSummary(id.toString());
    return Tender.getById(id);
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRegenerateSummary(@Arg("id", () => ID) id: Id) {
    await Tender.getById(id, { throwError: true });
    await (Tender as any).findByIdAndUpdate(id, { $set: { summaryGenerating: true } });
    await generateTenderSummary(id.toString(), "manual");
    return Tender.getById(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async tenderRemove(@Arg("id", () => ID) id: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    await Conversation.deleteMany({ tenderId: id });
    // Clean up all associated EnrichedFile documents
    const fileIds = (tender!.files as any[]).map((f: any) => f.toString());
    if (fileIds.length > 0) {
      await EnrichedFile.deleteMany({ _id: { $in: fileIds } });
    }
    await tender!.deleteOne();
    return true;
  }
}
