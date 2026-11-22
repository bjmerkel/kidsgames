export type Point = { x: number; y: number };
export type Dir = { x: number; y: number };

const EAST: Dir = { x: 1, y: 0 };
const SOUTH: Dir = { x: 0, y: 1 };
const SOUTHEAST: Dir = { x: 1, y: 1 };
const WEST: Dir = { x: -1, y: 0 };
const NORTH: Dir = { x: 0, y: -1 };
const NORTHEAST: Dir = { x: 1, y: -1 };
const NORTHWEST: Dir = { x: -1, y: -1 };
const SOUTHWEST: Dir = { x: -1, y: 1 };

const ACROSS_DOWN = [EAST, SOUTH];
const WITH_DIAGONAL = [EAST, SOUTH, SOUTHEAST];
const ANY_LINE = [EAST, SOUTH, SOUTHEAST, WEST, NORTH, NORTHEAST, NORTHWEST, SOUTHWEST];

export type Placement = { word: string; cells: Point[] };

export type WordPuzzle = {
  name: string;
  blurb: string;
  words: string[];
  size: number;
  grid: string[];
  placed: Placement[];
};

const SPAN = 456;
export const GRID_TOP = 196;

export function metrics(size: number): { tile: number; originX: number; originY: number } {
  const tile = Math.floor(SPAN / size);
  return { tile, originX: Math.floor((480 - size * tile) / 2), originY: GRID_TOP };
}

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fits(grid: string[][], word: string, x: number, y: number, dir: Dir, size: number): boolean {
  for (let i = 0; i < word.length; i += 1) {
    const cx = x + dir.x * i;
    const cy = y + dir.y * i;
    if (cx < 0 || cy < 0 || cx >= size || cy >= size) return false;
    const letter = grid[cy][cx];
    if (letter && letter !== word[i]) return false;
  }
  return true;
}

function tryBuild(words: string[], size: number, dirs: Dir[], seed: number): { grid: string[]; placed: Placement[] } | null {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
  const placed: Placement[] = [];
  const random = rng(seed);
  const sorted = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));
  for (const word of sorted) {
    const options: { x: number; y: number; dir: Dir }[] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        for (const dir of dirs) if (fits(grid, word, x, y, dir, size)) options.push({ x, y, dir });
      }
    }
    if (options.length === 0) return null;
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = options[i];
      options[i] = options[j];
      options[j] = swap;
    }
    const pick = options[0];
    const cells: Point[] = [];
    for (let i = 0; i < word.length; i += 1) {
      const x = pick.x + pick.dir.x * i;
      const y = pick.y + pick.dir.y * i;
      grid[y][x] = word[i];
      cells.push({ x, y });
    }
    placed.push({ word, cells });
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) grid[y][x] = alphabet[Math.floor(random() * alphabet.length)];
    }
  }
  return { grid: grid.map((row) => row.join("")), placed };
}

function occurrences(grid: string[], word: string, size: number): number {
  let count = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      for (const dir of ANY_LINE) {
        let matches = true;
        for (let i = 0; i < word.length; i += 1) {
          const cx = x + dir.x * i;
          const cy = y + dir.y * i;
          if (cx < 0 || cy < 0 || cx >= size || cy >= size || grid[cy][cx] !== word[i]) {
            matches = false;
            break;
          }
        }
        if (matches) count += 1;
      }
    }
  }
  return count;
}

type PuzzleSpec = {
  name: string;
  blurb: string;
  words: string[];
  size: number;
  dirs: Dir[];
};

