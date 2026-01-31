import { game } from "@/state/game"
import { ws } from "@/state/ws"
import { signal } from "kiru"

const joinId = signal("")

export function LobbySetupScreen() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium text-primary">Lobby</h2>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={ws.current?.$connectionState !== "connected"}
          onclick={game.createLobby}
          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
        >
          Create lobby
        </button>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Lobby ID"
            className="flex-1 px-3 py-2 rounded-md bg-white/5 border border-gray-600 text-primary text-sm placeholder-gray-500"
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
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  )
}
