import { describe, expect, it } from "vitest";
import { BURST_LEVELS, COLS, GRID_X, GRID_Y, ROWS, TILE } from "../src/burst/levels";
import { advanceBurst, blankBurstInput, cellAt, createBurst, tickBurst, type BurstState, type Cell } from "../src/burst/sim";

function at(x: number, y: number): { x: number; y: number } {
  return { x: GRID_X + x * TILE + 8, y: GRID_Y + y * TILE + 8 };
}

function tap(state: BurstState, x: number, y: number): BurstState {
  const point = at(x, y);
  return tickBurst(state, { ...blankBurstInput(), tap: true, x: point.x, y: point.y }, 16);
}

function settle(state: BurstState): BurstState {
  for (let i = 0; i < 80 && state.status !== "idle" && state.phase === "playing"; i += 1) {
    state = tickBurst(state, blankBurstInput(), 50);
  }
  return state;
}

function paint(state: BurstState, rows: string[]): BurstState {
  const next = structuredClone(state);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const kind = (x + y * 2) % 5;
      next.board[y][x] = { tile: { kind, special: "none", fromY: y }, jelly: false };
    }
  }
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const cell: Cell = next.board[y][x];
      if (ch === "j") {
        cell.jelly = true;
        return;
      }
      const special = ch === "R" ? "row" : ch === "C" ? "col" : ch === "B" ? "burst" : "none";
      const kind = special === "none" ? Number(ch) : 1;
      cell.tile = { kind, special, fromY: y };
    });
  });
  return next;
}

