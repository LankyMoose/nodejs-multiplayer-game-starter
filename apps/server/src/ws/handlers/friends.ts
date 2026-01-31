import { and, eq, inArray } from "drizzle-orm";
import type { WsContext } from "../context.js";
import type { ServerHandlers, WebSocketContract } from "shared";

export function createFriendsHandlers(ctx: WsContext) {
  const {
    userId,
    session,
    log,
    db,
    schema,
    emitToUser,
    hasConnections,
    getFriendStatus,
  } = ctx;
  const { user, userFriend, friendRequest } = schema;

  return {
    "friends:list": async () => {
      const rows = await db
        .select({ friendId: userFriend.friendId })
        .from(userFriend)
        .where(eq(userFriend.userId, userId));
      const friendIds = rows.map((r) => r.friendId);
      if (friendIds.length === 0) return { friends: [] };
      const users = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, friendIds));
      return {
        friends: users.map((u) => ({
          id: u.id,
          name: u.name,
          online: hasConnections(u.id),
          status: getFriendStatus(u.id),
        })),
      };
    },
    "friends:remove": async ({ friendId }) => {
      if (friendId === userId) return { success: false };
      const [row] = await db
        .select()
        .from(userFriend)
        .where(
          and(eq(userFriend.userId, userId), eq(userFriend.friendId, friendId)),
        )
        .limit(1);
      if (!row) return { success: false };
      await db
        .delete(userFriend)
        .where(
          and(eq(userFriend.userId, userId), eq(userFriend.friendId, friendId)),
        );
      await db
        .delete(userFriend)
        .where(
          and(eq(userFriend.userId, friendId), eq(userFriend.friendId, userId)),
        );
      emitToUser(friendId, "friend:removed", { friendId: userId });
      log.info({ userId, friendId }, "Friend removed");
      return { success: true };
    },
    "friend_requests:send": async ({ addresseeId }) => {
      if (addresseeId === userId) return { success: false };
      const [addressee] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, addresseeId))
        .limit(1);
      if (!addressee) return { success: false };
      const [alreadyFriends] = await db
        .select()
        .from(userFriend)
        .where(
          and(
            eq(userFriend.userId, userId),
            eq(userFriend.friendId, addresseeId),
          ),
        )
        .limit(1);
      if (alreadyFriends) return { success: false };
      const [existingRequest] = await db
        .select()
        .from(friendRequest)
        .where(
          and(
            eq(friendRequest.requesterId, userId),
            eq(friendRequest.addresseeId, addresseeId),
          ),
        )
        .limit(1);
      if (existingRequest) return { success: false };
      const [reverseRequest] = await db
        .select()
        .from(friendRequest)
        .where(
          and(
            eq(friendRequest.requesterId, addresseeId),
            eq(friendRequest.addresseeId, userId),
          ),
        )
        .limit(1);
      if (reverseRequest) return { success: false };
      await db.insert(friendRequest).values({
        requesterId: userId,
        addresseeId,
        createdAt: new Date(),
      });
      emitToUser(addresseeId, "friend_request:received", {
        requesterId: userId,
        requesterName: session.user.name ?? "Someone",
      });
      log.info({ userId, addresseeId }, "Friend request sent");
      return { success: true };
    },
    "friend_requests:list": async () => {
      const rows = await db
        .select({ requesterId: friendRequest.requesterId })
        .from(friendRequest)
        .where(eq(friendRequest.addresseeId, userId));
      if (rows.length === 0) return { requests: [] };
      const requesters = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(
          inArray(
            user.id,
            rows.map((r) => r.requesterId),
          ),
        );
      return {
        requests: requesters.map((u) => ({
          requesterId: u.id,
          requesterName: u.name ?? "Unknown",
        })),
      };
    },
    "friend_requests:pending_sent": async () => {
      const rows = await db
        .select({ addresseeId: friendRequest.addresseeId })
        .from(friendRequest)
        .where(eq(friendRequest.requesterId, userId));
      return { addresseeIds: rows.map((r) => r.addresseeId) };
    },
    "friend_requests:accept": async ({ requesterId }) => {
      const [req] = await db
        .select()
        .from(friendRequest)
        .where(
          and(
            eq(friendRequest.requesterId, requesterId),
            eq(friendRequest.addresseeId, userId),
          ),
        )
        .limit(1);
      if (!req) return { success: false };
      await db
        .delete(friendRequest)
        .where(
          and(
            eq(friendRequest.requesterId, requesterId),
            eq(friendRequest.addresseeId, userId),
          ),
        );
      const now = new Date();
      await db.insert(userFriend).values([
        { userId: requesterId, friendId: userId, createdAt: now },
        { userId, friendId: requesterId, createdAt: now },
      ]);
      log.info({ requesterId, addresseeId: userId }, "Friend request accepted");
      const addresseeName = session.user.name ?? "Unknown";
      emitToUser(requesterId, "friend_request:accepted", {
        friendId: userId,
        friendName: addresseeName,
        online: hasConnections(userId),
      });
      return { success: true };
    },
    "friend_requests:decline": async ({ requesterId }) => {
      await db
        .delete(friendRequest)
        .where(
          and(
            eq(friendRequest.requesterId, requesterId),
            eq(friendRequest.addresseeId, userId),
          ),
        );
      return { success: true };
    },
  } satisfies Partial<ServerHandlers<WebSocketContract>>;
}
