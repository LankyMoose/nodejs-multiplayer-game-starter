import { game } from "@/state/game"
import { auth } from "@/state/auth"
import type { FriendStatus } from "shared"

function friendStatusLabel(status: FriendStatus): string {
  switch (status.kind) {
    case "offline":
      return "offline"
    case "menu":
      return "in menu"
    case "lobby":
      return `in lobby (${status.playerCount}/${status.maxPlayers})`
    case "in_game":
      return "in game"
    default:
      return "—"
  }
}

export default function FriendsList() {
  const friends = game.$friends
  const currentLobby = game.$lobby
  const userId = auth.$user?.id
  const inLobby = !!currentLobby
  const isOwner = !!userId && currentLobby?.ownerId === userId

  return (
    <section className="game-panel p-4">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
        Friends
      </h3>
      <ul className="flex flex-col gap-2">
        {friends.map((f) => {
          const canJoinOpenLobby =
            f.status.kind === "lobby" &&
            f.status.isOpen &&
            f.status.playerCount < f.status.maxPlayers &&
            !inLobby
          const isAlreadyInvited = (currentLobby?.invitedUsers ?? []).some(
            (u) => u.id === f.id
          )
          const canInviteToLobby =
            inLobby &&
            isOwner &&
            currentLobby &&
            !currentLobby.players.some((p) => p.id === f.id) &&
            !isAlreadyInvited &&
            currentLobby.players.length < currentLobby.maxPlayers &&
            f.status.kind === "menu"

          return (
            <li
              key={f.id}
              className="flex flex-col gap-1 py-2 px-3 bg-white/5 border border-(--game-surface-border) rounded text-sm"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block w-2 h-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      f.status.kind === "offline"
                        ? "var(--game-muted)"
                        : "var(--game-success)",
                  }}
                  title={friendStatusLabel(f.status)}
                  aria-hidden
                />
                <span className="text-(--game-text) font-medium truncate flex-1 min-w-0">
                  {f.name}
                </span>
                <span className="text-xs text-(--game-text-dim) shrink-0">
                  {friendStatusLabel(f.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                {canJoinOpenLobby &&
                  f.status.kind === "lobby" &&
                  (() => {
                    const lobbyId = f.status.lobbyId
                    return (
                      <button
                        type="button"
                        onclick={() => game.joinLobby(lobbyId)}
                        className="btn-ghost text-xs text-(--game-success) hover:bg-(--game-success)/15 border border-(--game-success)/50"
                      >
                        Join
                      </button>
                    )
                  })()}
                {canInviteToLobby && (
                  <button
                    type="button"
                    onclick={() =>
                      currentLobby &&
                      game.inviteFriendToLobby(currentLobby.id, f.id)
                    }
                    className="btn-ghost text-xs text-(--game-accent) hover:bg-(--game-accent)/15"
                  >
                    Invite to lobby
                  </button>
                )}
                {isAlreadyInvited && (
                  <span className="text-xs text-(--game-text-dim) italic">
                    Invited
                  </span>
                )}
                <button
                  type="button"
                  onclick={() => game.removeFriend(f.id)}
                  data-cancel="true"
                  className="btn-ghost text-xs py-0.5 px-1.5 text-(--game-muted) hover:text-(--game-danger)"
                  title="Remove friend"
                >
                  Remove
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
