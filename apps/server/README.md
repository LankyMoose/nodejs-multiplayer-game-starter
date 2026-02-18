# Server

Backend for the multiplayer game: Fastify + Drizzle (SQLite) + Better Auth + WebSockets. Depends on the **shared** package for types and the WebSocket contract.

## Stack

- [Fastify](https://fastify.io/) — HTTP server
- [Drizzle ORM](https://orm.drizzle.team/) — SQLite
- [Better Auth](https://better-auth.com/) — email/password auth
- [@fastify/websocket](https://github.com/fastify/fastify-websocket) — WebSocket
- **shared** (workspace) — types, game types, WS contract

## Setup

1. **Install deps** (from repo root):

   ```bash
   pnpm install
   ```

2. **Env**: In `apps/server`, copy `.env.example` to `.env` and set:

   | Variable        | Description                                               |
   | --------------- | --------------------------------------------------------- |
   | `PORT`          | HTTP/WS port (default: `6969`)                            |
   | `HOST`          | Bind address (default: `0.0.0.0`)                         |
   | `CLIENT_ORIGIN` | CORS origin for the client (e.g. `http://localhost:5173`) |
   | `DATABASE_PATH` | SQLite path (default: `./data/sqlite.db`)                 |
   | `AUTH_SECRET`   | 32+ character secret (e.g. `openssl rand -base64 32`)     |
   | `SERVER_URL`    | Base URL of this server (e.g. `http://localhost:6969`)    |

   Create a `data/` directory in `apps/server` or use an absolute path for `DATABASE_PATH`.

3. **DB**: From `apps/server`:

   ```bash
   pnpm db:generate   # generate migration from schema
   pnpm db:migrate    # apply migration (creates DB if needed)
   ```

4. **Run**:

   ```bash
   pnpm dev   # from apps/server, or use root: pnpm dev
   ```

## Endpoints

- **Auth**: `GET/POST /api/auth/*` — Better Auth (email/password).
- **WebSocket**: `GET /ws` — game/lobby protocol; handlers in `src/ws/handlers/`.

## Scripts

| Script               | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `pnpm dev`           | Run server with tsx watch                                 |
| `pnpm build`         | Compile TypeScript to `dist/`                             |
| `pnpm db:generate`   | Generate Drizzle migration from schema                    |
| `pnpm db:migrate`    | Apply migrations                                          |
| `pnpm db:studio`     | Open Drizzle Studio                                       |
| `pnpm auth:generate` | Regenerate Better Auth schema (e.g. after adding plugins) |

After `auth:generate`, run `pnpm db:generate` and `pnpm db:migrate` to update the DB.
