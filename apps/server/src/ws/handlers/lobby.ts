import { and, eq } from "drizzle-orm";
import type { GameInstance, ServerHandlers, WebSocketContract } from "shared";
import { getUserLobby, lobbyInvites } from "../../game/store.js";
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
    emitFriendStatusToFriends,
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
        visibility: "private",
      });
      log.info({ lobbyId, userId: session.user.id }, "Lobby created");
      void emitFriendStatusToFriends(userId);
      return { lobbyId };
    },
    "lobby:join": async ({ lobbyId }) => {
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
          for (const p of playerLobby.players) {
            await emitFriendStatusToFriends(p.id);
          }
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
      lobbyInvites.delete(userId);
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      log.info({ lobbyId, userId }, "Player joined lobby");
      for (const p of lobby.players) {
        await emitFriendStatusToFriends(p.id);
      }
      return { success: true, lobby };
    },
    "lobby:setVisibility": ({ lobbyId, visibility }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
      lobby.visibility = visibility;
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      void emitFriendStatusToFriends(userId);
      return { success: true };
    },
    "lobby:sendChat": ({ lobbyId, text }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (!lobby.players.some((p) => p.id === userId))
        return { success: false };
      const trimmed = String(text).slice(0, 500).trim();
      if (!trimmed) return { success: true };
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:chat",
        {
          lobbyId,
          userId,
          userName: session.user.name ?? "Player",
          text: trimmed,
        },
      );
      return { success: true };
    },
    "lobby:inviteFriend": async ({ lobbyId, friendId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
      if (lobby.players.some((p) => p.id === friendId))
        return { success: false };
      if (lobby.players.length >= lobby.maxPlayers) return { success: false };
      const { db, schema } = ctx;
      const [row] = await db
        .select()
        .from(schema.userFriend)
        .where(
          and(
            eq(schema.userFriend.userId, userId),
            eq(schema.userFriend.friendId, friendId),
          ),
        )
        .limit(1);
      if (!row) return { success: false };
      lobbyInvites.set(friendId, { lobbyId, inviterId: userId });
      emitToUser(friendId, "lobby:invited", {
        lobbyId,
        inviterId: userId,
        inviterName: session.user.name ?? "Someone",
      });
      log.info({ lobbyId, friendId }, "Lobby invite sent");
      return { success: true };
    },
    "lobby:acceptInvite": async ({ lobbyId }) => {
      const invite = lobbyInvites.get(userId);
      if (!invite || invite.lobbyId !== lobbyId) {
        return { success: false, lobby: null };
      }
      const playerLobby = getUserLobby(userId);
      if (playerLobby) {
        if (playerLobby.id !== lobbyId) return { success: false, lobby: null };
        lobbyInvites.delete(userId);
        return { success: true, lobby: playerLobby };
      }
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        lobbyInvites.delete(userId);
        return { success: false, lobby: null };
      }
      if (lobby.players.length >= lobby.maxPlayers) {
        lobbyInvites.delete(userId);
        return { success: false, lobby: null };
      }
      lobbyInvites.delete(userId);
      lobby.players.push(socketPlayer);
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      log.info({ lobbyId, userId }, "Player joined lobby via invite");
      void emitFriendStatusToFriends(userId);
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
      void ctx.emitFriendStatusToFriends(leavingUserId);
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
      void ctx.emitFriendStatusToFriends(playerId);
      log.info({ lobbyId, playerId }, "Player kicked from lobby");
      return { success: true };
    },
    "lobby:start": ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
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
      const game: GameInstance = {
        id: gameId,
        lobbyId,
        playerOrder: lobby.players.map((p) => p.id),
        currentTurnIndex: 0,
        status: "playing",
      };
      ctx.games.set(gameId, game);
      lobbies.delete(lobbyId);
      broadcastToUsers(game.playerOrder, "game:started", game);
      for (const pid of game.playerOrder) {
        void ctx.emitFriendStatusToFriends(pid);
      }
      log.info({ gameId, lobbyId }, "Game started");
      return { success: true, gameId };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
