import { describe, expect, it } from "vitest";
import { GROUND_Y, JUNGLE_LEVELS } from "../src/capy/levels";
import { advanceCapy, blankCapyInput, createCapy, tickCapy, type CapyInput } from "../src/capy/sim";

const STEP = 1000 / 60;

function jump(extra: Partial<CapyInput> = {}): CapyInput {
  return { ...blankCapyInput(), jump: true, jumpHeld: true, ...extra };
}

describe("capy swing", () => {
  it("has 5 jungle levels with vines, logs, and a deeper last trail", () => {
    expect(JUNGLE_LEVELS.map((level) => level.name)).toEqual([
      "River Bend",
      "Two Vines",
      "Log Run",
      "Driftwood",
      "Deep Jungle",
    ]);
    expect(JUNGLE_LEVELS.map((level) => level.vines.length)).toEqual([1, 2, 1, 1, 2]);
    expect(JUNGLE_LEVELS[3].drifts.length).toBeGreaterThan(0);
    expect(JUNGLE_LEVELS[4].deep).toBe(true);
    for (const level of JUNGLE_LEVELS) {
      expect(level.logs.length).toBeGreaterThan(0);
      expect(level.pool.x).toBeGreaterThan(400);
      expect(level.vines.every((vine) => vine.landX > vine.x)).toBe(true);
    }
    for (let i = 1; i < JUNGLE_LEVELS.length; i += 1) {
      expect(JUNGLE_LEVELS[i].width).toBeGreaterThan(JUNGLE_LEVELS[i - 1].width);
    }
  });

  it("jumps, lands, and does not change the earlier state", () => {
    const before = createCapy(0);
    const rising = tickCapy(before, jump(), STEP);
    expect(before.vy).toBe(0);
    expect(before.player.y).toBe(GROUND_Y - before.player.h);
    expect(rising.vy).toBeLessThan(0);
    expect(rising.player.y).toBeLessThan(before.player.y);
    let state = rising;
    for (let i = 0; i < 80; i += 1) state = tickCapy(state, { ...blankCapyInput(), jumpHeld: true, dx: 1 }, STEP);
    expect(state.grounded).toBe(true);
    expect(state.player.y).toBe(GROUND_Y - state.player.h);
    const clamped = tickCapy(before, blankCapyInput(), 1000);
    expect(before.elapsedMs).toBe(0);
    expect(clamped.elapsedMs).toBe(50);
  });

  it("swings a vine across the river and falls in when it misses", () => {
    const vine = JUNGLE_LEVELS[0].vines[0];
    let state = createCapy(0);
    state.player.x = vine.x - 16;
    state.player.y = vine.top + 180;
    state.grounded = false;
    state.vy = 80;
    state = tickCapy(state, blankCapyInput(), STEP);
    expect(state.swing).not.toBeNull();
    for (let i = 0; i < 20 && state.swing; i += 1) state = tickCapy(state, blankCapyInput(), 50);
    expect(state.swing).toBeNull();
    expect(state.grounded).toBe(true);
    expect(state.player.x).toBeCloseTo(vine.landX, 0);
    expect(state.lives).toBe(3);

    let missed = createCapy(0);
    let fell = false;
    for (let i = 0; i < 180 && !fell; i += 1) {
      missed = tickCapy(missed, { ...blankCapyInput(), dx: 1 }, STEP);
      fell = missed.lives === 2;
    }
    expect(fell).toBe(true);
    expect(missed.player.x).toBe(JUNGLE_LEVELS[0].spawnX);
    expect(missed.toast).toBe("Try again.");
  });

  it("rolls a log into the capybara and sends it back to the bank", () => {
    const before = createCapy(0);
    const log = before.logs[0];
    before.player.x = log.x;
    before.player.y = GROUND_Y - before.player.h;
    const hurt = tickCapy(before, blankCapyInput(), STEP);
    expect(before.lives).toBe(3);
    expect(hurt.lives).toBe(2);
    expect(hurt.player.x).toBe(JUNGLE_LEVELS[0].spawnX);
    expect(hurt.phase).toBe("playing");
    hurt.invulnMs = 0;
    hurt.player.x = hurt.logs[0].x;
    hurt.player.y = GROUND_Y - hurt.player.h;
    const again = tickCapy(hurt, blankCapyInput(), STEP);
    again.invulnMs = 0;
    again.player.x = again.logs[0].x;
    again.player.y = GROUND_Y - again.player.h;
    const out = tickCapy(again, blankCapyInput(), STEP);
    expect(out.lives).toBe(0);
    expect(out.phase).toBe("retry");
    expect(out.toast).toBe("Try again.");
    out.score = 40;
    const retried = advanceCapy(out);
    expect(retried.levelIndex).toBe(0);
    expect(retried.lives).toBe(3);
    expect(retried.score).toBe(40);
  });

  it("picks up a mango, rides driftwood, and finishes at the pool", () => {
    const level = JUNGLE_LEVELS[0];
    const before = createCapy(0);
    before.player.x = level.mangoes[0].x - 10;
    const got = tickCapy(before, blankCapyInput(), STEP);
    expect(before.score).toBe(0);
    expect(before.mangoesGot[0]).toBe(false);
    expect(got.score).toBe(100);
    expect(got.mangoesGot[0]).toBe(true);

    let riding = createCapy(3);
    const pad = JUNGLE_LEVELS[3].drifts[0];
    riding.player.x = pad.origin;
    riding.player.y = pad.y - riding.player.h;
    riding.grounded = true;
    riding.support = 0;
    riding.supportX = pad.origin;
    const moved = tickCapy(riding, blankCapyInput(), 50);
    expect(moved.player.x).not.toBe(riding.player.x);

    let clear = createCapy(0);
    clear.player.x = level.pool.x;
    clear.player.y = level.pool.y;
    clear.score = 100;
    clear = tickCapy(clear, blankCapyInput(), STEP);
    expect(clear.phase).toBe("clear");
    expect(clear.toast).toBe("You finished the level!");
    expect(clear.score).toBe(600);
    clear = advanceCapy(clear);
    expect(clear.levelIndex).toBe(1);
    expect(clear.score).toBe(600);
    expect(clear.lives).toBe(3);

    let finale = createCapy(4);
    finale.phase = "clear";
    finale = advanceCapy(finale);
    expect(finale.phase).toBe("done");
    expect(finale.toast).toBe("You finished all 5 levels.");
    finale = advanceCapy(finale);
    expect(finale.levelIndex).toBe(0);
    expect(finale.score).toBe(0);
  });

  it("can jump the short gap and swing the river on the first trail", () => {
    let state = createCapy(0);
    let gapHop = false;
    let vineHop = false;
    let crossed = false;
    for (let i = 0; i < 500 && !crossed; i += 1) {
      const jumpGap = !gapHop && state.grounded && state.player.x > 400 && state.player.x < 450;
      const jumpVine = !vineHop && state.grounded && state.player.x > 670;
      const jump = jumpGap || jumpVine;
      if (jumpGap) gapHop = true;
      if (jumpVine) vineHop = true;
      state = tickCapy(state, { ...blankCapyInput(), dx: 1, jump, jumpHeld: true }, STEP);
      crossed = state.player.x > 1040 && state.grounded && state.lives === 3 && state.swing === null;
    }
    expect(gapHop).toBe(true);
    expect(vineHop).toBe(true);
    expect(crossed).toBe(true);
    expect(state.lives).toBe(3);
  });
});
