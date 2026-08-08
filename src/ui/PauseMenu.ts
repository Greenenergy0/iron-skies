import { audio } from "../core/AudioEngine";

export interface PauseMenuHandlers {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export class PauseMenu {
  private root: HTMLDivElement;

  constructor(container: HTMLElement, handlers: PauseMenuHandlers) {
    this.root = document.createElement("div");
    this.root.className = "menu-screen pause-screen";
    this.root.innerHTML = `
      <div class="menu-title" style="font-size:22px;">PAUSED</div>
      <button type="button" class="menu-btn" data-action="resume">RESUME</button>
      <button type="button" class="menu-btn" data-action="restart">RESTART</button>
      <button type="button" class="menu-btn" data-action="menu">MAIN MENU</button>
    `;
    container.appendChild(this.root);

    this.bind("resume", () => handlers.onResume());
    this.bind("restart", () => handlers.onRestart());
    this.bind("menu", () => handlers.onMainMenu());
  }

  private bind(action: string, fn: () => void): void {
    this.root.querySelector(`[data-action="${action}"]`)!.addEventListener("click", () => {
      audio.playUiClick();
      fn();
    });
  }

  dispose(): void {
    this.root.remove();
  }
}
