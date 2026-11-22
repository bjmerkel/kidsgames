import { BURST_LEVELS, COLS, GRID_X, GRID_Y, KINDS, ROWS, TILE, burstLevel } from "./levels";

export type Special = "none" | "row" | "col" | "wrap" | "burst";

export type Tile = {
  kind: number;
  special: Special;
  fromY: number;
};

export type Cell = {
  tile: Tile | null;
  jelly: boolean;
};

export type BurstPhase = "playing" | "paused" | "clear" | "retry" | "done";
export type BoardStatus = "idle" | "clearing" | "falling";

export type BurstInput = {
  tap: boolean;
  x: number;
  y: number;
  pause: boolean;
  confirm: boolean;
  hint: boolean;
};

export type Point = { x: number; y: number };

type Spawn = Point & { kind: number; special: Special };

type Group = { horizontal: boolean; kind: number; cells: Point[] };

export type BurstState = {
  phase: BurstPhase;
  status: BoardStatus;
  levelIndex: number;
  score: number;
  gained: number;
  movesLeft: number;
  popped: number[];
  board: Cell[][];
  selected: Point | null;
  hint: Point[] | null;
  clearing: Point[];
  spawns: Spawn[];
  toast: string;
  toastMs: number;
  waitMs: number;
  seed: number;
  cascade: number;
  elapsedMs: number;
};

const CLEAR_MS = 180;
const FALL_MS = 160;
const CLEAR_BONUS = 200;
const RANK: Record<Special, number> = { none: 0, row: 1, col: 1, wrap: 2, burst: 3 };

export function blankBurstInput(): BurstInput {
  return { tap: false, x: 0, y: 0, pause: false, confirm: false, hint: false };
}

export function cellAt(px: number, py: number): Point | null {
  const x = Math.floor((px - GRID_X) / TILE);
  const y = Math.floor((py - GRID_Y) / TILE);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
  return { x, y };
}

function nextUnit(state: BurstState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function roll(state: BurstState): number {
  return Math.floor(nextUnit(state) * KINDS.length);
}

function randBelow(state: BurstState, count: number): number {
  return Math.floor(nextUnit(state) * count);
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function sameKind(board: Cell[][], x: number, y: number, kind: number): boolean {
  const tile = board[y]?.[x]?.tile;
  return !!tile && tile.kind === kind;
}

function pickKind(state: BurstState, board: Cell[][], x: number, y: number): number {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const kind = roll(state);
    const left = x >= 2 && sameKind(board, x - 1, y, kind) && sameKind(board, x - 2, y, kind);
    const up = y >= 2 && sameKind(board, x, y - 1, kind) && sameKind(board, x, y - 2, kind);
    if (!left && !up) return kind;
  }
  return roll(state);
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ tile: null, jelly: false })));
}

function writeTile(cell: Cell, kind: number, special: Special, fromY: number): void {
  cell.tile = { kind, special, fromY };
}

export function createBurst(levelIndex = 0, score = 0): BurstState {
  const safe = Math.max(0, Math.min(BURST_LEVELS.length - 1, levelIndex));
  const level = burstLevel(safe);
  const state: BurstState = {
    phase: "playing",
    status: "idle",
    levelIndex: safe,
    score,
    gained: 0,
    movesLeft: level.moves,
    popped: [0, 0, 0, 0, 0],
    board: emptyBoard(),
    selected: null,
    hint: null,
    clearing: [],
    spawns: [],
    toast: level.blurb,
    toastMs: 1800,
    waitMs: 0,
    seed: 10007 + safe * 97,
    cascade: 1,
    elapsedMs: 0,
  };
  for (const jelly of level.jelly) state.board[jelly.y][jelly.x].jelly = true;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) writeTile(state.board[y][x], pickKind(state, state.board, x, y), "none", y);
  }
  if (findGroups(state.board).length > 0 || !hasMove(state.board)) reshuffle(state);
  return state;
}

function findGroups(board: Cell[][]): Group[] {
  const groups: Group[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    let x = 0;
    while (x < COLS) {
      const tile = board[y][x].tile;
      if (!tile) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < COLS && board[y][end].tile?.kind === tile.kind) end += 1;
      if (end - x >= 3) {
        const cells = [];
        for (let i = x; i < end; i += 1) cells.push({ x: i, y });
        groups.push({ horizontal: true, kind: tile.kind, cells });
      }
      x = Math.max(end, x + 1);
    }
  }
  for (let x = 0; x < COLS; x += 1) {
    let y = 0;
    while (y < ROWS) {
      const tile = board[y][x].tile;
      if (!tile) {
        y += 1;
        continue;
      }
      let end = y + 1;
      while (end < ROWS && board[end][x].tile?.kind === tile.kind) end += 1;
      if (end - y >= 3) {
        const cells = [];
        for (let i = y; i < end; i += 1) cells.push({ x, y: i });
        groups.push({ horizontal: false, kind: tile.kind, cells });
      }
      y = Math.max(end, y + 1);
    }
  }
  return groups;
}

