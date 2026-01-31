import type { ClientRouter } from "shared"
import type { GameInstance, GameLobby, WebSocketContract } from "shared"
import { signal } from "kiru"
import { toast } from "@/features/toast"

const lobby = signal<GameLobby | null>(null)
const gameInstance = signal<GameInstance | null>(null)
const error = signal<string | null>(null)
const friends = signal<
  { id: string; name: string; online: boolean }[]
>([])
const friendRequests = signal<{ requesterId: string; requesterName: string }[]>(
  []
)
const pendingSentAddresseeIds = signal<string[]>([])
/** True only after router is bound and initial session:state has been applied. */
const ready = signal(false)

let currentRouter: ClientRouter<WebSocketContract> | null = null
let unregister: (() => void) | null = null

export function bindRouter(router: ClientRouter<WebSocketContract> | null) {
  if (router === currentRouter) return
  unregister?.()
  currentRouter = null
  ready.value = false

  if (!router) {
    lobby.value = null
    gameInstance.value = null
    friends.value = []
    friendRequests.value = []
    pendingSentAddresseeIds.value = []
    return
  }

  currentRouter = router

  const cleanups = [
    router.on("lobby:updated", (payload) => {
      lobby.value = payload
    }),
    router.on("lobby:kicked", (payload) => {
      if (lobby.value?.id === payload.lobbyId) lobby.value = null
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
    router.on("friend_request:received", (payload) => {
      friendRequests.value = [
        ...friendRequests.value,
        {
          requesterId: payload.requesterId,
          requesterName: payload.requesterName,
        },
      ]
      toast({
        type: "info",
        children: () => `${payload.requesterName} sent you a friend request`,
      })
    }),
    router.on("friend_request:accepted", (payload) => {
      friends.value = [
        ...friends.value,
        {
          id: payload.friendId,
          name: payload.friendName,
          online: payload.online,
        },
      ]
      pendingSentAddresseeIds.value = pendingSentAddresseeIds.value.filter(
        (id) => id !== payload.friendId
      )
    }),
    router.on("friend:removed", (payload) => {
      friends.value = friends.value.filter((f) => f.id !== payload.friendId)
    }),
    router.on("friend:online", (payload) => {
      friends.value = friends.value.map((f) =>
        f.id === payload.userId ? { ...f, online: true } : f
      )
    }),
    router.on("friend:offline", (payload) => {
      friends.value = friends.value.map((f) =>
        f.id === payload.userId ? { ...f, online: false } : f
      )
    }),
  ]

  void router.send("session:state").then((state) => {
    if (currentRouter !== router) return
    lobby.value = state.lobby
    gameInstance.value = state.game
    ready.value = true
  })

  void router.send("friends:list").then((res) => {
    if (currentRouter !== router) return
    friends.value = res.friends
  })

  void router.send("friend_requests:list").then((res) => {
    if (currentRouter !== router) return
    friendRequests.value = res.requests
  })

  void router.send("friend_requests:pending_sent").then((res) => {
    if (currentRouter !== router) return
    pendingSentAddresseeIds.value = res.addresseeIds
  })

  unregister = () => {
    cleanups.forEach((cleanup) => cleanup())
    currentRouter = null
  }
}

export const game = {
  _signals: {
    lobby,
    gameInstance,
    error,
    ready,
    friends,
    friendRequests,
    pendingSentAddresseeIds,
  },
  get $lobby() {
    return lobby.value
  },
  get $instance() {
    return gameInstance.value
  },
  get $error() {
    return error.value
  },
  get $ready() {
    return ready.value
  },
  get $friends() {
    return friends.value
  },
  get $friendRequests() {
    return friendRequests.value
  },
  get $pendingSentAddresseeIds() {
    return pendingSentAddresseeIds.value
  },
  bindRouter,
  clearError() {
    error.value = null
  },
  async createLobby() {
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
  async unreadyLobby(lobbyId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("lobby:unready", { lobbyId })
      if (!res.success) error.value = "Could not unready"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async transferLobbyOwner(lobbyId: string, newOwnerId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("lobby:transferOwner", {
        lobbyId,
        newOwnerId,
      })
      if (!res.success) error.value = "Could not transfer owner"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async kickFromLobby(lobbyId: string, playerId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("lobby:kick", { lobbyId, playerId })
      if (!res.success) error.value = "Could not kick player"
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
  async addFriend(userId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("friend_requests:send", {
        addresseeId: userId,
      })
      if (!res.success) error.value = "Could not send request (same lobby only)"
      else {
        const pending = await currentRouter.send("friend_requests:pending_sent")
        pendingSentAddresseeIds.value = pending.addresseeIds
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async acceptFriendRequest(requesterId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("friend_requests:accept", {
        requesterId,
      })
      if (!res.success) error.value = "Could not accept"
      else {
        const [list, requests] = await Promise.all([
          currentRouter.send("friends:list"),
          currentRouter.send("friend_requests:list"),
        ])
        friends.value = list.friends
        friendRequests.value = requests.requests
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async declineFriendRequest(requesterId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      await currentRouter.send("friend_requests:decline", { requesterId })
      const res = await currentRouter.send("friend_requests:list")
      friendRequests.value = res.requests
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
  async removeFriend(friendId: string) {
    error.value = null
    if (!currentRouter) return
    try {
      const res = await currentRouter.send("friends:remove", { friendId })
      if (!res.success) error.value = "Could not remove friend"
      else friends.value = friends.value.filter((f) => f.id !== friendId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  },
}
