import type { Contract } from "./ws/contract.js";
import type { GameInstance } from "./game/instance.js";
import type { GameLobby } from "./game/lobby.js";

export type WebSocketContract = Contract<{
  serverEvents: {
    "user:disconnect": string;
    "match:started": string;
    "lobby:updated": GameLobby;
    "game:started": GameInstance;
    "game:turn": { game: GameInstance; previousPlayerId: string };
    "game:ended": GameInstance;
  };
  rpc: {
    ping: { res: "pong" };
    "match:join": { req: { id: string }; res: { success: boolean } };
    "lobby:create": { res: { lobbyId: string } };
    "lobby:join": {
      req: { lobbyId: string };
      res:
        | { success: false; lobby: null }
        | { success: true; lobby: GameLobby };
    };
    "lobby:leave": { req: { lobbyId: string }; res: { success: boolean } };
    "lobby:ready": { req: { lobbyId: string }; res: { success: boolean } };
    "lobby:start": {
      req: { lobbyId: string };
      res: { success: boolean; gameId?: string };
    };
    "game:turn": {
      req: { gameId: string };
      res: { success: boolean };
    };
  };
}>;
