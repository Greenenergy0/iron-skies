import * as THREE from "three";
import { ObjectPool } from "../core/ObjectPool";
import { audio } from "../core/AudioEngine";
import type { Bullet } from "../entities/Bullet";
import type { Enemy } from "../entities/Enemy";

export type WeaponType = "vulcan" | "laser" | "missile";

export const MAX_WEAPON_LEVEL = 4;

const VULCAN_SPEED = 21;
const LASER_SPEED = 27;
const MISSILE_SPEED = 15;
const MISSILE_TURN_RATE = 3.4;
const MISSILE_SEEK_RANGE = 22;

interface WeaponVisual {
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
}

/** Owns the player's current weapon type/level, fires shots, and steers homing missiles. */
export class WeaponSystem {
  type: WeaponType = "vulcan";
  level = 1;
  readonly bullets: Bullet[] = [];

  private scene: THREE.Scene;
  private fireTimer = 0;
  private pools: Record<WeaponType, ObjectPool<THREE.Mesh>>;
  private visuals: Record<WeaponType, WeaponVisual>;
  private tmpDir = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.visuals = {
      vulcan: {
        geo: (() => {
          const g = new THREE.CylinderGeometry(0.05, 0.07, 0.42, 6);
          g.rotateX(-Math.PI / 2);
          return g;
        })(),
        mat: new THREE.MeshStandardMaterial({ color: 0xfff29a, emissive: 0xffb400, emissiveIntensity: 1.6, flatShading: true }),
      },
      laser: {
        geo: (() => {
          const g = new THREE.BoxGeometry(0.09, 0.09, 1.1);
          return g;
        })(),
        mat: new THREE.MeshStandardMaterial({ color: 0x9df8ff, emissive: 0x1fb8ff, emissiveIntensity: 2.0, flatShading: true }),
      },
      missile: {
        geo: (() => {
          const g = new THREE.ConeGeometry(0.09, 0.42, 5);
          g.rotateX(-Math.PI / 2);
          return g;
        })(),
        mat: new THREE.MeshStandardMaterial({ color: 0xb9ffb0, emissive: 0x2ecc40, emissiveIntensity: 1.3, flatShading: true }),
      },
    };

