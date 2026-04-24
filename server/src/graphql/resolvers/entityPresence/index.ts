import {
  Arg,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import type { IContext } from "@typescript/graphql";
import {
  heartbeat,
  listPresence,
  subscribeToPresence,
  type PresenceEntry,
} from "@lib/entityPresence";

@ObjectType("PresenceViewer")
class PresenceViewerGql {
  @Field()
  userId!: string;

  @Field()
  activity!: string;

  @Field()
  lastSeen!: Date;
}

@Resolver()
export default class EntityPresenceResolver {
  @Authorized()
  @Mutation(() => Boolean)
  async presenceHeartbeat(
    @Arg("entityType") entityType: string,
    @Arg("entityId") entityId: string,
    @Arg("activity") activity: string,
    @Ctx() { user }: IContext
  ): Promise<boolean> {
    if (!user) return false;
    if (activity !== "viewing" && activity !== "editing") return false;
    heartbeat({
      entityType,
      entityId,
      userId: user._id.toString(),
      activity,
    });
    return true;
  }

  @Subscription(() => [PresenceViewerGql], {
    subscribe: (_root, args: { entityType: string; entityId: string }) =>
      subscribePresence(args.entityType, args.entityId),
  })
  entityPresence(
    @Arg("entityType") _entityType: string,
    @Arg("entityId") _entityId: string,
    @Root() viewers: PresenceEntry[]
  ): PresenceViewerGql[] {
    return viewers.map((v) => ({
      userId: v.userId,
      activity: v.activity,
      lastSeen: new Date(v.lastSeen),
    }));
  }
}

async function* subscribePresence(
  entityType: string,
  entityId: string
): AsyncGenerator<PresenceEntry[]> {
  // Emit the current roster immediately so new subscribers don't have
  // to wait for the next heartbeat to see who's there.
  yield listPresence({ entityType, entityId });

  const queue: PresenceEntry[][] = [];
  let resolveNext: ((v: PresenceEntry[]) => void) | null = null;

  const unsub = subscribeToPresence(
    { entityType, entityId },
    (viewers) => {
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r(viewers);
      } else {
        queue.push(viewers);
      }
    }
  );

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        const next = await new Promise<PresenceEntry[]>((resolve) => {
          resolveNext = resolve;
        });
        yield next;
      }
    }
  } finally {
    unsub();
  }
}
