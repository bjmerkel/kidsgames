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
};

function block(x0: number, y0: number, w: number, h: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) cells.push({ x, y });
  }
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
];

export function burstLevel(index: number): BurstLevel {
  const safe = Math.max(0, Math.min(BURST_LEVELS.length - 1, index));
  return BURST_LEVELS[safe];
}
