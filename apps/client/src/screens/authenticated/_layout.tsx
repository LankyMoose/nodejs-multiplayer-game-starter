import { env } from "@/env"
import { auth } from "@/state/auth"
import { game } from "@/state/game"
import FriendsList from "@/features/friends/friends-list"
import FriendRequests from "@/features/friends/friend-requests"
import SendFriendRequest from "@/features/friends/send-friend-request"
import LobbyInvites from "@/features/lobby/lobby-invites"
import { Settings } from "@/features/settings"

interface AuthenticatedLayoutProps {
  children: JSX.Children
}
export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <div className="flex flex-col w-full max-w-4xl min-h-0 gap-4">
      <header className="flex items-center justify-between shrink-0 px-1">
        <h1 className="game-title text-xl tracking-wide">{env.APP_NAME}</h1>
        <div className="flex gap-2">
          <Settings />
          <button
            type="button"
            onclick={auth.signOut}
            className="btn-ghost text-sm"
            data-cancel="true"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 gap-4 flex-col lg:flex-row">
        <aside className="flex flex-col gap-4 shrink-0 lg:w-56 overflow-y-auto">
          <SendFriendRequest />
          <FriendsList />
          {game.$lobbyInvites.length > 0 && <LobbyInvites />}
          {game.$friendRequests.length > 0 && <FriendRequests />}
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
          {children}
        </main>
      </div>
    </div>
  )
}
