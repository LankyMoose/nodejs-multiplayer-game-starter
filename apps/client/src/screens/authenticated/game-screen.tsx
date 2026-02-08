import { signal } from "kiru"
import type { GameInstance } from "shared"
import { game } from "@/state/game"
import LobbyChat from "@/features/lobby/lobby-chat"

type Props = {
  gameInstance: GameInstance
  userId: string
}

const gameChatInput = signal("")

export default function GameScreen({ gameInstance, userId }: Props) {
  const currentPlayerId =
    gameInstance.playerOrder[gameInstance.currentTurnIndex]
  const isMyTurn = currentPlayerId === userId
  const waiting = game.$waitingForReconnect
  const showWaitingOverlay =
    waiting &&
    waiting.gameId === gameInstance.id &&
    waiting.disconnected.length > 0
  const showLobbyChat = game.$lobby?.id === gameInstance.lobbyId

  return (
    <div className="game-panel p-5 flex flex-col gap-5 relative min-h-0">
      {showWaitingOverlay && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded bg-(--game-bg)/95 p-6"
          aria-modal
          role="dialog"
          aria-label="Waiting for players to reconnect"
        >
          <p className="game-title text-sm uppercase tracking-wider text-(--game-text-dim)">
            Waiting for players to reconnect:
          </p>
          <ul className="flex flex-col gap-1.5 text-(--game-text)">
            {waiting.disconnected.map((p) => (
              <li key={p.playerId}>• {p.playerName}</li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap justify-center mt-2">
            <button
              type="button"
              onclick={game.leaveGame}
              className="btn-ghost border-2 border-(--game-danger)/50 text-(--game-danger)"
            >
              Leave game
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="game-title text-lg tracking-wide text-(--game-text)">
          Game {gameInstance.status === "finished" ? "— Over" : ""}
        </h2>
        <button
          type="button"
          onclick={game.leaveGame}
          className="btn-ghost text-sm"
        >
          {gameInstance.status === "finished" ? "Back to lobby" : "Leave game"}
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

      {showLobbyChat && (
        <div className="flex flex-col gap-2 min-h-0 shrink mt-2 border-t border-(--game-surface-border) pt-4">
          <LobbyChat
            lobbyId={gameInstance.lobbyId}
            messages={game.$lobbyChatMessages.get(gameInstance.lobbyId) ?? []}
            chatInput={gameChatInput}
            onSend={() => {
              const t = gameChatInput.value.trim()
              if (t) {
                game.sendLobbyChat(gameInstance.lobbyId, t)
                gameChatInput.value = ""
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
