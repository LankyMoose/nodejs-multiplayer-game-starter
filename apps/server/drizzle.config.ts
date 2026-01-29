import path from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DATABASE_PATH ?? "./data/sqlite.db";
const url = dbPath.startsWith("file:")
  ? dbPath
  : `file:${path.resolve(process.cwd(), dbPath)}`;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
