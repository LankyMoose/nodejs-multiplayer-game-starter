import { GameLobby } from "shared"
import { game } from "@/state/game"
import LobbyPlayers from "@/features/lobby/lobby-players"

export default function LobbyViewScreen({
  lobby,
  userId,
}: {
  lobby: GameLobby
  userId: string
}) {
  const connectedPlayers = lobby.players.filter(
    (p) => !lobby.disconnectedPlayerIds.includes(p.id)
  )
  const isReady = lobby.readyPlayers.includes(userId)
  const allReady =
    connectedPlayers.length >= lobby.requiredPlayers &&
    connectedPlayers.every((p) => lobby.readyPlayers.includes(p.id))

  return (
    <div className="game-panel p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="game-title text-lg tracking-wide text-(--game-text)">
          Lobby
        </h2>
        <button
          type="button"
          onclick={() => game.leaveLobby(lobby.id)}
          data-cancel="true"
          className="btn-ghost text-sm"
        >
          Leave
        </button>
      </div>

      <p className="text-xs font-mono text-(--game-text-dim) break-all bg-black/20 px-2 py-1.5 border border-(--game-surface-border)">
        {lobby.id}
      </p>

      <LobbyPlayers lobby={lobby} userId={userId} />

      <p className="text-xs text-(--game-text-dim)">
        {connectedPlayers.length} / {lobby.players.length} connected · need{" "}
        {lobby.requiredPlayers} to start
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onclick={() =>
            isReady ? game.unreadyLobby(lobby.id) : game.readyLobby(lobby.id)
          }
          data-cancel={isReady ? "true" : "false"}
          className={
            isReady
              ? "btn-ghost border border-(--game-success)/50 text-(--game-success)"
              : "btn-success"
          }
        >
          {isReady ? "Unready" : "Ready"}
        </button>
        {allReady && (
          <button
            type="button"
            onclick={() => game.startLobby(lobby.id)}
            className="btn-gold"
          >
            Start game
          </button>
        )}
      </div>
    </div>
  )
}
