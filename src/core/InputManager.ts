export interface InputState {
  /** -1..1, negative = left */
  moveX: number;
  /** -1..1, positive = toward bottom of screen (closer to camera); up/down intentionally inverted from screen-space convention */
  moveY: number;
  firing: boolean;
  /** edge-triggered, true for exactly one poll() after the bomb key/button is pressed */
  bombPressed: boolean;
  /** edge-triggered pause toggle */
  pausePressed: boolean;
  /** true while any touch/pointer drag is active (used to size the joystick UI) */
  usingTouch: boolean;
  touchOrigin: { x: number; y: number } | null;
  touchCurrent: { x: number; y: number } | null;
}

export const JOYSTICK_RADIUS = 46;

export class InputManager {
  private keys = new Set<string>();
  private bombFlag = false;
  private pauseFlag = false;

  private pointerId: number | null = null;
  private pointerStart = { x: 0, y: 0 };
  private pointerCurrent = { x: 0, y: 0 };

  private enabled = true;
  private surface: HTMLElement;

  constructor(surface: HTMLElement) {
    this.surface = surface;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    surface.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("blur", this.reset);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  /** Lets on-screen touch UI (bomb button) trigger the same edge-flag as the keyboard shortcut. */
  pressBomb(): void {
    this.bombFlag = true;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === "KeyX" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
      this.bombFlag = true;
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      this.pauseFlag = true;
    }
    if (e.code === "Space") e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled || this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.pointerCurrent = { ...this.pointerStart };
    this.surface.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerCurrent = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
  };

  private reset = (): void => {
    this.keys.clear();
    this.pointerId = null;
  };

  poll(): InputState {
    let moveX = 0;
    let moveY = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) moveX -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) moveX += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) moveY -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) moveY += 1;
    const diagLen = Math.hypot(moveX, moveY);
    if (diagLen > 1) {
      moveX /= diagLen;
      moveY /= diagLen;
    }

    let firing = this.keys.has("Space") || this.keys.has("KeyZ") || this.keys.has("KeyJ");
    const usingTouch = this.pointerId !== null;

    if (usingTouch) {
      const dx = this.pointerCurrent.x - this.pointerStart.x;
      const dy = this.pointerCurrent.y - this.pointerStart.y;
      const len = Math.hypot(dx, dy);
      const clampedLen = Math.min(len, JOYSTICK_RADIUS);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      const magnitude = clampedLen / JOYSTICK_RADIUS;
      moveX = nx * magnitude;
      moveY = ny * magnitude;
      firing = true;
    }

    const bombPressed = this.bombFlag;
    const pausePressed = this.pauseFlag;
    this.bombFlag = false;
    this.pauseFlag = false;

    if (!this.enabled) {
      return {
        moveX: 0,
        moveY: 0,
        firing: false,
        bombPressed: false,
        pausePressed,
        usingTouch: false,
        touchOrigin: null,
        touchCurrent: null,
      };
    }

    return {
      moveX,
      moveY,
      firing,
      bombPressed,
      pausePressed,
      usingTouch,
      touchOrigin: usingTouch ? this.pointerStart : null,
      touchCurrent: usingTouch ? this.pointerCurrent : null,
    };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.surface.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("blur", this.reset);
  }
}
