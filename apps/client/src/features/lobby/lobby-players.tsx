import { GameLobby } from "shared"
import { game } from "@/state/game"
import CrownIcon from "@/components/icons/crown-icon"

interface LobbyPlayersProps {
  userId: string
  lobby: GameLobby
}

export default function LobbyPlayers({ userId, lobby }: LobbyPlayersProps) {
  return (
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
          {lobby.disconnectedPlayerIds.includes(p.id) ? (
            <span className="badge badge-muted">disconnected</span>
          ) : lobby.readyPlayers.includes(p.id) ? (
            <span className="badge badge-success">ready</span>
          ) : null}

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
                data-cancel="true"
                className="btn-ghost text-xs text-(--game-danger) hover:bg-red-500/10"
              >
                Kick
              </button>
            </div>
          )}

          {p.id !== userId && !game.$friends.find((f) => f.id === p.id) && (
            <>
              {game.$pendingSentAddresseeIds.includes(p.id) ? (
                <span className="badge badge-muted">pending</span>
              ) : (
                <button
                  type="button"
                  onclick={() => game.addFriend(p.id)}
                  className="btn-ghost text-xs text-(--game-accent) hover:bg-(--game-accent)/15"
                >
                  Add friend
                </button>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
