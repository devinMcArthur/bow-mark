import { defineConfig, devices } from "@playwright/experimental-ct-react17";

export default defineConfig({
  testDir: "./tests/component",
  snapshotDir: "./tests/component/__snapshots__",
  timeout: 10_000,
  use: {
    ctPort: 3100,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
