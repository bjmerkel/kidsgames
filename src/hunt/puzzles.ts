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

function layout(name: string, blurb: string, words: string[], size: number, dirs: Dir[]): WordPuzzle {
  for (let seed = 1; seed < 4000; seed += 1) {
    const built = tryBuild(words, size, dirs, seed);
    if (!built) continue;
    return { name, blurb, words: [...words], size, grid: built.grid, placed: built.placed };
  }
  throw new Error(`no word hunt layout for ${name}`);
}

export const HUNT_LEVELS: WordPuzzle[] = [
  layout("Space Lab", "Words go across or down.", ["PLANET", "ORBIT", "COMET", "GRAVITY", "METEOR", "SOLAR"], 8, ACROSS_DOWN),
  layout("Habitats", "Words can run on a diagonal.", ["HABITAT", "PREDATOR", "CLIMATE", "FOSSIL", "BIOME", "ENERGY", "ORGANISM"], 10, WITH_DIAGONAL),
  layout("Math Lab", "Words can run backwards.", ["FRACTION", "DECIMAL", "POLYGON", "VOLUME", "QUOTIENT", "FACTOR", "PERIMETER"], 10, ANY_LINE),
  layout("Explorers", "Words can run any straight line.", ["COLONY", "PIONEER", "COMPASS", "LIBERTY", "HARBOR", "TREATY", "EQUATOR", "VOYAGE"], 10, ANY_LINE),
  layout("Story Craft", "Words can run any straight line.", ["METAPHOR", "SUMMARY", "CONFLICT", "NARRATOR", "STANZA", "FICTION", "THEME", "DIALOGUE"], 10, ANY_LINE),
];

export function huntLevel(index: number): WordPuzzle {
  const safe = Math.max(0, Math.min(HUNT_LEVELS.length - 1, index));
  return HUNT_LEVELS[safe];
}
