import { auth } from "@/state/auth"
import { game } from "@/state/game"
import { GameScreen } from "./Game"
import { LobbyViewScreen } from "./LobbyView"
import { LobbySetupScreen } from "./LobbySetup"

interface ConnectedViewProps {
  userId: string
}

export function ConnectedView({ userId }: ConnectedViewProps) {
  const friends = game.$friends

  return (
    <div className="flex flex-col gap-6 max-w-md w-full p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onclick={auth.signOut}
          className="text-sm text-gray-400 hover:text-primary underline"
        >
          Sign out
        </button>
      </div>

      {friends.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-400">Friends</h3>
          <ul className="flex flex-col gap-1">
            {friends.map((f) => (
              <li
                key={f.id}
                className="text-sm flex items-center gap-2 flex-wrap"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: f.online ? "var(--color-green-500, #22c55e)" : "var(--color-gray-500, #6b7280)",
                  }}
                  title={f.online ? "Online" : "Offline"}
                  aria-hidden
                />
                <span className="text-primary">{f.name}</span>
                <span className="text-xs text-gray-500">
                  {f.online ? "online" : "offline"}
                </span>
                <button
                  type="button"
                  onclick={() => game.removeFriend(f.id)}
                  className="text-xs text-gray-500 hover:text-red-400 underline"
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
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-400">Friend requests</h3>
          <ul className="flex flex-col gap-1">
            {game.$friendRequests.map((req) => (
              <li
                key={req.requesterId}
                className="text-sm flex items-center gap-2 flex-wrap"
              >
                <span className="text-primary">{req.requesterName}</span>
                <button
                  type="button"
                  onclick={() => game.acceptFriendRequest(req.requesterId)}
                  className="text-xs text-green-400 hover:text-green-300 underline"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onclick={() => game.declineFriendRequest(req.requesterId)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {game.$error && (
        <div
          className="text-red-400 text-sm flex items-center justify-between gap-2"
          role="alert"
        >
          <span>{game.$error}</span>
          <button
            type="button"
            onclick={game.clearError}
            className="text-gray-500 hover:text-gray-400"
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
    </div>
  )
}
