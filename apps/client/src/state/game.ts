import type { ClientRouter, LobbyVisibility } from "shared"
import type {
  FriendStatus,
  GameInstance,
  GameLobby,
  WebSocketContract,
} from "shared"
import { signal } from "kiru"
import { toast } from "@/features/toasts"

const lobby = signal<GameLobby | null>(null)
/** True only after router is bound and initial session:state has been applied. */
const ready = signal(false)

const gameInstance = signal<GameInstance | null>(null)
const error = signal<string | null>(null)
const friends = signal<
  { id: string; name: string; online: boolean; status: FriendStatus }[]
>([])
const friendRequests = signal<{ requesterId: string; requesterName: string }[]>(
  []
)
const pendingSentAddresseeIds = signal<string[]>([])
/** Ephemeral lobby chat messages: lobbyId -> list of messages. */
const lobbyChatMessages = signal<
  Map<string, { userId: string; userName: string; text: string }[]>
>(new Map())
/** Pending lobby invites (from lobby:invited). */
const lobbyInvites = signal<
  { lobbyId: string; inviterId: string; inviterName: string }[]
>([])
/** Players we're waiting to reconnect (empty list = hide overlay). */
const waitingForReconnect = signal<{
  gameId: string
  disconnected: { playerId: string; playerName: string }[]
} | null>(null)

let currentRouter: ClientRouter<WebSocketContract> | null = null
let unregister: (() => void) | null = null

