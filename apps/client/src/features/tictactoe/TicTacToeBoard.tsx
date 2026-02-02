import { game } from "@/state/game";
import type { GameInstance } from "shared";

interface TicTacToeBoardProps {
  gameInstance: GameInstance;
  userId: string;
}

export const TicTacToeBoard = ({ gameInstance, userId }: TicTacToeBoardProps) => {
  const isMyTurn = gameInstance.playerOrder[gameInstance.currentTurnIndex] === userId;
  const board = gameInstance.state?.board || Array(9).fill(null);
  
  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null || gameInstance.status !== "playing") return;
    game.makeTicTacToeMove(gameInstance.id, index);
  };

  const getPlayerSymbol = (playerId: string | null) => {
    if (!playerId) return null;
    const index = gameInstance.playerOrder.indexOf(playerId);
    return index === 0 ? "X" : "O";
  };

  const winnerId = gameInstance.state?.winner;
  const isDraw = gameInstance.state?.isDraw;

  return (
    <div className="flex flex-col items-center gap-4">
       <div className="text-center">
        {gameInstance.status === "finished" ? (
             <h3 className="text-xl font-bold text-(--game-text)">
                {winnerId 
                    ? (winnerId === userId ? "You Won!" : "You Lost!") 
                    : isDraw ? "Draw!" : "Game Over"}
             </h3>
        ) : (
            <h3 className="text-lg text-(--game-text)">
                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
            </h3>
        )}
       </div>

      <div className="grid grid-cols-3 gap-2 p-2 bg-(--game-surface-2) rounded-lg select-none">
        {board.map((cell, index) => {
          const symbol = getPlayerSymbol(cell);
          const canClick = isMyTurn && cell === null && gameInstance.status === "playing";
          return (
            <button
              key={index}
              type="button"
              onclick={() => handleCellClick(index)}
              disabled={!canClick && cell === null}
              className={`
                w-20 h-20 text-4xl font-bold flex items-center justify-center rounded
                border-2 border-(--game-surface-border)
                transition-all duration-150
                ${cell === null 
                    ? "bg-(--game-bg) hover:bg-(--game-surface) hover:border-(--game-accent)" 
                    : "bg-(--game-surface)"}
                ${symbol === "X" ? "text-blue-400" : "text-red-400"}
                ${!canClick && cell === null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
};
