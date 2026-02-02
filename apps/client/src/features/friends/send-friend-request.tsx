import { signal } from "kiru"
import { game } from "@/state/game"
import Input from "@/components/input"

const friendIdInput = signal("")

export default function SendFriendRequest() {
  return (
    <section className="game-panel p-4">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
        Add friend by ID
      </h3>
      <div className="flex gap-2 flex-wrap">
        <Input type="text" placeholder="User ID" bind:value={friendIdInput} />
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
