/**
 * Space Game Server - Instance Management and Game Loops
 */

import type { ServerRouter, WebSocketContract } from "shared";
import {
  type SpaceGameInstance,
  type PlayerInput,
  createSpaceGameInstance,
  createShip,
  simulateTick,
  serializeGameInstance,
  getRandomSpawnPosition,
  GAME_CONFIG,
} from "shared";
import { broadcastToUsers } from "./store.js";

// ============================================================================
// State Management
// ============================================================================

/** Active space game instances */
const spaceInstances = new Map<string, SpaceGameInstance>();

/** Map player ID to their current instance ID */
const playerInstances = new Map<string, string>();

/** Player names cache */
const playerNames = new Map<string, string>();

/** Input buffers for each instance: instanceId -> playerId -> latest input */
const inputBuffers = new Map<string, Map<string, PlayerInput>>();

/** Game loop intervals for each instance */
const gameLoops = new Map<string, NodeJS.Timeout>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique instance ID
 */
function generateInstanceId(): string {
  return `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all player IDs in an instance
 */
function getInstancePlayerIds(instanceId: string): string[] {
  const instance = spaceInstances.get(instanceId);
  if (!instance) return [];
  return Array.from(instance.ships.keys());
}

/**
 * Clean up empty instances
 */
function cleanupInstance(instanceId: string): void {
  const instance = spaceInstances.get(instanceId);
  if (!instance || instance.ships.size > 0) return;

  // Stop game loop
  const interval = gameLoops.get(instanceId);
  if (interval) {
    clearInterval(interval);
    gameLoops.delete(instanceId);
  }

  // Remove instance
  spaceInstances.delete(instanceId);
  inputBuffers.delete(instanceId);

  console.log(`[Space Game] Cleaned up empty instance: ${instanceId}`);
}

// ============================================================================
// Game Loop
// ============================================================================

/**
 * Start game loop for an instance (60 ticks per second)
 */
function startGameLoop(instanceId: string): void {
  if (gameLoops.has(instanceId)) {
    console.warn(`[Space Game] Game loop already running for ${instanceId}`);
    return;
  }

  console.log(`[Space Game] Starting game loop for instance: ${instanceId}`);

  let lastBroadcast = Date.now();
  const BROADCAST_INTERVAL = 50; // 20 updates per second

  const interval = setInterval(() => {
    const instance = spaceInstances.get(instanceId);
    if (!instance) {
      clearInterval(interval);
      gameLoops.delete(instanceId);
      return;
    }

    // Get current inputs
    const inputs = inputBuffers.get(instanceId) || new Map();

    // Simulate one tick
    simulateTick(instance, inputs);

    // Broadcast state to clients periodically
    const now = Date.now();
    if (now - lastBroadcast >= BROADCAST_INTERVAL) {
      broadcastGameState(instanceId);
      lastBroadcast = now;
    }
  }, GAME_CONFIG.TICK_DURATION);

  gameLoops.set(instanceId, interval);
}

/**
 * Broadcast game state to all players in instance
 */
function broadcastGameState(instanceId: string): void {
  const instance = spaceInstances.get(instanceId);
  if (!instance) return;

  const playerIds = getInstancePlayerIds(instanceId);
  if (playerIds.length === 0) return;

  const serialized = serializeGameInstance(instance);

  broadcastToUsers(playerIds, "space:gameState", {
    instanceId: instance.id,
    tick: instance.tick,
    ships: serialized.ships,
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a new instance for a player
 */
export function createPlayerInstance(
  userId: string,
  userName: string
): string {
  // Leave current instance if any
  const currentInstanceId = playerInstances.get(userId);
  if (currentInstanceId) {
    removePlayerFromInstance(userId, currentInstanceId);
  }

  // Create new instance
  const instanceId = generateInstanceId();
  const instance = createSpaceGameInstance(instanceId, userId);

  // Spawn player ship
  const spawnPos = getRandomSpawnPosition([], instanceId);
  const ship = createShip(userId, userName, spawnPos);
  instance.ships.set(userId, ship);

  // Store instance
  spaceInstances.set(instanceId, instance);
  playerInstances.set(userId, instanceId);
  playerNames.set(userId, userName);
  inputBuffers.set(instanceId, new Map());

  // Start game loop
  startGameLoop(instanceId);

  console.log(
    `[Space Game] Created instance ${instanceId} for player ${userName}`
  );

  return instanceId;
}

/**
 * Player warps to friend's instance
 */
export function warpToFriend(
  userId: string,
  userName: string,
  friendId: string
): string | null {
  const friendInstanceId = playerInstances.get(friendId);
  if (!friendInstanceId) {
    console.log(`[Space Game] Friend ${friendId} not in any instance`);
    return null;
  }

  const friendInstance = spaceInstances.get(friendInstanceId);
  if (!friendInstance) {
    console.log(`[Space Game] Friend's instance ${friendInstanceId} not found`);
    return null;
  }

  // Leave current instance
  const currentInstanceId = playerInstances.get(userId);
  if (currentInstanceId) {
    removePlayerFromInstance(userId, currentInstanceId);
  }

  // Join friend's instance
  const existingShips = Array.from(friendInstance.ships.values());
  const spawnPos = getRandomSpawnPosition(existingShips, friendInstanceId);
  const ship = createShip(userId, userName, spawnPos);
  friendInstance.ships.set(userId, ship);

  playerInstances.set(userId, friendInstanceId);
  playerNames.set(userId, userName);

  // Notify all players in instance
  const playerIds = getInstancePlayerIds(friendInstanceId);
  broadcastToUsers(playerIds, "space:playerJoined", {
    instanceId: friendInstanceId,
    playerId: userId,
    playerName: userName,
  });

  console.log(
    `[Space Game] Player ${userName} warped to friend's instance ${friendInstanceId}`
  );

  return friendInstanceId;
}

