import { describe, expect, it } from "vitest";
import { courseWidth, SKATE_LEVELS } from "../src/skate/levels";
import { advanceSkate, blankSkateInput, createSkate, tickSkate, type SkateInput, type SkateState } from "../src/skate/sim";

const STEP = 1000 / 60;

function hold(state: SkateState, frames: number, input: Partial<SkateInput> = {}): SkateState {
  const frame = { ...blankSkateInput(), ...input };
  let next = state;
  for (let i = 0; i < frames; i += 1) next = tickSkate(next, frame, STEP);
  return next;
}

describe("ollie cat", () => {
  it("has five parks with ramps, tunnels, and a finish", () => {
    expect(SKATE_LEVELS.map((level) => level.name)).toEqual(["Milk Street", "Alley Rail", "Tunnel Run", "Gap Park", "Night Bowl"]);
    for (const level of SKATE_LEVELS) {
      expect(level.pieces.some((piece) => piece.kind === "ramp")).toBe(true);
      expect(level.pieces.some((piece) => piece.kind === "tunnel")).toBe(true);
      expect(level.pieces.at(-1)?.kind).toBe("finish");
      expect(courseWidth(level)).toBeGreaterThan(600);
    }
    expect(SKATE_LEVELS[1].pieces.some((piece) => piece.kind === "rail")).toBe(true);
    expect(SKATE_LEVELS[3].pieces.some((piece) => piece.kind === "gap")).toBe(true);
    expect(SKATE_LEVELS[4].pieces.some((piece) => piece.kind === "rail")).toBe(true);
    expect(SKATE_LEVELS[4].pieces.some((piece) => piece.kind === "gap")).toBe(true);
  });

  it("pushes up to speed and brakes", () => {
    const pushed = hold(createSkate(0), 40, { dx: 1 });
    expect(pushed.vx).toBeGreaterThan(200);
    expect(pushed.x).toBeGreaterThan(48);
    const stopped = hold(pushed, 40, { dx: -1 });
    expect(stopped.vx).toBe(0);
  });

  it("launches off a speed ramp and scores the landing", () => {
    let state = createSkate(0);
    let launched = false;
    for (let i = 0; i < 500 && state.phase === "playing"; i += 1) {
      state = tickSkate(state, { ...blankSkateInput(), dx: 1, crouch: true }, STEP);
      if (!state.grounded && !state.grinding && state.vy < 0) launched = true;
    }
    expect(launched).toBe(true);
    expect(state.score).toBeGreaterThan(0);
  });

  it("crouches through a tunnel and wipes out on the roof", () => {
    const riding = hold(createSkate(2), 30, { dx: 1 });
    const safe = hold(riding, 400, { dx: 1, crouch: true });
    expect(safe.bails).toBe(0);
    expect(safe.toast === "Tunnel speed" || safe.score).toBeTruthy();
    expect(safe.bails).toBe(0);

    let standing = hold(createSkate(2), 20, { dx: 1 });
    standing.vx = 420;
    let hit = false;
    for (let i = 0; i < 400 && standing.phase === "playing"; i += 1) {
      standing = tickSkate(standing, { ...blankSkateInput(), dx: 1, crouch: false }, STEP);
      if (standing.toast === "The tunnel roof.") hit = true;
    }
    expect(hit).toBe(true);
    expect(standing.bails).toBeGreaterThan(0);
  });

  it("kickflips in the air and grinds a rail", () => {
    let state = createSkate(0);
    state = hold(state, 5, { dx: 1 });
    state = tickSkate(state, { ...blankSkateInput(), jump: true }, STEP);
    expect(state.grounded).toBe(false);
    expect(state.airTrick).toBe("ollie");
    state = tickSkate(state, { ...blankSkateInput(), jump: true }, STEP);
    expect(state.airTrick).toBe("kickflip");
    state = hold(state, 80);
    expect(state.grounded).toBe(true);
    expect(state.score).toBeGreaterThanOrEqual(250);

    let grind = createSkate(1);
    grind.x = 230;
    grind.y = 480;
    grind.vx = 280;
    grind.vy = 200;
    grind.grounded = false;
    let grinding = false;
    for (let i = 0; i < 80; i += 1) {
      grind = tickSkate(grind, { ...blankSkateInput(), dx: 1 }, STEP);
      if (grind.grinding) grinding = true;
    }
    expect(grinding).toBe(true);
    expect(grind.score).toBeGreaterThan(0);
  });

  it("misses a gap and retries after three wipeouts", () => {
    let state = createSkate(3);
    state.x = 700;
    state.y = 680;
    state.vx = 40;
    state.vy = 400;
    state.grounded = false;
    state = hold(state, 20);
    expect(state.toast).toBe("Missed the landing.");
    expect(state.bails).toBe(1);
    state.x = 700;
    state.y = 680;
    state.vy = 400;
    state.grounded = false;
    state = hold(state, 20);
    state.x = 700;
    state.y = 680;
    state.vy = 400;
    state.grounded = false;
    state = hold(state, 20);
    expect(state.phase).toBe("retry");
    const again = advanceSkate(state);
    expect(again.phase).toBe("playing");
    expect(again.bails).toBe(0);
    expect(again.score).toBe(0);
  });

  it("finishes the parks and carries the score", () => {
    let state = createSkate(0, 25);
    state = hold(state, 900, { dx: 1, crouch: true });
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    expect(state.score).toBeGreaterThan(25);
    const carried = state.score;
    state = advanceSkate(state);
    expect(state.levelIndex).toBe(1);
    expect(state.score).toBe(carried);

    state = createSkate(4, 10);
    state = hold(state, 1200, { dx: 1, crouch: true });
    expect(state.phase).toBe("clear");
    state = advanceSkate(state);
    expect(state.phase).toBe("done");
    expect(state.toast).toBe("You finished all 5 levels.");
    state = advanceSkate(state);
    expect(state.levelIndex).toBe(0);
    expect(state.score).toBe(0);
  });

  it("pauses without rolling", () => {
    const paused = tickSkate(createSkate(0), { ...blankSkateInput(), pause: true }, STEP);
    expect(paused.phase).toBe("paused");
    const held = tickSkate(paused, { ...blankSkateInput(), dx: 1, pause: true }, STEP);
    expect(held.phase).toBe("playing");
    expect(held.x).toBe(48);
  });
});
