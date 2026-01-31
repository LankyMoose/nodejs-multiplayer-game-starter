import { game } from "@/state/game"

export default function LobbyInvites() {
  const invites = game.$lobbyInvites
  if (invites.length === 0) return null

  return (
    <section className="game-panel p-4">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
        Lobby invites
      </h3>
      <ul className="flex flex-col gap-2">
        {invites.map((inv) => (
          <li
            key={inv.lobbyId}
            className="flex items-center gap-2 flex-wrap text-sm py-2 px-3 bg-white/5 border border-(--game-surface-border) rounded"
          >
            <span className="text-(--game-text) truncate flex-1 min-w-0">
              {inv.inviterName} invited you
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onclick={() => game.acceptLobbyInvite(inv.lobbyId)}
                className="btn-ghost text-xs text-(--game-success) hover:bg-(--game-success)/15"
              >
                Join
              </button>
              <button
                type="button"
                onclick={() => game.dismissLobbyInvite(inv.lobbyId)}
                className="btn-ghost text-xs text-(--game-muted)"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
