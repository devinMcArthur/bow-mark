import { prop } from "@typegoose/typegoose";
import { UserHomeViewSettings } from "@typescript/user";
import { VehicleIssuePriority } from "@typescript/vehicleIssue";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class UserSettings {
  @Field(() => UserHomeViewSettings, { nullable: false })
  @prop({
    required: true,
    enum: UserHomeViewSettings,
    default: UserHomeViewSettings.DailyReports,
  })
  public homeView!: UserHomeViewSettings;

  @Field(() => [VehicleIssuePriority])
  @prop({
    type: () => [String],
    required: true,
    enum: VehicleIssuePriority,
    default: [],
  })
  public subscribedVehicleIssuePriorities!: VehicleIssuePriority[];
}
