import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not set");
}

console.info({ dbUrl });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  casing: "snake_case",
});
