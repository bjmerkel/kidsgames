import { HUNT_LEVELS, huntLevel, metrics, type Point, type WordPuzzle } from "./puzzles";

export type HuntPhase = "playing" | "paused" | "clear" | "done";

export type HuntInput = {
  tap: boolean;
  drag: boolean;
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
  hint: Point | null;
  toast: string;
  toastMs: number;
  elapsedMs: number;
};

const FIND_POINTS = 100;
const CLEAR_BONUS = 250;

export function blankHuntInput(): HuntInput {
  return { tap: false, drag: false, x: 0, y: 0, x2: 0, y2: 0, pause: false, confirm: false, hint: false };
}

export function cellAt(px: number, py: number, size: number): Point | null {
  const { tile, originX, originY } = metrics(size);
  const x = Math.floor((px - originX) / tile);
  const y = Math.floor((py - originY) / tile);
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return { x, y };
}

export function createHunt(levelIndex = 0, score = 0): HuntState {
  const safe = Math.max(0, Math.min(HUNT_LEVELS.length - 1, levelIndex));
  const level = huntLevel(safe);
  return {
    phase: "playing",
    levelIndex: safe,
    score,
    found: [],
    selected: null,
    hint: null,
    toast: level.blurb,
    toastMs: 1800,
    elapsedMs: 0,
  };
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
  const level = huntLevel(next.levelIndex);
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
  if (input.drag) {
    const start = cellAt(input.x, input.y, level.size);
    const end = cellAt(input.x2, input.y2, level.size);
    if (!start || !end) return next;
    const cells = lineBetween(start, end, level.size);
    if (!cells) {
      next.toast = "Look again.";
      next.toastMs = 700;
      next.selected = null;
      return next;
    }
    mark(next, level, cells);
    return next;
  }
  if (!input.tap) return next;
  const cell = cellAt(input.x, input.y, level.size);
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
  const cells = lineBetween(next.selected, cell, level.size);
  if (!cells) {
    next.selected = cell;
    return next;
  }
  mark(next, level, cells);
  return next;
}

export function advanceHunt(state: HuntState): HuntState {
  if (state.phase === "done") return createHunt(0, 0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= HUNT_LEVELS.length - 1) {
    const done = structuredClone(state);
    done.phase = "done";
    done.toast = "You finished all 5 levels.";
    done.toastMs = 0;
    return done;
  }
  return createHunt(state.levelIndex + 1, state.score);
}
