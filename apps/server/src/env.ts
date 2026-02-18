import path from "node:path";
import fs from "node:fs";

let envRaw: Record<string, string | undefined> = {};
const args = process.argv.slice(2);
const envArgFilePath = args
  .find((arg) => arg.startsWith("--env-file="))
  ?.split("=")[1];

if (envArgFilePath) {
  console.log("Reading .env from filesystem...");
  const envPath = path.join(process.cwd(), envArgFilePath);
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env file");
  }

  const contents = fs.readFileSync(envPath, "utf-8");
  const lines = contents.split("\n");
  for (const line of lines) {
    const [key, value] = line.split("=");
    if (!value || !key || key.startsWith("#")) continue;
    envRaw[key as keyof typeof envRaw] = value;
  }
}

export const env = {
  ...process.env,
  HOST: envRaw.HOST!,
  PORT: envRaw.PORT!,
  DATABASE_URL: envRaw.DATABASE_URL!,
  SERVER_URL: envRaw.SERVER_URL!,
  AUTH_SECRET: envRaw.AUTH_SECRET!,
  CLIENT_ORIGIN: envRaw.CLIENT_ORIGIN!,
  IS_PRODUCTION: process.env.NODE_ENV === "production",
};

let missingKeys: string[] = [];
for (const key in env) {
  if (env[key as keyof typeof env] === undefined) {
    missingKeys.push(key);
  }
}

if (missingKeys.length > 0) {
  throw new Error(`Missing env vars: ${missingKeys.join(", ")}`);
}
console.log("Env ok");
