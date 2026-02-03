/**
 * Space Game Screen
 * Main game view with canvas rendering
 */

import { useEffect, useRef } from "kiru";
import { spaceGame, initSpaceGameHandlers } from "@/state/space-game";
import { InputHandler } from "@/features/space-game/input-handler";
import {
  Camera,
  renderBackground,
  renderShip,
} from "@/features/space-game/canvas-renderer";
import SpaceGameHUD from "@/features/space-game/space-hud";

type Props = {
  userId: string;
};

export default function SpaceGameScreen({ userId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const cameraRef = useRef<Camera>(new Camera());

  // Initialize game
  useEffect(() => {
    // Initialize event handlers
    initSpaceGameHandlers();

    // Create input handler
    const inputHandler = new InputHandler();
    inputHandler.enable();
    inputHandlerRef.current = inputHandler;

    // Handle ESC key to exit
    const handleEscape = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        spaceGame.leaveInstance();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      inputHandler.destroy();
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const camera = cameraRef.current;
    let animationId: number;

    // Resize canvas to fill window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function render() {
      if (!canvas || !ctx) return;

      const ships = spaceGame.$ships;
      const myShip = spaceGame.$myShip;

      // Follow player ship with camera
      if (myShip) {
        camera.follow(myShip.position);
      }

      // Clear and render background
      renderBackground(ctx, camera, canvas.width, canvas.height);

      // Render grid (optional, for spatial reference)
      // renderGrid(ctx, camera, canvas.width, canvas.height);

      // Render all ships
      for (const ship of ships) {
        const isLocalPlayer = ship.playerId === userId;
        renderShip(ctx, ship, camera, canvas.width, canvas.height, isLocalPlayer);
      }

      animationId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [userId]);

  return (
    <div className="space-game-container">
      <canvas ref={canvasRef} className="space-game-canvas" />
      <SpaceGameHUD userId={userId} />
    </div>
  );
}
