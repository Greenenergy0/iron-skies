import * as THREE from "three";
import { Enemy } from "./Enemy";
import { createShip } from "../core/AssetFactory";
import type { EnemyBulletManager } from "./EnemyBullet";

const ADVANCE_SPEED = 1.3;
const SWAY_AMPLITUDE = 0.5;
const SWAY_FREQUENCY = 0.5;
const FIRE_INTERVAL_MIN = 1.3;
const FIRE_INTERVAL_MAX = 2.0;
const BULLET_SPEED = 6.5;

/** Slow-cruising gunboat that sways side to side and fires twin shots at the player. */
export class ShipEnemy extends Enemy {
  private baseX: number;
  private fireTimer: number;
  private bulletManager: EnemyBulletManager;
  private speedScale: number;

  constructor(scene: THREE.Scene, bulletManager: EnemyBulletManager, spawnX: number, spawnZ: number, speedScale = 1) {
    const group = createShip(0x3d4f66);
    group.position.set(spawnX, 0, spawnZ);
    scene.add(group);

    super(group, 0.7, 4, 220);
    this.baseX = spawnX;
    this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    this.bulletManager = bulletManager;
    this.speedScale = speedScale;
  }

  protected updatePattern(dt: number, playerPos: THREE.Vector3): void {
    this.group.position.z += ADVANCE_SPEED * this.speedScale * dt;
    this.group.position.x = this.baseX + Math.sin(this.elapsed * SWAY_FREQUENCY) * SWAY_AMPLITUDE;
    this.group.rotation.y = Math.cos(this.elapsed * SWAY_FREQUENCY) * 0.08;
    this.group.position.y = Math.sin(this.elapsed * 1.6) * 0.05;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.alive) {
      this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
      const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.0001) dir.normalize();
      else dir.set(0, 0, 1);
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.18);
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 0.45, 0.6));
      const speed = BULLET_SPEED * this.speedScale;
      this.bulletManager.spawn(spawnPos.clone().add(perp), dir.clone().multiplyScalar(speed));
      this.bulletManager.spawn(spawnPos.clone().sub(perp), dir.clone().multiplyScalar(speed));
    }
  }
}
