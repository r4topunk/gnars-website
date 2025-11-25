import { beforeAll, afterAll } from "vitest";

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.DATABASE_PATH = ":memory:";
});

afterAll(() => {
  // Cleanup
});
