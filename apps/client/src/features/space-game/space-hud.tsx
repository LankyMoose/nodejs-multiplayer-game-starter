/**
 * Space Game HUD
 * Displays ship stats, friend list, and controls
 */

import { spaceGame } from "@/state/space-game";
import { getShipSpeed } from "shared";
import { game } from "@/state/game";

type Props = {
  userId: string;
};

export default function SpaceGameHUD({ userId }: Props) {
  const myShip = spaceGame.$myShip.value;
  const friends = game.$friends;

  return (
    <div className="space-hud">
      {/* Ship Stats */}
      {myShip && (
        <div className="hud-panel hud-stats">
          <div className="hud-stat">
            <span className="hud-label">Speed:</span>
            <span className="hud-value">{Math.round(getShipSpeed(myShip))}</span>
          </div>
          <div className="hud-stat">
            <span className="hud-label">Position:</span>
            <span className="hud-value">
              ({Math.round(myShip.position.x)}, {Math.round(myShip.position.y)})
            </span>
          </div>
          <div className="hud-stat">
            <span className="hud-label">Health:</span>
            <span className="hud-value">
              {myShip.health}/{myShip.maxHealth}
            </span>
          </div>
        </div>
      )}

      {/* Friend List */}
      <div className="hud-panel hud-friends">
        <h3 className="hud-title">Friends</h3>
        <div className="hud-friends-list">
          {friends.length === 0 ? (
            <p className="hud-empty">No friends online</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="hud-friend">
                <div className="hud-friend-info">
                  <span className="hud-friend-name">{friend.name}</span>
                  <span className={`hud-friend-status ${friend.status.kind}`}>
                    {friend.status.kind === "in_game"
                      ? "In Space"
                      : friend.status.kind === "lobby"
                      ? "In Lobby"
                      : friend.status.kind === "menu"
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>
                {friend.online && friend.status.kind !== "offline" && (
                  <button
                    type="button"
                    onclick={() => spaceGame.warpToFriend(friend.id)}
                    className="hud-warp-btn"
                    title="Warp to friend"
                  >
                    Warp
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="hud-panel hud-controls">
        <h3 className="hud-title">Controls</h3>
        <div className="hud-controls-list">
          <div className="hud-control">
            <span className="hud-key">W / ↑</span>
            <span className="hud-action">Thrust</span>
          </div>
          <div className="hud-control">
            <span className="hud-key">A / ←</span>
            <span className="hud-action">Rotate Left</span>
          </div>
          <div className="hud-control">
            <span className="hud-key">D / →</span>
            <span className="hud-action">Rotate Right</span>
          </div>
          <div className="hud-control">
            <span className="hud-key">S / ↓</span>
            <span className="hud-action">Brake</span>
          </div>
          <div className="hud-control">
            <span className="hud-key">ESC</span>
            <span className="hud-action">Exit</span>
          </div>
        </div>
      </div>

      {/* Exit Button */}
      <button
        type="button"
        onclick={spaceGame.leaveInstance}
        className="hud-exit-btn"
      >
        Exit Game
      </button>
    </div>
  );
}
