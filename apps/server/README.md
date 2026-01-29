# Server

Fastify + Drizzle (SQLite) + Better Auth + WebSockets.

## Setup

1. **Install deps** (from repo root):

   ```bash
   pnpm install
   ```

2. **Env**: Copy `.env.example` to `.env` and set:

   - `BETTER_AUTH_SECRET` — 32+ character secret (e.g. `openssl rand -base64 32`)
   - `BETTER_AUTH_URL` — base URL of this server (e.g. `http://localhost:4000`)
   - Optionally `DATABASE_PATH` (default `./data/sqlite.db`). Create a `data` folder in `apps/server` or use an absolute path.

3. **DB**: From `apps/server`:

   ```bash
   pnpm db:generate   # generate migration from schema
   pnpm db:migrate    # apply migration (creates DB if needed)
   ```

4. **Run**:
   ```bash
   pnpm dev   # from repo root, or pnpm dev from apps/server
   ```

- **Auth**: `POST/GET /api/auth/*` — Better Auth (email/password enabled).
- **WebSocket**: `GET /ws` — echo server; extend in `src/index.ts`.

To regenerate Better Auth schema (e.g. after adding plugins): `pnpm auth:generate`, then `pnpm db:generate` and `pnpm db:migrate`.
