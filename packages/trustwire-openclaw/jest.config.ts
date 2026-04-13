import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  forceExit: true,
  moduleDirectories: ["node_modules", "../../node_modules"],
  moduleNameMapper: {
    "^@trustchain/sdk$": "<rootDir>/../../node_modules/@trustchain/sdk/dist/index.js",
    "^trustwire-core$": "<rootDir>/../trustwire-core/src/gate.ts",
  },
};

export default config;
