import "./styles/showroom.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Player, DEFAULT_TUNING, DEFAULT_PLAYER_SCALE, type PlayerTuning } from "./entities/Player";
import { PLAYFIELD_HALF_WIDTH } from "./core/SceneManager";
import type { InputState } from "./core/InputManager";

const host = document.getElementById("showroom-canvas-host")!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1220);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(4, 4.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(4, 8, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6fa8ff, 0.5);
rim.position.set(-5, 3, -4);
scene.add(rim);

const grid = new THREE.GridHelper(20, 20, 0x3d7ab8, 0x1a3d63);
scene.add(grid);

// Playfield bounds reference (matches the real game's DEPTH_MIN/MAX + PLAYFIELD_HALF_WIDTH).
const DEPTH_MIN = -3.2;
const DEPTH_MAX = 2.4;
const boundsPoints = [
  new THREE.Vector3(-PLAYFIELD_HALF_WIDTH, 0.02, DEPTH_MIN),
  new THREE.Vector3(PLAYFIELD_HALF_WIDTH, 0.02, DEPTH_MIN),
  new THREE.Vector3(PLAYFIELD_HALF_WIDTH, 0.02, DEPTH_MAX),
  new THREE.Vector3(-PLAYFIELD_HALF_WIDTH, 0.02, DEPTH_MAX),
  new THREE.Vector3(-PLAYFIELD_HALF_WIDTH, 0.02, DEPTH_MIN),
];
const boundsLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(boundsPoints),
  new THREE.LineBasicMaterial({ color: 0xff8a3c }),
);
scene.add(boundsLine);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 30;
controls.update();

function resize(): void {
  const w = host.clientWidth;
  const h = host.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, true);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const player = new Player(scene);

// --- Keyboard-only flight test input (deliberately independent of InputManager's
// pointer-drag handling, which would otherwise fight OrbitControls' mouse drag). ---
const keys = new Set<string>();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

function pollKeyboard(): InputState {
  let moveX = 0;
  let moveY = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) moveY -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) moveY += 1;
  const len = Math.hypot(moveX, moveY);
  if (len > 1) {
    moveX /= len;
    moveY /= len;
  }
  return {
    moveX,
    moveY,
    firing: false,
    bombPressed: false,
    pausePressed: false,
    usingTouch: false,
    touchOrigin: null,
    touchCurrent: null,
  };
}

// --- Control panel wiring ---
const sliderIds: { key: keyof PlayerTuning; id: string; valueId: string; decimals: number }[] = [
  { key: "moveSpeedX", id: "s-moveSpeedX", valueId: "v-moveSpeedX", decimals: 1 },
  { key: "moveSpeedZ", id: "s-moveSpeedZ", valueId: "v-moveSpeedZ", decimals: 1 },
  { key: "accelX", id: "s-accelX", valueId: "v-accelX", decimals: 0 },
  { key: "accelZ", id: "s-accelZ", valueId: "v-accelZ", decimals: 0 },
  { key: "bankAmount", id: "s-bank", valueId: "v-bank", decimals: 2 },
  { key: "pitchAmount", id: "s-pitch", valueId: "v-pitch", decimals: 2 },
];

const scaleSlider = document.getElementById("s-scale") as HTMLInputElement;
const scaleValueEl = document.getElementById("v-scale")!;

function applyTuningToUI(tuning: PlayerTuning): void {
  for (const s of sliderIds) {
    const input = document.getElementById(s.id) as HTMLInputElement;
    const valueEl = document.getElementById(s.valueId)!;
    input.value = String(tuning[s.key]);
    valueEl.textContent = tuning[s.key].toFixed(s.decimals);
  }
}

function applyScaleToUI(scale: number): void {
  scaleSlider.value = String(scale);
  scaleValueEl.textContent = scale.toFixed(2);
}

