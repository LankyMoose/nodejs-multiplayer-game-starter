import type { GameInstance } from "shared"
import { game } from "@/state/game"

type Props = {
  gameInstance: GameInstance
  userId: string
}

export function GameScreen({ gameInstance, userId }: Props) {
  const currentPlayerId =
    gameInstance.playerOrder[gameInstance.currentTurnIndex]
  const isMyTurn = currentPlayerId === userId

  return (
    <div className="game-panel p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="game-title text-lg tracking-wide text-(--game-text)">
          Game {gameInstance.status === "finished" ? "— Over" : ""}
        </h2>
        <button
          type="button"
          onclick={game.leaveGame}
          className="btn-ghost text-sm"
        >
          Leave
        </button>
      </div>

      <p className="text-xs font-mono text-(--game-text-dim) break-all bg-black/20 px-2 py-1.5 border border-(--game-surface-border)">
        {gameInstance.id}
      </p>

      {gameInstance.status === "playing" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {isMyTurn ? (
              <span className="badge badge-success text-base py-1.5 px-3">
                Your turn
              </span>
            ) : (
              <span className="text-(--game-text-dim)">
                Waiting for other player…
              </span>
            )}
          </p>
          {isMyTurn && (
            <button
              type="button"
              onclick={() => game.takeTurn(gameInstance.id)}
              className="btn-primary w-fit"
            >
              Take turn
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-(--game-text-dim)">Game finished.</p>
      )}
    </div>
  )
}
