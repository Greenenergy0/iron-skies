import type { EnemyKind, StageDefinition } from "./StageData";
import { randRange } from "../utils/MathUtils";

const SPAWN_AHEAD = 26;
const FALLBACK_MIN = 1.1;
const FALLBACK_MAX = 1.9;

export type SpawnFn = (kind: EnemyKind, x: number, z: number) => void;

/** Walks a stage's timed wave script; once exhausted, falls back to endless light spawning. */
export class SpawnDirector {
  private elapsed = 0;
  private waveIndex = 0;
  private fallbackTimer = 2;
  private stage: StageDefinition;

  constructor(stage: StageDefinition) {
    this.stage = stage;
  }

  get finished(): boolean {
    return this.waveIndex >= this.stage.waves.length;
  }

  reset(stage?: StageDefinition): void {
    this.elapsed = 0;
    this.waveIndex = 0;
    this.fallbackTimer = 2;
    if (stage) this.stage = stage;
  }

  update(dt: number, scrollZ: number, spawn: SpawnFn): void {
    this.elapsed += dt;
    while (this.waveIndex < this.stage.waves.length && this.stage.waves[this.waveIndex].time <= this.elapsed) {
      const entry = this.stage.waves[this.waveIndex];
      spawn(entry.kind, entry.x, scrollZ - SPAWN_AHEAD);
      this.waveIndex++;
    }

    if (this.finished) {
      this.fallbackTimer -= dt;
      if (this.fallbackTimer <= 0) {
        this.fallbackTimer = randRange(FALLBACK_MIN, FALLBACK_MAX);
        spawn("fighter", randRange(-3, 3), scrollZ - SPAWN_AHEAD);
      }
    }
  }
}
