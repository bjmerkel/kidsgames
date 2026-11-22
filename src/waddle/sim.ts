import { ICE_LEVELS, iceLevel } from "./mazes";

export type WaddlePhase = "playing" | "paused" | "clear" | "retry" | "done";

export type WaddleInput = {
  dx: number;
  dy: number;
  pause: boolean;
  confirm: boolean;
};

export type Dir = { x: number; y: number };

export type Penguin = {
  tx: number;
  ty: number;
  prevX: number;
  prevY: number;
  dir: Dir;
  next: Dir;
  moveMs: number;
};

export type Seal = {
  tx: number;
  ty: number;
  prevX: number;
  prevY: number;
  homeX: number;
  homeY: number;
  dir: Dir;
  moveMs: number;
  scaredMs: number;
  homeMs: number;
};

export type WaddleState = {
  phase: WaddlePhase;
  levelIndex: number;
  elapsedMs: number;
  score: number;
  lives: number;
  maze: string[];
  pelletsLeft: number;
  penguin: Penguin;
  seals: Seal[];
  toast: string;
  toastMs: number;
};

export const TILE = 32;
export const PLAYER_STEP = 140;
const LIVES = 3;
const ORDER: Dir[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
];

export function blankWaddleInput(): WaddleInput {
  return { dx: 0, dy: 0, pause: false, confirm: false };
}

function cell(maze: string[], x: number, y: number): string {
  if (y < 0 || x < 0 || y >= maze.length || x >= maze[y].length) return "#";
  return maze[y][x];
}

function setCell(maze: string[], x: number, y: number, value: string): void {
  const row = maze[y];
  maze[y] = row.slice(0, x) + value + row.slice(x + 1);
}

function openDir(maze: string[], x: number, y: number, dir: Dir): boolean {
  return cell(maze, x + dir.x, y + dir.y) !== "#";
}

function wanted(input: WaddleInput): Dir | null {
  const dx = Math.max(-1, Math.min(1, input.dx));
  const dy = Math.max(-1, Math.min(1, input.dy));
  if (dx !== 0) return { x: dx, y: 0 };
  if (dy !== 0) return { x: 0, y: dy };
  return null;
}

function sameDir(a: Dir, b: Dir): boolean {
  return a.x === b.x && a.y === b.y;
}

function countPellets(maze: string[]): number {
  return maze.join("").split("").filter((ch) => ch === "." || ch === "o").length;
}

export function createWaddle(levelIndex = 0, score = 0): WaddleState {
  const index = Math.max(0, Math.min(ICE_LEVELS.length - 1, levelIndex));
  const level = ICE_LEVELS[index];
  const maze = level.rows.map((row) => row);
  let penguin: Penguin | null = null;
  const seals: Seal[] = [];
  maze.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === "P") {
        penguin = { tx: x, ty: y, prevX: x, prevY: y, dir: { x: 0, y: 0 }, next: { x: 0, y: 0 }, moveMs: 0 };
        setCell(maze, x, y, " ");
      }
      if (ch === "S") {
        seals.push({
          tx: x,
          ty: y,
          prevX: x,
          prevY: y,
          homeX: x,
          homeY: y,
          dir: { x: 0, y: 0 },
          moveMs: 0,
          scaredMs: 0,
          homeMs: 0,
        });
        setCell(maze, x, y, " ");
      }
    }
  });
  if (!penguin) throw new Error("maze is missing a penguin");
  return {
    phase: "playing",
    levelIndex: index,
    elapsedMs: 0,
    score,
    lives: LIVES,
    maze,
    pelletsLeft: countPellets(maze),
    penguin,
    seals,
    toast: level.blurb,
    toastMs: 2200,
  };
}

function eat(state: WaddleState): void {
  const { tx, ty } = state.penguin;
  const here = cell(state.maze, tx, ty);
  if (here === ".") {
    setCell(state.maze, tx, ty, " ");
    state.score += 10;
    state.pelletsLeft -= 1;
  }
  if (here === "o") {
    setCell(state.maze, tx, ty, " ");
    state.score += 50;
    state.pelletsLeft -= 1;
    const scare = iceLevel(state.levelIndex).scareMs;
    for (const seal of state.seals) {
      if (seal.homeMs > 0) continue;
      seal.scaredMs = scare;
    }
    state.toast = "The seals are sleepy!";
    state.toastMs = 1400;
  }
}

function stepPenguin(state: WaddleState): void {
  const penguin = state.penguin;
  const next = penguin.next;
  let dir = penguin.dir;
  if ((next.x || next.y) && openDir(state.maze, penguin.tx, penguin.ty, next)) dir = next;
  if (!(dir.x || dir.y) || !openDir(state.maze, penguin.tx, penguin.ty, dir)) {
    penguin.dir = { x: 0, y: 0 };
    penguin.prevX = penguin.tx;
    penguin.prevY = penguin.ty;
    return;
  }
  penguin.prevX = penguin.tx;
  penguin.prevY = penguin.ty;
  penguin.tx += dir.x;
  penguin.ty += dir.y;
  penguin.dir = dir;
}

