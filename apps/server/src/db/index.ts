import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql/node";
import { env } from "../env.js";
import * as schema from "./schema.js";

const url = env.DATABASE_URL;
if (url.startsWith("file:")) {
  const folder = path.dirname(url).replace("file:", "");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

const client = createClient({ url });
export const db = drizzle(client, { schema });
