import "./styles/main.css";
import { Game } from "./core/Game";
import { audio } from "./core/AudioEngine";

/**
 * iOS Safari still triggers double-tap-to-zoom on rapid taps regardless of
 * `touch-action: none` / `user-scalable=no`, so it needs an explicit block.
 */
function preventDoubleTapZoom(): void {
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) event.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );
  document.addEventListener("gesturestart", (event) => event.preventDefault());
}
preventDoubleTapZoom();

/**
 * The whole page is the game surface — there's nothing to scroll. Blocking
 * touchmove's default action stops the browser's own gestures (pull-to-refresh,
 * edge-swipe tab/back navigation) from hijacking a downward drag mid-game.
 * The joystick itself reads Pointer Events, which fire independently of this.
 */
document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });

/**
 * Requests fullscreen (hides the browser chrome that a downward swipe would
 * otherwise reveal) and locks the orientation to portrait-primary only, so
 * flipping the phone upside-down can't mirror the display. Both APIs require
 * a live user gesture, so this runs once on the first tap; both are silently
 * unsupported on iOS Safari, where the equivalent is "Add to Home Screen".
 */
function enterImmersiveModeOnce(): void {
  window.removeEventListener("pointerdown", enterImmersiveModeOnce);
  const root = document.documentElement;
  root
    .requestFullscreen?.()
    ?.then(() => screen.orientation?.lock?.("portrait-primary"))
    .catch(() => {});
}
window.addEventListener("pointerdown", enterImmersiveModeOnce);

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
