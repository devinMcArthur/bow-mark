import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The MCP SDK is ESM-only and incompatible with the CommonJS test
      // environment. Redirect to the existing mock used in jest.config.js.
      "@modelcontextprotocol/sdk/client/index.js": path.resolve(
        __dirname,
        "src/__mocks__/mcpSdk.ts"
      ),
      "@modelcontextprotocol/sdk/client/streamableHttp.js": path.resolve(
        __dirname,
        "src/__mocks__/mcpSdk.ts"
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Match the existing jest.config.js timeout of 60s
    testTimeout: 60000,
    globalSetup: [path.resolve(__dirname, "src/testing/vitestGlobalSetup.ts")],
    // singleFork: all test files share one worker process, so db/index.ts is
    // loaded exactly once with the env vars set by globalSetup. Required for
    // the Kysely pool singleton to point at the Testcontainer.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