/**
 * Handle player input
 */
export function handlePlayerInput(
  userId: string,
  instanceId: string,
  input: PlayerInput
): boolean {
  const instance = spaceInstances.get(instanceId);
  if (!instance) {
    console.warn(`[Space Game] Instance ${instanceId} not found`);
    return false;
  }

  if (!instance.ships.has(userId)) {
    console.warn(`[Space Game] Player ${userId} not in instance ${instanceId}`);
    return false;
  }

  // Store input in buffer
  let buffer = inputBuffers.get(instanceId);
  if (!buffer) {
    buffer = new Map();
    inputBuffers.set(instanceId, buffer);
  }
  buffer.set(userId, input);

  return true;
}

/**
 * Remove player from instance
 */
export function removePlayerFromInstance(
  userId: string,
  instanceId: string
): boolean {
  const instance = spaceInstances.get(instanceId);
  if (!instance) return false;

  // Remove ship
  instance.ships.delete(userId);

  // Remove from player mapping
  if (playerInstances.get(userId) === instanceId) {
    playerInstances.delete(userId);
  }

  // Remove from input buffer
  const buffer = inputBuffers.get(instanceId);
  if (buffer) {
    buffer.delete(userId);
  }

  // Notify other players
  const playerIds = getInstancePlayerIds(instanceId);
  if (playerIds.length > 0) {
    broadcastToUsers(playerIds, "space:playerLeft", {
      instanceId,
      playerId: userId,
    });
  }

  console.log(`[Space Game] Player ${userId} left instance ${instanceId}`);

  // Cleanup if empty
  cleanupInstance(instanceId);

  return true;
}

/**
 * Get player's current instance ID
 */
export function getPlayerInstanceId(userId: string): string | null {
  return playerInstances.get(userId) || null;
}

/**
 * Get instance by ID
 */
export function getInstance(instanceId: string): SpaceGameInstance | null {
  return spaceInstances.get(instanceId) || null;
}

/**
 * Handle player disconnect - remove from instance
 */
export function handlePlayerDisconnect(userId: string): void {
  const instanceId = playerInstances.get(userId);
  if (instanceId) {
    removePlayerFromInstance(userId, instanceId);
  }
}