function buildSpec(spec: PuzzleSpec, seedStart: number): WordPuzzle {
  for (let step = 0; step < 8000; step += 1) {
    const seed = (seedStart + step) >>> 0;
    if (seed === 0) continue;
    const built = tryBuild(spec.words, spec.size, spec.dirs, seed);
    if (!built) continue;
    if (spec.words.some((word) => occurrences(built.grid, word, spec.size) !== 1)) continue;
    return { name: spec.name, blurb: spec.blurb, words: [...spec.words], size: spec.size, grid: built.grid, placed: built.placed };
  }
  throw new Error(`no word hunt layout for ${spec.name}`);
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

const ACROSS = "Words go across or down.";
const DIAGONAL = "Words can run on a diagonal.";
const ANY = "Words can run any straight line.";

const SPECS: PuzzleSpec[] = [
  { name: "Space Lab", blurb: ACROSS, words: ["PLANET", "ORBIT", "COMET", "GRAVITY", "METEOR", "SOLAR"], size: 8, dirs: ACROSS_DOWN },
  { name: "Weather Watch", blurb: ACROSS, words: ["CLOUD", "STORM", "BREEZE", "HUMID", "CYCLONE", "FORECAST"], size: 8, dirs: ACROSS_DOWN },
  { name: "Matter Lab", blurb: ACROSS, words: ["SOLID", "LIQUID", "MELTING", "FREEZE", "VAPOR", "DENSITY"], size: 8, dirs: ACROSS_DOWN },
  { name: "Waterways", blurb: ACROSS, words: ["OCEAN", "RIVER", "DROPLET", "RUNOFF", "GLACIER", "CURRENT"], size: 8, dirs: ACROSS_DOWN },
  { name: "Human Body", blurb: ACROSS, words: ["MUSCLE", "HEART", "LUNGS", "BRAIN", "SKELETON", "NERVES"], size: 8, dirs: ACROSS_DOWN },
  { name: "Simple Machines", blurb: ACROSS, words: ["LEVER", "WHEEL", "PULLEY", "SCREW", "WEDGE", "INCLINE"], size: 8, dirs: ACROSS_DOWN },
  { name: "Habitats", blurb: DIAGONAL, words: ["HABITAT", "PREDATOR", "CLIMATE", "FOSSIL", "BIOME", "ENERGY", "ORGANISM"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Rock Lab", blurb: DIAGONAL, words: ["MINERAL", "IGNEOUS", "SEDIMENT", "MAGMA", "CRYSTAL", "EROSION", "GRANITE"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Night Sky", blurb: DIAGONAL, words: ["SATURN", "JUPITER", "NEBULA", "GALAXY", "ASTEROID", "ECLIPSE", "ROTATION"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Plant Lab", blurb: DIAGONAL, words: ["FLOWER", "PETAL", "POLLEN", "ROOTS", "SEEDLING", "NECTAR", "BLOSSOM"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Forces", blurb: DIAGONAL, words: ["FRICTION", "INERTIA", "MAGNET", "VELOCITY", "MOTION", "BALANCE", "TENSION"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Food Webs", blurb: DIAGONAL, words: ["PRODUCER", "CONSUMER", "NICHE", "CANOPY", "MARSH", "FUNGUS", "SCAVENGER"], size: 10, dirs: WITH_DIAGONAL },
  { name: "Math Lab", blurb: "Words can run backwards.", words: ["FRACTION", "DECIMAL", "POLYGON", "VOLUME", "QUOTIENT", "FACTOR", "PERIMETER"], size: 10, dirs: ANY_LINE },
  { name: "Explorers", blurb: ANY, words: ["COLONY", "PIONEER", "COMPASS", "LIBERTY", "HARBOR", "TREATY", "EQUATOR", "VOYAGE"], size: 10, dirs: ANY_LINE },
  { name: "Story Craft", blurb: ANY, words: ["METAPHOR", "SUMMARY", "CONFLICT", "NARRATOR", "STANZA", "FICTION", "THEME", "DIALOGUE"], size: 10, dirs: ANY_LINE },
  { name: "Civics", blurb: ANY, words: ["SENATE", "BALLOT", "CITIZEN", "JUSTICE", "AMENDMENT", "RIGHTS", "MAYOR", "DEBATE"], size: 10, dirs: ANY_LINE },
  { name: "Landforms", blurb: ANY, words: ["CONTINENT", "PENINSULA", "LATITUDE", "ISTHMUS", "PLATEAU", "DELTA", "VALLEY", "CANYON"], size: 10, dirs: ANY_LINE },
  { name: "Grammar Lab", blurb: ANY, words: ["ADJECTIVE", "ADVERB", "PRONOUN", "SYNONYM", "ANTONYM", "PREFIX", "SUFFIX", "CLAUSE"], size: 10, dirs: ANY_LINE },
  { name: "Earth Forces", blurb: ANY, words: ["VOLCANO", "TSUNAMI", "MANTLE", "CRUST", "GEYSER", "TREMOR", "CINDER", "BASALT"], size: 10, dirs: ANY_LINE },
  { name: "Science Fair", blurb: ANY, words: ["HYPOTHESIS", "VARIABLE", "CONTROL", "OBSERVE", "RESULT", "SAMPLE", "EVIDENCE", "METHOD"], size: 10, dirs: ANY_LINE },
];

export const HUNT_LEVELS: WordPuzzle[] = SPECS.map((spec) => buildSpec(spec, 1));

export function dealHunt(seed: number): WordPuzzle[] {
  const random = rng((seed >>> 0) || 1);
  const bands = [SPECS.slice(0, 6), SPECS.slice(6, 12), SPECS.slice(12)];
  return bands.flatMap((band) => shuffle(band, random)).map((spec) => buildSpec(spec, 1 + Math.floor(random() * 6000)));
}

export function huntLevel(index: number): WordPuzzle {
  const safe = Math.max(0, Math.min(HUNT_LEVELS.length - 1, index));
  return HUNT_LEVELS[safe];
}
