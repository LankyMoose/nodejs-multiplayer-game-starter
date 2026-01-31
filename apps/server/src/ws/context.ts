import type { GameInstance, GameLobby, Player } from "shared";
import type { db } from "../db/index.js";
import type { user, userFriend, friendRequest } from "../db/schema.js";
import type {
  broadcastToUsers,
  emitToUser,
  hasConnections,
} from "../game/store.js";

export type WsContext = {
  userId: string;
  session: { user: { id: string; name: string | null } };
  socketPlayer: Player;
  log: {
    info: (o: object, msg?: string) => void;
    warn: (err: unknown, msg?: string) => void;
  };
  lobbies: Map<string, GameLobby>;
  games: Map<string, GameInstance>;
  broadcastToUsers: typeof broadcastToUsers;
  emitToUser: typeof emitToUser;
  hasConnections: typeof hasConnections;
  db: typeof db;
  schema: {
    user: typeof user;
    userFriend: typeof userFriend;
    friendRequest: typeof friendRequest;
  };
  GAME_LOBBY_LIMITS: { maxPlayers: number; requiredPlayers: number };
};
