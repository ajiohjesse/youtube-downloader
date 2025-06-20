import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { Database } from "bun:sqlite";

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL environment variable is not set");
}

const sqlite = new Database(dbUrl);

export const db = drizzle({
  client: sqlite,
  schema,
  casing: "snake_case",
  logger: process.env.NODE_ENV !== "production",
});

export type DB = typeof db;
