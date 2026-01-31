interface LobbyChatProps {
  lobbyId: string
  messages: { userId: string; userName: string; text: string }[]
  chatInput: { value: string }
  onSend: () => void
}

export default function LobbyChat({
  messages,
  chatInput,
  onSend,
}: LobbyChatProps) {
  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1 shrink">
      <h3 className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) shrink-0">
        Chat
      </h3>
      <div className="flex-1 min-h-0 overflow-y-auto border-2 border-(--game-surface-border) bg-black/20 rounded px-3 py-2 flex flex-col gap-1.5">
        {messages.length === 0 ? (
          <p className="text-xs text-(--game-text-dim) italic">
            No messages yet.
          </p>
        ) : (
          messages.map((m, i) => (
            <p key={i} className="text-sm text-(--game-text) leading-snug">
              <span className="text-(--game-text-dim) font-medium">
                {m.userName}:
              </span>{" "}
              {m.text}
            </p>
          ))
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-white/5 border-2 border-(--game-surface-border) text-(--game-text) placeholder-(--game-text-dim) text-sm focus:outline-none focus:border-(--game-accent)"
          value={chatInput.value}
          oninput={(e) => {
            chatInput.value = (e.target as HTMLInputElement).value
          }}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <button
          type="button"
          onclick={onSend}
          className="btn-ghost border border-(--game-surface-border) px-3 py-2 text-sm"
        >
          Send
        </button>
      </div>
    </section>
  )
}
