import "./styles/main.css";
import { Game } from "./core/Game";
import { audio } from "./core/AudioEngine";

const frame = document.getElementById("viewport-frame")!;
const canvasHost = document.getElementById("canvas-host")!;
const hudLayer = document.getElementById("hud-layer")!;
const menuLayer = document.getElementById("menu-layer")!;
const touchSurface = document.getElementById("touch-layer")!;

const game = new Game(frame, canvasHost, touchSurface, hudLayer, menuLayer);

function unlockAudioOnce(): void {
  audio.unlock();
  audio.startMusic();
  window.removeEventListener("pointerdown", unlockAudioOnce);
  window.removeEventListener("keydown", unlockAudioOnce);
}
window.addEventListener("pointerdown", unlockAudioOnce);
window.addEventListener("keydown", unlockAudioOnce);

if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}
