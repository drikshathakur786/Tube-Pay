import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: [
    "services/**/*.ts",
    "controller/**/*.ts",
    "middleware/**/*.ts",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
};

export default config;
