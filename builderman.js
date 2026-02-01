import { task, pipeline } from "builderman";
import { pnpm } from "@builderman/resolvers-pnpm";

const args = process.argv.slice(2);

const shared = task({
  name: "shared",
  cwd: "apps/shared",
  commands: {
    build: {
      run: "pnpm build",
      cache: {
        inputs: ["src", pnpm.package()],
        outputs: ["dist"],
      },
    },
    dev: {
      run: "pnpm dev",
      readyWhen: (output) => output.includes("Watching for file changes."),
    },
  },
});

const server = task({
  name: "server",
  cwd: "apps/server",
  commands: {
    build: {
      run: "pnpm build",
      cache: {
        inputs: [
          "src",
          "drizzle.config.ts",
          pnpm.package(),
          shared.artifact("build"),
        ],
        outputs: ["dist"],
      },
    },
    dev: {
      run: "pnpm dev",
      readyWhen: (output) => output.includes("Server listening on"),
    },
  },
  dependencies: [shared],
});

const client = task({
  name: "client",
  cwd: "apps/client",
  commands: {
    build: {
      run: "pnpm build",
      cache: {
        inputs: [
          "public",
          "src",
          "index.html",
          "postcss.config.js",
          "vite.config.ts",
          pnpm.package(),
          shared.artifact("build"),
        ],
        outputs: ["dist"],
      },
    },
    dev: {
      run: "pnpm dev",
      dependencies: [server],
    },
    preview: {
      run: "pnpm preview",
      dependencies: [server],
    },
  },
});

const result = await pipeline([client, server, shared]).run({
  command: args[0],
  onTaskBegin: (taskName) => {
    console.log(`[${taskName}] Starting...`);
  },
  onTaskReady: (taskName) => {
    console.log(`[${taskName}] Ready`);
  },
  onTaskComplete: (taskName) => {
    console.log(`[${taskName}] Finished`);
  },
});

console.log("result", result);
