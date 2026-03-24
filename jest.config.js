module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 30000,
  collectCoverageFrom: [
    "services/**/*.js",
    "controllers/**/*.js",
    "utils/**/*.js",
    "middleware/**/*.js",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  verbose: true
};
