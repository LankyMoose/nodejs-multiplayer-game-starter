import { CrownIcon } from "@/components/icons/crown"
import { game } from "@/state/game"
import { GameLobby } from "shared"

export function LobbyViewScreen({
  lobby,
  userId,
  friendIds,
  pendingSentAddresseeIds,
}: {
  lobby: GameLobby
  userId: string
  friendIds: string[]
  pendingSentAddresseeIds: string[]
}) {
  const disconnected = lobby.disconnectedPlayerIds ?? []
  const connectedPlayers = lobby.players.filter(
    (p) => !disconnected.includes(p.id)
  )
  const isReady = lobby.readyPlayers.includes(userId)
  const allReady =
    connectedPlayers.length >= lobby.requiredPlayers &&
    connectedPlayers.every((p) => lobby.readyPlayers.includes(p.id))

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
          <li key={p.id} className="text-sm flex items-center gap-2 flex-wrap">
            <span className={p.id === userId ? "text-purple-300" : ""}>
              {p.name}
              {p.id === userId ? " (you)" : ""}
            </span>
            {lobby.ownerId === p.id && (
              <span title="Lobby Owner">
                <CrownIcon className="w-4 h-4 text-amber-400" />
              </span>
            )}
            {disconnected.includes(p.id) && (
              <span className="text-gray-500 text-xs">disconnected</span>
            )}
            {lobby.readyPlayers.includes(p.id) && (
              <span className="text-green-400 text-xs">ready</span>
            )}
            {lobby.ownerId === userId && p.id !== userId && (
              <>
                <button
                  type="button"
                  onclick={() => game.transferLobbyOwner(lobby.id, p.id)}
                  className="text-xs text-gray-400 hover:text-primary underline"
                >
                  Make owner
                </button>
                <button
                  type="button"
                  onclick={() => game.kickFromLobby(lobby.id, p.id)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Kick
                </button>
              </>
            )}
            {p.id !== userId &&
              !friendIds.includes(p.id) &&
              pendingSentAddresseeIds.includes(p.id) && (
                <span className="text-gray-500 text-xs">pending</span>
              )}
            {p.id !== userId &&
              !friendIds.includes(p.id) &&
              !pendingSentAddresseeIds.includes(p.id) && (
                <button
                  type="button"
                  onclick={() => game.addFriend(p.id)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Add friend
                </button>
              )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        {connectedPlayers.length} / {lobby.players.length} connected · need{" "}
        {lobby.requiredPlayers} to start
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onclick={() =>
            isReady ? game.unreadyLobby(lobby.id) : game.readyLobby(lobby.id)
          }
          className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm"
        >
          {isReady ? "Unready" : "Ready"}
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
