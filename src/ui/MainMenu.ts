import { audio } from "../core/AudioEngine";

export interface PlaneLoadout {
  id: string;
  name: string;
  hull: number;
  accent: number;
  speedMultiplier: number;
  description: string;
}

export const LOADOUTS: PlaneLoadout[] = [
  { id: "interceptor", name: "INTERCEPTOR", hull: 0xb9c1c6, accent: 0xcc2b2b, speedMultiplier: 1.0, description: "균형 잡힌 표준 기체" },
  { id: "racer", name: "RACER", hull: 0x5a6b47, accent: 0xffb400, speedMultiplier: 1.22, description: "가볍고 빠른 고기동 기체" },
];

export class MainMenu {
  private root: HTMLDivElement;
  private selected = 0;
  private onSelect: (loadout: PlaneLoadout) => void;
  private onStart: (loadout: PlaneLoadout) => void;

  constructor(container: HTMLElement, highScore: number, onSelect: (loadout: PlaneLoadout) => void, onStart: (loadout: PlaneLoadout) => void) {
    this.onSelect = onSelect;
    this.onStart = onStart;
    this.root = document.createElement("div");
    this.root.className = "menu-screen";
    this.root.innerHTML = `
      <div class="menu-title">IRON SKIES</div>
      <div class="menu-subtitle">HIGH SCORE ${highScore.toString().padStart(7, "0")}</div>
      <div class="plane-select"></div>
      <button type="button" class="menu-btn menu-start-btn">TAP TO START</button>
      <div class="menu-volume">
        <label>SFX <input type="range" class="vol-sfx" min="0" max="1" step="0.05" /></label>
        <label>BGM <input type="range" class="vol-music" min="0" max="1" step="0.05" /></label>
      </div>
      <div class="menu-controls-hint">PC: WASD 이동 · Space 사격 · X 폭탄 · P 일시정지<br />모바일: 화면을 드래그해 이동 (터치 중 자동 발사)</div>
    `;
    container.appendChild(this.root);

    const sfxSlider = this.root.querySelector<HTMLInputElement>(".vol-sfx")!;
    const musicSlider = this.root.querySelector<HTMLInputElement>(".vol-music")!;
    sfxSlider.value = String(audio.getSfxVolume());
    musicSlider.value = String(audio.getMusicVolume());
    sfxSlider.addEventListener("input", () => audio.setSfxVolume(Number(sfxSlider.value)));
    musicSlider.addEventListener("input", () => audio.setMusicVolume(Number(musicSlider.value)));
    sfxSlider.addEventListener("change", () => audio.playUiClick());

    const select = this.root.querySelector(".plane-select")!;
    LOADOUTS.forEach((loadout, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "plane-card" + (i === this.selected ? " active" : "");
      card.innerHTML = `<div class="plane-name">${loadout.name}</div><div class="plane-desc">${loadout.description}</div>`;
      card.addEventListener("click", () => {
        this.selected = i;
        this.refreshSelection();
        audio.playUiClick();
        this.onSelect(loadout);
      });
      select.appendChild(card);
    });

    this.root.querySelector(".menu-start-btn")!.addEventListener("click", () => {
      audio.playUiClick();
      this.onStart(LOADOUTS[this.selected]);
    });

    this.onSelect(LOADOUTS[this.selected]);
  }

  private refreshSelection(): void {
    this.root.querySelectorAll(".plane-card").forEach((el, i) => {
      el.classList.toggle("active", i === this.selected);
    });
  }

  dispose(): void {
    this.root.remove();
  }
}
