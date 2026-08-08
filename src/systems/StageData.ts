export type EnemyKind = "fighter" | "bomber" | "turret" | "ship";

export interface WaveEntry {
  time: number;
  kind: EnemyKind;
  x: number;
}

export interface BossConfig {
  name: string;
  hullColor: number;
  turretColor: number;
  hpMultiplier: number;
  turretOffsets: { x: number; z: number }[];
  final?: boolean;
}

export interface StageDefinition {
  id: number;
  name: string;
  seaColor: number;
  fogColor: number;
  waves: WaveEntry[];
  boss: BossConfig;
}

const TWIN_TURRETS = [
  { x: -1.5, z: 0.3 },
  { x: 1.5, z: 0.3 },
];

export const STAGE_1: StageDefinition = {
  id: 1,
  name: "STAGE 1 - COASTAL WATERS",
  seaColor: 0x2f6f6a,
  fogColor: 0x2c2136,
  waves: [
    { time: 1.5, kind: "fighter", x: -2 },
    { time: 2.2, kind: "fighter", x: 2 },
    { time: 4.0, kind: "turret", x: 0 },
    { time: 5.5, kind: "fighter", x: -1.5 },
    { time: 5.9, kind: "fighter", x: 1.5 },
    { time: 8.0, kind: "ship", x: -2.3 },
    { time: 9.5, kind: "fighter", x: 0 },
    { time: 11.0, kind: "bomber", x: 1.0 },
    { time: 13.0, kind: "fighter", x: -2.5 },
    { time: 13.4, kind: "fighter", x: -0.8 },
    { time: 13.8, kind: "fighter", x: 0.8 },
    { time: 14.2, kind: "fighter", x: 2.5 },
    { time: 16.0, kind: "turret", x: -2.2 },
    { time: 16.3, kind: "turret", x: 2.2 },
    { time: 18.0, kind: "ship", x: 1.6 },
    { time: 20.0, kind: "bomber", x: -1.0 },
    { time: 20.4, kind: "bomber", x: 1.0 },
    { time: 23.0, kind: "fighter", x: -2 },
    { time: 23.3, kind: "fighter", x: -1 },
    { time: 23.6, kind: "fighter", x: 0 },
    { time: 23.9, kind: "fighter", x: 1 },
    { time: 24.2, kind: "fighter", x: 2 },
    { time: 27.0, kind: "ship", x: -1.8 },
    { time: 27.0, kind: "ship", x: 1.8 },
    { time: 30.0, kind: "bomber", x: 0 },
  ],
  boss: {
    name: "IRON LEVIATHAN",
    hullColor: 0x4a5566,
    turretColor: 0x5e6a4f,
    hpMultiplier: 1,
    turretOffsets: TWIN_TURRETS,
  },
};

export const STAGE_2: StageDefinition = {
  id: 2,
  name: "STAGE 2 - ARCHIPELAGO",
  seaColor: 0x0e5a48,
  fogColor: 0x08201a,
  waves: [
    { time: 1.2, kind: "fighter", x: -2 },
    { time: 1.6, kind: "fighter", x: 2 },
    { time: 2.0, kind: "fighter", x: 0 },
    { time: 3.8, kind: "turret", x: -2.4 },
    { time: 4.1, kind: "turret", x: 2.4 },
    { time: 6.0, kind: "ship", x: -1.8 },
    { time: 6.4, kind: "ship", x: 1.8 },
    { time: 8.5, kind: "bomber", x: 0 },
    { time: 10.0, kind: "fighter", x: -2.2 },
    { time: 10.3, kind: "fighter", x: -1.1 },
    { time: 10.6, kind: "fighter", x: 1.1 },
    { time: 10.9, kind: "fighter", x: 2.2 },
    { time: 13.0, kind: "turret", x: 0 },
    { time: 14.5, kind: "bomber", x: -1.4 },
    { time: 14.9, kind: "bomber", x: 1.4 },
    { time: 17.0, kind: "ship", x: -2.5 },
    { time: 17.4, kind: "fighter", x: 0.5 },
    { time: 17.7, kind: "fighter", x: -0.5 },
    { time: 20.0, kind: "turret", x: -2.0 },
    { time: 20.3, kind: "turret", x: 2.0 },
    { time: 22.0, kind: "fighter", x: -2.5 },
    { time: 22.3, kind: "fighter", x: -1.2 },
    { time: 22.6, kind: "fighter", x: 0 },
    { time: 22.9, kind: "fighter", x: 1.2 },
    { time: 23.2, kind: "fighter", x: 2.5 },
    { time: 26.0, kind: "ship", x: -1.5 },
    { time: 26.0, kind: "ship", x: 1.5 },
    { time: 28.5, kind: "bomber", x: 0 },
    { time: 31.0, kind: "fighter", x: -1.5 },
    { time: 31.3, kind: "fighter", x: 1.5 },
  ],
  boss: {
    name: "CRIMSON KRAKEN",
    hullColor: 0x6e2f3a,
    turretColor: 0x3a2020,
    hpMultiplier: 1.35,
    turretOffsets: TWIN_TURRETS,
  },
};

