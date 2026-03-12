import {
  Tender,
  TenderClass,
  TenderDocument,
  TenderConversation,
  File,
  JobsiteClass,
  Jobsite,
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
import { Types } from "mongoose";
import { TenderCreateData, TenderUpdateData, TenderAddFileData } from "./mutations";
import { publishTenderFileCreated } from "../../../rabbitmq/publisher";

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

    const fileObjectId = new Types.ObjectId();
    tender!.files.push({
      _id: fileObjectId,
      file: file!._id,
      ...(data.documentType ? { documentType: data.documentType } : {}),
      summaryStatus: "pending",
    } as any);

    await tender!.save();

    await publishTenderFileCreated(
      tender!._id.toString(),
      fileObjectId.toString(),
      file!._id.toString()
    );

    return Tender.getById(tender!._id.toString());
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRemoveFile(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    tender!.files = tender!.files.filter(
      (f) => f._id.toString() !== fileObjectId.toString()
    ) as any;
    await tender!.save();
    return tender;
  }

  @Authorized(["ADMIN", "PM"])
  @Mutation(() => TenderClass)
  async tenderRetrySummary(@Arg("id", () => ID) id: Id, @Arg("fileObjectId", () => ID) fileObjectId: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    const fileObj = tender!.files.find((f) => f._id.toString() === fileObjectId.toString());
    if (!fileObj) throw new Error("File not found on tender");

    await (Tender as any).findOneAndUpdate(
      { _id: id, "files._id": fileObjectId },
      { $set: { "files.$.summaryStatus": "pending" }, $unset: { "files.$.summaryError": "" } }
    );

    // fileObj.file may be a populated document (from getById) or a raw ObjectId ref —
    // extract the id string safely either way
    const fileId =
      fileObj.file && typeof (fileObj.file as any)._id !== "undefined"
        ? (fileObj.file as any)._id.toString()
        : fileObj.file!.toString();

    await publishTenderFileCreated(
      tender!._id.toString(),
      fileObjectId.toString(),
      fileId
    );

    return Tender.getById(id);
  }

  @Authorized(["ADMIN"])
  @Mutation(() => Boolean)
  async tenderRemove(@Arg("id", () => ID) id: Id) {
    const tender = await Tender.getById(id, { throwError: true });
    await TenderConversation.deleteMany({ tender: id });
    await tender!.deleteOne();
    return true;
  }
}
