import * as THREE from "three";
import { createMedal } from "../core/AssetFactory";

export type PowerupKind = "vulcan" | "laser" | "missile" | "score" | "life" | "shield" | "bomb" | "option";

const MEDAL_STYLE: Record<PowerupKind, { letter: string; color: number; ring: string; fill: string }> = {
  vulcan: { letter: "V", color: 0xffb400, ring: "#ffb400", fill: "#fff3cf" },
  laser: { letter: "L", color: 0x1fb8ff, ring: "#1fb8ff", fill: "#cdf3ff" },
  missile: { letter: "M", color: 0x2ecc40, ring: "#2ecc40", fill: "#d6ffd6" },
  score: { letter: "$", color: 0xd7b8ff, ring: "#d7b8ff", fill: "#f1e6ff" },
  life: { letter: "1UP", color: 0xff5a8a, ring: "#ff5a8a", fill: "#ffdce8" },
  shield: { letter: "S", color: 0x6fd8ff, ring: "#6fd8ff", fill: "#dcf6ff" },
  bomb: { letter: "B", color: 0xff6b3c, ring: "#ff6b3c", fill: "#ffe3d5" },
  option: { letter: "O", color: 0xbfe0ff, ring: "#bfe0ff", fill: "#eaf6ff" },
};

const ADVANCE_SPEED = 3.6;

export class Powerup {
  readonly group: THREE.Group;
  readonly kind: PowerupKind;
  readonly radius = 0.45;
  alive = true;
  private elapsed = 0;
  private baseY = 0.55;

  constructor(scene: THREE.Scene, kind: PowerupKind, x: number, z: number) {
    this.kind = kind;
    const style = MEDAL_STYLE[kind];
    this.group = createMedal(style.letter, style.color, style.ring, style.fill);
    this.group.position.set(x, this.baseY, z);
    scene.add(this.group);
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.group.position.z += ADVANCE_SPEED * dt;
    this.group.rotation.y += dt * 2.2;
    this.group.position.y = this.baseY + Math.sin(this.elapsed * 4) * 0.09;
  }
}
