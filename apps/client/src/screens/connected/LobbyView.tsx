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
    <div className="game-panel p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="game-title text-lg tracking-wide text-(--game-text)">
          Lobby
        </h2>
        <button
          type="button"
          onclick={() => game.leaveLobby(lobby.id)}
          className="btn-ghost text-sm"
        >
          Leave
        </button>
      </div>

      <p className="text-xs font-mono text-(--game-text-dim) break-all bg-black/20 px-2 py-1.5 border border-(--game-surface-border)">
        {lobby.id}
      </p>

      <ul className="flex flex-col gap-3">
        {lobby.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 flex-wrap text-sm py-2 px-3 bg-white/5 border-2 border-(--game-surface-border)"
          >
            <span
              className={
                p.id === userId
                  ? "text-(--game-accent) font-semibold"
                  : "text-(--game-text)"
              }
            >
              {p.name}
              {p.id === userId ? " (you)" : ""}
            </span>
            {lobby.ownerId === p.id && (
              <span title="Lobby Owner" className="flex items-center">
                <CrownIcon className="w-4 h-4 text-(--game-gold)" />
              </span>
            )}
            {disconnected.includes(p.id) && (
              <span className="badge badge-muted">disconnected</span>
            )}
            {lobby.readyPlayers.includes(p.id) &&
              !disconnected.includes(p.id) && (
                <span className="badge badge-success">ready</span>
              )}
            {lobby.ownerId === userId && p.id !== userId && (
              <div className="flex gap-1 ml-auto">
                <button
                  type="button"
                  onclick={() => game.transferLobbyOwner(lobby.id, p.id)}
                  className="btn-ghost text-xs"
                >
                  Make owner
                </button>
                <button
                  type="button"
                  onclick={() => game.kickFromLobby(lobby.id, p.id)}
                  className="btn-ghost text-xs text-(--game-danger) hover:bg-red-500/10"
                >
                  Kick
                </button>
              </div>
            )}
            {p.id !== userId &&
              !friendIds.includes(p.id) &&
              pendingSentAddresseeIds.includes(p.id) && (
                <span className="badge badge-muted">pending</span>
              )}
            {p.id !== userId &&
              !friendIds.includes(p.id) &&
              !pendingSentAddresseeIds.includes(p.id) && (
                <button
                  type="button"
                  onclick={() => game.addFriend(p.id)}
                  className="btn-ghost text-xs text-(--game-accent) hover:bg-(--game-accent)/15"
                >
                  Add friend
                </button>
              )}
          </li>
        ))}
      </ul>

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
