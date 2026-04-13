import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  forceExit: true,
  moduleDirectories: ["node_modules", "../../node_modules"],
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^@trustchain/sdk$": "<rootDir>/../../node_modules/@trustchain/sdk/dist/index.js",
  },
};

export default config;
