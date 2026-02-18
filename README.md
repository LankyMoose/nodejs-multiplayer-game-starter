# Node.js Multiplayer Game Starter

A pnpm monorepo for a multiplayer game: shared types and WebSocket contract, Fastify server with auth and DB, and a Kiru/Vite client.

## Workspace

| Package    | Path          | Description                                                    |
| ---------- | ------------- | -------------------------------------------------------------- |
| **shared** | `apps/shared` | Shared types, game logic, WS contract, validation              |
| **server** | `apps/server` | Fastify API, Better Auth, Drizzle (SQLite), WebSocket handlers |
| **client** | `apps/client` | Kiru + Vite frontend (lobby, game, auth)                       |

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/) (v10+; or use corepack: `corepack enable pnpm`)

## Quick start

1. **Install dependencies** (from repo root):

   ```bash
   pnpm install
   ```

2. **Server setup** (env + DB):
   - In `apps/server`: copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.
   - From `apps/server`: run `pnpm db:generate` and `pnpm db:migrate`.

3. **Client env** (optional):
   - In `apps/client`: copy `.env.example` to `.env` if you need to change API host/port (defaults: `localhost:6969`).

4. **Run everything** (from repo root):

   ```bash
   pnpm dev
   ```

   This uses [builderman](https://builderman-ck6.pages.dev/) to run `shared` (watch), `server`, and `client` in order. The client is typically at `http://localhost:5173` and the API/WebSocket at `http://localhost:6969`.

## Scripts (root)

| Script         | Description                                           |
| -------------- | ----------------------------------------------------- |
| `pnpm dev`     | Run shared (watch), server, and client in dev mode    |
| `pnpm build`   | Build shared, server, and client                      |
| `pnpm start`   | Runs the server and statically serves the client      |
| `pnpm preview` | Same as above, but uses the server's local .env file. |

### Port forwarding

To enable port forwarding from your host machine:

- start the tunnel service to your server (e.g. ngrok)
- update the server .env file with the url
- pass the url to the 'build' command: `pnpm build --host https://my-tunnel.ngrok.io`
- run the server in preview mode: `pnpm preview`

## Scripts per package

- **shared**: `pnpm build`, `pnpm dev` (watch)
- **server**: `pnpm dev`, `pnpm build`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`, `pnpm auth:generate`
- **client**: `pnpm dev`, `pnpm build`, `pnpm preview`

See each package’s README for setup and usage:

- [apps/shared](./apps/shared/README.md)
- [apps/server](./apps/server/README.md)
- [apps/client](./apps/client/README.md)