function hasMove(board: Cell[][]): boolean {
  const tryPair = (ax: number, ay: number, bx: number, by: number): boolean => {
    const a = board[ay][ax].tile;
    const b = board[by][bx].tile;
    if (!a || !b) return false;
    if (a.special !== "none" || b.special !== "none") return true;
    board[ay][ax].tile = b;
    board[by][bx].tile = a;
    const matched = findGroups(board).length > 0;
    board[ay][ax].tile = a;
    board[by][bx].tile = b;
    return matched;
  };
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (x + 1 < COLS && tryPair(x, y, x + 1, y)) return true;
      if (y + 1 < ROWS && tryPair(x, y, x, y + 1)) return true;
    }
  }
  return false;
}

function findMove(board: Cell[][]): Point[] | null {
  const pairs: Point[][] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (x + 1 < COLS) pairs.push([{ x, y }, { x: x + 1, y }]);
      if (y + 1 < ROWS) pairs.push([{ x, y }, { x, y: y + 1 }]);
    }
  }
  for (const pair of pairs) {
    const [a, b] = pair;
    const ta = board[a.y][a.x].tile;
    const tb = board[b.y][b.x].tile;
    if (!ta || !tb) continue;
    if (ta.special !== "none" || tb.special !== "none") return pair;
    board[a.y][a.x].tile = tb;
    board[b.y][b.x].tile = ta;
    const matched = findGroups(board).length > 0;
    board[a.y][a.x].tile = ta;
    board[b.y][b.x].tile = tb;
    if (matched) return pair;
  }
  return null;
}

function goalMet(state: BurstState): boolean {
  const level = burstLevel(state.levelIndex);
  if (state.gained < level.scoreNeed) return false;
  for (let i = 0; i < level.pops.length; i += 1) if (state.popped[i] < level.pops[i]) return false;
  return state.board.every((row) => row.every((cell) => !cell.jelly));
}

function cellsOf(tile: Tile, x: number, y: number, board: Cell[][]): Point[] {
  const hits: Point[] = [];
  if (tile.special === "row") {
    for (let cx = 0; cx < COLS; cx += 1) hits.push({ x: cx, y });
  } else if (tile.special === "col") {
    for (let cy = 0; cy < ROWS; cy += 1) hits.push({ x, y: cy });
  } else if (tile.special === "wrap") {
    for (let cy = y - 1; cy <= y + 1; cy += 1) {
      for (let cx = x - 1; cx <= x + 1; cx += 1) if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) hits.push({ x: cx, y: cy });
    }
  } else if (tile.special === "burst") {
    for (let cy = 0; cy < ROWS; cy += 1) {
      for (let cx = 0; cx < COLS; cx += 1) if (board[cy][cx].tile?.kind === tile.kind) hits.push({ x: cx, y: cy });
    }
  }
  return hits;
}

