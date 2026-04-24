import { computeForward, computeInverse, applyPatch } from "..";

describe("jsonPatch", () => {
  it("computeForward emits the minimum ops to go from before→after", () => {
    const before = { a: 1, b: { c: 2 } };
    const after = { a: 1, b: { c: 3 }, d: 4 };
    expect(computeForward(before, after)).toEqual([
      { op: "replace", path: "/b/c", value: 3 },
      { op: "add", path: "/d", value: 4 },
    ]);
  });

  it("computeInverse is symmetric with computeForward", () => {
    const before = { name: "alpha", tags: ["a"] };
    const after = { name: "beta", tags: ["a", "b"] };
    const inverse = computeInverse(before, after);
    expect(applyPatch(after, inverse)).toEqual(before);
  });

  it("applyPatch returns a new object — does not mutate", () => {
    const doc = { a: 1 };
    const patch = [{ op: "replace" as const, path: "/a", value: 2 }];
    const out = applyPatch(doc, patch);
    expect(out).toEqual({ a: 2 });
    expect(doc).toEqual({ a: 1 });
  });

  it("roundtrip: apply(forward) then apply(inverse) restores the original", () => {
    const before = { rows: [{ id: 1, qty: 10 }, { id: 2, qty: 20 }] };
    const after = { rows: [{ id: 1, qty: 15 }, { id: 2, qty: 20 }, { id: 3, qty: 5 }] };
    const forward = computeForward(before, after);
    const inverse = computeInverse(before, after);
    expect(applyPatch(before, forward)).toEqual(after);
    expect(applyPatch(after, inverse)).toEqual(before);
  });

  it("handles create-shaped events (add at root)", () => {
    const before = {};
    const after = { id: "x", name: "new" };
    const forward = computeForward(before, after);
    expect(applyPatch(before, forward)).toEqual(after);
  });

  it("handles delete-shaped events (remove at path)", () => {
    const before = { kept: 1, removed: 2 };
    const after = { kept: 1 };
    const forward = computeForward(before, after);
    expect(applyPatch(before, forward)).toEqual(after);
  });
});
