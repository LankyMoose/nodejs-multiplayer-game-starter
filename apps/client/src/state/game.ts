import type { ClientRouter } from "shared"
import type { GameInstance, GameLobby, WebSocketContract } from "shared"
import { signal } from "kiru"

const lobby = signal<GameLobby | null>(null)
const gameInstance = signal<GameInstance | null>(null)
const error = signal<string | null>(null)

let currentRouter: ClientRouter<WebSocketContract> | null = null
let unregister: (() => void) | null = null

export function bindRouter(router: ClientRouter<WebSocketContract> | null) {
  if (router === currentRouter) return
  unregister?.()
  currentRouter = null

  if (!router) {
    lobby.value = null
    gameInstance.value = null
    return
  }

  currentRouter = router

  const cleanups = [
    router.on("lobby:updated", (payload) => {
      lobby.value = payload
    }),
    router.on("game:started", (payload) => {
      gameInstance.value = payload
      lobby.value = null
    }),
    router.on("game:turn", (payload) => {
      gameInstance.value = payload.game
    }),
    router.on("game:ended", (payload) => {
      gameInstance.value = payload
    }),
  ]

  unregister = () => {
    cleanups.forEach((cleanup) => cleanup())
    currentRouter = null
  }
}

export const game = {
  _signals: { lobby, gameInstance, error },
  get $lobby() {
    return lobby.value
  },
  get $instance() {
    return gameInstance.value
  },
  get $error() {
    return error.value
  },
  bindRouter,
  clearError() {
    error.value = null
  },
  async createLobby() {
    debugger
    error.value = null
    if (!currentRouter) {
      error.value = "Not connected"
      return
    }
    try {
      const { lobbyId } = await currentRouter.send("lobby:create")
      const { success, lobby: joinedLobby } = await currentRouter.send(
        "lobby:join",
        { lobbyId }
      )
      if (!success) {
        error.value = "Could not join lobby"
        return
      }
      lobby.value = joinedLobby
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create lobby"
    }
  },
  async joinLobby(lobbyId: string) {
    error.value = null
    if (!currentRouter) {
      error.value = "Not connected"
      return
    }
    try {
      const res = await currentRouter.send("lobby:join", { lobbyId })
      if (!res.success) error.value = "Could not join lobby"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to join lobby"
    }
  },
  async leaveLobby(lobbyId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      await currentRouter.send("lobby:leave", { lobbyId })
      if (lobby.value?.id === lobbyId) lobby.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to leave"
    }
  },
  async readyLobby(lobbyId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("lobby:ready", { lobbyId })
      if (!res.success) error.value = "Could not set ready"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async startLobby(lobbyId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("lobby:start", { lobbyId })
      if (!res.success) error.value = "Could not start (all must be ready)"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to start"
    }
  },
  async takeTurn(gameId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("game:turn", { gameId })
      if (!res.success) error.value = "Not your turn or game ended"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  leaveGame() {
    gameInstance.value = null
  },
}