function bindRouter(router: ClientRouter<WebSocketContract> | null) {
  if (router === currentRouter) {
    return
  }
  unregister?.()
  currentRouter = null
  ready.value = false

  if (!router) {
    lobby.value = null
    gameInstance.value = null
    friends.value = []
    friendRequests.value = []
    pendingSentAddresseeIds.value = []
    lobbyChatMessages.value = new Map()
    waitingForReconnect.value = null
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
    }),
    router.on("game:turn", (payload) => {
      gameInstance.value = payload.game
    }),
    router.on("game:ended", (payload) => {
      gameInstance.value = payload
      if (waitingForReconnect.value?.gameId === payload.id)
        waitingForReconnect.value = null
    }),
    router.on("game:updated", (payload) => {
      gameInstance.value = payload
      if (waitingForReconnect.value?.gameId === payload.id)
        waitingForReconnect.value = null
    }),
    router.on("game:waitingForReconnect", (payload) => {
      waitingForReconnect.value =
        payload.disconnected.length > 0 ? payload : null
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
          status: payload.online
            ? ({ kind: "menu" } as FriendStatus)
            : ({ kind: "offline" } as FriendStatus),
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
    router.on("friend:status", (payload) => {
      friends.value = friends.value.map((f) =>
        f.id === payload.userId ? { ...f, status: payload.status } : f
      )
    }),
    router.on("lobby:chat", (payload) => {
      const next = new Map(lobbyChatMessages.value)
      const list = next.get(payload.lobbyId) ?? []
      next.set(payload.lobbyId, [
        ...list,
        {
          userId: payload.userId,
          userName: payload.userName,
          text: payload.text,
        },
      ])
      lobbyChatMessages.value = next
    }),
    router.on("lobby:invited", (payload) => {
      lobbyInvites.value = [
        ...lobbyInvites.value,
        {
          lobbyId: payload.lobbyId,
          inviterId: payload.inviterId,
          inviterName: payload.inviterName,
        },
      ]
      toast({
        type: "info",
        children: () => `${payload.inviterName} invited you to their lobby`,
      })
    }),
    router.on("lobby:inviteCancelled", (payload) => {
      lobbyInvites.value = lobbyInvites.value.filter(
        (inv) => inv.lobbyId !== payload.lobbyId
      )
    }),
  ]

  void router.send("session:state").then((state) => {
    if (currentRouter !== router) return
    lobby.value = state.lobby
    gameInstance.value = state.game
    if (state.lobby && state.lobbyChatMessages.length > 0) {
      const next = new Map(lobbyChatMessages.value)
      next.set(state.lobby.id, state.lobbyChatMessages)
      lobbyChatMessages.value = next
    }
    if (state.lobby) {
      toast({
        type: "info",
        children: () => `Reconnected to lobby`,
      })
    }
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

const action = <T, Args extends any[]>(
  callback: (
    router: ClientRouter<WebSocketContract>,
    ...args: Args
  ) => Promise<T>
) => {
  return (...args: Args) => {
    error.value = null
    if (!currentRouter) {
      error.value = "Not connected"
      return
    }
    return callback(currentRouter, ...args)
  }
}

export function resetGameState() {
  lobby.value = null
  gameInstance.value = null
  ready.value = false
  error.value = null
  friends.value = []
  friendRequests.value = []
  pendingSentAddresseeIds.value = []
  lobbyChatMessages.value = new Map()
  lobbyInvites.value = []
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
  get $lobbyChatMessages() {
    return lobbyChatMessages.value
  },
  get $lobbyInvites() {
    return lobbyInvites.value
  },
  get $waitingForReconnect() {
    return waitingForReconnect.value
  },
  bindRouter,
  getRouter: () => currentRouter,
  clearError() {
    error.value = null
  },
  createLobby: action(async (router) => {
    try {
      const { lobbyId } = await router.send("lobby:create")
      const { success, lobby: joinedLobby } = await router.send("lobby:join", {
        lobbyId,
      })
      if (!success) {
        error.value = "Could not join lobby"
        return
      }
      lobby.value = joinedLobby
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create lobby"
    }
  }),
  joinLobby: action(async (router, lobbyId) => {
    try {
      const res = await router.send("lobby:join", { lobbyId })
      if (!res.success) error.value = "Could not join lobby"
      else {
        if (res.lobby) {
          lobby.value = res.lobby
          if (res.chat.length > 0) {
            const next = new Map(lobbyChatMessages.value)
            next.set(res.lobby.id, res.chat)
            lobbyChatMessages.value = next
          }
        }
        const list = await router.send("friends:list")
        friends.value = list.friends
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to join lobby"
    }
  }),
  leaveLobby: action(async (router, lobbyId: string) => {
    try {
      await router.send("lobby:leave", { lobbyId })
      if (lobby.value?.id === lobbyId) lobby.value = null
      const next = new Map(lobbyChatMessages.value)
      next.delete(lobbyId)
      lobbyChatMessages.value = next
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to leave"
    }
  }),
  readyLobby: action(async (router, lobbyId: string) => {
    try {
      const res = await router.send("lobby:ready", { lobbyId })
      if (!res.success) error.value = "Could not set ready"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to set ready"
    }
  }),
  unreadyLobby: action(async (router, lobbyId: string) => {
    try {
      const res = await router.send("lobby:unready", { lobbyId })
      if (!res.success) error.value = "Could not unready"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  transferLobbyOwner: action(
    async (router, lobbyId: string, newOwnerId: string) => {
      try {
        const res = await router.send("lobby:transferOwner", {
          lobbyId,
          newOwnerId,
        })
        if (!res.success) error.value = "Could not transfer owner"
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed"
      }
    }
  ),
  kickFromLobby: action(async (router, lobbyId: string, playerId: string) => {
    try {
      const res = await router.send("lobby:kick", { lobbyId, playerId })
      if (!res.success) error.value = "Could not kick player"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  setLobbyVisibility: action(
    async (router, lobbyId: string, visibility: LobbyVisibility) => {
      try {
        const res = await router.send("lobby:setVisibility", {
          lobbyId,
          visibility,
        })
        if (!res.success) error.value = "Could not set visibility"
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed"
      }
    }
  ),
  sendLobbyChat: action(async (router, lobbyId: string, text: string) => {
    try {
      await router.send("lobby:sendChat", { lobbyId, text })
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to send"
    }
  }),
  inviteFriendToLobby: action(
    async (router, lobbyId: string, friendId: string) => {
      try {
        const res = await router.send("lobby:inviteFriend", {
          lobbyId,
          friendId,
        })
        if (!res.success) error.value = "Could not invite"
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed"
      }
    }
  ),
  acceptLobbyInvite: action(async (router, lobbyId: string) => {
    error.value = null
    try {
      const res = await router.send("lobby:acceptInvite", { lobbyId })
      if (!res.success) error.value = "Could not join lobby"
      else {
        if (res.lobby) {
          lobby.value = res.lobby
          if (res.chat.length > 0) {
            const next = new Map(lobbyChatMessages.value)
            next.set(res.lobby.id, res.chat)
            lobbyChatMessages.value = next
          }
        }
        lobbyInvites.value = lobbyInvites.value.filter(
          (inv) => inv.lobbyId !== lobbyId
        )
        const list = await router.send("friends:list")
        friends.value = list.friends
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to join"
    }
  }),
  dismissLobbyInvite: (lobbyId: string) => {
    lobbyInvites.value = lobbyInvites.value.filter(
      (inv) => inv.lobbyId !== lobbyId
    )
  },
  cancelLobbyInvite: action(async (router, lobbyId: string, userId: string) => {
    try {
      const res = await router.send("lobby:cancelInvite", {
        lobbyId,
        userId,
      })
      if (!res.success) error.value = "Could not cancel invite"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  startLobby: action(async (router, lobbyId: string) => {
    try {
      const res = await router.send("lobby:start", { lobbyId })
      if (!res.success) error.value = "Could not start (all must be ready)"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to start"
    }
  }),
  takeTurn: action(async (router, gameId: string) => {
    try {
      const res = await router.send("game:turn", { gameId })
      if (!res.success) error.value = "Not your turn or game ended"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  leaveGame: action(async (router) => {
    const gameId = gameInstance.value?.id
    if (!gameId) {
      gameInstance.value = null
      return
    }
    try {
      const res = await router.send("game:leave", { gameId })
      if (res.success) {
        gameInstance.value = null
        waitingForReconnect.value = null
      } else error.value = "Could not leave game"
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to leave"
    }
  }),
  addFriend: action(async (router, userId: string) => {
    try {
      const res = await router.send("friend_requests:send", {
        addresseeId: userId,
      })
      if (!res.success) error.value = "Could not send request"
      else {
        const pending = await router.send("friend_requests:pending_sent")
        pendingSentAddresseeIds.value = pending.addresseeIds
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  acceptFriendRequest: action(async (router, requesterId: string) => {
    try {
      const res = await router.send("friend_requests:accept", {
        requesterId,
      })
      if (!res.success) error.value = "Could not accept"
      else {
        const [list, requests] = await Promise.all([
          router.send("friends:list"),
          router.send("friend_requests:list"),
        ])
        friends.value = list.friends
        friendRequests.value = requests.requests
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  declineFriendRequest: action(async (router, requesterId: string) => {
    try {
      await router.send("friend_requests:decline", { requesterId })
      const res = await router.send("friend_requests:list")
      friendRequests.value = res.requests
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
  removeFriend: action(async (router, friendId: string) => {
    try {
      const res = await router.send("friends:remove", { friendId })
      if (!res.success) error.value = "Could not remove friend"
      else friends.value = friends.value.filter((f) => f.id !== friendId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed"
    }
  }),
}
