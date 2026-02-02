import type { GameInstance, ServerHandlers, WebSocketContract } from "shared";
import type { WsContext } from "../context.js";
import { GAME_LOBBY_LIMITS } from "../../game/config.js";

export function createGameHandlers(ctx: WsContext) {
  const { userId, session, games, lobbies, broadcastToUsers } = ctx;

  function returnLobbyFromGame(game: GameInstance): void {
    const lobby = lobbies.get(game.lobbyId);
    if (!lobby) return;
    delete lobby.inGameId;
    lobby.readyPlayers = [];
    broadcastToUsers(game.playerOrder, "lobby:updated", lobby);
    for (const pid of game.playerOrder) {
      void ctx.emitFriendStatusToFriends(pid);
    }
  }

  function removePlayerFromGame(
    game: GameInstance,
    targetPlayerIdx: number,
    targetPlayerId: string,
  ): void {
    game.playerOrder = game.playerOrder.filter((id) => id !== targetPlayerId);
    if (game.playerOrder.length === 0) {
      games.delete(game.id);
      void ctx.emitFriendStatusToFriends(targetPlayerId);
      return;
    }
    if (targetPlayerIdx < game.currentTurnIndex) {
      game.currentTurnIndex = Math.max(0, game.currentTurnIndex - 1);
    }
    if (game.currentTurnIndex >= game.playerOrder.length) {
      game.currentTurnIndex = 0;
    }
    const remainingCount = game.playerOrder.length;
    const requiredPlayers = GAME_LOBBY_LIMITS.requiredPlayers;
    if (remainingCount < requiredPlayers) {
      const order = game.playerOrder;
      games.delete(game.id);
      broadcastToUsers(order, "game:ended", { ...game, status: "finished" });
      if (game.status === "playing") {
        returnLobbyFromGame({ ...game, playerOrder: order });
      }
      void ctx.emitFriendStatusToFriends(targetPlayerId);
      return;
    }
    broadcastToUsers(game.playerOrder, "game:updated", { ...game });
    void ctx.emitFriendStatusToFriends(targetPlayerId);
  }

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
        returnLobbyFromGame(game);
      }
      return { success: true };
    },
    "game:leave": ({ gameId }) => {
      const game = games.get(gameId);
      if (!game) return { success: true };
      const idx = game.playerOrder.indexOf(userId);
      if (idx === -1) return { success: true };

      removePlayerFromGame(game, idx, userId);
      return { success: true };
    },
    "game:tictactoe:move": ({ gameId, cellIndex }) => {
      const game = games.get(gameId);
      if (!game || game.status !== "playing") return { success: false };
      
      const currentPlayerId = game.playerOrder[game.currentTurnIndex];
      if (currentPlayerId !== session.user.id) return { success: false };
      
      if (cellIndex < 0 || cellIndex > 8 || game.state.board[cellIndex] !== null) {
        return { success: false };
      }

      // 1. Update board
      game.state.board[cellIndex] = currentPlayerId;

      // 2. Check win
      const board = game.state.board;
      const wins: [number, number, number][] = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]             // diags
      ];
      let won = false;
      for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          won = true;
          break;
        }
      }

      if (won) {
        game.state.winner = currentPlayerId;
        game.status = "finished";
      } else if (board.every(cell => cell !== null)) {
        game.state.isDraw = true;
        game.status = "finished";
      } else {
        // Next turn
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.playerOrder.length;
      }

      const previousPlayerId = currentPlayerId;

      // Broadcast move update
      broadcastToUsers(game.playerOrder, "game:tictactoe:move", {
        gameId: game.id,
        previousPlayerId,
        state: game.state,
      });

      if (game.status === "finished") {
        broadcastToUsers(game.playerOrder, "game:ended", game);
        returnLobbyFromGame(game);
      } else {
         // Also broadcast generic turn so generic UI (if any) updates?
         // Use generic game:turn for turn update
         broadcastToUsers(game.playerOrder, "game:turn", {
            game: { ...game },
            previousPlayerId,
         });
      }

      return { success: true };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
