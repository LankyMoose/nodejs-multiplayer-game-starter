# Shared

Shared code used by both **client** and **server**: types, constants, validation, game domain (lobby, player, instance), and the WebSocket contract (client/server routers, transport, wire format).

## Contents

- **Types** — `src/types.ts`
- **Constants** — `src/constants.ts`
- **Validation** — `src/validation.ts`
- **Game** — `src/game/` — lobby, player, instance types and logic
- **WebSocket** — `src/ws/` — contract, client router, server router, transport

The server and client both depend on this package so that messages, game state, and validation stay in sync.

## Setup

1. **Install deps** from repo root:

   ```bash
   pnpm install
   ```

2. **Build** (required before running server or client from their packages, or use root `pnpm dev` which builds shared in watch mode):

   ```bash
   pnpm build   # from apps/shared
   ```

## Scripts

| Script     | Description                    |
| ---------- | ------------------------------ |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm dev`   | Watch and recompile on change |

## Usage

In **server** and **client**, import from the workspace package:

```ts
import {
  type Player,
  type LobbyState,
  createServerRouter,  // or createClientRouter on client
  type WebSocketContract,
  // ...
} from "shared";
```

Do not add runtime dependencies that are only needed in one environment (e.g. Node-only or browser-only). Keep this package isomorphic where possible.
