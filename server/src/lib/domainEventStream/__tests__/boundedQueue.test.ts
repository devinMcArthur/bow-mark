import { createBoundedQueue } from "../boundedQueue";

describe("createBoundedQueue", () => {
  it("FIFO for items pushed below the cap", () => {
    const q = createBoundedQueue<number>(5);
    q.push(1);
    q.push(2);
    q.push(3);
    expect(q.size).toBe(3);
    expect(q.droppedCount).toBe(0);
    expect(q.shift()).toBe(1);
    expect(q.shift()).toBe(2);
    expect(q.shift()).toBe(3);
    expect(q.shift()).toBeUndefined();
  });

  it("drops oldest when the cap is reached and tracks dropped count", () => {
    const q = createBoundedQueue<number>(3);
    q.push(1);
    q.push(2);
    q.push(3);
    q.push(4); // should drop 1
    q.push(5); // should drop 2
    expect(q.size).toBe(3);
    expect(q.droppedCount).toBe(2);
    // Remaining order: [3, 4, 5]
    expect(q.shift()).toBe(3);
    expect(q.shift()).toBe(4);
    expect(q.shift()).toBe(5);
  });

  it("handles a flood of pushes without unbounded growth (OOM regression)", () => {
    const q = createBoundedQueue<number>(100);
    for (let i = 0; i < 10_000; i++) q.push(i);
    // Size caps at maxSize regardless of how many items were pushed.
    expect(q.size).toBe(100);
    expect(q.droppedCount).toBe(9900);
    // Oldest retained element is 9900; newest is 9999.
    expect(q.shift()).toBe(9900);
  });

  it("rejects non-positive maxSize", () => {
    expect(() => createBoundedQueue<number>(0)).toThrow();
    expect(() => createBoundedQueue<number>(-1)).toThrow();
  });
});
