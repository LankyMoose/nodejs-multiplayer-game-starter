import type {
  GameInstance,
  GameLobby,
  Player,
  ServerRouter,
  WebSocketContract,
} from "shared";

export const lobbies = new Map<string, GameLobby>();

/** Remove user from every lobby they're in (optionally except one). Ensures single-lobby invariant. */
export function leaveLobbiesForUser(
  userId: string,
  exceptLobbyId?: string
): void {
  for (const [lobbyId, lobby] of lobbies.entries()) {
    if (exceptLobbyId !== undefined && lobbyId === exceptLobbyId) continue;
    if (!lobby.players.some((p) => p.id === userId)) continue;
    lobby.players = lobby.players.filter((p) => p.id !== userId);
    lobby.readyPlayers = lobby.readyPlayers.filter((id) => id !== userId);
    lobby.disconnectedPlayerIds = (
      lobby.disconnectedPlayerIds ?? []
    ).filter((id) => id !== userId);
    if (lobby.players.length === 0) lobbies.delete(lobbyId);
    else {
      if (lobby.ownerId === userId) {
        const disconnected = lobby.disconnectedPlayerIds ?? [];
        const connected = lobby.players.filter(
          (p) => !disconnected.includes(p.id)
        );
        const newOwner =
          connected[Math.floor(Math.random() * connected.length)];
        if (newOwner) lobby.ownerId = newOwner.id;
      }
      broadcastToUsers(
        lobby.players.map((p) => p.id),
        "lobby:updated",
        lobby
      );
    }
  }
}
export const games = new Map<string, GameInstance>();
const userConnections = new Map<
  string,
  Array<{
    router: ServerRouter<WebSocketContract>;
    session: { user: { id: string; name: string | null } };
  }>
>();

export function registerUser(
  userId: string,
  router: ServerRouter<WebSocketContract>,
  session: { user: { id: string; name: string | null } }
): void {
  const list = userConnections.get(userId) ?? [];
  list.push({ router, session });
  userConnections.set(userId, list);
}

export function unregisterUser(
  userId: string,
  router: ServerRouter<WebSocketContract>
): void {
  const list = userConnections.get(userId);
  if (!list) return;
  const next = list.filter((c) => c.router !== router);
  if (next.length === 0) userConnections.delete(userId);
  else userConnections.set(userId, next);
}

export function hasConnections(userId: string): boolean {
  return (userConnections.get(userId)?.length ?? 0) > 0;
}

export function emitToUser<K extends keyof WebSocketContract["serverEvents"]>(
  userId: string,
  type: K,
  payload: WebSocketContract["serverEvents"][K]
): void {
  const list = userConnections.get(userId) ?? [];
  for (const { router } of list) {
    router.emit(type, payload);
  }
}

export function broadcastToUsers<
  K extends keyof WebSocketContract["serverEvents"]
>(
  userIds: string[],
  type: K,
  payload: WebSocketContract["serverEvents"][K]
): void {
  for (const id of userIds) {
    emitToUser(id, type, payload);
  }
}
