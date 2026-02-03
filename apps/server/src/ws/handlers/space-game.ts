/**
 * Space Game WebSocket Handlers
 */

import type { ServerHandlers, WebSocketContract } from "shared";
import type { WsContext } from "../context.js";
import {
  createPlayerInstance,
  warpToFriend,
  handlePlayerInput,
  removePlayerFromInstance,
  getPlayerInstanceId,
} from "../../game/space-game-server.js";

export function createSpaceGameHandlers(ctx: WsContext) {
  const { userId, session } = ctx;
  const userName = session.user.name || "Player";

  return {
    /**
     * Create a new space game instance for the player
     */
    "space:createInstance": () => {
      try {
        const instanceId = createPlayerInstance(userId, userName);
        return { success: true, instanceId };
      } catch (error) {
        console.error("[Space Game] Error creating instance:", error);
        return { success: false };
      }
    },

    /**
     * Send player input to the server
     */
    "space:sendInput": (req) => {
      const { instanceId, input } = req;
      try {
        const success = handlePlayerInput(userId, instanceId, input);
        return { success };
      } catch (error) {
        console.error("[Space Game] Error handling input:", error);
        return { success: false };
      }
    },

    /**
     * Warp to a friend's instance
     */
    "space:warpToFriend": (req) => {
      const { friendId } = req;
      try {
        const instanceId = warpToFriend(userId, userName, friendId);
        if (instanceId) {
          return { success: true, instanceId };
        } else {
          return { success: false };
        }
      } catch (error) {
        console.error("[Space Game] Error warping to friend:", error);
        return { success: false };
      }
    },

    /**
     * Leave current space game instance
     */
    "space:leaveInstance": (req) => {
      const { instanceId } = req;
      try {
        const success = removePlayerFromInstance(userId, instanceId);
        return { success };
      } catch (error) {
        console.error("[Space Game] Error leaving instance:", error);
        return { success: false };
      }
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
