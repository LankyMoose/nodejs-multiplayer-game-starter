import type { ServerHandlers } from "shared";
import type { WebSocketContract } from "shared";
import type { WsContext } from "../context.js";
import { createSessionHandlers } from "./session.js";
import { createLobbyHandlers } from "./lobby.js";
import { createGameHandlers } from "./game.js";
import { createFriendsHandlers } from "./friends.js";
import { createSpaceGameHandlers } from "./space-game.js";

export function createWsHandlers(
  ctx: WsContext
): ServerHandlers<WebSocketContract> {
  return Object.assign(
    {},
    createSessionHandlers(ctx),
    createLobbyHandlers(ctx),
    createGameHandlers(ctx),
    createFriendsHandlers(ctx),
    createSpaceGameHandlers(ctx)
  );
}
