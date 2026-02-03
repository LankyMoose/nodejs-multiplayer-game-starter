/**
 * Space Game Client State
 * Handles client-side prediction, input buffering, and server reconciliation
 */

import { signal } from "kiru";
import type {
  Ship,
  PlayerInput,
  SpaceGameInstance,
  WebSocketContract,
} from "shared";
import {
  createSpaceGameInstance,
  createShip,
  simulateTick,
  GAME_CONFIG,
} from "shared";
import { ws } from "./ws";
import { auth } from "./auth";

// ============================================================================
// State
// ============================================================================

const gameInstanceId = signal<string | null>(null);
const ships = signal<Ship[]>([]);
const myShip = signal<Ship | null>(null);
const tick = signal(0);

let clientSimulation: SpaceGameInstance | null = null;
let inputBuffer: PlayerInput[] = [];
let sequenceNumber = 0;
let lastProcessedInput = 0;
let lastTickTime = 0;
let accumulator = 0;

const currentInput = {
  thrust: false,
  rotateLeft: false,
  rotateRight: false,
  brake: false,
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new space game instance
 */
async function createInstance() {
  const router = ws.current?.router;
  if (!router) {
    console.error("[Space Game] No WebSocket connection");
    return;
  }

  try {
    const result = await router.send("space:createInstance");
    if (result.success && result.instanceId) {
      gameInstanceId.value = result.instanceId;
      console.log("[Space Game] Created instance:", result.instanceId);
    } else {
      console.error("[Space Game] Failed to create instance");
    }
  } catch (error) {
    console.error("[Space Game] Error creating instance:", error);
  }
}

/**
 * Warp to a friend's instance
 */
async function warpToFriend(friendId: string) {
  const router = ws.current?.router;
  if (!router) {
    console.error("[Space Game] No WebSocket connection");
    return;
  }

  try {
    const result = await router.send("space:warpToFriend", { friendId });
    if (result.success && result.instanceId) {
      gameInstanceId.value = result.instanceId;
      console.log("[Space Game] Warped to friend's instance:", result.instanceId);
    } else {
      console.error("[Space Game] Failed to warp to friend");
    }
  } catch (error) {
    console.error("[Space Game] Error warping to friend:", error);
  }
}

/**
 * Leave current instance
 */
async function leaveInstance() {
  const instanceId = gameInstanceId.value;
  if (!instanceId) return;

  const router = ws.current?.router;
  if (!router) return;

  try {
    await router.send("space:leaveInstance", { instanceId });
    gameInstanceId.value = null;
    ships.value = [];
    myShip.value = null;
    clientSimulation = null;
    inputBuffer = [];
    console.log("[Space Game] Left instance");
  } catch (error) {
    console.error("[Space Game] Error leaving instance:", error);
  }
}

/**
 * Send input to server
 */
function sendInput(input: Omit<PlayerInput, "sequenceNumber" | "timestamp">) {
  const instanceId = gameInstanceId.value;
  if (!instanceId) return;

  const router = ws.current?.router;
  if (!router) return;

  sequenceNumber++;
  const fullInput: PlayerInput = {
    ...input,
    sequenceNumber,
    timestamp: Date.now(),
  };

  // Add to input buffer for prediction
  inputBuffer.push(fullInput);

  // Send to server (fire and forget)
  router.send("space:sendInput", {
    instanceId,
    input: fullInput,
  }).catch((error: unknown) => {
    console.error("[Space Game] Error sending input:", error);
  });
}

/**
 * Run client-side prediction tick
 */
function runPredictionTick() {
  if (!clientSimulation) return;

  const now = Date.now();
  const deltaTime = now - lastTickTime;
  lastTickTime = now;

  accumulator += deltaTime;

  // Run simulation at fixed timestep
  while (accumulator >= GAME_CONFIG.TICK_DURATION) {
    // Get current input
    const inputMap = new Map<string, PlayerInput>();
    if (inputBuffer.length > 0) {
      const latestInput = inputBuffer[inputBuffer.length - 1];
      const playerShip = myShip.value;
      if (playerShip) {
        inputMap.set(playerShip.playerId, latestInput);
      }
    }

    // Simulate tick
    simulateTick(clientSimulation, inputMap);

    accumulator -= GAME_CONFIG.TICK_DURATION;
  }

  // Update display state
  ships.value = Array.from(clientSimulation.ships.values());
  tick.value = clientSimulation.tick;
}

/**
 * Reconcile with server state
 */
function reconcileWithServer(
  serverState: WebSocketContract["serverEvents"]["space:gameState"]
) {
  const { instanceId: serverInstanceId, tick: serverTick, ships: serverShips } = serverState;

  // Update instance ID if needed
  if (gameInstanceId.value !== serverInstanceId) {
    gameInstanceId.value = serverInstanceId;
  }

  // Initialize client simulation if needed
  if (!clientSimulation) {
    clientSimulation = createSpaceGameInstance(serverInstanceId, "");
    lastTickTime = Date.now();
  }

  // Update server ships
  clientSimulation.ships.clear();
  for (const shipData of serverShips) {
    const ship = createShip(
      shipData.playerId,
      shipData.playerName,
      shipData.position,
      shipData.rotation
    );
    ship.velocity = { ...shipData.velocity };
    ship.health = shipData.health;
    ship.maxHealth = shipData.maxHealth;
    ship.isThrusting = shipData.isThrusting;
    clientSimulation.ships.set(shipData.playerId, ship);
  }

  clientSimulation.tick = serverTick;

  // Find my ship
  const userId = auth.$user?.id;
  const playerShip = serverShips.find((s) => s.playerId === userId);
  if (playerShip) {
    const ship = clientSimulation.ships.get(playerShip.playerId);
    if (ship) {
      myShip.value = ship;
    }
  }

  // Re-apply unprocessed inputs (client-side prediction reconciliation)
  const unprocessedInputs = inputBuffer.filter(
    (input) => input.sequenceNumber > lastProcessedInput
  );

  for (const input of unprocessedInputs) {
    const inputMap = new Map<string, PlayerInput>();
    if (playerShip) {
      inputMap.set(playerShip.playerId, input);
    }
    simulateTick(clientSimulation, inputMap);
  }

  // Update display state
  ships.value = Array.from(clientSimulation.ships.values());
  tick.value = clientSimulation.tick;

  // Clean up old inputs
  lastProcessedInput = tick.value;
  inputBuffer = inputBuffer.filter(
    (input) => input.sequenceNumber > tick.value
  );
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Initialize space game event handlers
 */
export function initSpaceGameHandlers() {
  const router = ws.current?.router;
  if (!router) return;

  // Game state updates
  router.on("space:gameState", (payload: WebSocketContract["serverEvents"]["space:gameState"]) => {
    reconcileWithServer(payload);
  });

  // Player joined
  router.on("space:playerJoined", (payload: WebSocketContract["serverEvents"]["space:playerJoined"]) => {
    console.log("[Space Game] Player joined:", payload.playerName);
  });

  // Player left
  router.on("space:playerLeft", (payload: WebSocketContract["serverEvents"]["space:playerLeft"]) => {
    console.log("[Space Game] Player left:", payload.playerId);
  });
}

// Start prediction loop
if (typeof window !== "undefined") {
  function predictionLoop() {
    if (gameInstanceId.value) {
      runPredictionTick();
    }
    
    requestAnimationFrame(predictionLoop);
  }
  
  requestAnimationFrame(predictionLoop);
}

// ============================================================================
// Export
// ============================================================================

export const spaceGame = {
  signals: {
    instanceId: gameInstanceId,
    ships,
    myShip,
    tick,
  },
  get $instanceId() {
    return gameInstanceId.value;
  },
  get $ships() {
    return ships.value;
  },
  get $myShip() {
    return myShip.value;
  },
  get $tick() {
    return tick.value;
  },
  currentInput,
  createInstance,
  warpToFriend,
  leaveInstance,
  sendInput,
};
