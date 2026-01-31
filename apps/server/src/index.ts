import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { auth } from "./auth.js";
import type { WebSocket } from "ws";
import {
  createServerRouter,
  type Transport,
  type WireMessage,
  type WebSocketContract,
  WS_CLOSE_UNAUTHORIZED,
  type Player,
  type ServerRouterOptions,
} from "shared";
import { fastifyRequestToRequest, fastifyHeadersToHeaders } from "./utils.js";
import {
  lobbies,
  games,
  registerUser,
  unregisterUser,
  hasConnections,
  broadcastToUsers,
  emitToUser,
  getUserLobby,
  getUserGame,
  getFriendStatus,
  gameDisconnectedPlayers,
} from "./game/store.js";
import { GAME_LOBBY_LIMITS } from "./game/config.js";
import { db } from "./db/index.js";
import { user, userFriend, friendRequest } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { createWsHandlers } from "./ws/handlers/index.js";
import type { WsContext } from "./ws/context.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
});

await app.register(websocket);

// Better-auth: catch-all for /api/auth/*
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  handler: async (request, reply) => {
    try {
      const req = fastifyRequestToRequest(request);
      const response = await auth.handler(req);
      console.log("auth response", response);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      const body = response.body ? await response.text() : null;
      reply.send(body);
    } catch (err) {
      app.log.error(err, "Authentication error");
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

const createWsTransport = (socket: WebSocket): Transport => ({
  send: (message) => socket.send(JSON.stringify(message)),
  onMessage: (cb) => {
    const handler: (this: WebSocket, ...args: any[]) => void = (
      raw: Buffer,
    ) => {
      const msg = JSON.parse(raw.toString()) as WireMessage;
      cb(msg);
    };
    socket.on("message", handler);
    return () => socket.off("message", handler);
  },
});

const wsServerRouterOptions: ServerRouterOptions = {
  onHandlerError: (err) => app.log.error(err, "Invalid WebSocket message"),
  onInvalidMessageType: (message) =>
    app.log.error(message, "Invalid WebSocket message type"),
};

app.get("/ws", { websocket: true }, async (socket, req) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;

  console.log("ws request", req.headers);

  try {
    session = await auth.api.getSession({
      headers: fastifyHeadersToHeaders(req.headers),
    });
    console.log("ws session", session);
  } catch (err) {
    app.log.warn(err, "WebSocket auth: getSession failed");
    socket.close(WS_CLOSE_UNAUTHORIZED, "Authentication failed");
    return;
  }

  if (!session) {
    app.log.info({ url: req.url }, "WebSocket connection rejected: no session");
    socket.close(WS_CLOSE_UNAUTHORIZED, "Unauthorized");
    return;
  }

  const { id: userId, name } = session.user;

  const socketPlayer: Player = {
    id: userId,
    name,
  };

  app.log.info({ url: req.url, userId }, "WebSocket client connected");

  const emitFriendStatusToFriends = async (targetUserId: string) => {
    const status = getFriendStatus(targetUserId);
    const rows = await db
      .select({ friendId: userFriend.friendId })
      .from(userFriend)
      .where(eq(userFriend.userId, targetUserId));
    for (const row of rows) {
      emitToUser(row.friendId, "friend:status", {
        userId: targetUserId,
        status,
      });
    }
  };

  const wsContext: WsContext = {
    userId,
    session,
    socketPlayer,
    log: app.log,
    lobbies,
    games,
    broadcastToUsers,
    emitToUser,
    hasConnections,
    getFriendStatus,
    emitFriendStatusToFriends,
    db,
    schema: { user, userFriend, friendRequest },
    GAME_LOBBY_LIMITS,
  };

  const router = createServerRouter<WebSocketContract>(
    createWsTransport(socket),
    createWsHandlers(wsContext),
    wsServerRouterOptions,
  );

  registerUser(session.user.id, router, session);

  // Notify friends that this user is now online and their current status
  const friendRows = await db
    .select({ friendId: userFriend.friendId })
    .from(userFriend)
    .where(eq(userFriend.userId, userId));
  const status = getFriendStatus(userId);
  for (const row of friendRows) {
    emitToUser(row.friendId, "friend:online", { userId });
    emitToUser(row.friendId, "friend:status", { userId, status });
  }

  // On connect: mark user as back in any lobbies they were disconnected from
  const lobby = [...lobbies.values()].find((l) =>
    l.disconnectedPlayerIds.includes(userId),
  );
  if (lobby) {
    lobby.disconnectedPlayerIds = lobby.disconnectedPlayerIds.filter(
      (id) => id !== userId,
    );
    broadcastToUsers(
      lobby.players.map((p) => p.id),
      "lobby:updated",
      lobby,
    );
    app.log.info({ lobbyId: lobby.id, userId }, "Player reconnected to lobby");
  }

  // On connect: if user was in a game and in "disconnected" map, remove and notify
  const userGame = getUserGame(userId);
  if (userGame) {
    const disconnectedMap = gameDisconnectedPlayers.get(userGame.id);
    if (disconnectedMap?.has(userId)) {
      disconnectedMap.delete(userId);
      if (disconnectedMap.size === 0)
        gameDisconnectedPlayers.delete(userGame.id);
      broadcastToUsers(userGame.playerOrder, "game:playerReconnected", {
        gameId: userGame.id,
        playerId: userId,
      });
      const disconnected = disconnectedMap.size
        ? [...disconnectedMap.entries()].map(([playerId, playerName]) => ({
            playerId,
            playerName,
          }))
        : [];
      broadcastToUsers(userGame.playerOrder, "game:waitingForReconnect", {
        gameId: userGame.id,
        disconnected,
      });
    }
  }

  socket.on("close", async () => {
    const disconnectingUserId = session.user.id;
    app.log.info(
      { userId: disconnectingUserId },
      "WebSocket client disconnected",
    );

    unregisterUser(disconnectingUserId, router);

    // if this is the last connection for a user:
    // - notify their friends
    // - update the lobby if they were in one
    if (!hasConnections(disconnectingUserId)) {
      const friendRows = await db
        .select({ friendId: userFriend.friendId })
        .from(userFriend)
        .where(eq(userFriend.userId, disconnectingUserId));

      for (const row of friendRows) {
        emitToUser(row.friendId, "friend:offline", {
          userId: disconnectingUserId,
        });
      }

      const lobby = getUserLobby(disconnectingUserId);
      if (lobby) {
        const disconnectedIds = lobby.disconnectedPlayerIds;
        if (!disconnectedIds.includes(disconnectingUserId)) {
          disconnectedIds.push(disconnectingUserId);
        }

        if (lobby.ownerId === disconnectingUserId) {
          const connected = lobby.players.filter(
            (p) => !disconnectedIds.includes(p.id),
          );
          const newOwner =
            connected[Math.floor(Math.random() * connected.length)];
          if (newOwner) {
            lobby.ownerId = newOwner.id;
            app.log.info(
              { lobbyId: lobby.id, newOwnerId: lobby.ownerId },
              "Lobby owner reassigned on disconnect",
            );
          }
        }

        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby,
        );
      }

      // Game: player disconnected -> enter paused state (overlay)
      const disconnectingUserGame = getUserGame(disconnectingUserId);
      if (disconnectingUserGame) {
        const playerName = session.user.name ?? "Player";
        let map = gameDisconnectedPlayers.get(disconnectingUserGame.id);
        if (!map) {
          map = new Map();
          gameDisconnectedPlayers.set(disconnectingUserGame.id, map);
        }
        map.set(disconnectingUserId, playerName);
        const game = games.get(disconnectingUserGame.id)!;
        const disconnected = [...map.entries()].map(([playerId, pName]) => ({
          playerId,
          playerName: pName,
        }));
        broadcastToUsers(game.playerOrder, "game:waitingForReconnect", {
          gameId: disconnectingUserGame.id,
          disconnected,
        });
        emitFriendStatusToFriends(disconnectingUserId);
      }
    }

    router.dispose();
  });
});

app.get("/", async (_, reply) => {
  reply.send({ ok: true, message: "hello world" });
});

const port = Number(process.env.PORT ?? 6969);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
