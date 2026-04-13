import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // The generated GraphQL file (graphql.tsx) imports Apollo Client and
      // React. Pure evaluator tests don't need any of that — redirect to a
      // minimal stub that exports only the enums.
      {
        find: /generated\/graphql$/,
        replacement: path.resolve(__dirname, "src/testing/generatedGraphqlStub.ts"),
      },
    ],
  },
});
