# Client

Frontend for the multiplayer game: Kiru (client-side routing) + Vite, with auth, lobby, and game screens. Depends on the **server** and **shared** packages.

## Stack

- [Vite](https://vitejs.dev/) — dev server and build
- [Kiru](https://kirujs.dev/) — CSR routing and data
- [Tailwind CSS](https://tailwindcss.com/) — styling
- **shared** (workspace) — types, game state, WebSocket contract

## Setup

1. **Install deps** from repo root:

   ```bash
   pnpm install
   ```

2. **Env** (optional): Copy `.env.example` to `.env` in `apps/client` if you need to point at a different API:

   - `VITE_API_HOST` — API host (default: `localhost`)
   - `VITE_API_PORT` — API port (default: `6969`)

3. **Run server** first (from root: `pnpm dev`, or from `apps/server`: `pnpm dev`).

## Scripts

| Script        | Description              |
| ------------- | ------------------------ |
| `pnpm dev`    | Start Vite dev server    |
| `pnpm build`  | Production build         |
| `pnpm preview`| Preview production build |

Dev server is usually at `http://localhost:5173`. It expects the API and WebSocket at the host/port from env (default `http://localhost:6969`).

## Project layout

- `src/app.tsx` — root app and routes
- `src/screens/` — **disconnected**: shown when the WebSocket cannot connect; **connected**: layout plus lobby setup, lobby view, and game screen (switched by state)
- `src/features/` — auth modal, friends, lobby players, toasts
- `src/state/` — auth, game, WebSocket state
- `public/` — favicon, fonts, sounds, spritesheets
