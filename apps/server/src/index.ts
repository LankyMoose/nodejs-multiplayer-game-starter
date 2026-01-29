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
} from "shared";

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
      const url = new URL(
        request.url,
        `http://${request.headers.host ?? "localhost"}`
      );
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value !== undefined) {
          headers.append(key, Array.isArray(value) ? value.join(", ") : value);
        }
      }
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body:
          request.body !== undefined && request.body !== null
            ? JSON.stringify(request.body)
            : null,
      });
      const response = await auth.handler(req);
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

app.get("/ws", { websocket: true }, (socket, req) => {
  app.log.info({ url: req.url }, "WebSocket client connected");

  const router = createServerRouter<WebSocketContract>(
    createWsTransport(socket),
    {
      ping: () => "pong",
      "match:join": ({ id }) => {
        app.log.info({ id }, "Client joined match");
        return { success: false };
      },
    }
  );

  socket.on("close", () => {
    app.log.info("WebSocket client disconnected");
    router.dispose();
  });

  // Example: emit a server event
  router.emit("match:started", "match-123");
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
