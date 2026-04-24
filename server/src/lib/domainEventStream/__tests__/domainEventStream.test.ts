import mongoose from "mongoose";
import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import { DomainEvent } from "@models";
import { watchDomainEvents } from "..";

beforeAll(async () => {
  await prepareDatabase();
});
afterAll(async () => {
  await DomainEvent.collection.drop().catch(() => undefined);
  await disconnectAndStopServer();
});

async function collect<T>(
  iter: AsyncIterable<T>,
  count: number,
  timeoutMs = 3000
): Promise<T[]> {
  const out: T[] = [];
  const timer = setTimeout(() => {
    throw new Error(`collect(${count}) timed out after ${timeoutMs}ms`);
  }, timeoutMs);
  for await (const item of iter) {
    out.push(item);
    if (out.length >= count) break;
  }
  clearTimeout(timer);
  return out;
}

describe("watchDomainEvents", () => {
  it("delivers events matching the filter, skipping others", async () => {
    const targetId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();
    const { iterator, close } = watchDomainEvents({
      entityType: "thing",
      entityId: targetId,
    });

    const collected = collect(iterator, 2);

    // Give the change stream a moment to open before writing.
    await new Promise((r) => setTimeout(r, 100));

    await DomainEvent.create({
      type: "thing.a",
      schemaVersion: 1,
      actorKind: "system",
      entityType: "thing",
      entityId: targetId,
      toVersion: 1,
      diff: { forward: [], inverse: [] },
    });
    await DomainEvent.create({
      type: "thing.ignored",
      schemaVersion: 1,
      actorKind: "system",
      entityType: "thing",
      entityId: otherId,
      toVersion: 1,
      diff: { forward: [], inverse: [] },
    });
    await DomainEvent.create({
      type: "thing.b",
      schemaVersion: 1,
      actorKind: "system",
      entityType: "thing",
      entityId: targetId,
      toVersion: 2,
      diff: { forward: [], inverse: [] },
    });

    const events = await collected;
    expect(events.map((e) => e.type)).toEqual(["thing.a", "thing.b"]);
    close();
  });

  it("close() terminates the iterator", async () => {
    const { iterator, close } = watchDomainEvents({ entityType: "never" });
    close();
    const it = iterator[Symbol.asyncIterator]();
    const result = await it.next();
    expect(result.done).toBe(true);
  });
});
