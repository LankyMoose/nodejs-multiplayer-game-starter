import type { ServerHandlers, WebSocketContract } from "shared";
import type { WsContext } from "../context.js";

export function createGameHandlers(ctx: WsContext) {
  const { userId, session, games, broadcastToUsers } = ctx;

  return {
    "game:turn": ({ gameId }) => {
      const game = games.get(gameId);
      if (!game || game.status !== "playing") return { success: false };
      const currentPlayerId = game.playerOrder[game.currentTurnIndex];
      if (currentPlayerId !== session.user.id) return { success: false };
      const previousPlayerId = currentPlayerId;
      game.currentTurnIndex =
        (game.currentTurnIndex + 1) % game.playerOrder.length;
      const finished =
        game.currentTurnIndex === 0 && game.playerOrder.length > 0;
      if (finished) game.status = "finished";
      broadcastToUsers(game.playerOrder, "game:turn", {
        game: { ...game },
        previousPlayerId,
      });
      if (finished) broadcastToUsers(game.playerOrder, "game:ended", game);
      return { success: true };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
