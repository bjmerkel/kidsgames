export type BugKind = "skimmer" | "beetle" | "dragonfly" | "king";

export type AxoLevel = {
  name: string;
  blurb: string;
  rows: BugKind[];
  columns: number;
  top: number;
  king: boolean;
  diveEvery: number;
  diveCount: number;
  firstDiveMs: number;
  kingDiveEvery: number | null;
  pelletSpeed: number;
};

export type BugLook = {
  name: string;
  hp: number;
  radius: number;
  points: number;
  body: string;
  accent: string;
};

export const BUG_LOOK: Record<BugKind, BugLook> = {
  skimmer: { name: "Skimmer", hp: 1, radius: 14, points: 100, body: "#7eb6e0", accent: "#f7f1e6" },
  beetle: { name: "Beetle", hp: 1, radius: 16, points: 150, body: "#e0a15a", accent: "#5c3b22" },
  dragonfly: { name: "Dragonfly", hp: 1, radius: 15, points: 200, body: "#7dbe6a", accent: "#e7f6df" },
  king: { name: "King Beetle", hp: 6, radius: 30, points: 1000, body: "#8d6cc2", accent: "#f2c14e" },
};

export const AXO_LEVELS: AxoLevel[] = [
  {
    name: "Skimmer School",
    blurb: "Slide a finger. The axolotl follows and shoots.",
    rows: ["skimmer", "skimmer"],
    columns: 4,
    top: 186,
    king: false,
    diveEvery: 2400,
    diveCount: 1,
    firstDiveMs: 1800,
    kingDiveEvery: null,
    pelletSpeed: 180,
  },
  {
    name: "Beetle Rows",
    blurb: "Beetles dive faster.",
    rows: ["beetle", "beetle", "beetle"],
    columns: 4,
    top: 176,
    king: false,
    diveEvery: 1900,
    diveCount: 1,
    firstDiveMs: 1700,
    kingDiveEvery: null,
    pelletSpeed: 200,
  },
  {
    name: "Dragonfly Dive",
    blurb: "Dragonflies drop water.",
    rows: ["dragonfly", "dragonfly", "dragonfly"],
    columns: 5,
    top: 176,
    king: false,
    diveEvery: 1500,
    diveCount: 1,
    firstDiveMs: 1700,
    kingDiveEvery: null,
    pelletSpeed: 220,
  },
  {
    name: "Mixed Swarm",
    blurb: "Two bugs dive at once.",
    rows: ["skimmer", "beetle", "dragonfly", "beetle"],
    columns: 5,
    top: 168,
    king: false,
    diveEvery: 1200,
    diveCount: 2,
    firstDiveMs: 1800,
    kingDiveEvery: null,
    pelletSpeed: 250,
  },
  {
    name: "King Beetle",
    blurb: "Pop the king beetle.",
    rows: ["beetle", "dragonfly", "beetle"],
    columns: 4,
    top: 220,
    king: true,
    diveEvery: 1300,
    diveCount: 2,
    firstDiveMs: 1700,
    kingDiveEvery: 4200,
    pelletSpeed: 270,
  },
];

export function axoLevel(index: number): AxoLevel {
  return AXO_LEVELS[Math.max(0, Math.min(AXO_LEVELS.length - 1, index))];
}
