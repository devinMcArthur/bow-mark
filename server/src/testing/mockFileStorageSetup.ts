/**
 * Pre-populates require.cache with a no-op fileStorage mock.
 *
 * This file is loaded via execArgv --require (after ts-node/register), which runs
 * before ANY test module or Vitest runner code executes. By the time seedDatabase
 * calls File.createDocument() → uploadFile(), require.cache already has the mock
 * entry and Node.js returns it without hitting the real S3 client.
 *
 * Why require.cache injection instead of tsconfig-paths override: tsconfig-paths
 * reads paths at registration time; we cannot change which tsconfig it uses per
 * test run without TS_NODE_PROJECT being set before ts-node starts (which has
 * proven unreliable across different Vitest fork setups).
 *
 * The key must match what tsconfig-paths + ts-node resolve "@utils/fileStorage" to:
 *   baseUrl (server/src) + paths "@utils/*" → "utils/*" → utils/fileStorage/index.ts
 */
import path from "path";

const realPath = path.resolve(__dirname, "../utils/fileStorage/index.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(require.cache as Record<string, any>)[realPath] = {
  id: realPath,
  filename: realPath,
  loaded: true,
  exports: {
    uploadFile: (_name: string, _buffer: Buffer, _mimetype: string) =>
      Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFile: (_name: string): Promise<any> => Promise.resolve(null),
    removeFile: (_name: string) => Promise.resolve(),
    getFileSignedUrl: (name: string) =>
      Promise.resolve(`https://test.example.com/${name}`),
  },
  children: [],
  parent: null,
};
