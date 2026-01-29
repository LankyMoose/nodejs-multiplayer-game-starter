import { task, pipeline } from "builderman";
import { pnpm } from "@builderman/resolvers-pnpm";

const args = process.argv.slice(2);

const buildCommand = {
  run: "pnpm build",
  cache: {
    inputs: ["src", pnpm.package()],
    outputs: ["dist"],
  },
};

const shared = task({
  name: "shared",
  cwd: "apps/shared",
  commands: {
    build: buildCommand,
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
    build: buildCommand,
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
    dev: "pnpm dev",
    build: {
      run: "pnpm build",
      cache: {
        inputs: [".", pnpm.package()],
        outputs: ["dist"],
      },
    },
    preview: "pnpm preview",
  },
  dependencies: [shared, server],
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
