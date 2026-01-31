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
  broadcastToUsers,
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
      "lobby:create": () => {
        const lobbyId = crypto.randomUUID();
        lobbies.set(lobbyId, {
          id: lobbyId,
          maxPlayers: GAME_LOBBY_LIMITS.maxPlayers,
          requiredPlayers: GAME_LOBBY_LIMITS.requiredPlayers,
          players: [socketPlayer],
          readyPlayers: [],
        });
        app.log.info({ lobbyId, userId: session.user.id }, "Lobby created");
        return { lobbyId };
      },
      "lobby:join": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
          return { success: false, lobby: null };
        }
        // prevent player joining twice via different connections
        if (lobby.players.some((p) => p.id === userId)) {
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
        const userId = session.user.id;
        lobby.players = lobby.players.filter((p) => p.id !== userId);
        lobby.readyPlayers = lobby.readyPlayers.filter((id) => id !== userId);
        if (lobby.players.length === 0) lobbies.delete(lobbyId);
        else
          broadcastToUsers(
            lobby.players.map((p) => p.id),
            "lobby:updated",
            lobby
          );
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
      "lobby:start": ({ lobbyId }) => {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return { success: false };
        const userId = session.user.id;
        if (!lobby.players.some((p) => p.id === userId))
          return { success: false };
        if (lobby.players.length < lobby.requiredPlayers)
          return { success: false };
        const allReady = lobby.players.every((p) =>
          lobby.readyPlayers.includes(p.id)
        );
        if (!allReady) return { success: false };
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

  socket.on("close", () => {
    app.log.info("WebSocket client disconnected");
    unregisterUser(session.user.id);
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
