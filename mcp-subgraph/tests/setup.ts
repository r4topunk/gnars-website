import { beforeAll, afterAll } from "vitest";

// Global test setup
beforeAll(() => {
  // Set test environment
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
  });
});

afterAll(() => {
  // Cleanup
});
