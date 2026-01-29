import { WebSocketContract, createClientRouter } from "shared"
import { signal } from "kiru"
import { onHMR } from "vite-plugin-kiru"

type WsConnectionState = "connecting" | "connected" | "disconnected"

export const wsConnectionState = signal<WsConnectionState>("connecting")

const ws = new WebSocket("ws://localhost:3000/ws")

export const wsRouter = createClientRouter<WebSocketContract>({
  send(msg) {
    ws.send(JSON.stringify(msg))
  },
  onMessage(cb) {
    const handler = (e: MessageEvent) => {
      cb(JSON.parse(e.data))
    }
    ws.addEventListener("message", handler)

    return () => {
      ws.removeEventListener("message", handler)
    }
  },
})

ws.addEventListener("open", () => {
  wsConnectionState.value = "connected"
})
ws.addEventListener("close", () => {
  wsConnectionState.value = "disconnected"
})

// wsRouter.on("user:disconnect", (id) => {
//   console.log(`User ${id} disconnected`)
// })

onHMR(() => {
  ws.close()
  wsRouter.dispose()
})
