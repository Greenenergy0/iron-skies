import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export interface CustomModelConfig {
  url: string;
  /** Initial Y rotation (radians) that aligns the model's native forward axis with the caller's expected forward. */
  rotationY: number;
  /** Uniform scale applied to the wrapper (converts the model's native units into world units). */
  scale: number;
  /** Native-space position offset applied to the loaded scene before wrapping (recenters an off-origin model). */
  offset?: THREE.Vector3;
}

/**
 * Loads a .glb/.gltf and hands back a THREE.Group wrapper (rotation+scale+recenter already
 * applied) via onLoaded. Silently no-ops on failure — callers keep whatever fallback is showing.
 */
export function loadCustomModel(config: CustomModelConfig, onLoaded: (wrapper: THREE.Group) => void): void {
  loader.load(
    config.url,
    (gltf) => {
      const inner = gltf.scene;
      if (config.offset) inner.position.copy(config.offset);
      inner.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });

      const wrapper = new THREE.Group();
      wrapper.rotation.y = config.rotationY;
      wrapper.scale.setScalar(config.scale);
      wrapper.add(inner);
      onLoaded(wrapper);
    },
    undefined,
    () => {
      /* No custom model available (or failed to load) — caller's procedural fallback stays visible. */
    },
  );
}

/** Toggles visibility of every mesh tagged `userData.proceduralPart` under root (leaves other children, e.g. a swapped-in custom model, alone). */
export function setProceduralPartsVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((child) => {
    if (child.userData.proceduralPart) child.visible = visible;
  });
}