function planClear(board: Cell[][], preferred: Point[], forced: Point[]): { cells: Point[]; spawns: Spawn[] } {
  const groups = findGroups(board);
  const member = new Map<string, Group[]>();
  for (const group of groups) {
    for (const cell of group.cells) {
      const list = member.get(keyOf(cell.x, cell.y)) ?? [];
      list.push(group);
      member.set(keyOf(cell.x, cell.y), list);
    }
  }
  const spawns = new Map<string, Spawn>();
  const offer = (x: number, y: number, kind: number, special: Special) => {
    if (special === "none") return;
    const key = keyOf(x, y);
    const prev = spawns.get(key);
    if (!prev || RANK[special] > RANK[prev.special]) spawns.set(key, { x, y, kind, special });
  };
  const anchor = (group: Group): Point => {
    for (const spot of preferred) if (group.cells.some((cell) => cell.x === spot.x && cell.y === spot.y)) return spot;
    return group.cells[Math.floor((group.cells.length - 1) / 2)];
  };
  for (const group of groups) {
    if (group.cells.length >= 5) {
      const at = anchor(group);
      offer(at.x, at.y, group.kind, "burst");
    } else if (group.cells.length === 4) {
      const at = anchor(group);
      offer(at.x, at.y, group.kind, group.horizontal ? "row" : "col");
    }
  }
  for (const [key, groupsHere] of member) {
    if (groupsHere.length < 2) continue;
    const longest = Math.max(...groupsHere.map((group) => group.cells.length));
    if (longest >= 4) continue;
    const [x, y] = key.split(",").map(Number);
    offer(x, y, groupsHere[0].kind, "wrap");
  }
  const doomed = new Set<string>();
  for (const group of groups) for (const cell of group.cells) doomed.add(keyOf(cell.x, cell.y));
  for (const spot of forced) doomed.add(keyOf(spot.x, spot.y));
  for (const spawn of spawns.values()) doomed.delete(keyOf(spawn.x, spawn.y));
  const queue: Point[] = [];
  const seen = new Set<string>();
  const consider = (x: number, y: number) => {
    const id = keyOf(x, y);
    if (!doomed.has(id) || seen.has(id)) return;
    const tile = board[y][x].tile;
    if (!tile || tile.special === "none") return;
    seen.add(id);
    queue.push({ x, y });
  };
  for (const id of doomed) {
    const [x, y] = id.split(",").map(Number);
    consider(x, y);
  }
  while (queue.length) {
    const spot = queue.shift();
    if (!spot) break;
    const tile = board[spot.y][spot.x].tile;
    if (!tile) continue;
    for (const hit of cellsOf(tile, spot.x, spot.y, board)) {
      const id = keyOf(hit.x, hit.y);
      if (spawns.has(id)) continue;
      if (!doomed.has(id)) {
        doomed.add(id);
        consider(hit.x, hit.y);
      }
    }
  }
  return {
    cells: [...doomed].map((id) => {
      const [x, y] = id.split(",").map(Number);
      return { x, y };
    }),
    spawns: [...spawns.values()],
  };
}

function beginClear(state: BurstState, preferred: Point[], forced: Point[]): void {
  const plan = planClear(state.board, preferred, forced);
  if (plan.cells.length === 0 && plan.spawns.length === 0) {
    state.status = "idle";
    state.waitMs = 0;
    return;
  }
  let points = plan.cells.length * 20 * state.cascade + plan.spawns.length * 40;
  state.gained += points;
  state.score += points;
  for (const cell of plan.cells) {
    const tile = state.board[cell.y][cell.x].tile;
    if (tile) state.popped[tile.kind] += 1;
    if (state.board[cell.y][cell.x].jelly) state.board[cell.y][cell.x].jelly = false;
  }
  state.clearing = plan.cells;
  state.spawns = plan.spawns;
  state.status = "clearing";
  state.waitMs = CLEAR_MS;
}

function finishClear(state: BurstState): void {
  for (const cell of state.clearing) state.board[cell.y][cell.x].tile = null;
  for (const spawn of state.spawns) writeTile(state.board[spawn.y][spawn.x], spawn.kind, spawn.special, spawn.y);
  for (let x = 0; x < COLS; x += 1) {
    const kept: { tile: Tile; fromY: number }[] = [];
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      const tile = state.board[y][x].tile;
      if (tile) kept.push({ tile, fromY: y });
    }
    const holes = ROWS - kept.length;
    for (let i = 0; i < kept.length; i += 1) {
      const dest = ROWS - 1 - i;
      const tile = kept[i].tile;
      tile.fromY = kept[i].fromY;
      state.board[dest][x].tile = tile;
    }
    for (let y = holes - 1; y >= 0; y -= 1) writeTile(state.board[y][x], roll(state), "none", y - holes);
  }
  state.clearing = [];
  state.spawns = [];
  state.status = "falling";
  state.waitMs = FALL_MS;
}

function finishFall(state: BurstState): void {
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
    const tile = state.board[y][x].tile;
    if (tile) tile.fromY = y;
  }
  if (findGroups(state.board).length > 0 && state.cascade < 12) {
    state.cascade += 1;
    beginClear(state, [], []);
    return;
  }
  state.status = "idle";
  state.cascade = 1;
  if (goalMet(state)) {
    state.score += CLEAR_BONUS;
    state.gained += CLEAR_BONUS;
    state.phase = "clear";
    state.toast = "You finished the level!";
    state.toastMs = 0;
    return;
  }
  if (state.movesLeft <= 0) {
    state.phase = "retry";
    state.toast = "Try again.";
    state.toastMs = 0;
    return;
  }
  if (!hasMove(state.board)) {
    reshuffle(state);
    state.toast = "The berries shuffled.";
    state.toastMs = 900;
  }
}