function chooseSealDir(state: WaddleState, seal: Seal): Dir {
  const reverse = { x: -seal.dir.x, y: -seal.dir.y };
  let choices = ORDER.filter((dir) => openDir(state.maze, seal.tx, seal.ty, dir) && !sameDir(dir, reverse));
  if (choices.length === 0) choices = ORDER.filter((dir) => openDir(state.maze, seal.tx, seal.ty, dir));
  if (choices.length === 0) return { x: 0, y: 0 };
  const flee = seal.scaredMs > 0;
  let best = choices[0];
  let bestScore = flee ? -1 : 999;
  for (const dir of choices) {
    const score = Math.abs(seal.tx + dir.x - state.penguin.tx) + Math.abs(seal.ty + dir.y - state.penguin.ty);
    if (flee ? score > bestScore : score < bestScore) {
      best = dir;
      bestScore = score;
    }
  }
  return best;
}

function stepSeal(state: WaddleState, seal: Seal): void {
  const dir = chooseSealDir(state, seal);
  seal.prevX = seal.tx;
  seal.prevY = seal.ty;
  if (!dir.x && !dir.y) {
    seal.dir = dir;
    return;
  }
  seal.tx += dir.x;
  seal.ty += dir.y;
  seal.dir = dir;
}

function caught(before: WaddleState, state: WaddleState, seal: Seal, index: number): boolean {
  if (seal.homeMs > 0) return false;
  if (seal.tx === state.penguin.tx && seal.ty === state.penguin.ty) return true;
  const prev = before.seals[index];
  return prev.tx === state.penguin.tx && prev.ty === state.penguin.ty && seal.tx === before.penguin.tx && seal.ty === before.penguin.ty;
}

function tagSeal(state: WaddleState, seal: Seal): void {
  seal.tx = seal.homeX;
  seal.ty = seal.homeY;
  seal.prevX = seal.homeX;
  seal.prevY = seal.homeY;
  seal.dir = { x: 0, y: 0 };
  seal.scaredMs = 0;
  seal.homeMs = 2200;
  seal.moveMs = 0;
  state.score += 200;
  state.toast = "Home run!";
  state.toastMs = 900;
}

function hurt(state: WaddleState): void {
  state.lives -= 1;
  state.toast = "Try again.";
  state.toastMs = state.lives > 0 ? 1000 : 0;
  if (state.lives <= 0) {
    state.phase = "retry";
    return;
  }
  const fresh = createWaddle(state.levelIndex);
  state.penguin.tx = fresh.penguin.tx;
  state.penguin.ty = fresh.penguin.ty;
  state.penguin.prevX = fresh.penguin.tx;
  state.penguin.prevY = fresh.penguin.ty;
  state.penguin.dir = { x: 0, y: 0 };
  state.penguin.next = { x: 0, y: 0 };
  state.penguin.moveMs = 0;
  state.seals.forEach((seal, index) => {
    const home = fresh.seals[index];
    seal.tx = home.homeX;
    seal.ty = home.homeY;
    seal.prevX = home.homeX;
    seal.prevY = home.homeY;
    seal.dir = { x: 0, y: 0 };
    seal.moveMs = 0;
    seal.scaredMs = 0;
    seal.homeMs = 0;
  });
}

export function tickWaddle(state: WaddleState, input: WaddleInput, dtMs: number): WaddleState {
  const step = Math.max(0, Math.min(50, dtMs));
  const next = structuredClone(state);
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "paused" ? "playing" : "paused";
    return next;
  }
  if (next.phase !== "playing") return next;

  const level = iceLevel(next.levelIndex);
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  for (const seal of next.seals) {
    seal.scaredMs = Math.max(0, seal.scaredMs - step);
    seal.homeMs = Math.max(0, seal.homeMs - step);
  }

  const wish = wanted(input);
  if (wish) next.penguin.next = wish;
  eat(next);
  next.penguin.moveMs += step;
  if (next.penguin.moveMs >= PLAYER_STEP) {
    next.penguin.moveMs -= PLAYER_STEP;
    stepPenguin(next);
    eat(next);
  }

  for (const seal of next.seals) {
    if (seal.homeMs > 0) continue;
    seal.moveMs += step;
    const pace = seal.scaredMs > 0 ? 280 : level.sealStep;
    if (seal.moveMs >= pace) {
      seal.moveMs -= pace;
      stepSeal(next, seal);
    }
  }

  if (next.phase === "playing") {
    for (let i = 0; i < next.seals.length; i += 1) {
      const seal = next.seals[i];
      if (!caught(state, next, seal, i)) continue;
      if (seal.scaredMs > 0) tagSeal(next, seal);
      else {
        hurt(next);
        break;
      }
    }
  }

  if (next.phase === "playing" && next.pelletsLeft <= 0) {
    next.phase = "clear";
    next.score += 500;
    next.toast = "You finished the level!";
    next.toastMs = 0;
  }
  return next;
}

export function advanceWaddle(state: WaddleState): WaddleState {
  if (state.phase === "retry") return createWaddle(state.levelIndex, state.score);
  if (state.phase === "clear" && state.levelIndex < ICE_LEVELS.length - 1) return createWaddle(state.levelIndex + 1, state.score);
  if (state.phase === "clear") {
    const next = structuredClone(state);
    next.phase = "done";
    next.toast = "You finished all 5 levels.";
    return next;
  }
  if (state.phase === "done") return createWaddle(0);
  return structuredClone(state);
}
