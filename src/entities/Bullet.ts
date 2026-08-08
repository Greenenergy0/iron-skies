import * as THREE from "three";

export interface Bullet {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
  radius: number;
  owner: "player" | "enemy";
  /** homing target for missiles; undefined for straight-flying shots */
  homingTarget?: THREE.Object3D | null;
  turnRate?: number;
  /** extra enemies a laser bolt can pass through before it's consumed */
  pierceRemaining?: number;
}
