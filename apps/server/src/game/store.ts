import type {
  FriendStatus,
  GameInstance,
  GameLobby,
  ServerRouter,
  WebSocketContract,
} from "shared";

export const lobbies = new Map<string, GameLobby>();
export const games = new Map<string, GameInstance>();
/** Pending lobby invites: addresseeId -> { lobbyId, inviterId }. */
export const lobbyInvites = new Map<
  string,
  { lobbyId: string; inviterId: string }
>();

const MAX_LOBBY_CHAT = 100;
/** Lobby chat history: lobbyId -> messages (newest at end). */
const lobbyChatMessages = new Map<
  string,
  Array<{ userId: string; userName: string; text: string }>
>();

const userConnections = new Map<
  string,
  Array<{
    router: ServerRouter<WebSocketContract>;
    session: { user: { id: string; name: string | null } };
  }>
>();

export function getUserLobby(userId: string): GameLobby | null {
  return (
    [...lobbies.values()].find((l) => l.players.some((p) => p.id === userId)) ??
    null
  );
}

export function getLobbyChat(
  lobbyId: string
): Array<{ userId: string; userName: string; text: string }> {
  return lobbyChatMessages.get(lobbyId) ?? [];
}

export function appendLobbyChat(
  lobbyId: string,
  msg: { userId: string; userName: string; text: string }
): void {
  const list = lobbyChatMessages.get(lobbyId) ?? [];
  list.push(msg);
  if (list.length > MAX_LOBBY_CHAT) list.shift();
  lobbyChatMessages.set(lobbyId, list);
}

export function clearLobbyChat(lobbyId: string): void {
  lobbyChatMessages.delete(lobbyId);
}

export function getUserGame(userId: string): GameInstance | null {
  return (
    [...games.values()].find((g) => g.playerOrder.includes(userId)) ?? null
  );
}

/** Players who disconnected; remaining players see overlay until they reconnect or "Continue without them". */
export const gameDisconnectedPlayers = new Map<string, Map<string, string>>();

/** Remove a player from their game (used on disconnect when not promptToContinue). Returns true if game was updated or deleted. */
export function removePlayerFromGameByUserId(
  userId: string
): { gameId: string; game: GameInstance } | null {
  const game = getUserGame(userId);
  if (!game) return null;
  const gameId = game.id;
  const idx = game.playerOrder.indexOf(userId);
  if (idx === -1) return null;

  game.playerOrder = game.playerOrder.filter((id) => id !== userId);
  if (game.playerOrder.length === 0) {
    games.delete(gameId);
    return { gameId, game };
  }
  if (idx < game.currentTurnIndex) {
    game.currentTurnIndex = Math.max(0, game.currentTurnIndex - 1);
  }
  if (game.currentTurnIndex >= game.playerOrder.length) {
    game.currentTurnIndex = 0;
  }
  return { gameId, game };
}

export function getFriendStatus(userId: string): FriendStatus {
  if (!hasConnections(userId)) return { kind: "offline" };
  const userGame = [...games.values()].find((g) =>
    g.playerOrder.includes(userId)
  );
  if (userGame) return { kind: "in_game" };
  const userLobby = getUserLobby(userId);
  if (userLobby) {
    const connected = userLobby.players.filter(
      (p) => !userLobby.disconnectedPlayerIds.includes(p.id)
    );
    return {
      kind: "lobby",
      lobbyId: userLobby.id,
      playerCount: connected.length,
      maxPlayers: userLobby.maxPlayers,
      isOpen: userLobby.visibility === "open",
    };
  }
  return { kind: "menu" };
}

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
