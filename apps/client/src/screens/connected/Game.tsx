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
    <div className="flex flex-col gap-4 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary">
          Game {gameInstance.status === "finished" ? "— Over" : ""}
        </h2>
        <button
          type="button"
          onclick={game.leaveGame}
          className="text-sm text-gray-400 hover:text-primary"
        >
          Leave
        </button>
      </div>
      <p className="text-xs text-gray-500 font-mono break-all">
        ID: {gameInstance.id}
      </p>
      {gameInstance.status === "playing" ? (
        <>
          <p className="text-sm">
            {isMyTurn ? (
              <span className="text-green-400">Your turn</span>
            ) : (
              <span className="text-gray-400">Waiting for other player…</span>
            )}
          </p>
          {isMyTurn && (
            <button
              type="button"
              onclick={() => game.takeTurn(gameInstance.id)}
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm w-fit"
            >
              Take turn
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400">Game finished.</p>
      )}
    </div>
  )
}
