import { UserRoles } from "@typescript/user";
import {
  runWithContext,
  getRequestContext,
  requireTenderContext,
} from "../../mcp/context";

describe("mcp/context", () => {
  it("round-trips userId/role/tenderId via runWithContext + getRequestContext", async () => {
    await runWithContext(
      { userId: "u1", role: UserRoles.ProjectManager, tenderId: "t1" },
      async () => {
        const ctx = getRequestContext();
        expect(ctx.userId).toBe("u1");
        expect(ctx.role).toBe(UserRoles.ProjectManager);
        expect(ctx.tenderId).toBe("t1");
      },
    );
  });

  it("getRequestContext throws when called outside runWithContext", () => {
    expect(() => getRequestContext()).toThrow(
      /No request context/,
    );
  });

  it("requireTenderContext throws when tenderId missing", async () => {
    await runWithContext(
      { userId: "u1", role: UserRoles.User },
      async () => {
        expect(() => requireTenderContext()).toThrow(
          /This tool requires X-Tender-Id/,
        );
      },
    );
  });

  it("isolates concurrent contexts", async () => {
    const tasks = [1, 2, 3].map((i) =>
      runWithContext(
        { userId: `u${i}`, role: UserRoles.ProjectManager, tenderId: `t${i}` },
        async () => {
          await new Promise((r) => setTimeout(r, 5 * (4 - i)));
          return getRequestContext().tenderId;
        },
      ),
    );
    const results = await Promise.all(tasks);
    expect(results).toEqual(["t1", "t2", "t3"]);
  });
});
