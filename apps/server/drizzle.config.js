import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (url.startsWith("file:")) {
  const folder = path.dirname(url).replace("file:", "");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
