module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  setupFiles: ["<rootDir>/src/test/setupEnv.ts"],
  clearMocks: true,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  }
};
