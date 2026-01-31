import { auth } from "@/state/auth"
import { game } from "@/state/game"
import { GameScreen } from "./Game"
import { LobbyViewScreen } from "./LobbyView"
import { LobbySetupScreen } from "./LobbySetup"

interface ConnectedViewProps {
  userId: string
}

export function ConnectedView({ userId }: ConnectedViewProps) {
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
        <LobbyViewScreen lobby={game.$lobby} userId={userId} />
      ) : (
        <LobbySetupScreen />
      )}
    </div>
  )
}