describe("berry burst", () => {
  it("has fifteen gardens, with ten harder ones after Orchard Goal", () => {
    expect(BURST_LEVELS.map((level) => level.name)).toEqual([
      "Sunny Patch",
      "Berry Basket",
      "Lemon Lane",
      "Jelly Middles",
      "Orchard Goal",
      "Leaf Rows",
      "Orange Grove",
      "Twin Baskets",
      "Jelly Frame",
      "Corner Patch",
      "High Score",
      "Color Trio",
      "Jelly Rows",
      "Busy Garden",
      "Night Harvest",
    ]);
    expect(BURST_LEVELS.slice(0, 5).map((level) => level.moves)).toEqual([22, 24, 24, 26, 28]);
    expect(BURST_LEVELS[1].pops[0]).toBe(10);
    expect(BURST_LEVELS[3].jelly.length).toBe(12);
    expect(BURST_LEVELS[4].jelly.length).toBe(6);
    const harder = BURST_LEVELS.slice(5);
    expect(harder).toHaveLength(10);
    for (const level of harder) {
      const goals = (level.scoreNeed > 0 ? 1 : 0) + level.pops.filter((need) => need > 0).length + (level.jelly.length > 0 ? 1 : 0);
      expect(goals, level.name).toBeGreaterThanOrEqual(1);
      expect(level.moves, level.name).toBeGreaterThan(24);
    }
    expect(harder.some((level) => level.jelly.length >= 24)).toBe(true);
    expect(harder.some((level) => level.pops.filter((need) => need > 0).length >= 2)).toBe(true);
    expect(harder.some((level) => level.scoreNeed >= 800)).toBe(true);
    const finale = harder[harder.length - 1];
    expect(finale.scoreNeed).toBeGreaterThan(0);
    expect(finale.jelly.length).toBeGreaterThan(0);
    expect(finale.pops.some((need) => need > 0)).toBe(true);
    const start = createBurst(0);
    expect(start.movesLeft).toBe(22);
    expect(start.board).toHaveLength(ROWS);
    expect(start.board[0]).toHaveLength(COLS);
    expect(start.toast).toBe("Match three. Score 300.");
    expect(cellAt(GRID_X + 3, GRID_Y + 3)).toEqual({ x: 0, y: 0 });
    expect(cellAt(0, 0)).toBeNull();
  });

  it("pops a line of three and leaves the old state alone", () => {
    const start = paint(createBurst(0), ["1102201", "..1...."]);
    const before = structuredClone(start);
    let state = tap(start, 2, 1);
    state = tap(state, 2, 0);
    expect(start.board[0][2].tile?.kind).toBe(before.board[0][2].tile?.kind);
    expect(state.status).toBe("clearing");
    expect(state.movesLeft).toBe(21);
    expect(state.gained).toBe(60);
    expect(state.clearing).toHaveLength(3);
    expect(tickBurst(state, blankBurstInput(), 1000).elapsedMs - state.elapsedMs).toBe(50);
    state = settle(state);
    expect(state.status).toBe("idle");
    expect(state.board.every((row) => row.every((cell) => cell.tile))).toBe(true);
  });

  it("puts a swapped pair back when it makes no line", () => {
    const start = paint(createBurst(0), []);
    const kind = start.board[0][0].tile?.kind;
    let state = tap(start, 0, 0);
    state = tap(state, 1, 0);
    expect(state.movesLeft).toBe(22);
    expect(state.status).toBe("idle");
    expect(state.toast).toBe("Try a different pair.");
    expect(state.board[0][0].tile?.kind).toBe(kind);
  });

  it("makes a striped berry from four in a row", () => {
    const start = paint(createBurst(0), ["1101201", "..1...."]);
    let state = tap(start, 2, 1);
    state = tap(state, 2, 0);
    expect(state.spawns).toEqual([expect.objectContaining({ x: 2, y: 0, kind: 1, special: "row" })]);
    expect(state.gained).toBe(100);
    expect(state.movesLeft).toBe(21);
  });

  it("clears a whole row when a striped berry is swapped", () => {
    const start = paint(createBurst(0), ["R120120"]);
    let state = tap(start, 0, 0);
    state = tap(state, 1, 0);
    expect(state.movesLeft).toBe(21);
    expect(state.clearing.length).toBeGreaterThanOrEqual(COLS);
  });

  it("clears jelly, then finishes or asks you to try again", () => {
    let state = paint(createBurst(0), ["1102201", "..1...."]);
    state.board[0][0].jelly = true;
    state.board[0][1].jelly = true;
    state.gained = 240;
    state = tap(state, 2, 1);
    state = tap(state, 2, 0);
    expect(state.board[0][0].jelly).toBe(false);
    expect(state.board[0][1].jelly).toBe(false);
    state = settle(state);
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    expect(state.gained).toBeGreaterThanOrEqual(240 + 60 + 200);

    state = paint(createBurst(1), ["1102201", "..1...."]);
    state.movesLeft = 1;
    state = settle(tap(tap(state, 2, 1), 2, 0));
    expect(state.phase).toBe("retry");
    expect(state.toast).toBe("Try again.");
    const banked = state.score - state.gained;
    state = advanceBurst(state);
    expect(state.levelIndex).toBe(1);
    expect(state.score).toBe(banked);
    expect(state.movesLeft).toBe(24);
    expect(state.phase).toBe("playing");
  });

  it("carries the score through the last garden", () => {
    const last = BURST_LEVELS.length - 1;
    const level = BURST_LEVELS[last];
    let state = paint(createBurst(last, 80), ["1102201", "..1...."]);
    state.gained = level.scoreNeed;
    state.popped = [...level.pops];
    state = settle(tap(tap(state, 2, 1), 2, 0));
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    state = advanceBurst(state);
    expect(state.phase).toBe("done");
    expect(state.toast).toBe("You finished all 15 levels.");
    expect(state.score).toBeGreaterThanOrEqual(80);
    state = advanceBurst(state);
    expect(state.levelIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(advanceBurst(createBurst(0)).phase).toBe("playing");
  });

  it("can clear every harder garden by aiming at the goals", () => {
    const solved = BURST_LEVELS.slice(5).map((_, offset) => clearGarden(offset + 5));
    for (const result of solved) {
      expect(result.phase, result.name).toBe("clear");
      expect(result.movesLeft, result.name).toBeGreaterThan(0);
    }
  });
});

function clearGarden(index: number): { name: string; phase: string; movesLeft: number } {
  let state = createBurst(index);
  let guard = 0;
  while (state.phase === "playing" && guard < BURST_LEVELS[index].moves) {
    const next = strongestMove(state);
    if (!next) break;
    state = next;
    guard += 1;
  }
  return { name: BURST_LEVELS[index].name, phase: state.phase, movesLeft: state.movesLeft };
}

function playMove(state: BurstState, ax: number, ay: number, bx: number, by: number): BurstState {
  let next = tap(state, ax, ay);
  next = tap(next, bx, by);
  for (let i = 0; i < 400 && next.status !== "idle" && next.phase === "playing"; i += 1) next = tickBurst(next, blankBurstInput(), 50);
  return next;
}

function progress(state: BurstState): number {
  const level = BURST_LEVELS[state.levelIndex];
  if (state.phase === "clear") return 1_000_000 + state.movesLeft;
  let score = Math.min(state.gained, level.scoreNeed);
  level.pops.forEach((need, kind) => {
    if (need > 0) score += Math.min(state.popped[kind], need) * 40;
  });
  const jelly = state.board.reduce((sum, row) => sum + row.filter((cell) => cell.jelly).length, 0);
  return score + (level.jelly.length - jelly) * 30 + state.gained * 0.1;
}

function strongestMove(state: BurstState): BurstState | null {
  let winner: BurstState | null = null;
  let best = -1;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const neighbors = x + 1 < COLS ? [[x + 1, y]] : [];
      if (y + 1 < ROWS) neighbors.push([x, y + 1]);
      for (const [bx, by] of neighbors) {
        const next = playMove(state, x, y, bx, by);
        if (next.movesLeft === state.movesLeft && next.phase === "playing") continue;
        const worth = progress(next);
        if (worth > best) {
          best = worth;
          winner = next;
        }
      }
    }
  }
  return winner;
}
