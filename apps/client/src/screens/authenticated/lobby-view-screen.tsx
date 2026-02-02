import { signal } from "kiru"
import { GameLobby } from "shared"
import { game } from "@/state/game"
import LobbyPlayers from "@/features/lobby/lobby-players"
import LobbyChat from "@/features/lobby/lobby-chat"

const chatInput = signal("")

export default function LobbyViewScreen({
  lobby,
  userId,
}: {
  lobby: GameLobby
  userId: string
}) {
  const connectedPlayers = lobby.players.filter(
    (p) => !lobby.disconnectedPlayerIds.includes(p.id)
  )
  const isReady = lobby.readyPlayers.includes(userId)
  const allReady =
    connectedPlayers.length >= lobby.requiredPlayers &&
    connectedPlayers.every((p) => lobby.readyPlayers.includes(p.id))
  const isOwner = lobby.ownerId === userId
  const visibility = lobby.visibility ?? "private"

  return (
    <div className="game-panel p-5 flex flex-col gap-5 min-h-0 flex-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="game-title text-lg tracking-wide text-(--game-text)">
          Lobby
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <button
              type="button"
              onclick={() =>
                game.setLobbyVisibility(
                  lobby.id,
                  visibility === "open" ? "private" : "open"
                )
              }
              className={
                visibility === "open"
                  ? "btn-ghost border border-(--game-success)/50 text-(--game-success) text-sm"
                  : "btn-ghost text-sm text-(--game-text-dim)"
              }
              title={
                visibility === "open"
                  ? "Open for friends – click to set Private"
                  : "Private – click to allow friends to join"
              }
            >
              {visibility === "open" ? "Open" : "Private"}
            </button>
          )}
          <button
            type="button"
            onclick={() => game.leaveLobby(lobby.id)}
            data-cancel="true"
            className="btn-ghost text-sm"
          >
            Leave
          </button>
        </div>
      </div>

      <p className="text-xs font-mono text-(--game-text-dim) break-all bg-black/20 px-2 py-1.5 border border-(--game-surface-border) shrink-0">
        {lobby.id}
      </p>

      <LobbyPlayers lobby={lobby} userId={userId} />

      {(lobby.invitedUsers?.length ?? 0) > 0 && (
        <div className="shrink-0">
          <p className="game-title text-xs uppercase tracking-wider text-(--game-text-dim) mb-1.5">
            Invited
          </p>
          <ul className="flex flex-wrap gap-1.5 text-sm text-(--game-text)">
            {(lobby.invitedUsers ?? []).map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-(--game-surface-border)"
              >
                <span className="truncate">{u.name}</span>
                {isOwner && (
                  <button
                    type="button"
                    onclick={() => game.cancelLobbyInvite(lobby.id, u.id)}
                    className="btn-ghost text-xs text-(--game-muted) hover:text-(--game-danger) shrink-0"
                    title="Cancel invite"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-(--game-text-dim) shrink-0">
        {connectedPlayers.length} / {lobby.players.length} connected
        {lobby.requiredPlayers < lobby.maxPlayers &&
          ` - need ${lobby.requiredPlayers} to start`}
      </p>

      <LobbyChat
        lobbyId={lobby.id}
        messages={game.$lobbyChatMessages.get(lobby.id) ?? []}
        chatInput={chatInput}
        onSend={() => {
          const t = chatInput.value.trim()
          if (t) {
            game.sendLobbyChat(lobby.id, t)
            chatInput.value = ""
          }
        }}
      />

      <div className="flex gap-3 flex-wrap shrink-0">
        <button
          type="button"
          onclick={() =>
            isReady ? game.unreadyLobby(lobby.id) : game.readyLobby(lobby.id)
          }
          data-cancel={isReady ? "true" : "false"}
          className={
            isReady
              ? "btn-ghost border border-(--game-success)/50 text-(--game-success)"
              : "btn-success"
          }
        >
          {isReady ? "Unready" : "Ready"}
        </button>
        {allReady && isOwner && (
          <button
            type="button"
            onclick={() => game.startLobby(lobby.id)}
            className="btn-gold"
          >
            Start game
          </button>
        )}
      </div>
    </div>
  )
}
