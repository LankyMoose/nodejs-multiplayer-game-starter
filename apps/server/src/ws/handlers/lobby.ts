import { and, eq } from "drizzle-orm";
import type {
  GameInstance,
  GameLobby,
  LobbySuccessResult,
  ServerHandlers,
  WebSocketContract,
} from "shared";
import {
  appendLobbyChat,
  clearLobbyChat,
  getLobbyChat,
  getUserLobby,
  lobbyInvites,
} from "../../game/store.js";
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
        invitedUsers: [],
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
        return createLobbySuccessResult(playerLobby);
      }

      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        return { success: false, lobby: null };
      }
      if (lobby.inGameId) {
        return { success: false, lobby: null };
      }
      if (lobby.players.length >= lobby.maxPlayers) {
        return { success: false, lobby: null };
      }
      lobby.players.push(socketPlayer);
      if (lobby.invitedUsers) {
        lobby.invitedUsers = lobby.invitedUsers.filter((u) => u.id !== userId);
      }
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
      return createLobbySuccessResult(lobby);
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
      const msg = {
        userId,
        userName: session.user.name ?? "Player",
        text: trimmed,
      };
      appendLobbyChat(lobbyId, msg);
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:chat",
        { lobbyId, ...msg },
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
      const invited = lobby.invitedUsers ?? [];
      if (invited.some((u) => u.id === friendId)) return { success: false };
      const { db, schema } = ctx;
      const { user, userFriend } = schema;
      const [row] = await db
        .select()
        .from(userFriend)
        .where(
          and(
            eq(userFriend.userId, userId),
            eq(userFriend.friendId, friendId),
          ),
        )
        .limit(1);
      if (!row) return { success: false };
      const [friendRow] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, friendId))
        .limit(1);
      const friendName = friendRow?.name ?? "Player";
      if (!lobby.invitedUsers) lobby.invitedUsers = [];
      lobby.invitedUsers.push({ id: friendId, name: friendName });
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      lobbyInvites.set(friendId, { lobbyId, inviterId: userId });
      emitToUser(friendId, "lobby:invited", {
        lobbyId,
        inviterId: userId,
        inviterName: session.user.name ?? "Someone",
      });
      log.info({ lobbyId, friendId }, "Lobby invite sent");
      return { success: true };
    },
    "lobby:cancelInvite": ({ lobbyId, userId: targetUserId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return { success: false };
      if (lobby.ownerId !== userId) return { success: false };
      if (!lobby.invitedUsers?.some((u) => u.id === targetUserId))
        return { success: false };
      lobby.invitedUsers = lobby.invitedUsers.filter(
        (u) => u.id !== targetUserId,
      );
      lobbyInvites.delete(targetUserId);
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      emitToUser(targetUserId, "lobby:inviteCancelled", { lobbyId });
      log.info({ lobbyId, targetUserId }, "Lobby invite cancelled");
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
        return createLobbySuccessResult(playerLobby);
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
      if (lobby.invitedUsers) {
        lobby.invitedUsers = lobby.invitedUsers.filter((u) => u.id !== userId);
      }
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby,
      );
      log.info({ lobbyId, userId }, "Player joined lobby via invite");
      void emitFriendStatusToFriends(userId);
      return createLobbySuccessResult(lobby);
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
        clearLobbyChat(lobbyId);
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
      if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
        clearLobbyChat(lobbyId);
      } else
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
      lobby.inGameId = gameId;
      broadcastToUsers(game.playerOrder, "game:started", game);
      for (const pid of game.playerOrder) {
        void ctx.emitFriendStatusToFriends(pid);
      }
      log.info({ gameId, lobbyId }, "Game started");
      return { success: true, gameId };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}

function createLobbySuccessResult(lobby: GameLobby): LobbySuccessResult {
  return {
    success: true,
    lobby: lobby,
    chat: getLobbyChat(lobby.id),
  };
}
