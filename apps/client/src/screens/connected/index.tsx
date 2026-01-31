import { auth } from "@/state/auth"
import { game } from "@/state/game"
import { GameScreen } from "./Game"
import { LobbyViewScreen } from "./LobbyView"
import { LobbySetupScreen } from "./LobbySetup"
import { env } from "../../env"

interface ConnectedViewProps {
  userId: string
}

export function ConnectedView({ userId }: ConnectedViewProps) {
  const friends = game.$friends

  return (
    <div className="flex flex-col w-full max-w-4xl min-h-0 gap-4">
      <header className="flex items-center justify-between shrink-0 px-1">
        <h1 className="game-title text-xl tracking-wide">{env.APP_NAME}</h1>
        <button
          type="button"
          onclick={auth.signOut}
          className="btn-ghost text-sm"
        >
          Sign out
        </button>
      </header>

      <div className="flex flex-1 min-h-0 gap-4 flex-col lg:flex-row">
        <aside className="flex flex-col gap-4 shrink-0 lg:w-56">
          {friends.length > 0 && (
            <section className="game-panel p-4">
              <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
                Friends
              </h3>
              <ul className="flex flex-col gap-2">
                {friends.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 flex-wrap text-sm"
                  >
                    <span
                      className="inline-block w-2 h-2 shrink-0"
                      style={{
                        backgroundColor: f.online
                          ? "var(--game-success)"
                          : "var(--game-muted)",
                      }}
                      title={f.online ? "Online" : "Offline"}
                      aria-hidden
                    />
                    <span className="text-(--game-text) font-medium truncate flex-1 min-w-0">
                      {f.name}
                    </span>
                    <span className="text-xs text-(--game-text-dim)">
                      {f.online ? "online" : "offline"}
                    </span>
                    <button
                      type="button"
                      onclick={() => game.removeFriend(f.id)}
                      className="btn-ghost text-xs py-1 px-2 text-(--game-muted) hover:text-(--game-danger)"
                      title="Remove friend"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {game.$friendRequests.length > 0 && (
            <section className="game-panel p-4">
              <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
                Friend requests
              </h3>
              <ul className="flex flex-col gap-2">
                {game.$friendRequests.map((req) => (
                  <li
                    key={req.requesterId}
                    className="flex items-center gap-2 flex-wrap text-sm"
                  >
                    <span className="text-(--game-text) truncate flex-1 min-w-0">
                      {req.requesterName}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onclick={() =>
                          game.acceptFriendRequest(req.requesterId)
                        }
                        className="btn-ghost text-xs text-(--game-success) hover:bg-green-500/10"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onclick={() =>
                          game.declineFriendRequest(req.requesterId)
                        }
                        className="btn-ghost text-xs text-(--game-danger) hover:bg-red-500/10"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <main className="flex flex-col flex-1 min-w-0">
          {game.$error && (
            <div
              className="flex items-center justify-between gap-2 px-4 py-2 bg-red-500/15 border-2 border-red-500/50 text-red-400 text-sm mb-4"
              role="alert"
            >
              <span>{game.$error}</span>
              <button
                type="button"
                onclick={game.clearError}
                className="btn-ghost p-1"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {game.$instance ? (
            <GameScreen gameInstance={game.$instance} userId={userId} />
          ) : game.$lobby ? (
            <LobbyViewScreen
              lobby={game.$lobby}
              userId={userId}
              friendIds={game.$friends.map((f) => f.id)}
              pendingSentAddresseeIds={game.$pendingSentAddresseeIds}
            />
          ) : (
            <LobbySetupScreen />
          )}
        </main>
      </div>
    </div>
  )
}
