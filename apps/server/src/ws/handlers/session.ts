import type { ServerHandlers, WebSocketContract } from "shared";
import type { WsContext } from "../context.js";

export function createSessionHandlers(ctx: WsContext) {
  const { userId, lobbies, games } = ctx;
  return {
    "session:state": () => {
      const userLobby = [...lobbies.values()].find((l) =>
        l.players.some((p) => p.id === userId),
      );
      const userGame = [...games.values()].find((g) =>
        g.playerOrder.includes(userId),
      );
      return {
        lobby: userLobby ?? null,
        game: userGame ?? null,
      };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
