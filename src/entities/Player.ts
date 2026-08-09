import * as THREE from "three";
import type { InputState } from "../core/InputManager";
import { createFighterPlane } from "../core/AssetFactory";
import { PLAYFIELD_HALF_WIDTH } from "../core/SceneManager";
import { clamp, approach } from "../utils/MathUtils";
import { WeaponSystem } from "../systems/WeaponSystem";
import { loadCustomModel, setProceduralPartsVisible } from "../core/CustomModelLoader";
import type { Enemy } from "./Enemy";
import type { Bullet } from "./Bullet";

// Custom player model: authored at real-world (meter) scale, length axis is X but the nose
// actually sits at the -X end (confirmed visually — the +90° guess had it flying tail-first).
// Rotating -90° about Y maps local -X (nose) to world -Z, matching this game's forward convention.
const CUSTOM_MODEL_URL = `${import.meta.env.BASE_URL}models/harrier_gr7.glb`;
const CUSTOM_MODEL_WORLD_SCALE = 0.115;
const CUSTOM_MODEL_ROTATION_Y = -Math.PI / 2;
const CUSTOM_MODEL_LOCAL_Y_OFFSET = -2.05;

export interface PlayerTuning {
  moveSpeedX: number;
  moveSpeedZ: number;
  accelX: number;
  accelZ: number;
  bankAmount: number;
  pitchAmount: number;
}

export const DEFAULT_TUNING: PlayerTuning = {
  moveSpeedX: 12,
  moveSpeedZ: 10.5,
  accelX: 46,
  accelZ: 40,
  bankAmount: 0.55,
  pitchAmount: 0.14,
};

const DEPTH_MIN = -3.2;
const DEPTH_MAX = 2.4;
const PROP_SPIN_SPEED = 55;
const RESPAWN_INVULN_DURATION = 1.8;
const MAX_OPTIONS = 2;
const MAX_BOMBS = 3;
export const DEFAULT_PLAYER_SCALE = 0.68;
const PLAYER_SCALE = DEFAULT_PLAYER_SCALE;
const OPTION_LOCAL_OFFSETS: THREE.Vector3[] = [new THREE.Vector3(-0.95, -0.05, 0.35), new THREE.Vector3(0.95, -0.05, 0.35)];

export class Player {
  readonly group: THREE.Group;
  readonly radius = 0.42 * PLAYER_SCALE;
  readonly weapon: WeaponSystem;
  alive = true;
  depthOffset = 0.4;
  bombs = 2;
  optionCount = 0;

