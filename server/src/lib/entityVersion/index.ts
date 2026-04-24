import type {
  Schema,
  Model,
  FilterQuery,
  UpdateQuery,
  ClientSession,
  Document,
} from "mongoose";

export class StaleVersionError extends Error {
  constructor(
    public readonly modelName: string,
    public readonly filter: unknown,
    public readonly expectedVersion: number
  ) {
    super(
      `Stale version on ${modelName}: expected ${expectedVersion} but document has been modified.`
    );
    this.name = "StaleVersionError";
  }
}

export function versioned<T extends Document>(schema: Schema<T>): void {
  schema.add({
    version: {
      type: Number,
      default: 0,
      required: true,
    },
  });

  schema.pre("save", function (next) {
    if (!this.isNew) {
      (this as unknown as { version: number }).version += 1;
    }
    next();
  });
}

export interface VersionedUpdateOptions {
  expectedVersion: number;
  session?: ClientSession;
}

export async function findOneAndUpdateVersioned<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  update: UpdateQuery<T>,
  options: VersionedUpdateOptions
): Promise<T | null> {
  const guardedFilter = {
    ...filter,
    version: options.expectedVersion,
  } as FilterQuery<T>;

  const guardedUpdate: UpdateQuery<T> = {
    ...update,
    $inc: {
      ...((update as { $inc?: Record<string, number> }).$inc ?? {}),
      version: 1,
    },
  };

  const updated = await model.findOneAndUpdate(guardedFilter, guardedUpdate, {
    new: true,
    session: options.session,
  });

  if (!updated) {
    // Either the doc doesn't exist (caller error) or the version
    // precondition failed. Disambiguate with a session-aware count.
    const count = await model
      .countDocuments(filter)
      .session(options.session ?? null);
    if (count > 0) {
      throw new StaleVersionError(model.modelName, filter, options.expectedVersion);
    }
  }
  return updated;
}
