import { dealHunt, HUNT_LEVELS, metrics, type Point, type WordPuzzle } from "./puzzles";

export type HuntPhase = "playing" | "paused" | "clear" | "done";

export type HuntInput = {
  tap: boolean;
  drag: boolean;
  tracking: boolean;
  x: number;
  y: number;
  x2: number;
  y2: number;
  pause: boolean;
  confirm: boolean;
  hint: boolean;
};

export type FoundWord = { word: string; cells: Point[] };

export type HuntState = {
  phase: HuntPhase;
  levelIndex: number;
  score: number;
  found: FoundWord[];
  selected: Point | null;
  trail: Point[] | null;
  hint: Point | null;
  toast: string;
  toastMs: number;
  elapsedMs: number;
  levels: WordPuzzle[];
  reshuffle: boolean;
};

const FIND_POINTS = 100;
const CLEAR_BONUS = 250;

export function blankHuntInput(): HuntInput {
  return { tap: false, drag: false, tracking: false, x: 0, y: 0, x2: 0, y2: 0, pause: false, confirm: false, hint: false };
}

export function nearestCell(px: number, py: number, size: number): Point | null {
  const { tile, originX, originY } = metrics(size);
  const reach = tile * 0.5;
  if (px < originX - reach || py < originY - reach || px >= originX + size * tile + reach || py >= originY + size * tile + reach) return null;
  const x = Math.min(size - 1, Math.max(0, Math.floor((px - originX) / tile)));
  const y = Math.min(size - 1, Math.max(0, Math.floor((py - originY) / tile)));
  return { x, y };
}

export function cellAt(px: number, py: number, size: number): Point | null {
  const { tile, originX, originY } = metrics(size);
  const x = Math.floor((px - originX) / tile);
  const y = Math.floor((py - originY) / tile);
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return { x, y };
}

export function createHunt(levelIndex = 0, score = 0, levels: WordPuzzle[] = HUNT_LEVELS): HuntState {
  const list = levels.length > 0 ? levels : HUNT_LEVELS;
  const safe = Math.max(0, Math.min(list.length - 1, levelIndex));
  const level = list[safe];
  return {
    phase: "playing",
    levelIndex: safe,
    score,
    found: [],
    selected: null,
    trail: null,
    hint: null,
    toast: level.blurb,
    toastMs: 1800,
    elapsedMs: 0,
    levels: list,
    reshuffle: false,
  };
}

export function startHunt(seed = 1 + Math.floor(Math.random() * 2147483646)): HuntState {
  const state = createHunt(0, 0, dealHunt(seed));
  state.reshuffle = true;
  return state;
}

function lineBetween(a: Point, b: Point, size: number): Point[] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if ((dx !== 0 && Math.abs(dx) !== steps) || (dy !== 0 && Math.abs(dy) !== steps)) return null;
  const sx = dx === 0 ? 0 : Math.sign(dx);
  const sy = dy === 0 ? 0 : Math.sign(dy);
  const cells: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + sx * i;
    const y = a.y + sy * i;
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    cells.push({ x, y });
  }
  return cells;
}

function spell(grid: string[], cells: Point[]): string {
  return cells.map((cell) => grid[cell.y][cell.x]).join("");
}

const AIM_DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function knownWord(level: WordPuzzle, cells: Point[]): string | null {
  const forward = spell(level.grid, cells);
  const backward = forward.split("").reverse().join("");
  return level.words.find((word) => word === forward || word === backward) ?? null;
}

function aimedLine(level: WordPuzzle, x: number, y: number, x2: number, y2: number, found: FoundWord[]): Point[] | null {
  const start = nearestCell(x, y, level.size);
  if (!start) return null;
  const { tile } = metrics(level.size);
  const dx = x2 - x;
  const dy = y2 - y;
  const dist = Math.hypot(dx, dy);
  if (dist < tile * 0.45) return [nearestCell(x2, y2, level.size) ?? start];
  let dir = AIM_DIRS[0];
  let best = -2;
  for (const candidate of AIM_DIRS) {
    const length = Math.hypot(candidate.x, candidate.y);
    const dot = (dx * candidate.x + dy * candidate.y) / (dist * length);
    if (dot > best) {
      best = dot;
      dir = candidate;
    }
  }
  const step = tile * Math.hypot(dir.x, dir.y);
  let steps = Math.max(1, Math.round(dist / step));
  let line: Point[] | null = null;
  while (steps >= 1) {
    const end = { x: start.x + dir.x * steps, y: start.y + dir.y * steps };
    line = lineBetween(start, end, level.size);
    if (line) break;
    steps -= 1;
  }
  if (!line || line.length < 2) return [start];
  if (knownWord(level, line)) return line;
  const taken = new Set(found.map((item) => item.word));
  const end = line[line.length - 1];
  let winner: { miss: number; cells: Point[] } | null = null;
  let tied = false;
  for (const place of level.placed) {
    if (taken.has(place.word) || place.cells.length < 2) continue;
    const first = place.cells[0];
    const last = place.cells[place.cells.length - 1];
    const wordDx = Math.sign(last.x - first.x);
    const wordDy = Math.sign(last.y - first.y);
    const aligned = (wordDx === dir.x && wordDy === dir.y) || (wordDx === -dir.x && wordDy === -dir.y);
    if (!aligned) continue;
    const miss = Math.min(chebyshev(start, first) + chebyshev(end, last), chebyshev(start, last) + chebyshev(end, first));
    if (miss > 1) continue;
    if (!winner || miss < winner.miss) {
      winner = { miss, cells: place.cells };
      tied = false;
    } else if (miss === winner.miss && spell(level.grid, winner.cells) !== place.word) tied = true;
  }
  if (winner && !tied) return winner.cells;
  return line;
}

