/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { compilerOptions } = require("./tsconfig.json");
const { pathsToModuleNameMapper } = require("ts-jest");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
  testTimeout: 60000,
  globalSetup: "<rootDir>/testing/globalSetup.ts",
  rootDir: "src",
  testRunner: "jasmine2",
};