    this.pools = {
      vulcan: this.makePool("vulcan"),
      laser: this.makePool("laser"),
      missile: this.makePool("missile"),
    };
  }

  private makePool(type: WeaponType): ObjectPool<THREE.Mesh> {
    const visual = this.visuals[type];
    return new ObjectPool<THREE.Mesh>(
      () => {
        const mesh = new THREE.Mesh(visual.geo, visual.mat);
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
      },
      (mesh) => {
        mesh.visible = false;
      },
      24,
    );
  }

  /** Picking up a medal of the equipped type levels it up; a different type switches weapons. */
  pickupMedal(type: WeaponType): void {
    if (this.type === type) {
      this.level = Math.min(MAX_WEAPON_LEVEL, this.level + 1);
    } else {
      this.type = type;
      this.level = 1;
    }
  }

  update(dt: number, firing: boolean, origin: THREE.Vector3, enemies: Enemy[], extraOrigins: THREE.Vector3[] = []): void {
    this.fireTimer -= dt;
    if (firing && this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval();
      this.fire(origin, enemies);
      for (const extra of extraOrigins) this.fireOptionShot(extra);
    }
    this.updateBullets(dt);
  }

  private fireOptionShot(origin: THREE.Vector3): void {
    this.spawnBullet(
      "vulcan",
      origin.clone().add(new THREE.Vector3(0, 0.06, -0.3)),
      new THREE.Vector3(0, 0, -VULCAN_SPEED),
      1,
      0.1,
      2.0,
    );
  }

  private fireInterval(): number {
    switch (this.type) {
      case "vulcan":
        return 0.12 - (this.level - 1) * 0.015;
      case "laser":
        return 0.24 - (this.level - 1) * 0.028;
      case "missile":
        return 0.46 - (this.level - 1) * 0.05;
    }
  }

  private fire(origin: THREE.Vector3, enemies: Enemy[]): void {
    audio.playShoot(this.type);
    if (this.type === "vulcan") this.fireVulcan(origin);
    else if (this.type === "laser") this.fireLaser(origin);
    else this.fireMissile(origin, enemies);
  }

  private spawnBullet(
    type: WeaponType,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    damage: number,
    radius: number,
    life: number,
    extra?: Partial<Bullet>,
  ): void {
    const mesh = this.pools[type].acquire();
    mesh.userData.weaponType = type;
    mesh.visible = true;
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(velocity));
    const bullet: Bullet = { mesh, velocity: velocity.clone(), life, damage, radius, owner: "player", ...extra };
    this.bullets.push(bullet);
  }

  private fireVulcan(origin: THREE.Vector3): void {
    const streamCount = this.level === 1 ? 2 : this.level === 2 ? 3 : 5;
    const spread = 0.24;
    const offsets: number[] =
      streamCount === 2
        ? [-spread, spread]
        : streamCount === 3
          ? [-spread, 0, spread]
          : [-spread * 1.8, -spread, 0, spread, spread * 1.8];

    for (const offsetX of offsets) {
      const angle = THREE.MathUtils.clamp(offsetX * 0.35, -0.3, 0.3);
      const velocity = new THREE.Vector3(Math.sin(angle) * VULCAN_SPEED * 0.18, 0, -VULCAN_SPEED);
      this.spawnBullet(
        "vulcan",
        new THREE.Vector3(origin.x + offsetX, origin.y + 0.08, origin.z - 0.9),
        velocity,
        1,
        0.12,
        2.2,
      );
    }
  }

  private fireLaser(origin: THREE.Vector3): void {
    const pierce = this.level + 1;
    const damage = 2 + Math.floor(this.level / 2);
    const lanes = this.level >= 3 ? [-0.18, 0.18] : [0];
    for (const offsetX of lanes) {
      this.spawnBullet(
        "laser",
        new THREE.Vector3(origin.x + offsetX, origin.y + 0.08, origin.z - 1.0),
        new THREE.Vector3(0, 0, -LASER_SPEED),
        damage,
        0.11,
        2.0,
        { pierceRemaining: pierce },
      );
    }
  }

  private fireMissile(origin: THREE.Vector3, enemies: Enemy[]): void {
    const count = this.level;
    const target = this.findMissileTarget(origin, enemies);
    for (let i = 0; i < count; i++) {
      const spreadX = (i - (count - 1) / 2) * 0.35;
      const velocity = new THREE.Vector3(spreadX, 0, -MISSILE_SPEED * 0.94).normalize().multiplyScalar(MISSILE_SPEED);
      this.spawnBullet(
        "missile",
        new THREE.Vector3(origin.x + spreadX * 0.6, origin.y + 0.05, origin.z - 0.8),
        velocity,
        2,
        0.14,
        3.0,
        { homingTarget: target?.group ?? null, turnRate: MISSILE_TURN_RATE },
      );
    }
  }

  private findMissileTarget(origin: THREE.Vector3, enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestDistSq = MISSILE_SEEK_RANGE * MISSILE_SEEK_RANGE;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.group.position.z >= origin.z) continue;
      const distSq = enemy.group.position.distanceToSquared(origin);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = enemy;
      }
    }
    return best;
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      if (bullet.homingTarget && bullet.homingTarget.parent) {
        this.tmpDir.subVectors(bullet.homingTarget.position, bullet.mesh.position).normalize();
        const speed = bullet.velocity.length();
        bullet.velocity.lerp(this.tmpDir.multiplyScalar(speed), Math.min(1, (bullet.turnRate ?? 3) * dt));
        bullet.velocity.setLength(speed);
        bullet.mesh.lookAt(bullet.mesh.position.clone().add(bullet.velocity));
      }

      bullet.mesh.position.addScaledVector(bullet.velocity, dt);
      bullet.life -= dt;
      if (bullet.life <= 0) this.removeAt(i);
    }
  }

  removeAt(index: number): void {
    const bullet = this.bullets[index];
    const type = bullet.mesh.userData.weaponType as WeaponType;
    this.pools[type].release(bullet.mesh as THREE.Mesh);
    this.bullets.splice(index, 1);
  }
}
