import type { Contract } from "./ws/contract.js";
import type { GameInstance } from "./game/instance.js";
import type { GameLobby, LobbyVisibility } from "./game/lobby.js";

/** Friend status for display. */
export type FriendStatus =
  | { kind: "offline" }
  | { kind: "menu" }
  | { kind: "lobby"; lobbyId: string; playerCount: number; maxPlayers: number; isOpen: boolean }
  | { kind: "in_game" };

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
  };
  rpc: {
    "session:state": {
      res: { lobby: GameLobby | null; game: GameInstance | null };
    };
    "lobby:create": { res: { lobbyId: string } };
    "lobby:join": {
      req: { lobbyId: string };
      res:
        | { success: false; lobby: null }
        | { success: true; lobby: GameLobby };
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
    "lobby:acceptInvite": {
      req: { lobbyId: string };
      res:
        | { success: false; lobby: null }
        | { success: true; lobby: GameLobby };
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
  };
}>;
