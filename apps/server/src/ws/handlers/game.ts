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
      if (finished) {
        broadcastToUsers(game.playerOrder, "game:ended", game);
        for (const pid of game.playerOrder) {
          void ctx.emitFriendStatusToFriends(pid);
        }
      }
      return { success: true };
    },
    "game:leave": ({ gameId }) => {
      const game = games.get(gameId);
      if (!game) return { success: false };
      const idx = game.playerOrder.indexOf(userId);
      if (idx === -1) return { success: false };

      game.playerOrder = game.playerOrder.filter((id) => id !== userId);
      if (game.playerOrder.length === 0) {
        games.delete(gameId);
        void ctx.emitFriendStatusToFriends(userId);
        return { success: true };
      }
      if (idx < game.currentTurnIndex) {
        game.currentTurnIndex = Math.max(
          0,
          game.currentTurnIndex - 1,
        );
      }
      if (game.currentTurnIndex >= game.playerOrder.length) {
        game.currentTurnIndex = 0;
      }
      broadcastToUsers(game.playerOrder, "game:updated", { ...game });
      void ctx.emitFriendStatusToFriends(userId);
      return { success: true };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
