import { WebSocketContract, createClientRouter } from "shared"
import { signal } from "kiru"
import { onHMR } from "vite-plugin-kiru"

type WsConnectionState = "connecting" | "connected" | "disconnected"

export const wsConnectionState = signal<WsConnectionState>("connecting")

const ws = new WebSocket("ws://localhost:3000/ws")
ws.addEventListener("open", () => (wsConnectionState.value = "connected"))
ws.addEventListener("close", () => (wsConnectionState.value = "disconnected"))

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

// wsRouter.send("ping").then((res) => console.log(res))
// wsRouter.send("match:join", { id: "asd" }).then((res) => console.log(res))

// wsRouter.on("user:disconnect", (id) => {
//   console.log(`User ${id} disconnected`)
// })

onHMR(() => {
  ws.close()
  wsRouter.dispose()
})
