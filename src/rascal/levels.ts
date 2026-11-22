export const GROUND_Y = 640;
export const RASCAL_W = 28;
export const RASCAL_H = 40;

export type Plat = { x: number; y: number; w: number; h: number };
export type WebHook = { x: number; y: number };
export type Mover = { origin: number; y: number; w: number; h: number; span: number; phase: number };
export type BugSpawn = { x: number; y: number; left: number; right: number };
export type CoinSpot = { x: number; y: number };
export type Goal = { x: number; y: number; w: number; h: number };

export type RoofLevel = {
  name: string;
  blurb: string;
  width: number;
  night: boolean;
  platforms: Plat[];
  movers: Mover[];
  webs: WebHook[];
  bugs: BugSpawn[];
  coins: CoinSpot[];
  checks: number[];
  goal: Goal;
  spawnX: number;
  spawnY: number;
};

function ground(x: number, w: number): Plat {
  return { x, y: GROUND_Y, w, h: 220 };
}

function step(x: number, y: number, w = 150): Plat {
  return { x, y, w, h: 22 };
}

const stand = GROUND_Y - RASCAL_H;

export const ROOF_LEVELS: RoofLevel[] = [
  {
    name: "First Roof",
    blurb: "Run and jump to the nest.",
    width: 1900,
    night: false,
    platforms: [ground(0, 680), ground(780, 1120), step(340, 500, 160), step(1000, 490, 170)],
    movers: [],
    webs: [],
    bugs: [{ x: 1120, y: GROUND_Y - 22, left: 980, right: 1360 }],
    coins: [
      { x: 400, y: 450 },
      { x: 680, y: 560 },
      { x: 1040, y: 440 },
    ],
    checks: [860],
    goal: { x: 1720, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  },
  {
    name: "Silk Gap",
    blurb: "Jump, then tap Web.",
    width: 2200,
    night: false,
    platforms: [ground(0, 520), ground(740, 1460), step(1260, 470, 180)],
    movers: [],
    webs: [
      { x: 640, y: 430 },
      { x: 1320, y: 350 },
    ],
    bugs: [{ x: 980, y: GROUND_Y - 22, left: 860, right: 1200 }],
    coins: [
      { x: 640, y: 500 },
      { x: 1100, y: 560 },
      { x: 1320, y: 410 },
    ],
    checks: [820],
    goal: { x: 2020, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  },
  {
    name: "Bug Bounce",
    blurb: "Bounce on the bugs.",
    width: 2500,
    night: false,
    platforms: [ground(0, 760), ground(860, 700), ground(1660, 840), step(430, 500, 140), step(1100, 470, 160)],
    movers: [],
    webs: [{ x: 1280, y: 390 }],
    bugs: [
      { x: 520, y: GROUND_Y - 22, left: 360, right: 660 },
      { x: 1000, y: GROUND_Y - 22, left: 880, right: 1280 },
      { x: 1760, y: GROUND_Y - 22, left: 1680, right: 2100 },
    ],
    coins: [
      { x: 480, y: 450 },
      { x: 760, y: 540 },
      { x: 1280, y: 450 },
      { x: 1900, y: 560 },
    ],
    checks: [900, 1700],
    goal: { x: 2300, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  },
  {
    name: "High Wire",
    blurb: "Ride the plank. Use the webs.",
    width: 2800,
    night: false,
    platforms: [ground(0, 780), ground(1120, 1680), step(1560, 430, 160)],
    movers: [{ origin: 900, y: 560, w: 140, h: 20, span: 55, phase: 0 }],
    webs: [
      { x: 1680, y: 340 },
      { x: 1960, y: 300 },
    ],
    bugs: [
      { x: 1560, y: GROUND_Y - 22, left: 1400, right: 1900 },
      { x: 2200, y: GROUND_Y - 22, left: 2060, right: 2500 },
    ],
    coins: [
      { x: 1040, y: 510 },
      { x: 1680, y: 400 },
      { x: 2100, y: 540 },
    ],
    checks: [1400],
    goal: { x: 2580, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  },
  {
    name: "Night Nest",
    blurb: "Swing to the high nest.",
    width: 3200,
    night: true,
    platforms: [ground(0, 700), ground(1040, 740), ground(1860, 1340), step(1280, 480, 150), step(2400, 360, 180)],
    movers: [{ origin: 820, y: 540, w: 130, h: 20, span: 50, phase: 1 }],
    webs: [
      { x: 860, y: 400 },
      { x: 1740, y: 390 },
      { x: 2280, y: 300 },
    ],
    bugs: [
      { x: 1180, y: GROUND_Y - 22, left: 1040, right: 1500 },
      { x: 2100, y: GROUND_Y - 22, left: 2000, right: 2400 },
      { x: 2700, y: GROUND_Y - 22, left: 2580, right: 3000 },
    ],
    coins: [
      { x: 860, y: 470 },
      { x: 1400, y: 560 },
      { x: 1760, y: 420 },
      { x: 2540, y: 310 },
    ],
    checks: [1100, 2100],
    goal: { x: 2460, y: 250, w: 70, h: 110 },
    spawnX: 48,
    spawnY: stand,
  },
];

export function roofLevel(index: number): RoofLevel {
  return ROOF_LEVELS[Math.max(0, Math.min(ROOF_LEVELS.length - 1, index))];
}
