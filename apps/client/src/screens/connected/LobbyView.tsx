import { game } from "@/state/game"
import { GameLobby } from "shared"

export function LobbyViewScreen({
  lobby,
  userId,
}: {
  lobby: GameLobby
  userId: string
}) {
  const isReady = lobby.readyPlayers.includes(userId)
  const allReady =
    lobby.players.length >= lobby.requiredPlayers &&
    lobby.players.every((p) => lobby.readyPlayers.includes(p.id))

  return (
    <div className="flex flex-col gap-4 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary">Lobby</h2>
        <button
          type="button"
          onclick={() => game.leaveLobby(lobby.id)}
          className="text-sm text-gray-400 hover:text-primary"
        >
          Leave
        </button>
      </div>
      <p className="text-xs text-gray-500 font-mono break-all">
        ID: {lobby.id}
      </p>
      <ul className="flex flex-col gap-1">
        {lobby.players.map((p) => (
          <li key={p.id} className="text-sm flex items-center gap-2">
            <span className={p.id === userId ? "text-purple-300" : ""}>
              {p.name}
              {p.id === userId ? " (you)" : ""}
            </span>
            {lobby.readyPlayers.includes(p.id) && (
              <span className="text-green-400 text-xs">ready</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        {lobby.players.length} / {lobby.maxPlayers} · need{" "}
        {lobby.requiredPlayers} to start
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isReady}
          onclick={() => game.readyLobby(lobby.id)}
          className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
        >
          Ready
        </button>
        {allReady && (
          <button
            type="button"
            onclick={() => game.startLobby(lobby.id)}
            className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            Start game
          </button>
        )}
      </div>
    </div>
  )
}
