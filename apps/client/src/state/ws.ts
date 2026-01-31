import {
  WS_CLOSE_UNAUTHORIZED,
  WebSocketContract,
  createClientRouter,
} from "shared"
import { Signal, signal, computed } from "kiru"
import { env } from "@/env"
import { auth } from "./auth"

export const ws = computed(() => {
  if (!auth.isAuthenticated.value) return null
  return createWebSocket()
})

/** Close code sent by server when the client is not authenticated */

type WebSocketState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "unauthorized"

export function createWebSocket() {
  const state = signal<WebSocketState>("connecting")
  const socket = new WebSocket(
    `${import.meta.env.DEV ? "ws" : "wss"}://${env.HOST}${env.PORT}/ws`
  )

  socket.addEventListener("open", () => (state.value = "connected"))
  socket.addEventListener("close", (event) => {
    state.value =
      event.code === WS_CLOSE_UNAUTHORIZED ? "unauthorized" : "disconnected"
  })
  socket.addEventListener("error", () => (state.value = "disconnected"))

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
    state,
    dispose: () => {
      socket.close()
      router.dispose()
      Signal.dispose(state)
    },
  }
}
