import * as THREE from "three";

export abstract class Enemy {
  readonly group: THREE.Group;
  readonly radius: number;
  readonly maxHp: number;
  readonly scoreValue: number;
  hp: number;
  alive = true;
  elapsed = 0;

  protected constructor(group: THREE.Group, radius: number, hp: number, scoreValue: number) {
    this.group = group;
    this.radius = radius;
    this.hp = hp;
    this.maxHp = hp;
    this.scoreValue = scoreValue;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.elapsed += dt;
    this.updatePattern(dt, playerPos);
  }

  protected abstract updatePattern(dt: number, playerPos: THREE.Vector3): void;

  /** Returns true if this hit killed the enemy. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }
}
