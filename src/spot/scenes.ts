export const PANEL_X = 12;
export const PANEL_W = 456;
export const PANEL_H = 286;
export const PANEL_TOP = 78;
export const PANEL_GAP = 22;
export const PANEL_BOTTOM = PANEL_TOP + PANEL_H + PANEL_GAP;

export type SpotDiff = {
  id: string;
  x: number;
  y: number;
  r: number;
};

export type SpotSky = "day" | "dusk" | "night";

export type SpotLevel = {
  name: string;
  blurb: string;
  sky: SpotSky;
  hero: { x: number; y: number; face: number };
  diffs: SpotDiff[];
};

const R = 28;

function level(partial: Omit<SpotLevel, "blurb">): SpotLevel {
  return { ...partial, blurb: `Find ${partial.diffs.length} changes.` };
}

export const SPOT_LEVELS: SpotLevel[] = [
  level({
    name: "Rooftop Morning",
    sky: "day",
    hero: { x: 250, y: 168, face: 1 },
    diffs: [
      { id: "balloon", x: 390, y: 52, r: R },
      { id: "web", x: 72, y: 158, r: R },
      { id: "bird", x: 210, y: 78, r: R },
    ],
  }),
  level({
    name: "Park Swing",
    sky: "day",
    hero: { x: 220, y: 176, face: -1 },
    diffs: [
      { id: "flower", x: 64, y: 228, r: R },
      { id: "web", x: 300, y: 138, r: R },
      { id: "balloon", x: 392, y: 54, r: R },
      { id: "bird", x: 150, y: 86, r: R },
    ],
  }),
  level({
    name: "Night Windows",
    sky: "night",
    hero: { x: 190, y: 176, face: 1 },
    diffs: [
      { id: "window", x: 108, y: 118, r: R },
      { id: "star", x: 250, y: 40, r: R },
      { id: "cat", x: 330, y: 214, r: R },
      { id: "moon", x: 410, y: 54, r: R },
      { id: "web", x: 64, y: 188, r: R },
    ],
  }),
  level({
    name: "Snack Alley",
    sky: "dusk",
    hero: { x: 250, y: 132, face: 1 },
    diffs: [
      { id: "snack", x: 196, y: 220, r: R },
      { id: "lantern", x: 68, y: 96, r: R },
      { id: "balloon", x: 400, y: 58, r: R },
      { id: "puddle", x: 330, y: 232, r: R },
      { id: "web", x: 128, y: 154, r: R },
    ],
  }),
  level({
    name: "Moon Nest",
    sky: "night",
    hero: { x: 280, y: 168, face: -1 },
    diffs: [
      { id: "moon", x: 412, y: 48, r: R },
      { id: "star", x: 248, y: 36, r: R },
      { id: "star2", x: 70, y: 42, r: R },
      { id: "cat", x: 118, y: 222, r: R },
      { id: "web", x: 188, y: 112, r: R },
      { id: "flag", x: 360, y: 200, r: R },
    ],
  }),
  level({
    name: "Chimney Puff",
    sky: "day",
    hero: { x: 240, y: 170, face: 1 },
    diffs: [
      { id: "smoke", x: 90, y: 70, r: R },
      { id: "cloud", x: 360, y: 48, r: R },
      { id: "acorn", x: 200, y: 48, r: R },
      { id: "flower", x: 80, y: 230, r: R },
    ],
  }),
  level({
    name: "Kite Roof",
    sky: "day",
    hero: { x: 180, y: 180, face: -1 },
    diffs: [
      { id: "kite", x: 400, y: 70, r: R },
      { id: "balloon", x: 300, y: 50, r: R },
      { id: "web", x: 70, y: 150, r: R },
      { id: "bird", x: 160, y: 50, r: R },
    ],
  }),
  level({
    name: "Bakery Dusk",
    sky: "dusk",
    hero: { x: 250, y: 160, face: 1 },
    diffs: [
      { id: "snack", x: 90, y: 230, r: R },
      { id: "lantern", x: 70, y: 80, r: R },
      { id: "window", x: 180, y: 100, r: R },
      { id: "puddle", x: 340, y: 236, r: R },
      { id: "web", x: 400, y: 140, r: R },
    ],
  }),
  level({
    name: "Star Porch",
    sky: "night",
    hero: { x: 220, y: 180, face: 1 },
    diffs: [
      { id: "star", x: 70, y: 40, r: R },
      { id: "star2", x: 180, y: 40, r: R },
      { id: "moon", x: 400, y: 50, r: R },
      { id: "cat", x: 90, y: 230, r: R },
      { id: "web", x: 340, y: 140, r: R },
    ],
  }),
  level({
    name: "Puddle Lane",
    sky: "day",
    hero: { x: 250, y: 150, face: -1 },
    diffs: [
      { id: "puddle", x: 80, y: 236, r: R },
      { id: "puddle2", x: 200, y: 236, r: R },
      { id: "bird", x: 360, y: 50, r: R },
      { id: "balloon", x: 80, y: 50, r: R },
      { id: "flower", x: 400, y: 200, r: R },
    ],
  }),
  level({
    name: "Lantern Row",
    sky: "dusk",
    hero: { x: 200, y: 170, face: 1 },
    diffs: [
      { id: "lantern", x: 70, y: 90, r: R },
      { id: "lantern2", x: 400, y: 90, r: R },
      { id: "flag", x: 250, y: 50, r: R },
      { id: "snack", x: 90, y: 230, r: R },
      { id: "web", x: 340, y: 210, r: R },
    ],
  }),
  level({
    name: "Owl Windows",
    sky: "night",
    hero: { x: 240, y: 190, face: -1 },
    diffs: [
      { id: "window", x: 70, y: 120, r: R },
      { id: "window2", x: 180, y: 100, r: R },
      { id: "moon", x: 400, y: 48, r: R },
      { id: "star", x: 250, y: 40, r: R },
      { id: "cat", x: 80, y: 230, r: R },
      { id: "web", x: 360, y: 180, r: R },
    ],
  }),
  level({
    name: "Flower Boxes",
    sky: "day",
    hero: { x: 230, y: 160, face: 1 },
    diffs: [
      { id: "flower", x: 70, y: 230, r: R },
      { id: "flower2", x: 180, y: 230, r: R },
      { id: "butterfly", x: 360, y: 70, r: R },
      { id: "bird", x: 90, y: 50, r: R },
      { id: "balloon", x: 250, y: 46, r: R },
      { id: "cloud", x: 410, y: 150, r: R },
    ],
  }),
  level({
    name: "Flag Parade",
    sky: "dusk",
    hero: { x: 200, y: 180, face: 1 },
    diffs: [
      { id: "flag", x: 80, y: 160, r: R },
      { id: "flag2", x: 400, y: 160, r: R },
      { id: "kite", x: 250, y: 48, r: R },
      { id: "lantern", x: 70, y: 60, r: R },
      { id: "balloon", x: 400, y: 48, r: R },
      { id: "snack", x: 300, y: 230, r: R },
    ],
  }),
  level({
    name: "Cat Nap",
    sky: "day",
    hero: { x: 260, y: 150, face: -1 },
    diffs: [
      { id: "cat", x: 80, y: 220, r: R },
      { id: "cat2", x: 200, y: 230, r: R },
      { id: "web", x: 70, y: 90, r: R },
      { id: "flower", x: 360, y: 230, r: R },
      { id: "puddle", x: 400, y: 170, r: R },
      { id: "bird", x: 180, y: 46, r: R },
    ],
  }),
  level({
    name: "Balloon Bunch",
    sky: "day",
    hero: { x: 160, y: 180, face: 1 },
    diffs: [
      { id: "balloon", x: 70, y: 46, r: R },
      { id: "balloon2", x: 200, y: 46, r: R },
      { id: "balloon3", x: 340, y: 50, r: R },
      { id: "kite", x: 410, y: 140, r: R },
      { id: "cloud", x: 90, y: 140, r: R },
      { id: "bird", x: 300, y: 140, r: R },
    ],
  }),
  level({
    name: "Web Corner",
    sky: "dusk",
    hero: { x: 240, y: 170, face: 1 },
    diffs: [
      { id: "web", x: 64, y: 150, r: R },
      { id: "web2", x: 160, y: 80, r: R },
      { id: "lantern", x: 400, y: 80, r: R },
      { id: "snack", x: 80, y: 230, r: R },
      { id: "flag", x: 300, y: 50, r: R },
      { id: "puddle", x: 360, y: 236, r: R },
      { id: "flower", x: 200, y: 230, r: R },
    ],
  }),
  level({
    name: "Moonlit Steps",
    sky: "night",
    hero: { x: 200, y: 190, face: -1 },
    diffs: [
      { id: "moon", x: 410, y: 46, r: R },
      { id: "star", x: 70, y: 40, r: R },
      { id: "star2", x: 180, y: 40, r: R },
      { id: "star3", x: 290, y: 40, r: R },
      { id: "cat", x: 80, y: 230, r: R },
      { id: "window", x: 160, y: 120, r: R },
      { id: "web", x: 340, y: 160, r: R },
    ],
  }),
  level({
    name: "Snack Window",
    sky: "dusk",
    hero: { x: 220, y: 160, face: 1 },
    diffs: [
      { id: "snack", x: 80, y: 230, r: R },
      { id: "snack2", x: 220, y: 230, r: R },
      { id: "window", x: 70, y: 110, r: R },
      { id: "lantern", x: 400, y: 90, r: R },
      { id: "balloon", x: 250, y: 46, r: R },
      { id: "puddle", x: 360, y: 236, r: R },
      { id: "kite", x: 400, y: 180, r: R },
    ],
  }),
  level({
    name: "Nest Party",
    sky: "night",
    hero: { x: 180, y: 180, face: 1 },
    diffs: [
      { id: "moon", x: 410, y: 48, r: R },
      { id: "star", x: 80, y: 40, r: R },
      { id: "star2", x: 200, y: 40, r: R },
      { id: "cat", x: 70, y: 220, r: R },
      { id: "flag", x: 340, y: 200, r: R },
      { id: "web", x: 250, y: 120, r: R },
      { id: "balloon", x: 400, y: 140, r: R },
    ],
  }),
  level({
    name: "Science Fair",
    sky: "dusk",
    hero: { x: 160, y: 190, face: 1 },
    diffs: [
      { id: "window", x: 58, y: 130, r: R },
      { id: "window2", x: 150, y: 130, r: R },
      { id: "lantern", x: 420, y: 130, r: R },
      { id: "snack", x: 58, y: 220, r: R },
      { id: "flag", x: 334, y: 48, r: R },
      { id: "balloon", x: 242, y: 48, r: R },
      { id: "web", x: 242, y: 130, r: R },
      { id: "acorn", x: 334, y: 220, r: R },
    ],
  }),
  level({
    name: "Planetarium",
    sky: "night",
    hero: { x: 250, y: 180, face: -1 },
    diffs: [
      { id: "star", x: 58, y: 48, r: R },
      { id: "star2", x: 150, y: 48, r: R },
      { id: "star3", x: 242, y: 48, r: R },
      { id: "star4", x: 334, y: 48, r: R },
      { id: "moon", x: 420, y: 48, r: R },
      { id: "window", x: 150, y: 130, r: R },
      { id: "web", x: 334, y: 130, r: R },
      { id: "cat", x: 58, y: 220, r: R },
    ],
  }),
  level({
    name: "Class Garden",
    sky: "day",
    hero: { x: 250, y: 130, face: 1 },
    diffs: [
      { id: "flower", x: 58, y: 220, r: R },
      { id: "flower2", x: 150, y: 220, r: R },
      { id: "flower3", x: 242, y: 220, r: R },
      { id: "butterfly", x: 58, y: 48, r: R },
      { id: "butterfly2", x: 150, y: 48, r: R },
      { id: "cloud", x: 334, y: 48, r: R },
      { id: "bird", x: 420, y: 48, r: R },
      { id: "acorn", x: 420, y: 220, r: R },
    ],
  }),
  level({
    name: "Field Day",
    sky: "dusk",
    hero: { x: 300, y: 170, face: -1 },
    diffs: [
      { id: "flag", x: 58, y: 130, r: R },
      { id: "flag2", x: 150, y: 130, r: R },
      { id: "balloon", x: 58, y: 48, r: R },
      { id: "balloon2", x: 150, y: 48, r: R },
      { id: "balloon3", x: 242, y: 48, r: R },
      { id: "kite", x: 420, y: 48, r: R },
      { id: "lantern", x: 420, y: 130, r: R },
      { id: "snack", x: 242, y: 220, r: R },
    ],
  }),
  level({
    name: "Observatory",
    sky: "night",
    hero: { x: 180, y: 190, face: 1 },
    diffs: [
      { id: "moon", x: 420, y: 48, r: R },
      { id: "star", x: 58, y: 48, r: R },
      { id: "star2", x: 150, y: 48, r: R },
      { id: "window", x: 58, y: 130, r: R },
      { id: "window2", x: 242, y: 130, r: R },
      { id: "lantern", x: 334, y: 130, r: R },
      { id: "web", x: 334, y: 220, r: R },
      { id: "cat", x: 58, y: 220, r: R },
    ],
  }),
];

