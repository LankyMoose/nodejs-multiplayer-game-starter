import {
  WS_CLOSE_UNAUTHORIZED,
  WebSocketContract,
  createClientRouter,
} from "shared"
import { signal } from "kiru"
import { env } from "@/env"

/** Close code sent by server when the client is not authenticated */

type WsConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "unauthorized"

export const wsConnectionState = signal<WsConnectionState>("connecting")

export function createWebSocket() {
  const socket = new WebSocket(
    `${import.meta.env.DEV ? "ws" : "wss"}://${env.HOST}${env.PORT}/ws`
  )
  socket.addEventListener("open", () => (wsConnectionState.value = "connected"))
  socket.addEventListener("close", (event) => {
    wsConnectionState.value =
      event.code === WS_CLOSE_UNAUTHORIZED ? "unauthorized" : "disconnected"
  })
  socket.addEventListener(
    "error",
    () => (wsConnectionState.value = "disconnected")
  )

  const router = createClientRouter<WebSocketContract>({
    send(msg) {
      socket.send(JSON.stringify(msg))
    },
    onMessage(cb) {
      const handler = (e: MessageEvent) => {
        cb(JSON.parse(e.data))
      }
      socket.addEventListener("message", handler)

      return () => {
        socket.removeEventListener("message", handler)
      }
    },
  })

  return {
    socket,
    router,
    dispose: () => {
      socket.close()
      router.dispose()
    },
  }
}