  private tuning: PlayerTuning = { ...DEFAULT_TUNING };
  private respawnInvulnTimer = 0;
  private shieldTimer = 0;
  private speedMultiplier = 1;
  private velocityX = 0;
  private velocityZ = 0;
  private propeller: THREE.Object3D;
  private hullMaterial: THREE.MeshStandardMaterial;
  private accentMaterial: THREE.MeshStandardMaterial;
  private shieldMesh: THREE.Mesh;
  private optionMeshes: THREE.Object3D[] = [];
  private tmpWorld = new THREE.Vector3();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const { group, propeller, hullMaterial, accentMaterial } = createFighterPlane({
      hull: 0xb9c1c6,
      accent: 0xcc2b2b,
      canopy: 0x16222c,
      stripes: true,
      roundel: true,
    });
    this.group = group;
    this.propeller = propeller;
    this.hullMaterial = hullMaterial;
    this.accentMaterial = accentMaterial;
    this.group.scale.setScalar(PLAYER_SCALE);
    this.group.position.set(0, 0.55, 0);
    scene.add(this.group);

    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x6fd8ff,
      transparent: true,
      opacity: 0.28,
      emissive: 0x2fb8ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    this.shieldMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), shieldMat);
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    this.weapon = new WeaponSystem(scene);

    this.loadCustomModel();
  }

  /** Best-effort swap to the custom .glb model; silently keeps the procedural plane if it fails to load. */
  private loadCustomModel(): void {
    loadCustomModel(
      {
        url: CUSTOM_MODEL_URL,
        rotationY: CUSTOM_MODEL_ROTATION_Y,
        scale: CUSTOM_MODEL_WORLD_SCALE / PLAYER_SCALE,
        offset: new THREE.Vector3(0, CUSTOM_MODEL_LOCAL_Y_OFFSET, 0),
      },
      (wrapper) => {
        this.setProceduralModelVisible(false);
        this.group.add(wrapper);
      },
    );
  }

  get bullets(): Bullet[] {
    return this.weapon.bullets;
  }

  get invulnerable(): boolean {
    return this.respawnInvulnTimer > 0 || this.shieldTimer > 0;
  }

  /** Live-adjustable movement feel (used by the tuning showroom); partial updates merge over current values. */
  setTuning(partial: Partial<PlayerTuning>): void {
    this.tuning = { ...this.tuning, ...partial };
  }

  getTuning(): PlayerTuning {
    return { ...this.tuning };
  }

  /** Shows/hides just the procedural aircraft meshes (tagged in AssetFactory), leaving the shield and any swapped-in custom model untouched. */
  setProceduralModelVisible(visible: boolean): void {
    setProceduralPartsVisible(this.group, visible);
  }

  update(dt: number, input: InputState, scrollZ: number, enemies: Enemy[]): void {
    if (this.alive) {
      const targetVX = input.moveX * this.tuning.moveSpeedX * this.speedMultiplier;
      const targetVZ = input.moveY * this.tuning.moveSpeedZ * this.speedMultiplier;
      this.velocityX = approach(this.velocityX, targetVX, this.tuning.accelX * this.speedMultiplier * dt);
      this.velocityZ = approach(this.velocityZ, targetVZ, this.tuning.accelZ * this.speedMultiplier * dt);

      this.depthOffset = clamp(this.depthOffset + this.velocityZ * dt, DEPTH_MIN, DEPTH_MAX);
      const targetX = clamp(this.group.position.x + this.velocityX * dt, -PLAYFIELD_HALF_WIDTH, PLAYFIELD_HALF_WIDTH);
      this.group.position.x = targetX;
      this.group.position.z = scrollZ + this.depthOffset;
      this.group.rotation.z = -input.moveX * this.tuning.bankAmount;
      this.group.rotation.x = input.moveY * this.tuning.pitchAmount;

      const extraOrigins = this.optionMeshes.map((mesh) => mesh.getWorldPosition(this.tmpWorld.clone()));
      this.weapon.update(dt, input.firing, this.group.position, enemies, extraOrigins);
    } else {
      this.weapon.update(dt, false, this.group.position, enemies, []);
    }

    this.updateInvulnerability(dt);
    this.propeller.rotation.z += dt * PROP_SPIN_SPEED;
  }

  private updateInvulnerability(dt: number): void {
    if (this.respawnInvulnTimer > 0) {
      this.respawnInvulnTimer -= dt;
      this.group.visible = Math.floor(this.respawnInvulnTimer * 10) % 2 === 0;
      if (this.respawnInvulnTimer <= 0) this.group.visible = this.alive;
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      this.shieldMesh.visible = true;
      this.shieldMesh.rotation.y += dt * 0.8;
      this.shieldMesh.rotation.x += dt * 0.5;
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.04;
      this.shieldMesh.scale.setScalar(pulse);
    } else {
      this.shieldMesh.visible = false;
    }
  }

  removeBulletAt(index: number): void {
    this.weapon.removeAt(index);
  }

  hit(): void {
    if (this.invulnerable || !this.alive) return;
    this.alive = false;
    this.group.visible = false;
  }

  respawn(scrollZ: number): void {
    this.alive = true;
    this.group.visible = true;
    this.depthOffset = 0.4;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.group.position.set(0, 0.55, scrollZ + this.depthOffset);
    this.group.rotation.set(0, 0, 0);
    this.respawnInvulnTimer = RESPAWN_INVULN_DURATION;
  }

  /** Clears run-scoped progress (bombs/options/shield) for a fresh run; keeps the chosen loadout skin. */
  resetLoadoutState(): void {
    for (const drone of this.optionMeshes) this.group.remove(drone);
    this.optionMeshes = [];
    this.optionCount = 0;
    this.bombs = 2;
    this.shieldTimer = 0;
    this.respawnInvulnTimer = 0;
  }

  configure(loadout: { hull: number; accent: number; speedMultiplier: number }): void {
    this.hullMaterial.color.set(loadout.hull);
    this.accentMaterial.color.set(loadout.accent);
    this.speedMultiplier = loadout.speedMultiplier;
  }

  applyShield(duration: number): void {
    this.shieldTimer = Math.max(this.shieldTimer, duration);
  }

  addBomb(): void {
    this.bombs = Math.min(MAX_BOMBS, this.bombs + 1);
  }

  /** Returns true if a bomb was actually consumed. */
  consumeBomb(): boolean {
    if (this.bombs <= 0) return false;
    this.bombs -= 1;
    return true;
  }

  addOption(): void {
    if (this.optionCount >= MAX_OPTIONS) return;
    const offset = OPTION_LOCAL_OFFSETS[this.optionCount];
    const { group: drone } = createFighterPlane({ hull: 0xbfe0ff, accent: 0xffb400, canopy: 0x123044 });
    drone.scale.setScalar(0.5);
    drone.position.copy(offset);
    this.group.add(drone);
    this.optionMeshes.push(drone);
    this.optionCount++;
  }

  dispose(): void {
    this.scene.remove(this.group);
  }
}
