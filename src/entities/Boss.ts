import * as THREE from "three";
import { Enemy } from "./Enemy";
import { createShip, createTurret } from "../core/AssetFactory";
import type { EnemyBulletManager } from "./EnemyBullet";
import type { BossConfig } from "../systems/StageData";

const SWAY_AMPLITUDE = 2.1;
const SWAY_FREQUENCY = 0.35;
const AIMED_SPEED = 6.8;
const RADIAL_SPEED = 5.2;
const RADIAL_INTERVAL = 2.6;
const BASE_HP = 46;

/** Stage boss: holds position while the world scroll freezes, escalating attacks as HP drops. */
export class Boss extends Enemy {
  readonly name: string;

  private bulletManager: EnemyBulletManager;
  private centerX: number;
  private turretHeads: THREE.Group[] = [];
  private turretWorlds: THREE.Vector3[] = [];
  private final: boolean;

  private fireTimer = 1.6;
  private radialTimer = RADIAL_INTERVAL;
  private phase = 1;
  private lastReportedPhase = 1;

  constructor(scene: THREE.Scene, bulletManager: EnemyBulletManager, x: number, z: number, config: BossConfig) {
    const group = new THREE.Group();

    const hull = createShip(config.hullColor);
    hull.scale.setScalar(3.4);
    group.add(hull);

    const turretHeads: THREE.Group[] = [];
    for (const offset of config.turretOffsets) {
      const { group: turretGroup, head } = createTurret(config.turretColor);
      turretGroup.scale.setScalar(1.7);
      turretGroup.position.set(offset.x, 0.5, offset.z);
      group.add(turretGroup);
      turretHeads.push(head);
    }

    group.position.set(x, 0, z);
    scene.add(group);

    super(group, 2.1, Math.round(BASE_HP * config.hpMultiplier), config.final ? 9000 : 5000);
    this.name = config.name;
    this.bulletManager = bulletManager;
    this.centerX = x;
    this.turretHeads = turretHeads;
    this.turretWorlds = turretHeads.map(() => new THREE.Vector3());
    this.final = config.final ?? false;
  }

  /** Returns true exactly once when the attack phase escalates (for VFX hooks). */
  consumePhaseChange(): boolean {
    if (this.phase !== this.lastReportedPhase) {
      this.lastReportedPhase = this.phase;
      return true;
    }
    return false;
  }

  protected updatePattern(dt: number, playerPos: THREE.Vector3): void {
    this.group.position.x = this.centerX + Math.sin(this.elapsed * SWAY_FREQUENCY) * SWAY_AMPLITUDE;
    this.group.position.y = Math.sin(this.elapsed * 0.8) * 0.05;

    const hpFrac = this.hp / this.maxHp;
    this.phase = hpFrac > 0.66 ? 1 : hpFrac > 0.33 ? 2 : 3;

    for (let i = 0; i < this.turretHeads.length; i++) {
      this.turretHeads[i].getWorldPosition(this.turretWorlds[i]);
      this.aimTurret(this.turretHeads[i], playerPos);
    }

    const fireInterval = (this.phase === 1 ? 1.1 : this.phase === 2 ? 0.8 : 0.55) * (this.final ? 0.75 : 1);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.alive) {
      this.fireTimer = fireInterval;
      this.fireAimedVolley(playerPos);
    }

    if (this.phase === 3) {
      this.radialTimer -= dt;
      if (this.radialTimer <= 0 && this.alive) {
        this.radialTimer = RADIAL_INTERVAL;
        this.fireRadialBurst();
      }
    }
  }

  private aimTurret(head: THREE.Group, playerPos: THREE.Vector3): void {
    const local = head.parent!.worldToLocal(playerPos.clone());
    head.rotation.y = Math.atan2(local.x - head.position.x, local.z - head.position.z);
  }

  private fireAimedVolley(playerPos: THREE.Vector3): void {
    const spreadCount = this.phase >= 2 ? 3 : 1;
    for (const origin of this.turretWorlds) {
      const dir = new THREE.Vector3().subVectors(playerPos, origin);
      dir.y = 0;
      if (dir.lengthSq() > 0.0001) dir.normalize();
      else dir.set(0, 0, 1);
      const baseAngle = Math.atan2(dir.x, dir.z);
      const spread = 0.22;
      for (let i = 0; i < spreadCount; i++) {
        const angle = baseAngle + (i - (spreadCount - 1) / 2) * spread;
        const velocity = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(AIMED_SPEED);
        this.bulletManager.spawn(origin.clone().add(new THREE.Vector3(0, 0.1, 0)), velocity);
      }
    }
  }

  private fireRadialBurst(): void {
    const count = this.final ? 16 : 12;
    const center = this.group.position.clone().add(new THREE.Vector3(0, 0.5, 0.4));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const velocity = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(RADIAL_SPEED);
      this.bulletManager.spawn(center, velocity);
    }
  }
}
