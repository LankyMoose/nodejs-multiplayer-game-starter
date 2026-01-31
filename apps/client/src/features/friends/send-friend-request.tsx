import { signal } from "kiru"
import { game } from "@/state/game"

const friendIdInput = signal("")

export default function SendFriendRequest() {
  return (
    <section className="game-panel p-4">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
        Add friend by ID
      </h3>
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="User ID"
          className="flex-1 min-w-0 px-3 py-2 bg-white/5 border-2 border-(--game-surface-border) text-(--game-text) placeholder-(--game-text-dim) text-sm font-mono focus:outline-none focus:border-(--game-accent)"
          value={friendIdInput.value}
          oninput={(e) => {
            friendIdInput.value = (e.target as HTMLInputElement).value.trim()
          }}
        />
        <button
          type="button"
          disabled={!friendIdInput.value}
          onclick={() => {
            if (friendIdInput.value) {
              game.addFriend(friendIdInput.value)
              friendIdInput.value = ""
            }
          }}
          className="btn-ghost border border-(--game-surface-border) px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send request
        </button>
      </div>
    </section>
  )
}
