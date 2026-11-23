import { describe, expect, it } from "vitest";
import { GROUND_Y, ROOF_LEVELS } from "../src/rascal/levels";
import { advanceRascal, blankRascalInput, createRascal, hookAtPoint, rascalCameraX, tickRascal, type RascalInput } from "../src/rascal/sim";

const STEP = 1000 / 60;

function holdJump(extra: Partial<RascalInput> = {}): RascalInput {
  return { ...blankRascalInput(), jump: true, jumpHeld: true, ...extra };
}

describe("web rascal", () => {
  it("has 15 rooftop levels, the first five, then ten new roofs", () => {
    expect(ROOF_LEVELS.map((level) => level.name)).toEqual([
      "First Roof",
      "Silk Gap",
      "Bug Bounce",
      "High Wire",
      "Night Nest",
      "Chimney Row",
      "Laundry Line",
      "Fire Escape",
      "Pigeon Parade",
      "Clock Tower",
      "Rain Gutter",
      "Antenna Garden",
      "Subway Roof",
      "Silk Spiral",
      "Moon Nest",
    ]);
    expect(ROOF_LEVELS.slice(0, 5).map((level) => level.webs.length)).toEqual([0, 2, 1, 2, 3]);
    expect(ROOF_LEVELS[3].movers.length).toBeGreaterThan(0);
    expect(ROOF_LEVELS[4].night).toBe(true);
    for (let i = 1; i < 5; i += 1) expect(ROOF_LEVELS[i].width).toBeGreaterThan(ROOF_LEVELS[i - 1].width);
    const added = ROOF_LEVELS.slice(5);
    expect(added).toHaveLength(10);
    expect(added.some((level) => level.webs.length >= 2)).toBe(true);
    expect(added.some((level) => level.movers.length >= 2)).toBe(true);
    expect(added.filter((level) => level.night)).toHaveLength(3);
    expect(added.some((level) => level.bugs.length >= 3)).toBe(true);
    for (const level of ROOF_LEVELS) {
      expect(level.blurb.length).toBeGreaterThan(0);
      expect(level.goal.x).toBeGreaterThan(400);
      expect(level.goal.x + level.goal.w).toBeLessThan(level.width);
      expect(level.bugs.length).toBeGreaterThan(0);
    }
  });

  it("jumps and lands without changing the earlier state", () => {
    const before = createRascal(0);
    const rising = tickRascal(before, holdJump(), STEP);
    expect(before.player.y).toBe(GROUND_Y - before.player.h);
    expect(before.vy).toBe(0);
    expect(rising.vy).toBeLessThan(0);
    expect(rising.player.y).toBeLessThan(before.player.y);
    let state = rising;
    for (let i = 0; i < 90; i += 1) state = tickRascal(state, { ...blankRascalInput(), jumpHeld: true, dx: 1 }, STEP);
    expect(state.grounded).toBe(true);
    expect(state.player.x).toBeGreaterThan(before.player.x);
    expect(state.player.y).toBe(GROUND_Y - state.player.h);
    const clamped = tickRascal(before, blankRascalInput(), 1000);
    expect(before.elapsedMs).toBe(0);
    expect(clamped.elapsedMs).toBe(50);
  });

  it("bounces on a bug from above and loses a life from the side", () => {
    const before = createRascal(0);
    const bug = before.bugs[0];
    before.player.x = bug.x;
    before.player.y = bug.y - before.player.h;
    before.vy = 200;
    before.grounded = false;
    const stomped = tickRascal(before, blankRascalInput(), STEP);
    expect(before.bugs[0].gone).toBe(false);
    expect(before.score).toBe(0);
    expect(stomped.bugs[0].gone).toBe(true);
    expect(stomped.score).toBe(200);
    expect(stomped.vy).toBeLessThan(0);
    expect(stomped.lives).toBe(3);

    const side = createRascal(0);
    side.player.x = side.bugs[0].x;
    side.player.y = side.bugs[0].y - 8;
    side.vy = 0;
    side.grounded = false;
    const hurt = tickRascal(side, blankRascalInput(), STEP);
    expect(side.lives).toBe(3);
    expect(hurt.lives).toBe(2);
    expect(hurt.phase).toBe("playing");
    expect(hurt.toast).toBe("Try again.");
  });

  it("zips to a web hook and stays put when none is in reach", () => {
    const level = ROOF_LEVELS[1];
    const hook = level.webs[0];
    let state = createRascal(1);
    state.player.x = hook.x - 30;
    state.player.y = hook.y + 90;
    state.grounded = false;
    state.vy = 40;
    state = tickRascal(state, { ...blankRascalInput(), web: true }, 50);
    expect(state.zip).not.toBeNull();
    for (let i = 0; i < 6 && state.zip; i += 1) state = tickRascal(state, blankRascalInput(), 50);
    expect(state.zip).toBeNull();
    expect(state.player.x).toBeCloseTo(hook.x - state.player.w / 2, 0);
    expect(state.player.y).toBeCloseTo(hook.y + 18, 0);

    const home = createRascal(0);
    const stayed = tickRascal(home, { ...blankRascalInput(), web: true }, STEP);
    expect(stayed.zip).toBeNull();
    expect(stayed.player.x).toBe(home.player.x);
    expect(stayed.player.y).toBe(home.player.y);
  });

  it("clears a running jump and needs a web for the wide gap", () => {
    let jumped = false;
    let state = createRascal(0);
    for (let i = 0; i < 220; i += 1) {
      const jump = !jumped && state.grounded && state.player.x > 630;
      if (jump) jumped = true;
      state = tickRascal(state, { ...blankRascalInput(), dx: 1, jump, jumpHeld: true }, STEP);
    }
    expect(state.lives).toBe(3);
    expect(state.grounded).toBe(true);
    expect(state.player.x).toBeGreaterThan(800);

    jumped = false;
    state = createRascal(1);
    for (let i = 0; i < 180; i += 1) {
      const jump = !jumped && state.grounded && state.player.x > 460;
      if (jump) jumped = true;
      state = tickRascal(state, { ...blankRascalInput(), dx: 1, jump, jumpHeld: true }, STEP);
    }
    expect(state.player.x).toBeLessThan(700);

    jumped = false;
    let webbed = false;
    let hopped = false;
    let crossed = false;
    state = createRascal(1);
    for (let i = 0; i < 260 && !crossed; i += 1) {
      const jump = (!jumped && state.grounded && state.player.x > 450) || (!hopped && webbed && !state.zip && state.coyoteMs > 0);
      if (!jumped && jump) jumped = true;
      else if (webbed && jump) hopped = true;
      const web = !webbed && !state.grounded && state.player.x > 520;
      if (web) webbed = true;
      state = tickRascal(state, { ...blankRascalInput(), dx: 1, jump, jumpHeld: true, web }, STEP);
      crossed = state.player.x > 780 && state.grounded && state.lives === 3;
    }
    expect(webbed).toBe(true);
    expect(crossed).toBe(true);
  });

  it("picks up an acorn, falls back to the roof, and finishes the level at the nest", () => {
    const level = ROOF_LEVELS[0];
    const before = createRascal(0);
    before.player.x = level.coins[0].x - 10;
    before.player.y = level.coins[0].y - 20;
    const got = tickRascal(before, blankRascalInput(), STEP);
    expect(before.score).toBe(0);
    expect(before.coinsGot[0]).toBe(false);
    expect(got.score).toBe(50);
    expect(got.coinsGot[0]).toBe(true);

    let fallen = createRascal(0);
    fallen.player.y = 860;
    fallen.grounded = false;
    fallen = tickRascal(fallen, blankRascalInput(), STEP);
    expect(fallen.lives).toBe(2);
    expect(fallen.player.x).toBe(level.spawnX);
    expect(fallen.player.y).toBe(level.spawnY);
    fallen.invulnMs = 0;
    fallen.player.y = 860;
    fallen = tickRascal(fallen, blankRascalInput(), STEP);
    fallen.invulnMs = 0;
    fallen.player.y = 860;
    fallen = tickRascal(fallen, blankRascalInput(), STEP);
    expect(fallen.lives).toBe(0);
    expect(fallen.phase).toBe("retry");
    expect(fallen.toast).toBe("Try again.");
    fallen.score = 80;
    fallen = advanceRascal(fallen);
    expect(fallen.levelIndex).toBe(0);
    expect(fallen.lives).toBe(3);
    expect(fallen.score).toBe(80);

    let clear = createRascal(0);
    clear.player.x = level.goal.x;
    clear.player.y = level.goal.y;
    clear.score = 100;
    clear = tickRascal(clear, blankRascalInput(), STEP);
    expect(clear.phase).toBe("clear");
    expect(clear.toast).toBe("You finished the level!");
    expect(clear.score).toBe(600);
    clear = advanceRascal(clear);
    expect(clear.levelIndex).toBe(1);
    expect(clear.score).toBe(600);
    expect(clear.lives).toBe(3);

    let finale = createRascal(ROOF_LEVELS.length - 1);
    finale.phase = "clear";
    finale = advanceRascal(finale);
    expect(finale.phase).toBe("done");
    expect(finale.toast).toBe("You finished all 15 levels.");
    finale = advanceRascal(finale);
    expect(finale.levelIndex).toBe(0);
    expect(finale.score).toBe(0);
  });

  it("grabs a web mark that is on screen and hangs long enough to jump", () => {
    const hook = ROOF_LEVELS[1].webs[0];
    const approach = createRascal(1);
    approach.player.x = hook.x - 300;
    approach.player.y = GROUND_Y - approach.player.h;
    const screenX = hook.x - rascalCameraX(approach);
    expect(screenX).toBeGreaterThanOrEqual(0);
    expect(screenX).toBeLessThanOrEqual(480);
    expect(hookAtPoint(approach, hook.x, hook.y)).toBe(true);
    expect(hookAtPoint(approach, hook.x + 200, hook.y)).toBe(false);

    let state = tickRascal(approach, { ...blankRascalInput(), web: true }, STEP);
    expect(state.zip?.hookX).toBe(hook.x);
    for (let i = 0; i < 40 && state.zip; i += 1) state = tickRascal(state, blankRascalInput(), STEP);
    expect(state.zip).toBeNull();
    expect(state.perchMs).toBeGreaterThan(500);
    const hangX = state.player.x;
    const hangY = state.player.y;
    for (let i = 0; i < 20; i += 1) state = tickRascal(state, blankRascalInput(), STEP);
    expect(state.player.x).toBeCloseTo(hangX, 0);
    expect(state.player.y).toBeCloseTo(hangY, 0);
    expect(state.lives).toBe(3);
    state = tickRascal(state, { ...blankRascalInput(), jump: true, jumpHeld: true, dx: 1 }, STEP);
    expect(state.vy).toBeLessThan(0);
    for (let i = 0; i < 120 && !(state.grounded && state.player.x > 740); i += 1) {
      state = tickRascal(state, { ...blankRascalInput(), jumpHeld: true, dx: 1 }, STEP);
    }
    expect(state.grounded).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.player.x).toBeGreaterThan(740);
  });

  it("keeps a web tap that happens on the same frame as jump", () => {
    const hook = ROOF_LEVELS[1].webs[0];
    const state = createRascal(1);
    state.player.x = hook.x - 80;
    state.player.y = hook.y + 90;
    state.grounded = false;
    state.coyoteMs = 0;
    state.vy = 80;
    const swung = tickRascal(state, { ...blankRascalInput(), web: true, jump: true }, STEP);
    expect(swung.zip).not.toBeNull();
  });

  it("remembers a web tap until the mark is close", () => {
    const hook = ROOF_LEVELS[1].webs[0];
    let state = createRascal(1);
    state.player.x = 48;
    state = tickRascal(state, { ...blankRascalInput(), web: true }, STEP);
    expect(state.zip).toBeNull();
    expect(state.toast).toBe("Jump closer to the web mark.");
    state.player.x = hook.x - 70;
    state.player.y = hook.y + 80;
    state = tickRascal(state, blankRascalInput(), STEP);
    expect(state.zip?.hookX).toBe(hook.x);
    expect(state.toast).toBe("");

    const first = tickRascal(createRascal(0), { ...blankRascalInput(), web: true }, STEP);
    expect(first.zip).toBeNull();
    expect(first.toast).toBe("No web mark on this roof.");
    expect(first.player.y).toBe(createRascal(0).player.y);
  });
});
