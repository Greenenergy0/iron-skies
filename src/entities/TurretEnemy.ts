import * as THREE from "three";
import { Enemy } from "./Enemy";
import { createTurret } from "../core/AssetFactory";
import type { EnemyBulletManager } from "./EnemyBullet";

const FIRE_INTERVAL_MIN = 1.6;
const FIRE_INTERVAL_MAX = 2.4;
const BULLET_SPEED = 6.2;
const AIM_RANGE_Z = 16;
const SCALE = 0.78;

/** World-fixed ground/deck turret: doesn't fly, just sits and tracks/fires as the world scrolls past. */
export class TurretEnemy extends Enemy {
  private head: THREE.Group;
  private fireTimer: number;
  private bulletManager: EnemyBulletManager;
  private speedScale: number;

  constructor(scene: THREE.Scene, bulletManager: EnemyBulletManager, spawnX: number, spawnZ: number, speedScale = 1) {
    const { group, head } = createTurret();
    group.scale.setScalar(SCALE);
    group.position.set(spawnX, 0.05, spawnZ);
    scene.add(group);

    super(group, 0.48 * SCALE, 3, 180);
    this.head = head;
    this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    this.bulletManager = bulletManager;
    this.speedScale = speedScale;
  }

  protected updatePattern(dt: number, playerPos: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    const inRange = Math.abs(dir.z) < AIM_RANGE_Z;
    if (inRange) {
      this.head.rotation.y = Math.atan2(dir.x, dir.z);
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.alive && inRange) {
      this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
      const aimDir = dir.clone();
      aimDir.y = 0;
      if (aimDir.lengthSq() > 0.0001) aimDir.normalize();
      else aimDir.set(0, 0, 1);
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 0.3 * SCALE, 0)).addScaledVector(aimDir, 0.5 * SCALE);
      this.bulletManager.spawn(spawnPos, aimDir.multiplyScalar(BULLET_SPEED * this.speedScale));
    }
  }
}
