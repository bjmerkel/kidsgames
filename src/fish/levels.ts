export const SPECIES = ["bluegill", "sunfish", "perch", "bass", "trout", "catfish", "minnow"] as const;

export type Species = (typeof SPECIES)[number];

export type Goal = {
  species: Species;
  need: number;
};

export type Spawn = {
  species: Species;
  x: number;
  y: number;
  vx: number;
};

export type FishLevel = {
  name: string;
  blurb: string;
  goals: Goal[];
  fish: Spawn[];
};

export const FISH_LEVELS: FishLevel[] = [
  {
    name: "Sunny Shore",
    blurb: "Catch 3 bluegill.",
    goals: [{ species: "bluegill", need: 3 }],
    fish: [
      { species: "bluegill", x: 90, y: 250, vx: 42 },
      { species: "bluegill", x: 220, y: 360, vx: -36 },
      { species: "bluegill", x: 360, y: 480, vx: 34 },
      { species: "minnow", x: 140, y: 300, vx: 70 },
      { species: "minnow", x: 300, y: 560, vx: -64 },
    ],
  },
  {
    name: "Sunfish Bend",
    blurb: "Catch 2 sunfish and 1 perch.",
    goals: [
      { species: "sunfish", need: 2 },
      { species: "perch", need: 1 },
    ],
    fish: [
      { species: "sunfish", x: 80, y: 270, vx: 48 },
      { species: "sunfish", x: 340, y: 420, vx: -44 },
      { species: "perch", x: 200, y: 540, vx: 40 },
      { species: "bluegill", x: 120, y: 340, vx: -52 },
      { species: "minnow", x: 280, y: 250, vx: 78 },
    ],
  },
  {
    name: "Bass Hole",
    blurb: "Catch 2 bass.",
    goals: [{ species: "bass", need: 2 }],
    fish: [
      { species: "bass", x: 100, y: 460, vx: 62 },
      { species: "bass", x: 320, y: 580, vx: -70 },
      { species: "bluegill", x: 160, y: 280, vx: 50 },
      { species: "minnow", x: 240, y: 340, vx: -90 },
      { species: "minnow", x: 380, y: 500, vx: 84 },
    ],
  },
  {
    name: "Shady Bank",
    blurb: "Catch 1 catfish and 2 perch.",
    goals: [
      { species: "catfish", need: 1 },
      { species: "perch", need: 2 },
    ],
    fish: [
      { species: "catfish", x: 150, y: 600, vx: 36 },
      { species: "perch", x: 90, y: 300, vx: 58 },
      { species: "perch", x: 360, y: 430, vx: -54 },
      { species: "trout", x: 250, y: 250, vx: 72 },
      { species: "minnow", x: 200, y: 520, vx: -80 },
    ],
  },
  {
    name: "Full Creel",
    blurb: "Catch 1 bluegill, 1 sunfish, 1 bass, 1 trout, and 1 catfish.",
    goals: [
      { species: "bluegill", need: 1 },
      { species: "sunfish", need: 1 },
      { species: "bass", need: 1 },
      { species: "trout", need: 1 },
      { species: "catfish", need: 1 },
    ],
    fish: [
      { species: "bluegill", x: 70, y: 240, vx: 56 },
      { species: "sunfish", x: 180, y: 330, vx: -60 },
      { species: "bass", x: 300, y: 450, vx: 68 },
      { species: "trout", x: 120, y: 520, vx: -74 },
      { species: "catfish", x: 360, y: 620, vx: 42 },
      { species: "minnow", x: 240, y: 280, vx: 96 },
      { species: "perch", x: 400, y: 380, vx: -66 },
    ],
  },
];

export const FISH_LOOK: Record<Species, { name: string; body: string; mark: string; belly: string }> = {
  bluegill: { name: "Bluegill", body: "#3d7ea6", mark: "#1f4e73", belly: "#e07a32" },
  sunfish: { name: "Sunfish", body: "#e07a32", mark: "#8a3e16", belly: "#f2c14e" },
  perch: { name: "Perch", body: "#d6b84a", mark: "#3f6b3a", belly: "#f7f1e6" },
  bass: { name: "Bass", body: "#3f7a45", mark: "#1c1915", belly: "#d7e2b5" },
  trout: { name: "Trout", body: "#c5cdd4", mark: "#6b4f6a", belly: "#f4b6c2" },
  catfish: { name: "Catfish", body: "#8a6a45", mark: "#3e2a1c", belly: "#e7d3b0" },
  minnow: { name: "Minnow", body: "#e7eef2", mark: "#8aa0ad", belly: "#f7f4ee" },
};

export function fishLevel(index: number): FishLevel {
  return FISH_LEVELS[Math.max(0, Math.min(FISH_LEVELS.length - 1, index))];
}
