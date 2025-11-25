import Database from "better-sqlite3";
import { config } from "../config.js";
import { SCHEMA } from "./schema.js";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Initialize schema
  db.exec(SCHEMA);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// For testing: create a fresh in-memory database
export function createTestDatabase(): Database.Database {
  const testDb = new Database(":memory:");
  testDb.pragma("foreign_keys = ON");
  testDb.exec(SCHEMA);
  return testDb;
}
