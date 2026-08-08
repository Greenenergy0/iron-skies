import type { WeaponType } from "../systems/WeaponSystem";

export interface HudState {
  score: number;
  lives: number;
  weaponType: WeaponType;
  weaponLevel: number;
  bombs: number;
  combo: number;
}

const WEAPON_STYLE: Record<WeaponType, { label: string; color: string }> = {
  vulcan: { label: "VULCAN", color: "#ffb400" },
  laser: { label: "LASER", color: "#1fb8ff" },
  missile: { label: "MISSILE", color: "#2ecc40" },
};

export class HUD {
  private root: HTMLDivElement;
  private scoreEl: HTMLElement;
  private livesEl: HTMLElement;
  private weaponLabelEl: HTMLElement;
  private weaponPipsEl: HTMLElement;
  private bombsEl: HTMLElement;
  private comboEl: HTMLElement;
  private flashEl: HTMLElement;
  private lastLives = -1;
  private lastWeaponLevel = -1;
  private lastWeaponType: WeaponType | null = null;
  private lastBombs = -1;
  private bossBar: HTMLElement;
  private bossNameEl: HTMLElement;
  private bossFillEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "hud-root";
    this.root.innerHTML = `
      <div class="hud-flash"></div>
      <div class="hud-top">
        <div class="hud-score">SCORE<br /><span class="hud-score-val">0000000</span>
          <div class="hud-combo"></div>
        </div>
        <div class="hud-lives"></div>
      </div>
      <div class="boss-bar" style="display:none;">
        <div class="boss-bar-name"></div>
        <div class="boss-bar-track"><div class="boss-bar-fill"></div></div>
      </div>
      <div class="hud-bottom">
        <div class="hud-weapon">
          <span class="hud-weapon-label">VULCAN</span>
          <div class="hud-weapon-pips"></div>
        </div>
        <div class="hud-bombs"></div>
      </div>
    `;
    container.appendChild(this.root);
    this.scoreEl = this.root.querySelector(".hud-score-val")!;
    this.livesEl = this.root.querySelector(".hud-lives")!;
    this.weaponLabelEl = this.root.querySelector(".hud-weapon-label")!;
    this.weaponPipsEl = this.root.querySelector(".hud-weapon-pips")!;
    this.bombsEl = this.root.querySelector(".hud-bombs")!;
    this.comboEl = this.root.querySelector(".hud-combo")!;
    this.flashEl = this.root.querySelector(".hud-flash")!;
    this.bossBar = this.root.querySelector(".boss-bar")!;
    this.bossNameEl = this.root.querySelector(".boss-bar-name")!;
    this.bossFillEl = this.root.querySelector(".boss-bar-fill")!;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? "flex" : "none";
  }

  setBoss(name: string | null, hpFraction: number): void {
    if (name === null) {
      this.bossBar.style.display = "none";
      return;
    }
    this.bossBar.style.display = "flex";
    this.bossNameEl.textContent = name;
    this.bossFillEl.style.width = `${Math.max(0, Math.min(1, hpFraction)) * 100}%`;
  }

  flash(color = "rgba(255,255,255,0.7)", duration = 0.4): void {
    this.flashEl.style.transition = "none";
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = "1";
    // Force reflow so the next transition actually animates from opacity 1.
    void this.flashEl.offsetHeight;
    this.flashEl.style.transition = `opacity ${duration}s ease-out`;
    this.flashEl.style.opacity = "0";
  }

  update(state: HudState): void {
    this.scoreEl.textContent = Math.floor(state.score).toString().padStart(7, "0");

    if (state.lives !== this.lastLives) {
      this.lastLives = state.lives;
      this.livesEl.innerHTML = "";
      for (let i = 0; i < Math.max(0, state.lives); i++) {
        const icon = document.createElement("span");
        icon.className = "hud-life-icon";
        this.livesEl.appendChild(icon);
      }
    }

    if (state.weaponType !== this.lastWeaponType || state.weaponLevel !== this.lastWeaponLevel) {
      this.lastWeaponType = state.weaponType;
      this.lastWeaponLevel = state.weaponLevel;
      const style = WEAPON_STYLE[state.weaponType];
      this.weaponLabelEl.textContent = style.label;
      this.weaponLabelEl.style.color = style.color;
      this.weaponPipsEl.innerHTML = "";
      for (let i = 0; i < 4; i++) {
        const pip = document.createElement("span");
        pip.className = "hud-pip" + (i < state.weaponLevel ? " filled" : "");
        if (i < state.weaponLevel) pip.style.background = style.color;
        this.weaponPipsEl.appendChild(pip);
      }
    }

    if (state.bombs !== this.lastBombs) {
      this.lastBombs = state.bombs;
      this.bombsEl.innerHTML = "";
      for (let i = 0; i < state.bombs; i++) {
        const icon = document.createElement("span");
        icon.className = "hud-bomb-icon";
        this.bombsEl.appendChild(icon);
      }
    }

    if (state.combo >= 2) {
      this.comboEl.textContent = `COMBO x${state.combo}`;
      this.comboEl.style.opacity = "1";
    } else {
      this.comboEl.style.opacity = "0";
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
