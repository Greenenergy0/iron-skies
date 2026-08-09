import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const loader = new GLTFLoader();

// Cache the parsed template per URL so spawning many enemies doesn't re-fetch/re-parse a
// multi-MB .glb from scratch every time — each caller gets a cheap clone of the cached scene.
const templateCache = new Map<string, Promise<THREE.Object3D>>();

function loadTemplate(url: string): Promise<THREE.Object3D> {
  let cached = templateCache.get(url);
  if (!cached) {
    cached = new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
    templateCache.set(url, cached);
  }
  return cached;
}

export interface CustomModelConfig {
  url: string;
  /** Y rotation (radians) that aligns the model's native forward axis with the caller's expected forward. */
  rotationY: number;
  /** Uniform scale applied to the wrapper (converts the model's native units into world units). */
  scale: number;
  /** Native-space position offset applied to the cloned scene before wrapping (recenters an off-origin model). */
  offset?: THREE.Vector3;
}

/**
 * Resolves a .glb/.gltf (using a shared cached-and-cloned template — see above) and hands back
 * a THREE.Group wrapper (rotation+scale+recenter already applied) via onLoaded. Silently no-ops
 * on failure — callers keep whatever fallback is already showing.
 */
export function loadCustomModel(config: CustomModelConfig, onLoaded: (wrapper: THREE.Group) => void): void {
  loadTemplate(config.url)
    .then((template) => {
      const inner = cloneSkinned(template);
      if (config.offset) inner.position.copy(config.offset);
      inner.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });

      const wrapper = new THREE.Group();
      wrapper.rotation.y = config.rotationY;
      wrapper.scale.setScalar(config.scale);
      wrapper.add(inner);
      onLoaded(wrapper);
    })
    .catch(() => {
      /* No custom model available (or failed to load) — caller's procedural fallback stays visible. */
    });
}

/** Toggles visibility of every mesh tagged `userData.proceduralPart` under root (leaves other children, e.g. a swapped-in custom model, alone). */
export function setProceduralPartsVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((child) => {
    if (child.userData.proceduralPart) child.visible = visible;
  });
}
