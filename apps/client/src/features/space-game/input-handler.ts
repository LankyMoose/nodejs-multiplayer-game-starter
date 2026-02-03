/**
 * Input Handler for Space Game
 * Handles keyboard input for ship controls
 */

import { spaceGame } from "@/state/space-game";

export class InputHandler {
  private keys: Set<string> = new Set();
  private enabled: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    
    // Prevent default for game keys
    if (
      ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }

    this.keys.add(e.code);
    this.updateInput();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    this.keys.delete(e.code);
    this.updateInput();
  };

  private handleBlur = () => {
    // Clear all keys when window loses focus
    this.keys.clear();
    if (this.enabled) {
      this.updateInput();
    }
  };

  private updateInput() {
    const input = {
      thrust: this.keys.has("KeyW") || this.keys.has("ArrowUp"),
      rotateLeft: this.keys.has("KeyA") || this.keys.has("ArrowLeft"),
      rotateRight: this.keys.has("KeyD") || this.keys.has("ArrowRight"),
      brake: this.keys.has("KeyS") || this.keys.has("ArrowDown"),
    };

    // Update current input state
    spaceGame.currentInput = input;

    // Send to server
    spaceGame.sendInput(input);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }

  isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }
}
