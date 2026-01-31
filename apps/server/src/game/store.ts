import type {
  GameInstance,
  GameLobby,
  Player,
  ServerRouter,
  WebSocketContract,
} from "shared";

export const lobbies = new Map<string, GameLobby>();
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
