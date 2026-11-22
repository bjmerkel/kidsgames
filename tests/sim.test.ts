import { describe, expect, it } from "vitest";
import { VIEW_H } from "../src/game/constants";
import { cameraTop } from "../src/game/camera";
import { COPY } from "../src/game/copy";
import { blankInput } from "../src/game/input";
import { buildLevel, LEVELS, startPoint, type LevelDraft } from "../src/game/levels";
import { createGame, tick } from "../src/game/sim";
import { debugState, hopNorth, idle, playStraight, startPlaying } from "./helpers";

describe("simulation", () => {
  it("does not mutate the previous state", () => {
    const state = startPlaying();
    const before = state.crab.lives;
    tick(state, { ...blankInput(), dy: -1 }, 16);
    expect(state.crab.lives).toBe(before);
    expect(state.crab.mode).toBe("idle");
  });

  it("hops north, prefers north over a diagonal, and refuses the map edge", () => {
    let state = startPlaying();
    const startY = state.crab.y;
    state = hopNorth(state);
    expect(state.crab.y).toBe(startY - 48);
    expect(state.crab.score).toBe(25);
    state = tick(state, { ...blankInput(), dx: 1, dy: -1 }, 16);
    state = hopUntilIdle(state);
    expect(state.crab.x).toBe(240);
    const south = tick(startPlaying(), { ...blankInput(), dy: 1 }, 16);
    expect(south.crab.y).toBe(startPoint(LEVELS[0]).y);
    expect(south.crab.mode).toBe("idle");
  });

  it("tucks, then waits out the cooldown", () => {
    let state = startPlaying();
    state = tick(state, { ...blankInput(), tuck: true }, 16);
    expect(state.crab.mode).toBe("tucked");
    state = tick(state, { ...blankInput(), dy: -1 }, 16);
    expect(state.crab.mode).toBe("tucked");
    state = idle(state, 700);
    expect(state.crab.mode).toBe("idle");
    expect(state.crab.tuckCooldownMs).toBeGreaterThan(0);
    state = tick(state, { ...blankInput(), tuck: true }, 16);
    expect(state.crab.mode).toBe("idle");
  });

  it("lets a tucked shell dodge a clip that would hit an open crab", () => {
    const level = buildLevel(tiny({
      bands: [
        { kind: "curb", h: 400 },
        { kind: "road", h: 80, lanes: [{ mode: "authored", localY: 40, x: 270, speed: 0, color: "#c81d25", w: 40, h: 24 }] },
      ],
    }));
    const state = startPlaying(createGame([level]));
    state.crab.x = 240;
    state.crab.y = level.segments[1].y + 40;
    const open = tick(state, blankInput(), 16);
    expect(open.lastFail).toBe("car");
    state.crab.mode = "tucked";
    const tucked = tick(state, blankInput(), 16);
    expect(tucked.lastFail).toBeNull();
    expect(tucked.crab.lives).toBe(state.crab.lives);
  });

  it("keeps a tucked crab on its stone and the sink timer", () => {
    const level = buildLevel(tiny({
      bands: [
        { kind: "curb", h: 200 },
        {
          kind: "pond",
          h: 120,
          stones: [{ x: 240, localY: 60, r: 30, vx: 0, minX: 240, maxX: 240, sinkAfterMs: 800 }],
        },
      ],
    }));
    let state = startPlaying(createGame([level]));
    const stone = state.level.segments[1].stones[0];
    state.crab.x = stone.x;
    state.crab.y = stone.y;
    state = idle(state, 32);
    expect(state.crab.supportId).toBe(stone.id);
    let stoodStone = state.level.segments[1].stones[0];
    expect(stoodStone.occupiedMs).toBeGreaterThan(0);
    const occupiedBeforeTuck = stoodStone.occupiedMs;
    state = tick(state, { ...blankInput(), tuck: true }, 16);
    const stood = state.level.segments[1].stones[0];
    expect(state.crab.mode).toBe("tucked");
    expect(state.crab.supportId).toBe(stone.id);
    expect(stood.occupiedMs).toBeGreaterThan(0);
    const occupiedAfterTuck = stood.occupiedMs;
    state = tick(state, blankInput(), 16);
    const stoodAgain = state.level.segments[1].stones[0];
    expect(state.crab.supportId).toBe(stone.id);
    expect(stoodAgain.occupiedMs).toBeGreaterThan(occupiedAfterTuck);
    expect(stoodAgain.occupiedMs).toBeGreaterThan(occupiedBeforeTuck);
  });

  it("sinks a stood-on stone and drops the crab in the water", () => {
    const level = buildLevel(tiny({
      bands: [
        { kind: "curb", h: 200 },
        {
          kind: "pond",
          h: 120,
          stones: [{ x: 240, localY: 60, r: 30, vx: 0, minX: 240, maxX: 240, sinkAfterMs: 100 }],
        },
      ],
    }));
    let state = startPlaying(createGame([level]));
    const stone = state.level.segments[1].stones[0];
    state.crab.x = stone.x;
    state.crab.y = stone.y;
    state = idle(state, 250);
    expect(state.lastFail).toBe("water");
    expect(state.crab.lives).toBe(3);
    expect(state.toast).toBe(COPY.tryAgain);
  });

  it("ends the level on time and offers the level again with the score kept", () => {
    const level = buildLevel(tiny({ timeLimitMs: 80, bands: [{ kind: "curb", h: 200 }] }));
    let state = startPlaying(createGame([level]));
    state.crab.score = 40;
    state = idle(state, 120);
    expect(state.lastFail).toBe("time");
    expect(state.toast).toBe(COPY.timeUp);
    expect(state.phase).toBe("playing");
    expect(state.crab.lives).toBe(3);
    expect(state.elapsedMs).toBeLessThan(level.timeLimitMs);
    state = idle(state, 360);
    expect(state.phase).toBe("retry");
    expect(state.bannerTitle).toBe(COPY.tryLevel);
    expect(state.bannerBody).toContain(COPY.emery);
    const score = state.crab.score;
    state = tick(state, { ...blankInput(), confirm: true }, 16);
    expect(state.phase).toBe("intro");
    expect(state.crab.lives).toBe(4);
    expect(state.crab.score).toBe(score);
  });

  it("congratulates a cleared level and the full campaign", () => {
    let state = startPlaying();
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.phase).toBe("level-clear");
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(state.bannerBody).toContain(COPY.emery);
    expect(state.crab.score).toBeGreaterThanOrEqual(500);
    state = tick(state, { ...blankInput(), confirm: true }, 16);
    expect(state.levelIndex).toBe(1);
    expect(state.phase).toBe("intro");
    expect(state.bannerBody).toContain(COPY.emery);

    let finale = startPlaying();
    finale.levelIndex = 4;
    finale.crab.y = 10;
    finale = tick(finale, blankInput(), 16);
    expect(finale.phase).toBe("campaign-clear");
    expect(finale.bannerTitle).toBe(COPY.finishedLevel);
    expect(finale.bannerBody).toContain("You finished all 5 levels.");
    expect(finale.bannerBody).toContain(COPY.emery);
  });

  it("respawns at the last safe checkpoint", () => {
    let state = startPlaying();
    const before = state.checkpointY;
    for (let i = 0; i < 6; i += 1) state = hopNorth(state);
    expect(state.checkpointY).toBeLessThan(before);
    const checkpoint = state.checkpointY;
    const lives = state.crab.lives;
    const pond = state.level.segments.find((segment) => segment.kind === "pond");
    expect(pond).toBeTruthy();
    state.crab.x = 30;
    state.crab.y = (pond?.y ?? 0) + 20;
    state.crab.mode = "idle";
    state.crab.supportId = null;
    state = tick(state, blankInput(), 16);
    expect(state.lastFail).toBe("water");
    expect(state.crab.lives).toBe(lives - 1);
    expect(state.crab.y).toBe(checkpoint);
    expect(state.crab.x).toBe(240);
  });

  it("finishes level 1 by hopping straight up the spine", () => {
    const state = playStraight();
    expect(state.phase, debugState(state)).toBe("level-clear");
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(state.elapsedMs).toBeLessThan(15000);
    expect(state.crab.lives).toBe(4);
  });

  it("punishes a straight hop on level 2", () => {
    let state = startPlaying(createGame(LEVELS));
    state = beginLevelIndex(state, 1);
    let hops = 0;
    while (state.phase === "playing" && state.crab.lives === 4 && hops < 12) {
      state = hopNorth(state);
      hops += 1;
    }
    expect(state.crab.lives, debugState(state)).toBeLessThan(4);
    expect(state.lastFail).toBe("car");
  });

  it("frames the crab with the camera", () => {
    const level = LEVELS[0];
    const start = startPoint(level);
    expect(cameraTop(start.y, level.height, VIEW_H)).toBe(level.height - VIEW_H);
    expect(cameraTop(20, level.height, VIEW_H)).toBe(0);
  });
});

function hopUntilIdle(state: ReturnType<typeof tick>): ReturnType<typeof tick> {
  let next = state;
  let guard = 0;
  while (next.crab.mode === "hopping" && guard < 30) {
    next = tick(next, blankInput(), 16);
    guard += 1;
  }
  return next;
}

function beginLevelIndex(state: ReturnType<typeof tick>, index: number): ReturnType<typeof tick> {
  let next = state;
  while (next.levelIndex < index) {
    next.crab.y = 10;
    next = tick(next, blankInput(), 16);
    next = tick(next, { ...blankInput(), confirm: true }, 16);
    next = tick(next, { ...blankInput(), confirm: true }, 16);
  }
  return next;
}

function tiny(overrides: Partial<LevelDraft> & Pick<LevelDraft, "bands">): LevelDraft {
  return {
    id: 99,
    name: "Tiny",
    intro: "Emery is awesome.",
    timeLimitMs: 30000,
    width: 480,
    spine: null,
    ...overrides,
  };
}