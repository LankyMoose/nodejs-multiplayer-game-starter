/**
 * Canvas Renderer for Space Game
 * Handles all rendering including background, ships, and effects
 */

import type { Ship } from "shared";
import { getShipSpeed } from "shared";

// ============================================================================
// Camera System
// ============================================================================

export class Camera {
  position: { x: number; y: number } = { x: 0, y: 0 };
  zoom: number = 1;
  smoothing: number = 0.1;

  private targetPosition: { x: number; y: number } = { x: 0, y: 0 };

  follow(target: { x: number; y: number }, immediate: boolean = false) {
    this.targetPosition = { ...target };
    
    if (immediate) {
      this.position = { ...target };
    } else {
      // Smooth camera movement
      this.position.x += (this.targetPosition.x - this.position.x) * this.smoothing;
      this.position.y += (this.targetPosition.y - this.position.y) * this.smoothing;
    }
  }

  worldToScreen(
    worldPos: { x: number; y: number },
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    return {
      x: (worldPos.x - this.position.x) * this.zoom + canvasWidth / 2,
      y: (worldPos.y - this.position.y) * this.zoom + canvasHeight / 2,
    };
  }

  screenToWorld(
    screenPos: { x: number; y: number },
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    return {
      x: (screenPos.x - canvasWidth / 2) / this.zoom + this.position.x,
      y: (screenPos.y - canvasHeight / 2) / this.zoom + this.position.y,
    };
  }
}

// ============================================================================
// Background Rendering
// ============================================================================

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  layer: number; // for parallax effect
}

let stars: Star[] = [];

function generateStars(count: number = 200): Star[] {
  const newStars: Star[] = [];
  for (let i = 0; i < count; i++) {
    newStars.push({
      x: (Math.random() - 0.5) * 10000,
      y: (Math.random() - 0.5) * 10000,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.5 + 0.5,
      layer: Math.floor(Math.random() * 3), // 0, 1, or 2
    });
  }
  return newStars;
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
) {
  // Initialize stars if needed
  if (stars.length === 0) {
    stars = generateStars(200);
  }

  // Clear with dark space background
  ctx.fillStyle = "#0a0a15";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render stars with parallax
  for (const star of stars) {
    const parallaxFactor = 1 - star.layer * 0.3; // Closer layers move more
    const screenPos = camera.worldToScreen(
      {
        x: star.x * parallaxFactor,
        y: star.y * parallaxFactor,
      },
      canvasWidth,
      canvasHeight
    );

    // Only render if on screen (with margin)
    if (
      screenPos.x < -100 ||
      screenPos.x > canvasWidth + 100 ||
      screenPos.y < -100 ||
      screenPos.y > canvasHeight + 100
    ) {
      continue;
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// Ship Rendering
// ============================================================================

export function renderShip(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
  isLocalPlayer: boolean = false
) {
  const screenPos = camera.worldToScreen(ship.position, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(screenPos.x, screenPos.y);
  ctx.rotate(ship.rotation);

  // Ship body (triangle)
  const size = 20;
  ctx.fillStyle = isLocalPlayer ? "#4a9eff" : "#ff6b6b";
  ctx.strokeStyle = isLocalPlayer ? "#6bb3ff" : "#ff8787";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, size * 0.6);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.6, -size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Thrust effect
  if (ship.isThrusting) {
    renderThrust(ctx, size);
  }

  ctx.restore();

  // Player name
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ship.playerName, screenPos.x, screenPos.y - 30);

  // Health bar
  renderHealthBar(ctx, ship, screenPos.x, screenPos.y - 40);
}

function renderThrust(ctx: CanvasRenderingContext2D, shipSize: number) {
  const flameLength = shipSize * 0.8;
  const flameWidth = shipSize * 0.4;

  // Animate flame
  const flicker = Math.random() * 0.3 + 0.7;

  const gradient = ctx.createLinearGradient(-shipSize * 0.4, 0, -shipSize * 0.4 - flameLength, 0);
  gradient.addColorStop(0, "rgba(255, 200, 100, 0.9)");
  gradient.addColorStop(0.5, "rgba(255, 100, 50, 0.6)");
  gradient.addColorStop(1, "rgba(255, 50, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-shipSize * 0.4, 0);
  ctx.lineTo(-shipSize * 0.4 - flameLength * flicker, flameWidth * flicker);
  ctx.lineTo(-shipSize * 0.4 - flameLength * 0.6 * flicker, 0);
  ctx.lineTo(-shipSize * 0.4 - flameLength * flicker, -flameWidth * flicker);
  ctx.closePath();
  ctx.fill();
}

function renderHealthBar(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  x: number,
  y: number
) {
  const barWidth = 40;
  const barHeight = 4;
  const healthPercent = ship.health / ship.maxHealth;

  // Background
  ctx.fillStyle = "#333";
  ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

  // Health
  ctx.fillStyle = healthPercent > 0.5 ? "#4ade80" : healthPercent > 0.25 ? "#fbbf24" : "#ef4444";
  ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);
}

// ============================================================================
// Effects
// ============================================================================

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
) {
  const gridSize = 500;
  const startX = Math.floor((camera.position.x - canvasWidth / 2) / gridSize) * gridSize;
  const startY = Math.floor((camera.position.y - canvasHeight / 2) / gridSize) * gridSize;
  const endX = startX + canvasWidth + gridSize * 2;
  const endY = startY + canvasHeight + gridSize * 2;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    const screenPos = camera.worldToScreen({ x, y: 0 }, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(screenPos.x, 0);
    ctx.lineTo(screenPos.x, canvasHeight);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    const screenPos = camera.worldToScreen({ x: 0, y }, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.moveTo(0, screenPos.y);
    ctx.lineTo(canvasWidth, screenPos.y);
    ctx.stroke();
  }
}
