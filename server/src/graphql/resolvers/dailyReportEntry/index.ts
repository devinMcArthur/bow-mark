import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  ID,
  InputType,
  Mutation,
  Query,
  Resolver,
  Root,
  Field,
} from "type-graphql";
import mongoose from "mongoose";
import { DailyReportEntry, DailyReportEntryDocument } from "@models";
import { DailyReportEntrySchema } from "../../../models/DailyReportEntry/schema";
import { UserClass } from "../../../models/User/class";
import { User } from "@models";
import { IContext } from "@typescript/graphql";

@InputType()
class DailyReportEntryCreateData {
  @Field(() => ID)
  public dailyReportId!: string;

  @Field({ nullable: true })
  public text?: string;

  @Field(() => [ID], { defaultValue: [] })
  public documentIds!: string[];

  @Field({ nullable: true })
  public isIssue?: boolean;
}

@InputType()
class DailyReportEntryUpdateData {
  @Field({ nullable: true })
  public text?: string;

  @Field(() => [ID], { nullable: true })
  public documentIds?: string[];

  @Field({ nullable: true })
  public isIssue?: boolean;
}

@Resolver(() => DailyReportEntrySchema)
export default class DailyReportEntryResolver {
  /**
   * Populate the author's User record for the entry card header. Kept as
   * a lean read — the timeline only needs name + _id, but exposing the
   * full UserClass matches the rest of our resolvers.
   */
  @FieldResolver(() => UserClass, { nullable: true })
  async createdByUser(
    @Root() entry: DailyReportEntrySchema
  ): Promise<UserClass | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (entry as any).createdBy;
    if (!id) return null;
    const u = await User.findById(id).lean();
    return (u as unknown as UserClass | null) ?? null;
  }

  /**
   * Chronologically-ordered timeline of entries for a daily report.
   * Oldest-first so readers follow the arc of the day.
   */
  @Authorized()
  @Query(() => [DailyReportEntrySchema])
  async dailyReportEntries(
    @Arg("dailyReportId", () => ID) dailyReportId: string
  ): Promise<DailyReportEntrySchema[]> {
    if (!mongoose.isValidObjectId(dailyReportId)) return [];
    const entries = await DailyReportEntry.find({
      dailyReportId: new mongoose.Types.ObjectId(dailyReportId),
    })
      .sort({ createdAt: 1 })
      .lean();
    return entries as unknown as DailyReportEntrySchema[];
  }

  @Authorized()
  @Mutation(() => DailyReportEntrySchema)
  async createDailyReportEntry(
    @Arg("data") data: DailyReportEntryCreateData,
    @Ctx() ctx: IContext
  ): Promise<DailyReportEntrySchema> {
    if (!mongoose.isValidObjectId(data.dailyReportId)) {
      throw new Error("Invalid dailyReportId");
    }
    const hasText = typeof data.text === "string" && data.text.trim().length > 0;
    const hasFiles = Array.isArray(data.documentIds) && data.documentIds.length > 0;
    if (!hasText && !hasFiles) {
      throw new Error("Entry must include text or at least one attachment");
    }

    const now = new Date();
    const created = await DailyReportEntry.create({
      dailyReportId: new mongoose.Types.ObjectId(data.dailyReportId),
      text: hasText ? data.text!.trim() : undefined,
      documentIds: (data.documentIds ?? []).map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
      createdBy: ctx.user?._id,
      isIssue: !!data.isIssue,
      createdAt: now,
      updatedAt: now,
    });
    return created.toObject() as unknown as DailyReportEntrySchema;
  }

  @Authorized()
  @Mutation(() => DailyReportEntrySchema)
  async updateDailyReportEntry(
    @Arg("id", () => ID) id: string,
    @Arg("data") data: DailyReportEntryUpdateData,
    @Ctx() ctx: IContext
  ): Promise<DailyReportEntrySchema> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const entry = await DailyReportEntry.findById(id);
    if (!entry) throw new Error("Entry not found");

    // Authorship guard: only the author OR PM+ can edit. Keeps foremen
    // from rewriting each other's entries.
    const viewerId = ctx.user?._id?.toString();
    const isAuthor =
      entry.createdBy != null && entry.createdBy.toString() === viewerId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewerRole = (ctx.user as any)?.role as number | undefined;
    const isPmPlus = typeof viewerRole === "number" && viewerRole >= 2;
    if (!isAuthor && !isPmPlus) {
      throw new Error("Not permitted to edit this entry");
    }

    if (data.text !== undefined) {
      entry.text = data.text.trim() || undefined;
    }
    if (data.documentIds !== undefined) {
      (entry as unknown as { documentIds: mongoose.Types.ObjectId[] }).documentIds =
        data.documentIds.map((d) => new mongoose.Types.ObjectId(d));
    }
    if (data.isIssue !== undefined) {
      entry.isIssue = data.isIssue;
    }
    entry.updatedAt = new Date();
    await entry.save();
    return (entry as DailyReportEntryDocument).toObject() as unknown as DailyReportEntrySchema;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteDailyReportEntry(
    @Arg("id", () => ID) id: string,
    @Ctx() ctx: IContext
  ): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) throw new Error("Invalid id");
    const entry = await DailyReportEntry.findById(id);
    if (!entry) return false;

    const viewerId = ctx.user?._id?.toString();
    const isAuthor =
      entry.createdBy != null && entry.createdBy.toString() === viewerId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewerRole = (ctx.user as any)?.role as number | undefined;
    const isPmPlus = typeof viewerRole === "number" && viewerRole >= 2;
    if (!isAuthor && !isPmPlus) {
      throw new Error("Not permitted to delete this entry");
    }

    await entry.deleteOne();
    return true;
  }
}
