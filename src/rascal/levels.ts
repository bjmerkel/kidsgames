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

function sway(leftEnd: number, span: number, width: number, y: number, phase: number): { mover: Mover; nextX: number } {
  return {
    mover: { origin: leftEnd + 85 - span, y, w: width, h: 20, span, phase },
    nextX: leftEnd + width + 170 - 2 * span,
  };
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
  chimneyRow(),
  laundryLine(),
  fireEscape(),
  pigeonParade(),
  clockTower(),
  rainGutter(),
  antennaGarden(),
  subwayRoof(),
  silkSpiral(),
  moonNest(),
];

function chimneyRow(): RoofLevel {
  return {
    name: "Chimney Row",
    blurb: "Hop the chimneys.",
    width: 2200,
    night: false,
    platforms: [ground(0, 420), step(500, 570, 170), step(750, 500, 170), step(1000, 560, 180), ground(1260, 940)],
    movers: [],
    webs: [],
    bugs: [{ x: 1600, y: GROUND_Y - 22, left: 1460, right: 1860 }],
    coins: [
      { x: 560, y: 500 },
      { x: 820, y: 430 },
      { x: 1080, y: 490 },
      { x: 1500, y: 560 },
    ],
    checks: [1320],
    goal: { x: 2000, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function laundryLine(): RoofLevel {
  return {
    name: "Laundry Line",
    blurb: "Swing twice.",
    width: 2500,
    night: false,
    platforms: [ground(0, 460), ground(640, 460), ground(1320, 1180)],
    movers: [],
    webs: [
      { x: 560, y: 420 },
      { x: 1240, y: 400 },
    ],
    bugs: [{ x: 1700, y: GROUND_Y - 22, left: 1520, right: 1980 }],
    coins: [
      { x: 560, y: 500 },
      { x: 900, y: 560 },
      { x: 1240, y: 480 },
      { x: 1800, y: 560 },
    ],
    checks: [700, 1400],
    goal: { x: 2280, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function fireEscape(): RoofLevel {
  const plank = sway(500, 30, 160, 600, 0);
  return {
    name: "Fire Escape",
    blurb: "Ride the plank, then swing.",
    width: 2600,
    night: false,
    platforms: [ground(0, 500), ground(plank.nextX, 500), ground(plank.nextX + 700, 1100)],
    movers: [plank.mover],
    webs: [{ x: plank.nextX + 620, y: 400 }],
    bugs: [{ x: plank.nextX + 220, y: GROUND_Y - 22, left: plank.nextX + 80, right: plank.nextX + 380 }],
    coins: [
      { x: 560, y: 540 },
      { x: plank.nextX + 200, y: 560 },
      { x: plank.nextX + 620, y: 480 },
    ],
    checks: [plank.nextX + 40, plank.nextX + 760],
    goal: { x: plank.nextX + 1500, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function pigeonParade(): RoofLevel {
  return {
    name: "Pigeon Parade",
    blurb: "Bounce the pigeons.",
    width: 2700,
    night: false,
    platforms: [ground(0, 700), ground(790, 700), ground(1580, 1120)],
    movers: [],
    webs: [],
    bugs: [
      { x: 360, y: GROUND_Y - 22, left: 220, right: 520 },
      { x: 1100, y: GROUND_Y - 22, left: 960, right: 1320 },
      { x: 1900, y: GROUND_Y - 22, left: 1760, right: 2140 },
    ],
    coins: [
      { x: 740, y: 540 },
      { x: 1140, y: 560 },
      { x: 1530, y: 540 },
      { x: 2000, y: 560 },
    ],
    checks: [860, 1660],
    goal: { x: 2480, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function clockTower(): RoofLevel {
  return {
    name: "Clock Tower",
    blurb: "Climb the tower.",
    width: 2700,
    night: false,
    platforms: [ground(0, 400), step(540, 560, 680), step(1360, 470, 640), step(2140, 380, 420)],
    movers: [],
    webs: [
      { x: 620, y: 420 },
      { x: 1460, y: 340 },
      { x: 2240, y: 270 },
    ],
    bugs: [{ x: 1600, y: 448, left: 1500, right: 1760 }],
    coins: [
      { x: 700, y: 500 },
      { x: 1540, y: 410 },
      { x: 2320, y: 320 },
    ],
    checks: [640, 1460],
    goal: { x: 2400, y: 280, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function rainGutter(): RoofLevel {
  const first = sway(480, 35, 170, 610, 0);
  const second = sway(first.nextX + 400, 40, 180, 590, 1.2);
  return {
    name: "Rain Gutter",
    blurb: "Wait for both planks.",
    width: 2800,
    night: true,
    platforms: [ground(0, 480), ground(first.nextX, 400), ground(second.nextX, 1000)],
    movers: [first.mover, second.mover],
    webs: [],
    bugs: [{ x: first.nextX + 200, y: GROUND_Y - 22, left: first.nextX + 80, right: first.nextX + 320 }],
    coins: [
      { x: 560, y: 540 },
      { x: first.nextX + 180, y: 560 },
      { x: second.nextX - 80, y: 520 },
      { x: second.nextX + 300, y: 560 },
    ],
    checks: [first.nextX + 40, second.nextX + 80],
    goal: { x: second.nextX + 760, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function antennaGarden(): RoofLevel {
  return {
    name: "Antenna Garden",
    blurb: "Jump, then one web.",
    width: 2600,
    night: false,
    platforms: [ground(0, 640), ground(730, 500), step(900, 520, 140), ground(1450, 1150)],
    movers: [],
    webs: [{ x: 1350, y: 400 }],
    bugs: [
      { x: 300, y: GROUND_Y - 22, left: 180, right: 480 },
      { x: 1800, y: GROUND_Y - 22, left: 1640, right: 2100 },
    ],
    coins: [
      { x: 680, y: 540 },
      { x: 960, y: 460 },
      { x: 1350, y: 480 },
      { x: 1900, y: 560 },
    ],
    checks: [800, 1520],
    goal: { x: 2380, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function subwayRoof(): RoofLevel {
  return {
    name: "Subway Roof",
    blurb: "Three jumps to the nest.",
    width: 2800,
    night: false,
    platforms: [ground(0, 600), ground(690, 520), ground(1300, 520), ground(1910, 890)],
    movers: [],
    webs: [],
    bugs: [
      { x: 280, y: GROUND_Y - 22, left: 160, right: 420 },
      { x: 940, y: GROUND_Y - 22, left: 820, right: 1080 },
      { x: 1560, y: GROUND_Y - 22, left: 1440, right: 1700 },
    ],
    coins: [
      { x: 645, y: 540 },
      { x: 1255, y: 540 },
      { x: 1865, y: 540 },
      { x: 2200, y: 560 },
    ],
    checks: [760, 1380, 1980],
    goal: { x: 2560, y: 540, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function silkSpiral(): RoofLevel {
  return {
    name: "Silk Spiral",
    blurb: "Swing up the silk.",
    width: 2900,
    night: true,
    platforms: [ground(0, 440), step(580, 540, 700), step(1440, 450, 660), step(2260, 360, 480)],
    movers: [],
    webs: [
      { x: 680, y: 400 },
      { x: 1540, y: 320 },
      { x: 2360, y: 240 },
    ],
    bugs: [{ x: 1700, y: 428, left: 1580, right: 1860 }],
    coins: [
      { x: 760, y: 480 },
      { x: 1620, y: 390 },
      { x: 2480, y: 300 },
    ],
    checks: [680, 1540],
    goal: { x: 2560, y: 260, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

function moonNest(): RoofLevel {
  const plank = sway(1130, 30, 160, 600, 0.6);
  return {
    name: "Moon Nest",
    blurb: "The last nest.",
    width: 3200,
    night: true,
    platforms: [ground(0, 560), ground(650, 480), ground(plank.nextX, 420), ground(plank.nextX + 640, 400), step(plank.nextX + 1180, 460, 400)],
    movers: [plank.mover],
    webs: [
      { x: plank.nextX + 540, y: 400 },
      { x: plank.nextX + 1240, y: 320 },
    ],
    bugs: [
      { x: 860, y: GROUND_Y - 22, left: 740, right: 1000 },
      { x: plank.nextX + 180, y: GROUND_Y - 22, left: plank.nextX + 60, right: plank.nextX + 300 },
    ],
    coins: [
      { x: 605, y: 540 },
      { x: 900, y: 560 },
      { x: plank.nextX + 80, y: 540 },
      { x: plank.nextX + 540, y: 470 },
      { x: plank.nextX + 1280, y: 400 },
    ],
    checks: [720, plank.nextX + 40, plank.nextX + 700, plank.nextX + 1220],
    goal: { x: plank.nextX + 1400, y: 360, w: 64, h: 100 },
    spawnX: 48,
    spawnY: stand,
  };
}

export function roofLevel(index: number): RoofLevel {
  return ROOF_LEVELS[Math.max(0, Math.min(ROOF_LEVELS.length - 1, index))];
}
