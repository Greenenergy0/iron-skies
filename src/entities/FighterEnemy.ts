import * as THREE from "three";
import { Enemy } from "./Enemy";
import { createFighterPlane } from "../core/AssetFactory";
import type { EnemyBulletManager } from "./EnemyBullet";

const ADVANCE_SPEED = 3.2;
const WEAVE_AMPLITUDE = 1.9;
const WEAVE_FREQUENCY = 1.3;
const FIRE_INTERVAL_MIN = 1.4;
const FIRE_INTERVAL_MAX = 2.4;
const BULLET_SPEED = 6.5;
const SCALE = 0.6;

/** A weaving fighter that advances toward the player and takes periodic shots. */
export class FighterEnemy extends Enemy {
  private baseX: number;
  private fireTimer: number;
  private bulletManager: EnemyBulletManager;
  private propeller: THREE.Object3D;
  private speedScale: number;

  constructor(scene: THREE.Scene, bulletManager: EnemyBulletManager, spawnX: number, spawnZ: number, speedScale = 1) {
    const { group, propeller } = createFighterPlane({
      hull: 0x8a3f3f,
      accent: 0x2b2b2b,
      canopy: 0x241414,
      stripes: true,
      roundel: true,
      roundelRing: "#7a1f1f",
      roundelStar: "#f4e3c8",
    });
    group.rotation.y = Math.PI;
    group.scale.setScalar(SCALE);
    group.position.set(spawnX, 0.55, spawnZ);
    scene.add(group);

    super(group, 0.42 * SCALE, 2, 120);
    this.baseX = spawnX;
    this.propeller = propeller;
    this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    this.bulletManager = bulletManager;
    this.speedScale = speedScale;
  }

  protected updatePattern(dt: number, playerPos: THREE.Vector3): void {
    this.group.position.z += ADVANCE_SPEED * this.speedScale * dt;
    this.group.position.x = this.baseX + Math.sin(this.elapsed * WEAVE_FREQUENCY) * WEAVE_AMPLITUDE;
    this.propeller.rotation.z -= dt * 40;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.alive) {
      this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
      const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.0001) dir.normalize();
      else dir.set(0, 0, 1);
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 0.05, 0.35));
      this.bulletManager.spawn(spawnPos, dir.multiplyScalar(BULLET_SPEED * this.speedScale));
    }
  }
}
