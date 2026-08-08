import * as THREE from "three";
import { createWaterTexture, createIsland } from "../core/AssetFactory";
import { randRange } from "../utils/MathUtils";

const ISLAND_SPAWN_INTERVAL_MIN = 3.5;
const ISLAND_SPAWN_INTERVAL_MAX = 6.5;
const ISLAND_SPAWN_AHEAD = 40;
const ISLAND_DESPAWN_BEHIND = 15;

/** Scrolling ocean plane (animated canvas texture) plus recycled decorative islands. */
export class Terrain {
  readonly sea: THREE.Mesh;
  private texture: THREE.CanvasTexture;
  private islands: THREE.Group[] = [];
  private islandTimer = 2;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, seaColor: number) {
    this.scene = scene;
    this.texture = createWaterTexture();
    this.texture.repeat.set(6, 60);

    const tint = new THREE.Color(seaColor).lerp(new THREE.Color(0xffffff), 0.5);
    const seaMat = new THREE.MeshStandardMaterial({ map: this.texture, color: tint, roughness: 0.9, metalness: 0.05 });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(36, 500, 1, 1), seaMat);
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.receiveShadow = true;
    scene.add(this.sea);
  }

  setSeaColor(seaColor: number): void {
    const tint = new THREE.Color(seaColor).lerp(new THREE.Color(0xffffff), 0.5);
    (this.sea.material as THREE.MeshStandardMaterial).color.copy(tint);
  }

  update(dt: number, scrollZ: number): void {
    this.sea.position.z = scrollZ;
    this.texture.offset.y = -scrollZ * 0.05;

    this.islandTimer -= dt;
    if (this.islandTimer <= 0) {
      this.islandTimer = randRange(ISLAND_SPAWN_INTERVAL_MIN, ISLAND_SPAWN_INTERVAL_MAX);
      const island = createIsland();
      const side = Math.random() < 0.5 ? -1 : 1;
      island.position.set(side * randRange(4.2, 6.5), 0, scrollZ - ISLAND_SPAWN_AHEAD);
      island.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(island);
      this.islands.push(island);
    }

    for (let i = this.islands.length - 1; i >= 0; i--) {
      const island = this.islands[i];
      if (island.position.z - scrollZ > ISLAND_DESPAWN_BEHIND) {
        this.scene.remove(island);
        this.islands.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.sea);
    for (const island of this.islands) this.scene.remove(island);
    this.islands = [];
  }
}