function reshuffle(state: BurstState): void {
  const tiles: Tile[] = [];
  for (const row of state.board) for (const cell of row) if (cell.tile) tiles.push(cell.tile);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (let i = tiles.length - 1; i > 0; i -= 1) {
      const j = randBelow(state, i + 1);
      const swap = tiles[i];
      tiles[i] = tiles[j];
      tiles[j] = swap;
    }
    let n = 0;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const tile = tiles[n];
        n += 1;
        if (tile) {
          tile.special = "none";
          tile.fromY = y;
          state.board[y][x].tile = tile;
        }
      }
    }
    if (findGroups(state.board).length === 0 && hasMove(state.board)) return;
  }
  for (let extra = 0; extra < 8; extra += 1) {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) writeTile(state.board[y][x], pickKind(state, state.board, x, y), "none", y);
    }
    if (findGroups(state.board).length === 0 && hasMove(state.board)) return;
  }
}

function trySwap(state: BurstState, a: Point, b: Point): void {
  const from = state.board[a.y][a.x].tile;
  const to = state.board[b.y][b.x].tile;
  if (!from || !to) return;
  state.board[a.y][a.x].tile = to;
  state.board[b.y][b.x].tile = from;
  const special = from.special !== "none" || to.special !== "none";
  const matched = findGroups(state.board).length > 0;
  if (!special && !matched) {
    state.board[a.y][a.x].tile = from;
    state.board[b.y][b.x].tile = to;
    state.toast = "Try a different pair.";
    state.toastMs = 700;
    return;
  }
  state.movesLeft -= 1;
  state.cascade = 1;
  const forced = special ? [a, b].filter((spot) => state.board[spot.y][spot.x].tile?.special !== "none") : [];
  beginClear(state, [b, a], forced);
}

export function tickBurst(state: BurstState, input: BurstInput, dt: number): BurstState {
  const step = Math.max(0, Math.min(50, dt));
  const next = structuredClone(state);
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
  if (next.status !== "idle") {
    next.waitMs -= step;
    if (next.waitMs > 0) return next;
    if (next.status === "clearing") finishClear(next);
    else finishFall(next);
    return next;
  }
  if (input.hint) {
    next.hint = findMove(next.board);
    next.toast = next.hint ? "Try the glowing berries." : "Look for three in a line.";
    next.toastMs = 900;
    return next;
  }
  if (!input.tap) return next;
  const cell = cellAt(input.x, input.y);
  if (!cell || !next.board[cell.y][cell.x].tile) return next;
  if (!next.selected) {
    next.selected = cell;
    return next;
  }
  if (next.selected.x === cell.x && next.selected.y === cell.y) {
    next.selected = null;
    return next;
  }
  const beside = Math.abs(next.selected.x - cell.x) + Math.abs(next.selected.y - cell.y) === 1;
  if (!beside) {
    next.selected = cell;
    return next;
  }
  const from = next.selected;
  next.selected = null;
  next.hint = null;
  trySwap(next, from, cell);
  return next;
}

export function advanceBurst(state: BurstState): BurstState {
  if (state.phase === "done") return createBurst(0, 0);
  if (state.phase === "retry") return createBurst(state.levelIndex, state.score - state.gained);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= BURST_LEVELS.length - 1) {
    const done = structuredClone(state);
    done.phase = "done";
    done.toast = `You finished all ${BURST_LEVELS.length} levels.`;
    done.toastMs = 0;
    return done;
  }
  return createBurst(state.levelIndex + 1, state.score);
}

function plural(name: string, count: number): string {
  if (count === 1) return name;
  if (name === "berry") return "berries";
  if (name === "leaf") return "leaves";
  return `${name}s`;
}

export function goalLine(state: BurstState): string {
  const level = burstLevel(state.levelIndex);
  const parts: string[] = [];
  if (level.scoreNeed > 0) parts.push(`${Math.max(0, level.scoreNeed - state.gained)} points`);
  level.pops.forEach((need, index) => {
    const left = Math.max(0, need - state.popped[index]);
    if (need > 0) parts.push(`${left} ${plural(KINDS[index], left)}`);
  });
  if (level.jelly.length > 0) {
    const left = state.board.reduce((sum, row) => sum + row.filter((cell) => cell.jelly).length, 0);
    parts.push(`${left} jelly`);
  }
  return parts.join(" · ") || "Match three";
}
