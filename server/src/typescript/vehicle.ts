import { VehicleDocument } from "@models";
import { Field, Float, Int, ObjectType } from "type-graphql";

export interface IVehicleCreate {
  name: string;
  vehicleCode: string;
  vehicleType: string;
  rental?: boolean;
  sourceCompany?: string;
}

export interface IVehicleUpdate {
  name: string;
  vehicleType: string;
  vehicleCode: string;
}

export interface IVehicleSearchObject {
  score: number;
  vehicle: VehicleDocument;
}

@ObjectType()
class VehicleHourReport {
  @Field(() => Float, { nullable: false })
  public hours!: number;

  @Field(() => Int, { nullable: false })
  public year!: number;
}

@ObjectType()
export class VehicleHoursReport {
  @Field(() => [VehicleHourReport], { nullable: false })
  public years!: VehicleHourReport[];
}
