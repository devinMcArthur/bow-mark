import { Field, Float, ID, InputType } from "type-graphql";

@InputType()
export class RatesData {
  @Field(() => ID, { nullable: true })
  public _id?: string;

  @Field({ nullable: false })
  public date!: Date;

  @Field(() => Float, { nullable: false })
  public rate!: number;
}

@InputType()
export class DefaultRateData {
  @Field(() => ID, { nullable: true })
  public _id?: string;

  @Field({ nullable: false })
  public title!: string;

  @Field(() => [RatesData], { nullable: false })
  public rates!: RatesData[];
}
