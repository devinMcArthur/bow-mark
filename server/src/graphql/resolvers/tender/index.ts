import {
  Tender,
  TenderClass,
  TenderDocument,
  Conversation,
  File,
  JobsiteClass,
  Jobsite,
  EnrichedFile,
} from "@models";
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
