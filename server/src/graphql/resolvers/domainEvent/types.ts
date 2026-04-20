import { Field, ID, ObjectType } from "type-graphql";
import { GraphQLScalarType, Kind } from "graphql";

// Permissive JSON scalar for free-form diff/metadata/relatedEntities payloads.
const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (v) => v,
  parseValue: (v) => v,
  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {};
        for (const f of ast.fields) obj[f.name.value] = (f.value as { value: unknown }).value;
        return obj;
      }
      case Kind.LIST:
        return ast.values.map((v) => (v as { value: unknown }).value);
      default:
        return null;
    }
  },
});

@ObjectType("DomainEvent")
export class DomainEventGql {
  @Field(() => ID)
  _id!: string;

  @Field()
  type!: string;

  @Field()
  schemaVersion!: number;

  @Field()
  actorKind!: string;

  @Field(() => ID, { nullable: true })
  actorId?: string;

  @Field(() => ID, { nullable: true })
  onBehalfOf?: string;

  @Field()
  entityType!: string;

  @Field(() => ID)
  entityId!: string;

  @Field(() => JSONScalar, { nullable: true })
  relatedEntities?: unknown;

  @Field()
  at!: Date;

  @Field({ nullable: true })
  fromVersion?: number;

  @Field()
  toVersion!: number;

  @Field(() => JSONScalar)
  diff!: unknown;

  @Field({ nullable: true })
  requestId?: string;

  @Field({ nullable: true })
  sessionId?: string;

  @Field({ nullable: true })
  correlationId?: string;

  @Field(() => ID, { nullable: true })
  causedByEventId?: string;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: unknown;
}
