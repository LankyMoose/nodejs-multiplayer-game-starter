import { game } from "@/state/game"

export default function FriendsList() {
  const friends = game.$friends

  return (
    <section className="game-panel p-4">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-3">
        Friends
      </h3>
      <ul className="flex flex-col gap-2">
        {friends.map((f) => (
          <li key={f.id} className="flex items-center gap-2 flex-wrap text-sm">
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
              data-cancel="true"
              className="btn-ghost text-xs py-1 px-2 text-(--game-muted) hover:text-(--game-danger)"
              title="Remove friend"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
