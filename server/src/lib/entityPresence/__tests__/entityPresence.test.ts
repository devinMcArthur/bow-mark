import {
  heartbeat,
  listPresence,
  clearPresence,
  subscribeToPresence,
  PRESENCE_TTL_MS,
} from "..";

beforeEach(() => {
  clearPresence();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  clearPresence();
});

describe("entityPresence", () => {
  it("heartbeat registers a viewer; listPresence returns them", () => {
    heartbeat({
      entityType: "tender",
      entityId: "t1",
      userId: "u1",
      activity: "viewing",
    });
    const viewers = listPresence({ entityType: "tender", entityId: "t1" });
    expect(viewers).toHaveLength(1);
    expect(viewers[0].userId).toBe("u1");
    expect(viewers[0].activity).toBe("viewing");
  });

  it("second heartbeat from same user refreshes the existing entry", () => {
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    vi.advanceTimersByTime(5000);
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "editing" });
    const viewers = listPresence({ entityType: "x", entityId: "y" });
    expect(viewers).toHaveLength(1);
    expect(viewers[0].activity).toBe("editing");
  });

  it("entries expire after PRESENCE_TTL_MS of no heartbeats", () => {
    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    vi.advanceTimersByTime(PRESENCE_TTL_MS + 1);
    const viewers = listPresence({ entityType: "x", entityId: "y" });
    expect(viewers).toHaveLength(0);
  });

  it("subscribeToPresence receives updates on heartbeat and expiry", async () => {
    const events: string[] = [];
    const unsub = subscribeToPresence(
      { entityType: "x", entityId: "y" },
      (viewers) => events.push(viewers.map((v) => v.userId).join(",") || "(empty)")
    );

    heartbeat({ entityType: "x", entityId: "y", userId: "u1", activity: "viewing" });
    heartbeat({ entityType: "x", entityId: "y", userId: "u2", activity: "viewing" });
    expect(events).toEqual(["u1", "u1,u2"]);

    vi.advanceTimersByTime(PRESENCE_TTL_MS + 1);
    listPresence({ entityType: "x", entityId: "y" });
    expect(events.at(-1)).toBe("(empty)");

    unsub();
  });

  it("subscriptions are scoped — unrelated entities do not fire", () => {
    const events: string[] = [];
    const unsub = subscribeToPresence(
      { entityType: "tender", entityId: "A" },
      (v) => events.push(v.map((x) => x.userId).join(","))
    );
    heartbeat({ entityType: "tender", entityId: "B", userId: "u1", activity: "viewing" });
    expect(events).toEqual([]);
    unsub();
  });
});
