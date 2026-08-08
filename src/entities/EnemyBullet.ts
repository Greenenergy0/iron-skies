import * as THREE from "three";
import { ObjectPool } from "../core/ObjectPool";
import { audio } from "../core/AudioEngine";
import type { Bullet } from "./Bullet";

/** Owns pooled meshes/state for every enemy-fired projectile on screen. */
export class EnemyBulletManager {
  readonly bullets: Bullet[] = [];

  private pool: ObjectPool<THREE.Mesh>;
  private geo = new THREE.SphereGeometry(0.09, 6, 5);
  private mat = new THREE.MeshStandardMaterial({
    color: 0xff4a3b,
    emissive: 0x8a0e00,
    emissiveIntensity: 1.5,
    flatShading: true,
  });
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pool = new ObjectPool<THREE.Mesh>(
      () => {
        const mesh = new THREE.Mesh(this.geo, this.mat);
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
      },
      (mesh) => {
        mesh.visible = false;
      },
      30,
    );
  }

  spawn(position: THREE.Vector3, velocity: THREE.Vector3, damage = 1, radius = 0.15, life = 4.5): void {
    const mesh = this.pool.acquire();
    mesh.visible = true;
    mesh.position.copy(position);
    this.bullets.push({ mesh, velocity: velocity.clone(), life, damage, radius, owner: "enemy" });
    audio.playEnemyShoot();
  }

  update(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.mesh.position.addScaledVector(bullet.velocity, dt);
      bullet.life -= dt;
      if (bullet.life <= 0) this.removeAt(i);
    }
  }

  removeAt(index: number): void {
    const bullet = this.bullets[index];
    this.pool.release(bullet.mesh as THREE.Mesh);
    this.bullets.splice(index, 1);
  }

  clear(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) this.removeAt(i);
  }
}