applyTuningToUI(DEFAULT_TUNING);
applyScaleToUI(DEFAULT_PLAYER_SCALE);
player.setTuning(DEFAULT_TUNING);

for (const s of sliderIds) {
  const input = document.getElementById(s.id) as HTMLInputElement;
  const valueEl = document.getElementById(s.valueId)!;
  input.addEventListener("input", () => {
    const value = Number(input.value);
    valueEl.textContent = value.toFixed(s.decimals);
    player.setTuning({ [s.key]: value } as Partial<PlayerTuning>);
  });
}

scaleSlider.addEventListener("input", () => {
  const value = Number(scaleSlider.value);
  scaleValueEl.textContent = value.toFixed(2);
  player.group.scale.setScalar(value);
});

document.getElementById("reset-btn")!.addEventListener("click", () => {
  applyTuningToUI(DEFAULT_TUNING);
  applyScaleToUI(DEFAULT_PLAYER_SCALE);
  player.setTuning(DEFAULT_TUNING);
  player.group.scale.setScalar(DEFAULT_PLAYER_SCALE);
});

document.getElementById("copy-btn")!.addEventListener("click", () => {
  const t = player.getTuning();
  const scale = player.group.scale.x;
  const code = [
    "export const DEFAULT_TUNING: PlayerTuning = {",
    `  moveSpeedX: ${t.moveSpeedX},`,
    `  moveSpeedZ: ${t.moveSpeedZ},`,
    `  accelX: ${t.accelX},`,
    `  accelZ: ${t.accelZ},`,
    `  bankAmount: ${t.bankAmount},`,
    `  pitchAmount: ${t.pitchAmount},`,
    "};",
    `export const DEFAULT_PLAYER_SCALE = ${scale.toFixed(2)};`,
  ].join("\n");
  const output = document.getElementById("code-output")!;
  output.textContent = code;
  navigator.clipboard?.writeText(code).catch(() => {
    /* clipboard permission unavailable — the snippet is still shown below for manual copy */
  });
});

// --- Custom model loading (local file only; nothing is fetched or embedded by the app itself) ---
const gltfLoader = new GLTFLoader();
let customModel: THREE.Object3D | null = null;
const statusEl = document.getElementById("model-status")!;

function clearCustomModel(): void {
  if (customModel) {
    player.group.remove(customModel);
    customModel = null;
  }
  player.setProceduralModelVisible(true);
  statusEl.textContent = "프로시저럴 모델 표시 중";
}

document.getElementById("revert-model-btn")!.addEventListener("click", clearCustomModel);

const fileInput = document.getElementById("model-file-input") as HTMLInputElement;
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  statusEl.textContent = `불러오는 중: ${file.name}...`;

  const reader = new FileReader();
  reader.onload = () => {
    const buffer = reader.result as ArrayBuffer;
    gltfLoader.parse(
      buffer,
      "",
      (gltf) => {
        clearCustomModel();
        customModel = gltf.scene;
        player.setProceduralModelVisible(false);
        player.group.add(customModel);
        statusEl.textContent = `로드됨: ${file.name} (씬 안에서 이동/회전은 절차적 모델과 동일한 로직 사용)`;
      },
      (err) => {
        statusEl.textContent = `로드 실패: ${err instanceof Error ? err.message : String(err)}`;
      },
    );
  };
  reader.readAsArrayBuffer(file);
});

// --- Render loop ---
if (import.meta.env.DEV) {
  const w = window as unknown as {
    __player: Player;
    __controls: OrbitControls;
    __renderer: THREE.WebGLRenderer;
    __scene: THREE.Scene;
    __camera: THREE.PerspectiveCamera;
  };
  w.__player = player;
  w.__controls = controls;
  w.__renderer = renderer;
  w.__scene = scene;
  w.__camera = camera;
}

let lastTime = 0;
function loop(time: number): void {
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 1 / 30) : 0;
  lastTime = time;

  player.update(dt, pollKeyboard(), 0, []);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
