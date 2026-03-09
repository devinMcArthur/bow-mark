import SchemaVersions from "@constants/SchemaVersions";
import { EmployeeClass } from "@models";
import { prop, Ref } from "@typegoose/typegoose";
import { UserRoles, UserTypes } from "@typescript/user";
import isEmail from "@validation/isEmail";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { UserSettings } from "./subdocuments";

@ObjectType()
export class UserSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, minlength: 1, trim: true })
  public name!: string;

  @Field({ nullable: false })
  @prop({
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: (value) => isEmail(value),
      message: "Provided email address is invalid",
    },
  })
  public email!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public password!: string;

  @Field({ nullable: true })
  @prop({ trim: true })
  public resetPasswordToken?: string;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public admin!: boolean;

  @Field({ nullable: false })
  @prop({ required: true, default: false })
  public projectManager!: boolean;

  @Field(() => UserRoles, { nullable: false })
  @prop({ required: true, enum: UserRoles, default: UserRoles.User })
  public role!: UserRoles;

  @Field(() => [UserTypes], {
    defaultValue: [UserTypes.VehicleMaintenance],
  })
  @prop({
    type: () => [String],
    required: true,
    enum: UserTypes,
    default: [UserTypes.VehicleMaintenance],
  })
  public types!: UserTypes[];

  @Field(() => EmployeeClass, { nullable: false })
  @prop({ ref: () => EmployeeClass, required: true })
  public employee!: Ref<EmployeeClass>;

  @Field(() => UserSettings)
  @prop({ type: () => UserSettings, required: true, default: {} })
  public settings!: UserSettings;

  @Field()
  @prop({ required: true, default: SchemaVersions.User })
  public schemaVersion!: number;

  /**
   * @deprecated token is now a JWT that will hold the expirey info
   */
  @Field()
  @prop()
  public resetPasswordExpires?: Date;
}
