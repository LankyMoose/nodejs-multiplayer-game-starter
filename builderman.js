import { task, pipeline, createInputResolver } from "builderman";
import { pnpm } from "@builderman/resolvers-pnpm";

const args = process.argv.slice(2);

const vars = {};
for (const arg of args) {
  const [key, value] = arg.split("=");
  if (!value) continue;
  vars[key] = value;
}
console.log(`running "${args[0]}" with args:`, vars);

const buildArgsResolver = createInputResolver({
  name: "build-args",
  resolve: () => {
    return Object.entries(vars).map(([key, value]) => ({
      type: "virtual",
      kind: "build-arg",
      description: key,
      hash: value,
    }));
  },
});

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
    preview: {
      run: "pnpm start --env-file=.env",
      env: {
        NODE_ENV: "production",
      },
    },
    start: "pnpm start",
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
          buildArgsResolver,
        ],
        outputs: ["dist"],
      },
      env: {
        VITE_API_HOST: vars["--host"],
      },
    },
    dev: "pnpm dev",
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
