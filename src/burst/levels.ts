export const COLS = 7;
export const ROWS = 8;
export const TILE = 56;
export const GRID_X = Math.floor((480 - COLS * TILE) / 2);
export const GRID_Y = 108;
export const KINDS = ["berry", "lemon", "grape", "leaf", "orange"] as const;

export type KindName = (typeof KINDS)[number];

export type BurstLevel = {
  name: string;
  blurb: string;
  moves: number;
  scoreNeed: number;
  pops: number[];
  jelly: { x: number; y: number }[];
  sky?: "day" | "dusk" | "night";
};

function block(x0: number, y0: number, w: number, h: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) cells.push({ x, y });
  }
  return cells;
}

function frame(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let x = 0; x < COLS; x += 1) cells.push({ x, y: 0 }, { x, y: ROWS - 1 });
  for (let y = 1; y < ROWS - 1; y += 1) cells.push({ x: 0, y }, { x: COLS - 1, y });
  return cells;
}

function rows(ys: number[]): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (const y of ys) for (let x = 0; x < COLS; x += 1) cells.push({ x, y });
  return cells;
}

export const BURST_LEVELS: BurstLevel[] = [
  {
    name: "Sunny Patch",
    blurb: "Match three. Score 300.",
    moves: 22,
    scoreNeed: 300,
    pops: [0, 0, 0, 0, 0],
    jelly: [],
  },
  {
    name: "Berry Basket",
    blurb: "Pop 10 red berries.",
    moves: 24,
    scoreNeed: 0,
    pops: [10, 0, 0, 0, 0],
    jelly: [],
  },
  {
    name: "Lemon Lane",
    blurb: "Pop 8 lemons and score 200.",
    moves: 24,
    scoreNeed: 200,
    pops: [0, 8, 0, 0, 0],
    jelly: [],
  },
  {
    name: "Jelly Middles",
    blurb: "Clear the pink jelly.",
    moves: 26,
    scoreNeed: 0,
    pops: [0, 0, 0, 0, 0],
    jelly: block(1, 3, 4, 3),
  },
  {
    name: "Orchard Goal",
    blurb: "Score 500, pop 5 grapes, and clear the jelly.",
    moves: 28,
    scoreNeed: 500,
    pops: [0, 0, 5, 0, 0],
    jelly: block(2, 3, 3, 2),
  },
  {
    name: "Leaf Rows",
    blurb: "Pop 16 leaves.",
    moves: 28,
    scoreNeed: 0,
    pops: [0, 0, 0, 16, 0],
    jelly: [],
  },
  {
    name: "Orange Grove",
    blurb: "Pop 12 oranges and score 700.",
    moves: 30,
    scoreNeed: 700,
    pops: [0, 0, 0, 0, 12],
    jelly: [],
  },
  {
    name: "Twin Baskets",
    blurb: "Pop 10 berries and 10 lemons.",
    moves: 30,
    scoreNeed: 0,
    pops: [10, 10, 0, 0, 0],
    jelly: [],
  },
  {
    name: "Jelly Frame",
    blurb: "Clear the jelly around the edge.",
    moves: 36,
    scoreNeed: 0,
    pops: [0, 0, 0, 0, 0],
    jelly: frame(),
    sky: "dusk",
  },
  {
    name: "Corner Patch",
    blurb: "Pop 10 grapes and clear both corners.",
    moves: 36,
    scoreNeed: 0,
    pops: [0, 0, 10, 0, 0],
    jelly: [...block(0, 0, 3, 3), ...block(4, 5, 3, 3)],
    sky: "dusk",
  },
  {
    name: "High Score",
    blurb: "Score 1600.",
    moves: 32,
    scoreNeed: 1600,
    pops: [0, 0, 0, 0, 0],
    jelly: [],
    sky: "dusk",
  },
  {
    name: "Color Trio",
    blurb: "Pop three colors and clear the jelly.",
    moves: 40,
    scoreNeed: 0,
    pops: [12, 0, 12, 0, 12],
    jelly: block(0, 3, 7, 2),
  },
  {
    name: "Jelly Rows",
    blurb: "Clear the jelly on every other row.",
    moves: 38,
    scoreNeed: 0,
    pops: [0, 0, 0, 0, 0],
    jelly: rows([1, 3, 5, 7]),
    sky: "night",
  },
  {
    name: "Busy Garden",
    blurb: "Score 800, pop 8 lemons, and clear the jelly.",
    moves: 38,
    scoreNeed: 800,
    pops: [0, 8, 0, 0, 0],
    jelly: block(1, 2, 5, 3),
    sky: "night",
  },
  {
    name: "Night Harvest",
    blurb: "Score 1000, pop 10 berries, and clear the jelly.",
    moves: 40,
    scoreNeed: 1000,
    pops: [10, 0, 0, 0, 0],
    jelly: block(1, 1, 5, 5),
    sky: "night",
  },
];

export function burstLevel(index: number): BurstLevel {
  const safe = Math.max(0, Math.min(BURST_LEVELS.length - 1, index));
  return BURST_LEVELS[safe];
}
