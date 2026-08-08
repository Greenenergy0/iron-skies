import { JOYSTICK_RADIUS, type InputState } from "../core/InputManager";

/** Purely visual: draws a floating joystick where the player is dragging, plus a fixed bomb button. */
export class TouchControls {
  private root: HTMLDivElement;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private bombBtn: HTMLButtonElement;
  private container: HTMLElement;

  constructor(container: HTMLElement, onBomb: () => void) {
    this.container = container;
    this.root = document.createElement("div");
    this.root.className = "touch-controls";
    this.root.innerHTML = `
      <div class="joystick-base"><div class="joystick-knob"></div></div>
      <button type="button" class="bomb-button">BOMB</button>
    `;
    container.appendChild(this.root);
    this.base = this.root.querySelector(".joystick-base")!;
    this.knob = this.root.querySelector(".joystick-knob")!;
    this.bombBtn = this.root.querySelector(".bomb-button")!;

    this.bombBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.bombBtn.classList.add("pressed");
      onBomb();
    });
    this.bombBtn.addEventListener("pointerup", () => this.bombBtn.classList.remove("pressed"));
    this.bombBtn.addEventListener("pointerleave", () => this.bombBtn.classList.remove("pressed"));
  }

  updateJoystick(input: InputState): void {
    if (input.usingTouch && input.touchOrigin && input.touchCurrent) {
      const rect = this.container.getBoundingClientRect();
      const originX = input.touchOrigin.x - rect.left;
      const originY = input.touchOrigin.y - rect.top;
      this.base.style.opacity = "1";
      this.base.style.left = `${originX}px`;
      this.base.style.top = `${originY}px`;

      const dx = input.touchCurrent.x - input.touchOrigin.x;
      const dy = input.touchCurrent.y - input.touchOrigin.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, JOYSTICK_RADIUS);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      this.knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    } else {
      this.base.style.opacity = "0";
    }
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? "block" : "none";
  }

  dispose(): void {
    this.root.remove();
  }
}
