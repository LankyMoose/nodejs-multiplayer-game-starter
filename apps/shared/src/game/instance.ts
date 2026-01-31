export type GameStatus = "playing" | "finished";

export interface GameInstance {
  id: string;
  lobbyId: string;
  /** Turn order: player ids. */
  playerOrder: string[];
  /** Index of the player whose turn it is. */
  currentTurnIndex: number;
  status: GameStatus;
}
