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
} from "./game/store.js";
import { GAME_LOBBY_LIMITS } from "./game/config.js";

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
      raw: Buffer
    ) => {
      const msg = JSON.parse(raw.toString()) as WireMessage;
      cb(msg);
    };
    socket.on("message", handler);
    return () => socket.off("message", handler);
  },
});

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

  const router = createServerRouter<WebSocketContract>(
    createWsTransport(socket),
    {
      ping: () => "pong",
      "match:join": ({ id }) => {
        app.log.info({ id }, "Client joined match");
        return { success: false };
      },
      "session:state": () => {
        const userLobby = [...lobbies.values()].find((l) =>
          l.players.some((p) => p.id === userId)
        );
        const userGame = [...games.values()].find((g) =>
          g.playerOrder.includes(userId)
        );
        return {
          lobby: userLobby ?? null,
          game: userGame ?? null,
        };
      },
      "lobby:create": () => {
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
        app.log.info({ lobbyId, userId: session.user.id }, "Lobby created");
        return { lobbyId };
      },
      "lobby:join": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
          return { success: false, lobby: null };
        }
        const alreadyInLobby = lobby.players.some((p) => p.id === userId);
        if (alreadyInLobby) {
          const disconnected = lobby.disconnectedPlayerIds ?? [];
          if (disconnected.includes(userId)) {
            lobby.disconnectedPlayerIds = (lobby.disconnectedPlayerIds ?? []).filter(
              (id) => id !== userId
            );
            broadcastToUsers(
              lobby.players.map((p) => p.id),
              "lobby:updated",
              lobby
            );
            app.log.info({ lobbyId, userId }, "Player rejoined lobby");
          }
          return { success: true, lobby };
        }
        if (lobby.players.length >= lobby.maxPlayers) {
          return { success: false, lobby: null };
        }
        lobby.players.push(socketPlayer);
        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby
        );
        app.log.info({ lobbyId, userId }, "Player joined lobby");
        return { success: true, lobby };
      },
      "lobby:leave": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return { success: false };
        const leavingUserId = session.user.id;
        lobby.players = lobby.players.filter((p) => p.id !== leavingUserId);
        lobby.readyPlayers = lobby.readyPlayers.filter(
          (id) => id !== leavingUserId
        );
        lobby.disconnectedPlayerIds = (lobby.disconnectedPlayerIds ?? []).filter(
          (id) => id !== leavingUserId
        );
        if (lobby.players.length === 0) lobbies.delete(lobbyId);
        else {
          if (lobby.ownerId === leavingUserId) {
            const disconnected = lobby.disconnectedPlayerIds ?? [];
            const connected = lobby.players.filter(
              (p) => !disconnected.includes(p.id)
            );
            const newOwner =
              connected[Math.floor(Math.random() * connected.length)];
            if (newOwner) lobby.ownerId = newOwner.id;
          }
          broadcastToUsers(
            lobby.players.map((p) => p.id),
            "lobby:updated",
            lobby
          );
        }
        return { success: true };
      },
      "lobby:ready": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return { success: false };
        const userId = session.user.id;
        if (!lobby.players.some((p) => p.id === userId))
          return { success: false };
        if (!lobby.readyPlayers.includes(userId)) {
          lobby.readyPlayers.push(userId);
          broadcastToUsers(
            lobby.players.map((p) => p.id),
            "lobby:updated",
            lobby
          );
        }
        return { success: true };
      },
      "lobby:unready": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return { success: false };
        const userId = session.user.id;
        if (!lobby.players.some((p) => p.id === userId))
          return { success: false };
        if (lobby.readyPlayers.includes(userId)) {
          lobby.readyPlayers = lobby.readyPlayers.filter((id) => id !== userId);
          broadcastToUsers(
            lobby.players.map((p) => p.id),
            "lobby:updated",
            lobby
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
          lobby
        );
        app.log.info({ lobbyId, newOwnerId }, "Lobby owner transferred");
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
        lobby.disconnectedPlayerIds = (lobby.disconnectedPlayerIds ?? []).filter(
          (id) => id !== playerId
        );
        if (lobby.players.length === 0) lobbies.delete(lobbyId);
        else
          broadcastToUsers(
            lobby.players.map((p) => p.id),
            "lobby:updated",
            lobby
          );
        emitToUser(playerId, "lobby:kicked", { lobbyId });
        app.log.info({ lobbyId, playerId }, "Player kicked from lobby");
        return { success: true };
      },
      "lobby:start": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return { success: false };
        const userId = session.user.id;
        if (!lobby.players.some((p) => p.id === userId))
          return { success: false };
        const disconnected = lobby.disconnectedPlayerIds ?? [];
        const connectedPlayers = lobby.players.filter(
          (p) => !disconnected.includes(p.id)
        );
        if (connectedPlayers.length < lobby.requiredPlayers)
          return { success: false };
        const allConnectedReady = connectedPlayers.every((p) =>
          lobby.readyPlayers.includes(p.id)
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
        games.set(gameId, game);
        lobbies.delete(lobbyId);
        broadcastToUsers(game.playerOrder, "game:started", game);
        app.log.info({ gameId, lobbyId }, "Game started");
        return { success: true, gameId };
      },
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
    }
  );

  registerUser(session.user.id, router, session);

  // On connect: mark user as back in any lobbies they were disconnected from
  for (const lobby of lobbies.values()) {
    if (!lobby.disconnectedPlayerIds?.includes(userId)) continue;
    lobby.disconnectedPlayerIds = lobby.disconnectedPlayerIds.filter(
      (id) => id !== userId
    );
    broadcastToUsers(
      lobby.players.map((p) => p.id),
      "lobby:updated",
      lobby
    );
    app.log.info({ lobbyId: lobby.id, userId }, "Player reconnected to lobby");
  }

  socket.on("close", () => {
    const disconnectingUserId = session.user.id;
    app.log.info(
      { userId: disconnectingUserId },
      "WebSocket client disconnected"
    );

    unregisterUser(disconnectingUserId, router);

    if (!hasConnections(disconnectingUserId)) {
      for (const lobby of lobbies.values()) {
        const inLobby = lobby.players.some((p) => p.id === disconnectingUserId);
        if (!inLobby) continue;

        if (!lobby.disconnectedPlayerIds) lobby.disconnectedPlayerIds = [];
        if (!lobby.disconnectedPlayerIds.includes(disconnectingUserId)) {
          lobby.disconnectedPlayerIds.push(disconnectingUserId);
        }

        if (lobby.ownerId === disconnectingUserId) {
          const connected = lobby.players.filter(
            (p) => !lobby.disconnectedPlayerIds!.includes(p.id)
          );
          const newOwner =
            connected[Math.floor(Math.random() * connected.length)];
          if (newOwner) {
            lobby.ownerId = newOwner.id;
            app.log.info(
              { lobbyId: lobby.id, newOwnerId: lobby.ownerId },
              "Lobby owner reassigned on disconnect"
            );
          }
        }

        broadcastToUsers(
          lobby.players.map((p) => p.id),
          "lobby:updated",
          lobby
        );
      }
    }

    router.dispose();
  });
});

app.get("/", async (_, reply) => {
  reply.send({ ok: true, message: "3up1down server" });
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
