import { task, pipeline } from "builderman";

const args = process.argv.slice(2);

const shared = task({
  name: "shared",
  cwd: "apps/shared",
  commands: {
    build: "pnpm build",
    dev: {
      run: "pnpm dev",
      readyWhen: (output) => output.includes("Watching for file changes."),
    },
  },
  dependencies: [],
});

const server = task({
  name: "server",
  cwd: "apps/server",
  commands: {
    build: "pnpm build",
    dev: {
      run: "pnpm dev",
      readyWhen: (output) => output.includes("Server is running on"),
    },
  },
  dependencies: [shared],
});

const client = task({
  name: "client",
  cwd: "apps/client",
  commands: {
    dev: "pnpm dev",
    build: "pnpm build",
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
