import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql/node";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH ?? "./data/sqlite.db";
const dir = path.dirname(dbPath);
if (dir !== "." && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const url = dbPath.startsWith("file:")
  ? dbPath
  : `file:${path.resolve(process.cwd(), dbPath)}`;
const client = createClient({ url });
export const db = drizzle(client, { schema });
