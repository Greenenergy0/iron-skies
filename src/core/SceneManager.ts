import * as THREE from "three";

export const DESIGN_WIDTH = 480;
export const DESIGN_HEIGHT = 854;
export const PLAYFIELD_HALF_WIDTH = 3.6;

/**
 * Owns the renderer/scene/camera/lights and keeps the logical 480x854
 * play-field frame correctly sized (letterboxed) inside the real viewport.
 */
export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly sun: THREE.DirectionalLight;
  width = DESIGN_WIDTH;
  height = DESIGN_HEIGHT;
  private frame: HTMLElement;
  private host: HTMLElement;

  constructor(frame: HTMLElement, host: HTMLElement) {
    this.frame = frame;
    this.host = host;
    this.camera = new THREE.PerspectiveCamera(34, DESIGN_WIDTH / DESIGN_HEIGHT, 0.1, 220);
    this.camera.up.set(0, 0, -1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x0a1626);
    this.scene.fog = new THREE.Fog(0x0a1626, 26, 70);

    const ambient = new THREE.AmbientLight(0x8fa7d6, 0.65);
    this.scene.add(ambient);

    const fill = new THREE.HemisphereLight(0x6fa8ff, 0x0a1626, 0.4);
    this.scene.add(fill);

    this.sun = new THREE.DirectionalLight(0xffd9a0, 1.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -12;
    this.sun.shadow.camera.right = 12;
    this.sun.shadow.camera.top = 16;
    this.sun.shadow.camera.bottom = -16;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
    this.sun.shadow.bias = -0.002;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    window.visualViewport?.addEventListener("resize", this.resize);
    this.resize();
  }

  resize = (): void => {
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const targetAspect = DESIGN_WIDTH / DESIGN_HEIGHT;

    let w: number;
    let h: number;
    if (availW / availH > targetAspect) {
      h = availH;
      w = h * targetAspect;
    } else {
      w = availW;
      h = w / targetAspect;
    }
    w = Math.round(w);
    h = Math.round(h);

    this.width = w;
    this.height = h;
    this.frame.style.width = `${w}px`;
    this.frame.style.height = `${h}px`;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Keeps the sun and its shadow frustum following a moving focus point (the scroll head). */
  followSun(focusX: number, focusZ: number): void {
    this.sun.position.set(focusX - 9, 20, focusZ + 10);
    this.sun.target.position.set(focusX, 0, focusZ);
    this.sun.target.updateMatrixWorld();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);
    window.visualViewport?.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
