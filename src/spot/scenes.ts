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
];

export function spotLevel(index: number): SpotLevel {
  const safe = ((index % SPOT_LEVELS.length) + SPOT_LEVELS.length) % SPOT_LEVELS.length;
  return SPOT_LEVELS[safe];
}
