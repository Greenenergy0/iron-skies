import * as THREE from "three";
import { ObjectPool } from "./ObjectPool";

interface ActiveParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

/** Small pooled cube-burst explosion/hit-spark effect (no textures needed). */
export class ParticleSystem {
  private pool: ObjectPool<THREE.Mesh>;
  private active: ActiveParticle[] = [];
  private geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  constructor(scene: THREE.Scene) {
    this.pool = new ObjectPool<THREE.Mesh>(
      () => {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(this.geo, mat);
        mesh.visible = false;
        scene.add(mesh);
        return mesh;
      },
      (mesh) => {
        mesh.visible = false;
      },
      80,
    );
  }

  burst(position: THREE.Vector3, color = 0xffaa33, count = 14, speed = 4.5): void {
    for (let i = 0; i < count; i++) {
      const mesh = this.pool.acquire();
      mesh.visible = true;
      mesh.position.copy(position);
      mesh.scale.setScalar(1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(color);
      mat.opacity = 1;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.5 + Math.random() * 0.7);
      const velocity = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi) * s,
        Math.sin(phi) * s * 0.6 + 1.4,
        Math.sin(theta) * Math.cos(phi) * s,
      );
      const maxLife = 0.4 + Math.random() * 0.25;
      this.active.push({ mesh, velocity, life: maxLife, maxLife });
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const particle = this.active[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.pool.release(particle.mesh);
        this.active.splice(i, 1);
        continue;
      }
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.y -= dt * 6;
      const t = particle.life / particle.maxLife;
      particle.mesh.scale.setScalar(0.35 + t * 0.85);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    }
  }
}
