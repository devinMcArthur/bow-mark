import { defineConfig, Plugin } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import ts from "typescript";
import path from "path";


/**
 * Custom Vite plugin that uses the full TypeScript compiler (ts.createProgram)
 * to transform .ts files. This is the only approach that correctly emits
 * decorator metadata (emitDecoratorMetadata: true) for ALL cases, including
 * enum-typed fields that require cross-file type resolution.
 *
 * Why not esbuild: ignores emitDecoratorMetadata entirely.
 * Why not SWC: emits enum object references instead of primitive types,
 *   breaking Typegoose for enum-typed properties (Typegoose error E012).
 * Why not ts.transpileModule: single-file only, same enum type problem as SWC.
 *   The Typegoose docs explicitly warn: "Is the code transpiled with
 *   tsc --transpile-only?" — transpile-only mode cannot infer enum types.
 * Why not rollup-plugin-typescript2: requires module: "ES2020" (Rollup needs
 *   ESM input), which changes circular-dep semantics and causes Typegoose to
 *   receive undefined for ref thunks.
 *
 * ts.createProgram: full TypeScript compilation with cross-file type
 * resolution. Emits CommonJS (preserving module object references so
 * circular deps work correctly). No Rollup involved, no compatibility check.
 */
function typescriptFullCompilerPlugin(): Plugin {
  const cwd = process.cwd();
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("tsconfig.json not found");

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));

  const { options: baseOptions, fileNames } = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath)
  );

  // CommonJS output is required for correct circular dep resolution.
  // The model files have a real circular dep: models/index.ts → Crew/class →
  // Crew/schema → imports VehicleClass from @models (back to models/index.ts).
  // With CommonJS, require() returns module object references so the ref thunk
  // `() => VehicleClass` accesses the live property at call time (correct).
  // With ESM + Vite SSR, the live binding is captured eagerly during circular
  // initialization and remains undefined (Vite SSR does not implement ESM live
  // bindings for circular deps correctly).
  //
  // Path alias resolution for CJS require() calls is handled separately by
  // adding "tsconfig-paths/register" to setupFiles, which patches Node.js's
  // require() resolver with the tsconfig paths before any test module loads.
  const compilerOptions: ts.CompilerOptions = {
    ...baseOptions,
    module: ts.ModuleKind.CommonJS,
    declaration: false,
    declarationMap: false,
    sourceMap: true,
    inlineSources: true,
  };

  let program: ts.Program | undefined;

  function getProgram(extraFiles?: string[]): ts.Program {
    if (!program) {
      const files = extraFiles ? [...new Set([...fileNames, ...extraFiles])] : fileNames;
      program = ts.createProgram(files, compilerOptions);
    }
    return program;
  }

  // The globalSetup file is loaded in the main process via Vite's SSR module
  // loader. CommonJS output (with __esModule: true) causes the module to be
  // wrapped as { default: module.exports } — which is an object, not a
  // function — triggering Vitest's "default must be a function" error.
  // The globalSetup file has no decorators, so ts.transpileModule with ESNext
  // (ESM output) is safe and produces correct named exports (setup, teardown).
  const globalSetupId = path.resolve(cwd, "src/testing/vitestGlobalSetup.ts");

  return {
    name: "typescript-full-compiler",
    buildStart() {
      // Reset program at the start of each build/test run
      program = undefined;
    },
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!id.endsWith(".ts") || id.endsWith(".d.ts")) return null;

      // ESM output for globalSetup: its named exports must survive Vite's
      // SSR module interop as named exports (not wrapped in a default object).
      if (id === globalSetupId) {
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2017,
            module: ts.ModuleKind.ESNext,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            sourceMap: true,
          },
          fileName: id,
        });
        return { code: result.outputText, map: result.sourceMapText ?? null };
      }

      let prog = getProgram();
      let sf = prog.getSourceFile(id);

      if (!sf) {
        // File not in initial program (rare: new file not matching tsconfig
        // include globs). Recreate program with it included.
        program = ts.createProgram([...fileNames, id], compilerOptions, undefined, prog);
        prog = program;
        sf = prog.getSourceFile(id);
      }
      if (!sf) return null;

      let outputCode = "";
      let outputMap = "";
      prog.emit(sf, (fileName, data) => {
        if (fileName.endsWith(".js")) outputCode = data;
        if (fileName.endsWith(".js.map")) outputMap = data;
      });

      if (!outputCode) return null;
      return { code: outputCode, map: outputMap || null };
    },
  };
}

