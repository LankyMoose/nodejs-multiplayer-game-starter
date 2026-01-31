import type { Player } from "./player.js";

export interface GameLobby {
  id: string;
  maxPlayers: number;
  requiredPlayers: number;
  players: Player[];
  /** Player ids that have marked ready (serializable for wire). */
  readyPlayers: Player["id"][];
}
