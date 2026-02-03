import type { Contract } from "./ws/contract.js";
import type { GameInstance } from "./game/instance.js";
import type { GameLobby, LobbyVisibility } from "./game/lobby.js";

/** Friend status for display. */
export type FriendStatus =
  | { kind: "offline" }
  | { kind: "menu" }
  | {
      kind: "lobby";
      lobbyId: string;
      playerCount: number;
      maxPlayers: number;
      isOpen: boolean;
    }
  | { kind: "in_game" };

export interface LobbySuccessResult {
  success: true;
  lobby: GameLobby;
  chat: Array<{
    userId: string;
    userName: string;
    text: string;
  }>;
}

export type WebSocketContract = Contract<{
  serverEvents: {
    "user:disconnect": string;
    "match:started": string;
    "lobby:updated": GameLobby;
    "lobby:kicked": { lobbyId: string };
    "lobby:chat": {
      lobbyId: string;
      userId: string;
      userName: string;
      text: string;
    };
    "lobby:invited": {
      lobbyId: string;
      inviterId: string;
      inviterName: string;
    };
    "lobby:inviteCancelled": { lobbyId: string };
    "friend_request:received": {
      requesterId: string;
      requesterName: string;
    };
    "friend_request:accepted": {
      friendId: string;
      friendName: string;
      online: boolean;
    };
    "friend:removed": { friendId: string };
    "friend:online": { userId: string };
    "friend:offline": { userId: string };
    "friend:status": { userId: string; status: FriendStatus };
    "game:started": GameInstance;
    "game:turn": { game: GameInstance; previousPlayerId: string };
    "game:ended": GameInstance;
    "game:updated": GameInstance;
    /** Disconnected player reconnected; update overlay. */
    "game:playerReconnected": { gameId: string; playerId: string };
    /** List of players we're waiting to reconnect (empty = none). */
    "game:waitingForReconnect": {
      gameId: string;
      disconnected: { playerId: string; playerName: string }[];
    };
    /** Space game: full game state update */
    "space:gameState": {
      instanceId: string;
      tick: number;
      ships: Array<{
        id: string;
        playerId: string;
        playerName: string;
        position: { x: number; y: number };
        velocity: { x: number; y: number };
        rotation: number;
        health: number;
        maxHealth: number;
        isThrusting: boolean;
      }>;
    };
    /** Space game: player joined instance */
    "space:playerJoined": {
      instanceId: string;
      playerId: string;
      playerName: string;
    };
    /** Space game: player left instance */
    "space:playerLeft": {
      instanceId: string;
      playerId: string;
    };
  };
  rpc: {
    "session:state": {
      res: {
        lobby: GameLobby | null;
        game: GameInstance | null;
        lobbyChatMessages: Array<{
          userId: string;
          userName: string;
          text: string;
        }>;
      };
    };
    "lobby:create": { res: { lobbyId: string } };
    "lobby:join": {
      req: { lobbyId: string };
      res: { success: false; lobby: null } | LobbySuccessResult;
    };
    "lobby:leave": { req: { lobbyId: string }; res: { success: boolean } };
    "lobby:ready": { req: { lobbyId: string }; res: { success: boolean } };
    "lobby:unready": { req: { lobbyId: string }; res: { success: boolean } };
    "lobby:setVisibility": {
      req: { lobbyId: string; visibility: LobbyVisibility };
      res: { success: boolean };
    };
    "lobby:transferOwner": {
      req: { lobbyId: string; newOwnerId: string };
      res: { success: boolean };
    };
    "lobby:kick": {
      req: { lobbyId: string; playerId: string };
      res: { success: boolean };
    };
    "lobby:start": {
      req: { lobbyId: string };
      res: { success: boolean; gameId?: string };
    };
    "lobby:sendChat": {
      req: { lobbyId: string; text: string };
      res: { success: boolean };
    };
    "lobby:inviteFriend": {
      req: { lobbyId: string; friendId: string };
      res: { success: boolean };
    };
    "lobby:cancelInvite": {
      req: { lobbyId: string; userId: string };
      res: { success: boolean };
    };
    "lobby:acceptInvite": {
      req: { lobbyId: string };
      res: { success: false; lobby: null } | LobbySuccessResult;
    };
    "game:turn": {
      req: { gameId: string };
      res: { success: boolean };
    };
    "game:leave": {
      req: { gameId: string };
      res: { success: boolean };
    };
    "friends:list": {
      res: {
        friends: {
          id: string;
          name: string;
          online: boolean;
          status: FriendStatus;
        }[];
      };
    };
    "friends:remove": {
      req: { friendId: string };
      res: { success: boolean };
    };
    "friend_requests:list": {
      res: { requests: { requesterId: string; requesterName: string }[] };
    };
    "friend_requests:send": {
      req: { addresseeId: string };
      res: { success: boolean };
    };
    "friend_requests:pending_sent": {
      res: { addresseeIds: string[] };
    };
    "friend_requests:accept": {
      req: { requesterId: string };
      res: { success: boolean };
    };
    "friend_requests:decline": {
      req: { requesterId: string };
      res: { success: boolean };
    };
    /** Space game: create new instance for player */
    "space:createInstance": {
      res: { success: boolean; instanceId?: string };
    };
    /** Space game: send player input */
    "space:sendInput": {
      req: {
        instanceId: string;
        input: {
          thrust: boolean;
          rotateLeft: boolean;
          rotateRight: boolean;
          brake: boolean;
          sequenceNumber: number;
          timestamp: number;
        };
      };
      res: { success: boolean };
    };
    /** Space game: warp to friend's instance */
    "space:warpToFriend": {
      req: { friendId: string };
      res: { success: boolean; instanceId?: string };
    };
    /** Space game: leave current instance */
    "space:leaveInstance": {
      req: { instanceId: string };
      res: { success: boolean };
    };
  };
}>;
