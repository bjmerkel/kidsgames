import { describe, expect, it } from "vitest";
import { ROOF_LEVELS, roofLevel, type Mover } from "../src/rascal/levels";
import { blankRascalInput, createRascal, tickRascal, type RascalState } from "../src/rascal/sim";

const STEP = 1000 / 60;

type Solid = { x: number; y: number; w: number; h: number };

function moverX(mover: Mover, elapsedMs: number): number {
  return mover.origin + Math.sin(elapsedMs / 900 + mover.phase) * mover.span;
}

function solids(levelIndex: number, elapsedMs: number): Solid[] {
  const level = roofLevel(levelIndex);
  return [
    ...level.platforms,
    ...level.movers.map((mover) => ({ x: moverX(mover, elapsedMs), y: mover.y, w: mover.w, h: mover.h })),
  ];
}

function supported(rows: Solid[], x: number, footY: number): boolean {
  return rows.some((solid) => x >= solid.x && x <= solid.x + solid.w && Math.abs(solid.y - footY) <= 14);
}

function landingAhead(rows: Solid[], right: number, footY: number): boolean {
  return rows.some((solid) => {
    const ahead = solid.x + solid.w > right - 4 && solid.x <= right + 92;
    const rise = footY - solid.y;
    return ahead && rise <= 95 && rise >= -420;
  });
}

function play(levelIndex: number): RascalState {
  let state = createRascal(levelIndex);
  for (let frame = 0; frame < 2800 && state.phase === "playing" && state.lives > 0; frame += 1) {
    const level = roofLevel(levelIndex);
    const rows = solids(levelIndex, state.elapsedMs);
    const right = state.player.x + state.player.w;
    const foot = state.player.y + state.player.h;
    const continues = supported(rows, right + 18, foot);
    const landing = landingAhead(rows, right, foot);
    const centerX = state.player.x + state.player.w / 2;
    const centerY = state.player.y + state.player.h / 2;
    let hook: { x: number; y: number } | null = null;
    let hookDist = 430;
    for (const web of level.webs) {
      if (web.y > centerY + 8) continue;
      const dist = Math.hypot(web.x - centerX, web.y - centerY);
      if (dist < hookDist) {
        hook = web;
        hookDist = dist;
      }
    }
    const hookAhead = hook != null && hook.x > state.player.x + 36;
    const bugAhead = state.bugs.some((bug) => !bug.gone && bug.x > state.player.x + 8 && bug.x < state.player.x + 78 && Math.abs(bug.y - state.player.y) < 60);
    const edge = state.grounded && !continues;
    const jump = state.grounded && ((edge && (landing || hookAhead)) || (continues && bugAhead));
    const web = !state.grounded && state.perchMs <= 0 && state.zip == null && !landing && hookAhead;
    const dx = edge && !landing && !hookAhead ? 0 : 1;
    state = tickRascal(state, { ...blankRascalInput(), dx, jump, jumpHeld: true, web }, STEP);
  }
  return state;
}

describe("new rascal roofs", () => {
  it("can be finished by running, jumping, and swinging", () => {
    const reports = ROOF_LEVELS.slice(5).map((level, index) => {
      const state = play(index + 5);
      return `${level.name} phase=${state.phase} x=${Math.round(state.player.x)} lives=${state.lives}`;
    });
    const stuck = reports.filter((line) => !line.includes("phase=clear"));
    expect(stuck, stuck.join("\n")).toEqual([]);
  });
});
