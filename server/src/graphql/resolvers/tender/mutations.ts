import { Field, InputType } from "type-graphql";

@InputType()
export class TenderCreateData {
  @Field()
  public name!: string;

  @Field()
  public jobcode!: string;

  @Field({ nullable: true })
  public description?: string;
}

@InputType()
export class TenderUpdateData {
  @Field({ nullable: true })
  public name?: string;

  @Field({ nullable: true })
  public description?: string;

  @Field({ nullable: true })
  public status?: string;

  @Field({ nullable: true })
  public jobsiteId?: string;
}

@InputType()
export class TenderAddFileData {
  @Field()
  public fileId!: string;

  @Field()
  public documentType!: string;
}