function chooseTap(px: number, py: number, level: WordPuzzle, selected: Point | null, found: FoundWord[]): Point | null {
  const cell = nearestCell(px, py, level.size);
  if (!cell || !selected) return cell;
  const direct = lineBetween(selected, cell, level.size);
  const taken = new Set(found.map((item) => item.word));
  if (direct && direct.length > 1) {
    const word = knownWord(level, direct);
    if (word && !taken.has(word)) return cell;
  }
  const { tile, originX, originY } = metrics(level.size);
  const fx = (px - originX) / tile;
  const fy = (py - originY) / tile;
  const options: Point[] = [];
  for (let y = cell.y - 1; y <= cell.y + 1; y += 1) {
    for (let x = cell.x - 1; x <= cell.x + 1; x += 1) {
      if (x < 0 || y < 0 || x >= level.size || y >= level.size || (x === cell.x && y === cell.y)) continue;
      if (Math.hypot(fx - (x + 0.5), fy - (y + 0.5)) > 0.72) continue;
      const line = lineBetween(selected, { x, y }, level.size);
      if (!line || line.length < 2) continue;
      const word = knownWord(level, line);
      if (word && !taken.has(word)) options.push({ x, y });
    }
  }
  return options.length === 1 ? options[0] : cell;
}

function mark(state: HuntState, level: WordPuzzle, cells: Point[]): void {
  const forward = spell(level.grid, cells);
  const backward = forward.split("").reverse().join("");
  const word = level.words.find((item) => !state.found.some((found) => found.word === item) && (item === forward || item === backward));
  if (!word) {
    if (level.words.includes(forward) || level.words.includes(backward)) {
      state.toast = "Already found.";
      state.toastMs = 700;
    } else {
      state.toast = "Look again.";
      state.toastMs = 700;
    }
    state.selected = null;
    return;
  }
  const ordered = word === forward ? cells : [...cells].reverse();
  state.found.push({ word, cells: ordered });
  state.score += FIND_POINTS;
  state.selected = null;
  state.hint = null;
  if (state.found.length === level.words.length) {
    state.score += CLEAR_BONUS;
    state.phase = "clear";
    state.toast = "You finished the level!";
    state.toastMs = 0;
    return;
  }
  state.toast = `Found ${word}!`;
  state.toastMs = 900;
}

export function tickHunt(state: HuntState, input: HuntInput, dt: number): HuntState {
  const step = Math.max(0, Math.min(50, dt));
  const next = structuredClone(state);
  const level = next.levels[next.levelIndex];
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  if (next.phase === "paused") {
    if (input.pause) next.phase = "playing";
    return next;
  }
  if (next.phase !== "playing") return next;
  if (input.pause) {
    next.phase = "paused";
    return next;
  }
  if (input.hint) {
    const left = level.placed.find((place) => !next.found.some((found) => found.word === place.word));
    next.hint = left ? left.cells[0] : null;
    next.toast = next.hint ? "The first letter is glowing." : "Every word is found.";
    next.toastMs = 900;
    return next;
  }
  if (!input.tracking) next.trail = null;
  if (input.drag) {
    const cells = aimedLine(level, input.x, input.y, input.x2, input.y2, next.found);
    next.trail = null;
    next.selected = null;
    if (!cells || cells.length < 2) {
      next.toast = "Look again.";
      next.toastMs = 700;
      return next;
    }
    mark(next, level, cells);
    return next;
  }
  if (input.tracking) {
    next.trail = aimedLine(level, input.x, input.y, input.x2, input.y2, next.found);
    return next;
  }
  if (!input.tap) return next;
  const cell = chooseTap(input.x, input.y, level, next.selected, next.found);
  if (!cell) {
    next.selected = null;
    return next;
  }
  if (!next.selected) {
    next.selected = cell;
    return next;
  }
  if (next.selected.x === cell.x && next.selected.y === cell.y) {
    next.selected = null;
    return next;
  }
  const box = metrics(level.size);
  const aimed = aimedLine(
    level,
    box.originX + next.selected.x * box.tile + box.tile / 2,
    box.originY + next.selected.y * box.tile + box.tile / 2,
    input.x,
    input.y,
    next.found,
  );
  if (aimed && aimed.length > 1 && knownWord(level, aimed)) {
    mark(next, level, aimed);
    return next;
  }
  const cells = lineBetween(next.selected, cell, level.size);
  if (!cells) {
    next.selected = cell;
    return next;
  }
  mark(next, level, cells);
  return next;
}

export function advanceHunt(state: HuntState): HuntState {
  if (state.phase === "done") return state.reshuffle ? startHunt() : createHunt(0, 0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= state.levels.length - 1) {
    const done = structuredClone(state);
    done.phase = "done";
    done.toast = `You finished all ${state.levels.length} levels.`;
    done.toastMs = 0;
    return done;
  }
  const next = createHunt(state.levelIndex + 1, state.score, state.levels);
  next.reshuffle = state.reshuffle;
  return next;
}
