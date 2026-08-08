import * as THREE from "three";
import { Enemy } from "./Enemy";
import { createFighterPlane } from "../core/AssetFactory";
import type { EnemyBulletManager } from "./EnemyBullet";

const ADVANCE_SPEED = 1.8;
const FIRE_INTERVAL_MIN = 2.0;
const FIRE_INTERVAL_MAX = 3.0;
const BULLET_SPEED = 5.4;
const SPREAD_COUNT = 3;
const SPREAD_ANGLE = 0.32;
const SCALE = 1.15;

/** Slow, tanky bomber that advances almost straight and drops a bullet spread. */
export class BomberEnemy extends Enemy {
  private fireTimer: number;
  private bulletManager: EnemyBulletManager;
  private propeller: THREE.Object3D;
  private speedScale: number;

  constructor(scene: THREE.Scene, bulletManager: EnemyBulletManager, spawnX: number, spawnZ: number, speedScale = 1) {
    const { group, propeller } = createFighterPlane({
      hull: 0x4c5b6e,
      accent: 0x2a2f38,
      canopy: 0x141a20,
      stripes: true,
      roundel: true,
      roundelRing: "#7a1f1f",
      roundelStar: "#f4e3c8",
    });
    group.scale.setScalar(SCALE);
    group.rotation.y = Math.PI;
    group.position.set(spawnX, 0.6, spawnZ);
    scene.add(group);

    super(group, 0.62 * (SCALE / 1.5), 5, 260);
    this.propeller = propeller;
    this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    this.bulletManager = bulletManager;
    this.speedScale = speedScale;
  }

  protected updatePattern(dt: number, playerPos: THREE.Vector3): void {
    this.group.position.z += ADVANCE_SPEED * this.speedScale * dt;
    this.group.position.x += Math.sin(this.elapsed * 0.6) * 0.3 * dt;
    this.propeller.rotation.z -= dt * 30;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.alive) {
      this.fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
      const baseDir = new THREE.Vector3().subVectors(playerPos, this.group.position);
      baseDir.y = 0;
      if (baseDir.lengthSq() > 0.0001) baseDir.normalize();
      else baseDir.set(0, 0, 1);
      const baseAngle = Math.atan2(baseDir.x, baseDir.z);
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 0.05, 0.4));
      for (let i = 0; i < SPREAD_COUNT; i++) {
        const angle = baseAngle + (i - (SPREAD_COUNT - 1) / 2) * SPREAD_ANGLE;
        const velocity = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(BULLET_SPEED * this.speedScale);
        this.bulletManager.spawn(spawnPos, velocity);
      }
    }
  }
}
