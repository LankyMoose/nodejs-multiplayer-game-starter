import type { GameLobby, ServerHandlers, WebSocketContract } from "shared";
import { getUserLobby } from "../../game/store.js";
import type { WsContext } from "../context.js";

export function createLobbyHandlers(ctx: WsContext) {
  const {
    userId,
    session,
    socketPlayer,
    log,
    lobbies,
    broadcastToUsers,
    emitToUser,
    GAME_LOBBY_LIMITS,
  } = ctx;

  return {
    "lobby:create": () => {
      const playerLobby = getUserLobby(userId);
      if (playerLobby) {
        throw new Error("Player attempted to create a lobby while in one");
      }
      const lobbyId = crypto.randomUUID();
      lobbies.set(lobbyId, {
        id: lobbyId,
        ownerId: userId,
        maxPlayers: GAME_LOBBY_LIMITS.maxPlayers,
        requiredPlayers: GAME_LOBBY_LIMITS.requiredPlayers,
        players: [socketPlayer],
        readyPlayers: [],
        disconnectedPlayerIds: [],
      });
      log.info({ lobbyId, userId: session.user.id }, "Lobby created");
      return { lobbyId };
    },
    "lobby:join": ({ lobbyId }) => {
      const playerLobby = getUserLobby(userId);
      if (playerLobby) {
        if (lobbyId !== playerLobby.id) {
          throw new Error("Player attempted to join more than one lobby");
        }
        const disconnectedIds = playerLobby.disconnectedPlayerIds;
        if (disconnectedIds.includes(userId)) {
          playerLobby.disconnectedPlayerIds = disconnectedIds.filter(
            (id) => id !== userId,
          );
          broadcastToUsers(
            playerLobby.players.map((p) => p.id),
            "lobby:updated",
            playerLobby,
          );
          log.info({ lobbyId, userId }, "Player rejoined lobby");
        }
        return { success: true, lobby: playerLobby };
      }

      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        return { success: false, lobby: null };
      }
      if (lobby.players.length >= lobby.maxPlayers) {
        return { success: false, lobby: null };
      }
      lobby.players.push(socketPlayer);
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      log.info({ lobbyId, userId }, "Player joined lobby");
      return { success: true, lobby };
    },
    "lobby:leave": ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      const leavingUserId = session.user.id;
      lobby.players = lobby.players.filter((p) => p.id !== leavingUserId);
      lobby.readyPlayers = lobby.readyPlayers.filter(
        (id) => id !== leavingUserId,
      );
      lobby.disconnectedPlayerIds = lobby.disconnectedPlayerIds.filter(
        (id) => id !== leavingUserId,
      );
      if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
        log.info({ lobbyId }, "Lobby deleted");
      } else {
        if (lobby.ownerId === leavingUserId) {
          const disconnected = lobby.disconnectedPlayerIds;
          const connected = lobby.players.filter(
            (p) => !disconnected.includes(p.id),
          );
          const newOwner =
            connected[Math.floor(Math.random() * connected.length)];
          if (newOwner) lobby.ownerId = newOwner.id;
        }
        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby,
        );
      }
      return { success: true };
    },
    "lobby:ready": ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby?.players.some((p) => p.id === userId))
        return { success: false };

      if (!lobby.readyPlayers.includes(userId)) {
        lobby.readyPlayers.push(userId);
        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby,
        );
      }
      return { success: true };
    },
    "lobby:unready": ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (!lobby.players.some((p) => p.id === userId))
        return { success: false };
      if (lobby.readyPlayers.includes(userId)) {
        lobby.readyPlayers = lobby.readyPlayers.filter((id) => id !== userId);
        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby,
        );
      }
      return { success: true };
    },
    "lobby:transferOwner": ({ lobbyId, newOwnerId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
      if (!lobby.players.some((p) => p.id === newOwnerId))
        return { success: false };
      lobby.ownerId = newOwnerId;
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      log.info({ lobbyId, newOwnerId }, "Lobby owner transferred");
      return { success: true };
    },
    "lobby:kick": ({ lobbyId, playerId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
      if (playerId === userId) return { success: false };
      if (!lobby.players.some((p) => p.id === playerId))
        return { success: false };
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      lobby.readyPlayers = lobby.readyPlayers.filter((id) => id !== playerId);
      lobby.disconnectedPlayerIds = lobby.disconnectedPlayerIds.filter(
        (id) => id !== playerId,
      );
      if (lobby.players.length === 0) lobbies.delete(lobbyId);
      else
        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby,
        );
      emitToUser(playerId, "lobby:kicked", { lobbyId });
      log.info({ lobbyId, playerId }, "Player kicked from lobby");
      return { success: true };
    },
    "lobby:start": ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (!lobby.players.some((p) => p.id === userId))
        return { success: false };
      const disconnected = lobby.disconnectedPlayerIds;
      const connectedPlayers = lobby.players.filter(
        (p) => !disconnected.includes(p.id),
      );
      if (connectedPlayers.length < lobby.requiredPlayers)
        return { success: false };
      const allConnectedReady = connectedPlayers.every((p) =>
        lobby.readyPlayers.includes(p.id),
      );
      if (!allConnectedReady) return { success: false };
      const gameId = crypto.randomUUID();
      const game = {
        id: gameId,
        lobbyId,
        playerOrder: lobby.players.map((p) => p.id),
        currentTurnIndex: 0,
        status: "playing" as const,
      };
      ctx.games.set(gameId, game);
      lobbies.delete(lobbyId);
      broadcastToUsers(game.playerOrder, "game:started", game);
      log.info({ gameId, lobbyId }, "Game started");
      return { success: true, gameId };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
