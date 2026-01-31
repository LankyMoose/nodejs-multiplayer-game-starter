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
  {
    router: ServerRouter<WebSocketContract>;
    session: { user: { id: string; name: string | null } };
  }
>();

export function registerUser(
  userId: string,
  router: ServerRouter<WebSocketContract>,
  session: { user: { id: string; name: string | null } }
): void {
  userConnections.set(userId, { router, session });
}

export function unregisterUser(userId: string): void {
  userConnections.delete(userId);
}

export function emitToUser<K extends keyof WebSocketContract["serverEvents"]>(
  userId: string,
  type: K,
  payload: WebSocketContract["serverEvents"][K]
): void {
  userConnections.get(userId)?.router.emit(type, payload);
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
