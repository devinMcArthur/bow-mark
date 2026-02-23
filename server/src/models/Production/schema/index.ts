import SchemaVersions from "@constants/SchemaVersions";
import { DailyReportClass, ProductionDocument } from "@models";
import { post, prop, Ref } from "@typegoose/typegoose";
import errorHandler from "@utils/errorHandler";
import { Types } from "mongoose";
import { Field, ID, ObjectType } from "type-graphql";
import { publishProductionChange } from "../../../rabbitmq/publisher";

@ObjectType()
@post<ProductionDocument>("save", async (production) => {
  // Publish to RabbitMQ for PostgreSQL sync
  try {
    await publishProductionChange("updated", production._id.toString());
  } catch (e) {
    errorHandler("Production RabbitMQ publish error", e);
  }
})
@post<ProductionDocument>("remove", async (production) => {
  // Publish deletion to RabbitMQ
  try {
    await publishProductionChange("deleted", production._id.toString());
  } catch (e) {
    errorHandler("Production RabbitMQ publish error", e);
  }
})
export class ProductionSchema {
  @Field(() => ID, { nullable: false })
  public _id!: Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public jobTitle!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public quantity!: number;

  @Field({ nullable: false })
  @prop({ required: true, trim: true })
  public unit!: string;

  @Field({ nullable: false })
  @prop({ required: true })
  public startTime!: Date;

  @Field({ nullable: false })
  @prop({ required: true })
  public endTime!: Date;

  @Field({ nullable: true })
  @prop({ trim: true })
  public description?: string;

  @Field()
  @prop({ required: true, default: SchemaVersions.Production })
  public schemaVersion!: number;

  /**
   * @deprecated link already exists in DailyReport document
   */
  @Field(() => DailyReportClass)
  @prop({ ref: () => DailyReportClass })
  public dailyReport!: Ref<DailyReportClass>;
}
