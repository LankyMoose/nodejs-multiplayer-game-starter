import type { Player } from "./player.js";

export type LobbyVisibility = "private" | "open";

export interface GameLobby {
  id: string;
  /** Player id of the lobby owner (can transfer, kick). */
  ownerId: Player["id"];
  maxPlayers: number;
  requiredPlayers: number;
  players: Player[];
  /** Player ids that have marked ready (serializable for wire). */
  readyPlayers: Player["id"][];
  /** Player ids that are currently disconnected (can rejoin on refresh). */
  disconnectedPlayerIds: Player["id"][];
  /** Whether friends can join without an invite. Default private. */
  visibility: LobbyVisibility;
}
