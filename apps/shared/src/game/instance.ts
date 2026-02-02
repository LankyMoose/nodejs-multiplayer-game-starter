export type GameStatus = "playing" | "finished";

export interface GameInstance {
  id: string;
  lobbyId: string;
  /** Turn order: player ids. */
  playerOrder: string[];
  /** Index of the player whose turn it is. */
  currentTurnIndex: number;
  state: TicTacToeState;
  status: GameStatus;
}

export interface TicTacToeState {
  board: (string | null)[]; // 9 cells, null or userId
  winner: string | null; // userId or null
  isDraw: boolean;
}
