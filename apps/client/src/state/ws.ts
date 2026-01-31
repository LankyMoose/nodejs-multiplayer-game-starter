import {
  ClientRouter,
  WS_CLOSE_UNAUTHORIZED,
  WebSocketContract,
  createClientRouter,
} from "shared"
import { Signal, signal, watch } from "kiru"
import { env } from "@/env"
import { auth } from "./auth"
import { game } from "@/state/game"

export const ws = {
  current: null as WebSocketConnection | null,
}

watch(() => {
  ws.current?.dispose()

  const user = auth.$user,
    loading = auth.$isLoading

  if (loading || !user) return

  ws.current = createWebSocket()
})

/** Close code sent by server when the client is not authenticated */

export type WebSocketConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "unauthorized"

interface WebSocketConnection {
  $connectionState: WebSocketConnectionState
  /** True when game router has applied initial session state. */
  $readyState: boolean
  dispose: () => void
  router: ClientRouter<WebSocketContract>
  socket: WebSocket
}

export function createWebSocket(): WebSocketConnection {
  const state = signal<WebSocketConnectionState>("connecting")
  const socket = new WebSocket(
    `${import.meta.env.DEV ? "ws" : "wss"}://${env.HOST}${env.PORT}/ws`
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

  socket.addEventListener("open", () => {
    state.value = "connected"
    game.bindRouter(router)
  })
  socket.addEventListener("close", (event) => {
    state.value =
      event.code === WS_CLOSE_UNAUTHORIZED ? "unauthorized" : "disconnected"
    game.bindRouter(null)
  })
  socket.addEventListener("error", () => {
    state.value = "disconnected"
    game.bindRouter(null)
  })

  return {
    socket,
    router,
    get $connectionState() {
      return state.value
    },
    /** True when connection is up and game router has applied initial session state. */
    get $readyState() {
      return game.$ready
    },
    dispose: () => {
      game.bindRouter(null)
      socket.close()
      router.dispose()
      Signal.dispose(state)
    },
  }
}
