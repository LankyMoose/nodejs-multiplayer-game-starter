import { ClientRouter, WebSocketContract, createClientRouter } from "shared"
import { signal, watch } from "kiru"
import { env } from "@/env"
import { auth } from "./auth"
import { game } from "@/state/game"
import { onDisconnected } from "./core"

export const ws = {
  current: null as WebSocketConnection | null,
}

let epoch = 0
watch(() => {
  ws.current?.dispose()

  const user = auth.$user,
    loading = auth.$isLoading

  if (loading || !user) return
  const e = ++epoch
  createWebSocket().then((socket) => {
    if (e !== epoch) return
    ws.current = socket
  })
})

/** Close code sent by server when the client is not authenticated */

export type WebSocketConnectionState = "connecting" | "connected"

interface WebSocketConnection {
  $connectionState: WebSocketConnectionState
  /** True when game router has applied initial session state. */
  $readyState: boolean
  dispose: () => void
  router: ClientRouter<WebSocketContract>
  socket: WebSocket
}

const state = signal<WebSocketConnectionState>("connecting")

export async function createWebSocket(): Promise<WebSocketConnection> {
  const socket = new WebSocket(`${env.WS_BASE_URL}/ws`)
  state.value = "connecting"

  // wait for server "init" message

  await new Promise((resolve) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data === "init") {
        socket.removeEventListener("message", onMessage)
        resolve(null)
      }
    }
    socket.addEventListener("message", onMessage)
  })

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

  state.value = "connected"
  game.bindRouter(router)

  socket.addEventListener("error", () => {
    game.bindRouter(null)
    onDisconnected()
  })

  socket.addEventListener("close", () => {
    game.bindRouter(null)
    onDisconnected()
  })

  return {
    get socket() {
      return socket
    },
    get router() {
      return router
    },
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
      state.value = "connecting"
    },
  }
}
