/**
 * Space RTS Game - Shared Logic
 * This file contains the core game simulation that runs identically on both client and server.
 */

// ============================================================================
// Types
// ============================================================================

export interface Ship {
  id: string;
  playerId: string;
  playerName: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number; // radians, 0 = pointing right
  rotationVelocity: number;
  health: number;
  maxHealth: number;
  isThrusting: boolean; // visual flag for rendering
}

export interface PlayerInput {
  thrust: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  brake: boolean;
  sequenceNumber: number;
  timestamp: number;
}

export interface SpaceGameInstance {
  id: string;
  ownerId: string; // player who created this instance
  ships: Map<string, Ship>;
  tick: number;
  lastUpdateTime: number;
  createdAt: number;
}

// ============================================================================
// Constants
// ============================================================================

export const GAME_CONFIG = {
  // Physics
  SHIP_THRUST: 300, // acceleration when thrusting
  SHIP_ROTATION_SPEED: 4, // radians per second
  SHIP_DRAG: 0.98, // velocity multiplier per tick (friction)
  SHIP_BRAKE_FACTOR: 0.85, // velocity multiplier when braking
  MAX_VELOCITY: 800, // maximum speed

  // Game world
  WORLD_SIZE: 50000, // large world for space feel
  SPAWN_RADIUS: 1000, // how far apart players spawn

  // Ship stats
  SHIP_MAX_HEALTH: 100,
  SHIP_COLLISION_RADIUS: 30,

  // Timing
  TICK_RATE: 60, // ticks per second
  TICK_DURATION: 1000 / 60, // milliseconds per tick
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize angle to [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Calculate distance between two points
 */
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get random spawn position
 */
export function getRandomSpawnPosition(
  existingShips: Ship[],
  instanceId: string
): { x: number; y: number } {
  // Use instance ID as seed for consistent spawning
  const seed = hashString(instanceId);
  const random = seededRandom(seed + existingShips.length);

  const angle = random() * Math.PI * 2;
  const radius = GAME_CONFIG.SPAWN_RADIUS * (0.5 + random() * 0.5);

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// ============================================================================
// Game Logic
// ============================================================================

/**
 * Create a new ship for a player
 */
export function createShip(
  playerId: string,
  playerName: string,
  position: { x: number; y: number },
  rotation: number = 0
): Ship {
  return {
    id: `ship_${playerId}`,
    playerId,
    playerName,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    rotation,
    rotationVelocity: 0,
    health: GAME_CONFIG.SHIP_MAX_HEALTH,
    maxHealth: GAME_CONFIG.SHIP_MAX_HEALTH,
    isThrusting: false,
  };
}

/**
 * Create a new game instance
 */
export function createSpaceGameInstance(
  instanceId: string,
  ownerId: string
): SpaceGameInstance {
  return {
    id: instanceId,
    ownerId,
    ships: new Map(),
    tick: 0,
    lastUpdateTime: Date.now(),
    createdAt: Date.now(),
  };
}

/**
 * Apply player input to a ship
 */
export function applyInput(ship: Ship, input: PlayerInput, deltaTime: number): void {
  const dt = deltaTime / 1000; // convert to seconds

  // Rotation
  if (input.rotateLeft) {
    ship.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
  }
  if (input.rotateRight) {
    ship.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * dt;
  }
  ship.rotation = normalizeAngle(ship.rotation);

  // Thrust
  ship.isThrusting = input.thrust;
  if (input.thrust) {
    const thrustX = Math.cos(ship.rotation) * GAME_CONFIG.SHIP_THRUST * dt;
    const thrustY = Math.sin(ship.rotation) * GAME_CONFIG.SHIP_THRUST * dt;
    ship.velocity.x += thrustX;
    ship.velocity.y += thrustY;
  }

  // Brake
  if (input.brake) {
    ship.velocity.x *= GAME_CONFIG.SHIP_BRAKE_FACTOR;
    ship.velocity.y *= GAME_CONFIG.SHIP_BRAKE_FACTOR;
  }
}

/**
 * Update ship physics
 */
export function updateShipPhysics(ship: Ship, deltaTime: number): void {
  const dt = deltaTime / 1000; // convert to seconds

  // Apply drag
  ship.velocity.x *= GAME_CONFIG.SHIP_DRAG;
  ship.velocity.y *= GAME_CONFIG.SHIP_DRAG;

  // Clamp velocity
  const speed = Math.sqrt(
    ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y
  );
  if (speed > GAME_CONFIG.MAX_VELOCITY) {
    const scale = GAME_CONFIG.MAX_VELOCITY / speed;
    ship.velocity.x *= scale;
    ship.velocity.y *= scale;
  }

  // Update position
  ship.position.x += ship.velocity.x * dt;
  ship.position.y += ship.velocity.y * dt;

  // World bounds (wrap around)
  const halfWorld = GAME_CONFIG.WORLD_SIZE / 2;
  if (ship.position.x > halfWorld) ship.position.x = -halfWorld;
  if (ship.position.x < -halfWorld) ship.position.x = halfWorld;
  if (ship.position.y > halfWorld) ship.position.y = -halfWorld;
  if (ship.position.y < -halfWorld) ship.position.y = halfWorld;
}

/**
 * Simulate one game tick
 * This is the core deterministic simulation that runs on both client and server
 */
export function simulateTick(
  instance: SpaceGameInstance,
  inputs: Map<string, PlayerInput>
): void {
  const deltaTime = GAME_CONFIG.TICK_DURATION;

  // Apply inputs and update each ship
  for (const [playerId, ship] of instance.ships) {
    const input = inputs.get(playerId);
    if (input) {
      applyInput(ship, input, deltaTime);
    }
    updateShipPhysics(ship, deltaTime);
  }

  instance.tick++;
  instance.lastUpdateTime = Date.now();
}

/**
 * Serialize ship for network transmission
 */
export function serializeShip(ship: Ship) {
  return {
    id: ship.id,
    playerId: ship.playerId,
    playerName: ship.playerName,
    position: { x: ship.position.x, y: ship.position.y },
    velocity: { x: ship.velocity.x, y: ship.velocity.y },
    rotation: ship.rotation,
    health: ship.health,
    maxHealth: ship.maxHealth,
    isThrusting: ship.isThrusting,
  };
}

/**
 * Serialize game instance for network transmission
 */
export function serializeGameInstance(instance: SpaceGameInstance) {
  return {
    id: instance.id,
    ownerId: instance.ownerId,
    ships: Array.from(instance.ships.values()).map(serializeShip),
    tick: instance.tick,
    lastUpdateTime: instance.lastUpdateTime,
  };
}

/**
 * Calculate ship speed (magnitude of velocity)
 */
export function getShipSpeed(ship: Ship): number {
  return Math.sqrt(
    ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y
  );
}
