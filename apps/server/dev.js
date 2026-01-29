import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_SRC = path.join(__dirname, "src");
const SHARED_SRC = path.join(__dirname, "..", "shared", "src");

let serverProcess = null;
let restartTimeout = null;
const RESTART_DEBOUNCE_MS = 300;

function startServer() {
  serverProcess = spawn("pnpm", ["exec", "tsx", "src/index.ts"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  serverProcess.on("exit", (code, signal) => {
    serverProcess = null;
    if (signal !== "SIGTERM" && signal !== "SIGKILL" && code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });
}

function restartServer() {
  if (restartTimeout) clearTimeout(restartTimeout);
  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      serverProcess = null;
    }
    console.log("\nRestarting server...");
    startServer();
  }, RESTART_DEBOUNCE_MS);
}

function watch(dir, label) {
  if (!fs.existsSync(dir)) {
    console.warn(`Watch path missing: ${dir}`);
    return;
  }
  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (filename && !filename.includes("node_modules")) {
      console.log(`[${label}] ${filename} changed`);
      restartServer();
    }
  });
}

console.log("Starting server (watching server/src and shared/src)...");
startServer();
watch(SERVER_SRC, "server");
watch(SHARED_SRC, "shared");
