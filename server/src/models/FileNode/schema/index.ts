import { prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { UserRoles } from "@typescript/user";
import { DocumentSchema } from "../../Document/schema";
import { UserClass } from "../../User/class";

@ObjectType()
export class FileNodeSchema {
  @Field(() => ID)
  public _id!: Types.ObjectId;

  @Field(() => String)
  @prop({ required: true, enum: ["folder", "file"] })
  public type!: "folder" | "file";

  @Field()
  @prop({ required: true, trim: true })
  public name!: string;

  @Field()
  @prop({ required: true, trim: true })
  public normalizedName!: string;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => FileNodeSchema, required: false, default: null })
  public parentId?: Ref<FileNodeSchema> | null;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => DocumentSchema, required: false })
  public documentId?: Ref<DocumentSchema>;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  /**
   * When true, the FileBrowser blocks user-initiated rename, move, or
   * trash on this node. Used for structural folders the system owns —
   * AI-curated tender categories, invoice subfolders, any future layout
   * we want to keep intact. (Originally named `aiManaged`; broadened and
   * renamed since the flag now covers more than AI-authored folders.)
   */
  @Field()
  @prop({ required: true, default: false })
  public systemManaged!: boolean;

  @Field()
  @prop({ required: true, default: "0000" })
  public sortKey!: string;

  @Field(() => UserRoles, { nullable: true })
  @prop({ type: () => Number })
  public minRole?: UserRoles;

  @Field()
  @prop({ required: true, default: false })
  public isReservedRoot!: boolean;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public createdBy?: Ref<UserClass>;

  @Field({ nullable: true })
  @prop()
  public deletedAt?: Date;

  @Field(() => ID, { nullable: true })
  @prop({ ref: () => UserClass, required: false })
  public deletedBy?: Ref<UserClass>;

  @Field()
  @prop({ required: true, default: 0 })
  public version!: number;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public createdAt!: Date;

  @Field()
  @prop({ required: true, default: () => new Date() })
  public updatedAt!: Date;
}
