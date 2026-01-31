import { signal } from "kiru"
import { game } from "@/state/game"
import { ws } from "@/state/ws"

const joinId = signal("")

export default function LobbySetupScreen() {
  return (
    <div className="game-panel p-5 flex flex-col gap-5">
      <h2 className="game-title text-lg tracking-wide text-(--game-text)">
        Lobby
      </h2>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          disabled={ws.current?.$connectionState !== "connected"}
          onclick={game.createLobby}
          className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create lobby
        </button>

        <div className="flex gap-2 items-stretch flex-col sm:flex-row">
          <input
            type="text"
            placeholder="Paste lobby ID to join"
            className="flex-1 px-4 py-2.5 bg-white/5 border-2 border-(--game-surface-border) text-(--game-text) placeholder-(--game-text-dim) text-sm focus:outline-none focus:border-(--game-accent)"
            value={joinId.value}
            oninput={(e) => {
              joinId.value = (e.target as HTMLInputElement).value.trim()
            }}
          />
          <button
            type="button"
            disabled={
              ws.current?.$connectionState !== "connected" || !joinId.value
            }
            onclick={() => joinId.value && game.joinLobby(joinId.value)}
            className="btn-ghost border border-(--game-surface-border) hover:bg-white/5 disabled:opacity-50 px-4 py-2.5 font-medium"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  )
}
