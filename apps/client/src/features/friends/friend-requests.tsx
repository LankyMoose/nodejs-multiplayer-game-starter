import { game } from "@/state/game"

export default function FriendRequests() {
  return (
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
                onclick={() => game.acceptFriendRequest(req.requesterId)}
                className="btn-ghost text-xs text-(--game-success) hover:bg-green-500/10"
              >
                Accept
              </button>
              <button
                type="button"
                onclick={() => game.declineFriendRequest(req.requesterId)}
                className="btn-ghost text-xs text-(--game-danger) hover:bg-red-500/10"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