export const STAGE_3: StageDefinition = {
  id: 3,
  name: "STAGE 3 - STORM COAST",
  seaColor: 0x1c2a3a,
  fogColor: 0x0c0e16,
  waves: [
    { time: 1.0, kind: "turret", x: -2 },
    { time: 1.3, kind: "turret", x: 2 },
    { time: 3.0, kind: "fighter", x: -2.4 },
    { time: 3.3, kind: "fighter", x: -1.2 },
    { time: 3.6, kind: "fighter", x: 1.2 },
    { time: 3.9, kind: "fighter", x: 2.4 },
    { time: 6.0, kind: "bomber", x: -1.2 },
    { time: 6.3, kind: "bomber", x: 1.2 },
    { time: 8.5, kind: "ship", x: -2.2 },
    { time: 8.8, kind: "ship", x: 2.2 },
    { time: 11.0, kind: "turret", x: 0 },
    { time: 12.5, kind: "fighter", x: -2.5 },
    { time: 12.8, kind: "fighter", x: -1.4 },
    { time: 13.1, kind: "fighter", x: 0 },
    { time: 13.4, kind: "fighter", x: 1.4 },
    { time: 13.7, kind: "fighter", x: 2.5 },
    { time: 16.0, kind: "bomber", x: -1.6 },
    { time: 16.3, kind: "bomber", x: 0 },
    { time: 16.6, kind: "bomber", x: 1.6 },
    { time: 19.0, kind: "turret", x: -2.3 },
    { time: 19.3, kind: "turret", x: 2.3 },
    { time: 21.5, kind: "ship", x: -1.6 },
    { time: 21.8, kind: "ship", x: 1.6 },
    { time: 24.0, kind: "fighter", x: -2.5 },
    { time: 24.2, kind: "fighter", x: -1.5 },
    { time: 24.4, kind: "fighter", x: -0.5 },
    { time: 24.6, kind: "fighter", x: 0.5 },
    { time: 24.8, kind: "fighter", x: 1.5 },
    { time: 25.0, kind: "fighter", x: 2.5 },
    { time: 28.0, kind: "bomber", x: -1.0 },
    { time: 28.0, kind: "bomber", x: 1.0 },
    { time: 30.5, kind: "turret", x: 0 },
    { time: 33.0, kind: "ship", x: -2 },
    { time: 33.0, kind: "ship", x: 2 },
  ],
  boss: {
    name: "STORM WRAITH",
    hullColor: 0x2e3a4a,
    turretColor: 0x161c26,
    hpMultiplier: 1.7,
    turretOffsets: TWIN_TURRETS,
  },
};

export const STAGE_4: StageDefinition = {
  id: 4,
  name: "STAGE 4 - ENEMY ARMADA",
  seaColor: 0x241018,
  fogColor: 0x120a0d,
  waves: [
    { time: 1.0, kind: "fighter", x: -2 },
    { time: 1.2, kind: "fighter", x: 2 },
    { time: 1.4, kind: "fighter", x: 0 },
    { time: 3.0, kind: "turret", x: -2.3 },
    { time: 3.0, kind: "turret", x: 2.3 },
    { time: 5.0, kind: "bomber", x: -1.3 },
    { time: 5.0, kind: "bomber", x: 1.3 },
    { time: 7.0, kind: "ship", x: -2.4 },
    { time: 7.2, kind: "ship", x: 2.4 },
    { time: 9.5, kind: "fighter", x: -2.5 },
    { time: 9.7, kind: "fighter", x: -1.3 },
    { time: 9.9, kind: "fighter", x: 0 },
    { time: 10.1, kind: "fighter", x: 1.3 },
    { time: 10.3, kind: "fighter", x: 2.5 },
    { time: 12.5, kind: "turret", x: 0 },
    { time: 14.0, kind: "bomber", x: -1.6 },
    { time: 14.0, kind: "bomber", x: 0 },
    { time: 14.0, kind: "bomber", x: 1.6 },
    { time: 17.0, kind: "ship", x: -1.8 },
    { time: 17.0, kind: "ship", x: 1.8 },
    { time: 19.0, kind: "turret", x: -2.2 },
    { time: 19.2, kind: "turret", x: 2.2 },
    { time: 21.0, kind: "fighter", x: -2.5 },
    { time: 21.2, kind: "fighter", x: -1.5 },
    { time: 21.4, kind: "fighter", x: -0.5 },
    { time: 21.6, kind: "fighter", x: 0.5 },
    { time: 21.8, kind: "fighter", x: 1.5 },
    { time: 22.0, kind: "fighter", x: 2.5 },
    { time: 25.0, kind: "bomber", x: -1.2 },
    { time: 25.0, kind: "bomber", x: 1.2 },
    { time: 27.0, kind: "ship", x: -2 },
    { time: 27.0, kind: "ship", x: 0 },
    { time: 27.0, kind: "ship", x: 2 },
    { time: 30.0, kind: "turret", x: -1.5 },
    { time: 30.0, kind: "turret", x: 1.5 },
    { time: 33.0, kind: "fighter", x: -2.5 },
    { time: 33.2, kind: "fighter", x: -1.5 },
    { time: 33.4, kind: "fighter", x: -0.5 },
    { time: 33.6, kind: "fighter", x: 0.5 },
    { time: 33.8, kind: "fighter", x: 1.5 },
    { time: 34.0, kind: "fighter", x: 2.5 },
  ],
  boss: {
    name: "IRON EMPEROR",
    hullColor: 0x3a1418,
    turretColor: 0x1c0a0c,
    hpMultiplier: 2.3,
    turretOffsets: [
      { x: -1.6, z: 0.45 },
      { x: 1.6, z: 0.45 },
      { x: -1.6, z: -0.55 },
      { x: 1.6, z: -0.55 },
    ],
    final: true,
  },
};

export const STAGES: StageDefinition[] = [STAGE_1, STAGE_2, STAGE_3, STAGE_4];