export default defineConfig({
  // Disable esbuild's TypeScript transformation so our custom plugin
  // (which uses the full tsc with emitDecoratorMetadata) handles all .ts files.
  esbuild: false,
  plugins: [
    tsconfigPaths(),
    typescriptFullCompilerPlugin(),
  ],
  resolve: {
    alias: [
      // MCP SDK: ESM-only, redirect to the existing mock.
      {
        find: "@modelcontextprotocol/sdk/client/index.js",
        replacement: path.resolve(__dirname, "src/__mocks__/mcpSdk.ts"),
      },
      {
        find: "@modelcontextprotocol/sdk/client/streamableHttp.js",
        replacement: path.resolve(__dirname, "src/__mocks__/mcpSdk.ts"),
      },
      // File storage: requires DigitalOcean Spaces credentials not available in tests.
      // Redirect to a no-op mock so seed data creates MongoDB File documents without
      // attempting real S3 uploads.
      {
        find: /^@utils\/fileStorage$/,
        replacement: path.resolve(__dirname, "src/__mocks__/fileStorage.ts"),
      },
      // TypeScript path aliases from tsconfig.json — replicated here so that
      // the vmForks module runner resolves them for CJS require() calls.
      // vite-tsconfig-paths handles ESM imports but not CJS require() in the
      // VM context; explicit resolve.alias entries work for both.
      { find: "@models", replacement: path.resolve(__dirname, "src/models") },
      { find: "@workers", replacement: path.resolve(__dirname, "src/workers") },
      { find: "@pubsub", replacement: path.resolve(__dirname, "src/pubsub") },
      { find: "@events", replacement: path.resolve(__dirname, "src/events") },
      { find: "@logger", replacement: path.resolve(__dirname, "src/logger") },
      { find: "@search", replacement: path.resolve(__dirname, "src/search") },
      {
        find: /^@testing\/(.*)/,
        replacement: path.resolve(__dirname, "src/testing/$1"),
      },
      {
        find: /^@constants\/(.*)/,
        replacement: path.resolve(__dirname, "src/constants/$1"),
      },
      {
        find: /^@config\/(.*)/,
        replacement: path.resolve(__dirname, "src/config/$1"),
      },
      {
        find: /^@actors\/(.*)/,
        replacement: path.resolve(__dirname, "src/actors/$1"),
      },
      {
        find: /^@typescript\/(.*)/,
        replacement: path.resolve(__dirname, "src/typescript/$1"),
      },
      {
        find: /^@utils\/(.*)/,
        replacement: path.resolve(__dirname, "src/utils/$1"),
      },
      {
        find: /^@validation\/(.*)/,
        replacement: path.resolve(__dirname, "src/validation/$1"),
      },
      {
        find: /^@graphql\/(.*)/,
        replacement: path.resolve(__dirname, "src/graphql/$1"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      // reflect-metadata must be imported before any decorator-using module.
      "reflect-metadata",
    ],
    testTimeout: 60000,
    globalSetup: [path.resolve(__dirname, "src/testing/vitestGlobalSetup.ts")],
    // pool: "forks" — CJS require() in test code goes through Node.js's native
    // Module._resolveFilename (confirmed from error stack traces). Two hooks
    // registered via execArgv --require fix this:
    //
    //   ts-node/register: patches require.extensions['.ts'] so Node.js can
    //     load .ts files. ts-node uses the FULL TypeScript compiler (not
    //     transpile-only), giving correct cross-file type resolution and
    //     emitDecoratorMetadata for enum types. Circular deps work via
    //     CommonJS module object reference semantics.
    //
    //   tsconfig-paths is auto-required by ts-node (tsconfig.json's
    //     ts-node.require field lists it). It patches Module._resolveFilename
    //     to resolve @models, @testing/*, etc. from tsconfig paths.
    //
    // Why execArgv and not setupFiles: execArgv --require runs BEFORE Vitest's
    // own fork runner code executes, so ts-node is active for everything in
    // the fork. setupFiles run after Vitest's module runner has already
    // started.
    //
    // Why keep our Vite plugin: Vite/ViteNode transforms the top-level test
    // file via its plugin pipeline (not require()). Our plugin emits CJS so
    // the test file's imports become require() calls, which then go to
    // Node.js's native require (patched by ts-node + tsconfig-paths).
    // Without CJS output, imports would be ESM — handled by Vite's SSR which
    // breaks circular deps.
    //
    // singleFork: all test files share one worker process, so db/index.ts is
    // loaded exactly once with the env vars set by globalSetup. Required for
    // the Kysely pool singleton to point at the Testcontainer.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: [
          "--require",
          "ts-node/register",
          // After ts-node is registered (so .ts files load), pre-populate
          // require.cache with no-op file storage. This intercepts
          // require("@utils/fileStorage") before any test module loads it,
          // so seed data's File.createDocument() skips real S3 uploads in tests.
          "--require",
          path.resolve(__dirname, "src/testing/mockFileStorageSetup.ts"),
        ],
      },
    },
  },
});