export function spotLevel(index: number): SpotLevel {
  const safe = ((index % SPOT_LEVELS.length) + SPOT_LEVELS.length) % SPOT_LEVELS.length;
  return SPOT_LEVELS[safe];
}

const SKY = new Set(["balloon", "bird", "star", "moon", "cloud", "kite", "butterfly", "smoke"]);
const GROUND = new Set(["flower", "puddle", "cat", "snack", "acorn"]);

function rng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = next[i];
    next[i] = next[j];
    next[j] = swap;
  }
  return next;
}

function zoneFor(id: string): { y0: number; y1: number } {
  const kind = id.replace(/\d+$/, "");
  if (SKY.has(kind)) return { y0: 36, y1: 110 };
  if (GROUND.has(kind)) return { y0: 190, y1: 240 };
  return { y0: 96, y1: 200 };
}

function layoutDiffs(diffs: SpotDiff[], random: () => number): SpotDiff[] {
  const place = (wide: boolean): SpotDiff[] | null => {
    const next: SpotDiff[] = [];
    for (const diff of diffs) {
      const zone = wide ? { y0: 36, y1: 240 } : zoneFor(diff.id);
      let chosen: SpotDiff | null = null;
      for (let tries = 0; tries < 80; tries += 1) {
        const x = 40 + Math.floor(random() * (PANEL_W - 80));
        const y = zone.y0 + Math.floor(random() * (zone.y1 - zone.y0 + 1));
        const candidate = { ...diff, x, y };
        const clear = next.every((other) => Math.hypot(other.x - x, other.y - y) > other.r + diff.r);
        if (clear) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) return null;
      next.push(chosen);
    }
    return next;
  };
  for (const wide of [false, true]) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const laid = place(wide);
      if (laid) return laid;
    }
  }
  return diffs.map((diff) => ({ ...diff }));
}

export function dealSpot(seed: number): SpotLevel[] {
  const random = rng(seed);
  const groups = new Map<number, SpotLevel[]>();
  for (const picture of SPOT_LEVELS) {
    const group = groups.get(picture.diffs.length) ?? [];
    group.push(picture);
    groups.set(picture.diffs.length, group);
  }
  return [...groups.keys()]
    .sort((a, b) => a - b)
    .flatMap((count) => shuffle(groups.get(count) ?? [], random).map((picture) => ({ ...picture, hero: { ...picture.hero }, diffs: layoutDiffs(picture.diffs, random) })));
}
