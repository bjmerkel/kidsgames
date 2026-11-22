export const GROUND_Y = 640;
export const CAPY_W = 42;
export const CAPY_H = 36;

export type Plat = { x: number; y: number; w: number; h: number };
export type Vine = { x: number; top: number; length: number; landX: number };
export type Drift = { origin: number; y: number; w: number; h: number; span: number; phase: number };
export type Roller = { x: number; left: number; right: number; speed: number };
export type MangoSpot = { x: number; y: number };
export type Pool = { x: number; y: number; w: number; h: number };

export type JungleLevel = {
  name: string;
  blurb: string;
  width: number;
  deep: boolean;
  platforms: Plat[];
  vines: Vine[];
  drifts: Drift[];
  logs: Roller[];
  mangoes: MangoSpot[];
  checks: number[];
  pool: Pool;
  spawnX: number;
  spawnY: number;
};

function ground(x: number, w: number): Plat {
  return { x, y: GROUND_Y, w, h: 200 };
}

const stand = GROUND_Y - CAPY_H;

export const JUNGLE_LEVELS: JungleLevel[] = [
  {
    name: "River Bend",
    blurb: "Jump into the vine.",
    width: 2000,
    deep: false,
    platforms: [ground(0, 450), ground(520, 210), ground(1000, 1000)],
    vines: [{ x: 790, top: 240, length: 320, landX: 1040 }],
    drifts: [],
    logs: [{ x: 1280, left: 1160, right: 1560, speed: 70 }],
    mangoes: [
      { x: 240, y: 600 },
      { x: 600, y: 600 },
      { x: 1200, y: 600 },
    ],
    checks: [1040],
    pool: { x: 1760, y: 560, w: 80, h: 80 },
    spawnX: 36,
    spawnY: stand,
  },
  {
    name: "Two Vines",
    blurb: "Swing across both rivers.",
    width: 2400,
    deep: false,
    platforms: [ground(0, 480), ground(820, 280), ground(1560, 840)],
    vines: [
      { x: 560, top: 230, length: 330, landX: 860 },
      { x: 1260, top: 220, length: 340, landX: 1600 },
    ],
    drifts: [],
    logs: [{ x: 1800, left: 1680, right: 2100, speed: 90 }],
    mangoes: [
      { x: 200, y: 600 },
      { x: 940, y: 600 },
      { x: 1700, y: 600 },
    ],
    checks: [860, 1600],
    pool: { x: 2140, y: 560, w: 80, h: 80 },
    spawnX: 36,
    spawnY: stand,
  },
  {
    name: "Log Run",
    blurb: "Jump the rolling logs.",
    width: 2600,
    deep: false,
    platforms: [ground(0, 980), ground(1070, 1530)],
    vines: [{ x: 1280, top: 230, length: 320, landX: 1560 }],
    drifts: [],
    logs: [
      { x: 360, left: 240, right: 620, speed: 110 },
      { x: 700, left: 640, right: 940, speed: 140 },
      { x: 1900, left: 1720, right: 2300, speed: 120 },
    ],
    mangoes: [
      { x: 180, y: 600 },
      { x: 1180, y: 560 },
      { x: 2000, y: 600 },
    ],
    checks: [1100],
    pool: { x: 2360, y: 560, w: 80, h: 80 },
    spawnX: 36,
    spawnY: stand,
  },
  {
    name: "Driftwood",
    blurb: "Hop the driftwood.",
    width: 2800,
    deep: false,
    platforms: [ground(0, 520), ground(1180, 420), ground(1960, 840)],
    vines: [{ x: 1760, top: 220, length: 340, landX: 2020 }],
    drifts: [
      { origin: 640, y: GROUND_Y, w: 100, h: 22, span: 36, phase: 0 },
      { origin: 860, y: GROUND_Y, w: 100, h: 22, span: 36, phase: 1.2 },
      { origin: 1060, y: GROUND_Y, w: 110, h: 22, span: 30, phase: 2 },
    ],
    logs: [{ x: 1400, left: 1260, right: 1680, speed: 100 }],
    mangoes: [
      { x: 300, y: 600 },
      { x: 860, y: 590 },
      { x: 1500, y: 600 },
    ],
    checks: [1200],
    pool: { x: 2520, y: 560, w: 80, h: 80 },
    spawnX: 36,
    spawnY: stand,
  },
  {
    name: "Deep Jungle",
    blurb: "Swing, hop, and jump.",
    width: 3400,
    deep: true,
    platforms: [ground(0, 460), ground(560, 520), ground(1480, 360), ground(2200, 1200)],
    vines: [
      { x: 1240, top: 210, length: 350, landX: 1520 },
      { x: 1960, top: 200, length: 360, landX: 2260 },
    ],
    drifts: [],
    logs: [
      { x: 280, left: 180, right: 440, speed: 100 },
      { x: 760, left: 640, right: 1000, speed: 150 },
      { x: 2600, left: 2400, right: 3100, speed: 130 },
    ],
    mangoes: [
      { x: 160, y: 600 },
      { x: 700, y: 600 },
      { x: 1600, y: 600 },
      { x: 2500, y: 600 },
    ],
    checks: [1520, 2260],
    pool: { x: 3120, y: 540, w: 90, h: 100 },
    spawnX: 36,
    spawnY: stand,
  },
];

export function jungleLevel(index: number): JungleLevel {
  return JUNGLE_LEVELS[Math.max(0, Math.min(JUNGLE_LEVELS.length - 1, index))];
}
