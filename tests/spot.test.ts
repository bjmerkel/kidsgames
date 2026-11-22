import { describe, expect, it, vi } from "vitest";
import { dealSpot, PANEL_H, PANEL_W, PANEL_X, PANEL_TOP, SPOT_LEVELS } from "../src/spot/scenes";
import { advanceSpot, blankSpotInput, createSpot, panelLocal, startSpot, tickSpot } from "../src/spot/sim";

const STEP = 1000 / 60;

function tap(state: ReturnType<typeof createSpot>, x: number, y: number) {
  return tickSpot(state, { ...blankSpotInput(), tap: true, x, y }, STEP);
}

describe("silk spot", () => {
  it("has twenty pictures and separated changes", () => {
    expect(SPOT_LEVELS.map((level) => level.name)).toEqual([
      "Rooftop Morning",
      "Park Swing",
      "Night Windows",
      "Snack Alley",
      "Moon Nest",
      "Chimney Puff",
      "Kite Roof",
      "Bakery Dusk",
      "Star Porch",
      "Puddle Lane",
      "Lantern Row",
      "Owl Windows",
      "Flower Boxes",
      "Flag Parade",
      "Cat Nap",
      "Balloon Bunch",
      "Web Corner",
      "Moonlit Steps",
      "Snack Window",
      "Nest Party",
    ]);
    expect(SPOT_LEVELS.map((level) => level.diffs.length)).toEqual([3, 4, 5, 5, 6, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7]);
    expect(SPOT_LEVELS.filter((level) => level.sky === "night").map((level) => level.name)).toEqual([
      "Night Windows",
      "Moon Nest",
      "Star Porch",
      "Owl Windows",
      "Moonlit Steps",
      "Nest Party",
    ]);
    for (const level of SPOT_LEVELS) {
      expect(level.blurb).toBe(`Find ${level.diffs.length} changes.`);
      const ids = level.diffs.map((diff) => diff.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const diff of level.diffs) {
        expect(diff.x).toBeGreaterThan(30);
        expect(diff.y).toBeGreaterThan(24);
        expect(diff.x).toBeLessThan(PANEL_W - 30);
        expect(diff.y).toBeLessThan(PANEL_H - 24);
      }
      for (let i = 0; i < level.diffs.length; i += 1) {
        for (let j = i + 1; j < level.diffs.length; j += 1) {
          const a = level.diffs[i];
          const b = level.diffs[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
        }
      }
    }
  });

  it("circles a change in either picture and does not mutate the old state", () => {
    const start = createSpot(0);
    const diff = start.diffs[0];
    const before = structuredClone(start);
    const top = tap(start, PANEL_X + diff.x, PANEL_TOP + diff.y);
    expect(top.diffs[0].found).toBe(true);
    expect(top.score).toBe(100);
    expect(top.toast).toBe("Found it!");
    expect(start).toEqual(before);
    const again = tap(top, PANEL_X + diff.x, PANEL_TOP + diff.y);
    expect(again.score).toBe(100);
    expect(again.toast).toBe("Already found.");

    let state = createSpot(0);
    const second = state.diffs[1];
    state = tap(state, PANEL_X + second.x, PANEL_TOP + PANEL_H + 22 + second.y);
    expect(state.diffs[1].found).toBe(true);
    expect(tickSpot(state, blankSpotInput(), 1000).elapsedMs - state.elapsedMs).toBe(50);
  });

  it("asks you to look again, then hints after three misses", () => {
    let state = createSpot(0);
    const outside = tap(state, 4, 4);
    expect(outside.misses).toBe(0);
    expect(outside.score).toBe(0);
    state = tap(state, PANEL_X + 300, PANEL_TOP + 200);
    expect(state.misses).toBe(1);
    expect(state.toast).toBe("Look again.");
    expect(state.hintId).toBeNull();
    state = tap(state, PANEL_X + 300, PANEL_TOP + 200);
    state = tap(state, PANEL_X + 300, PANEL_TOP + 200);
    expect(state.misses).toBe(3);
    expect(state.hintId).toBe(state.diffs[0].id);
    const hinted = tickSpot(state, { ...blankSpotInput(), hint: true }, STEP);
    expect(hinted.hintId).toBe(state.hintId);
    const fresh = tickSpot(createSpot(1), { ...blankSpotInput(), hint: true }, STEP);
    expect(fresh.hintId).toBe(fresh.diffs[0].id);
    expect(fresh.misses).toBe(0);
  });

  it("finishes every picture and carries the score", () => {
    let state = createSpot(0, 30);
    for (const diff of [...state.diffs]) {
      state = tap(state, PANEL_X + diff.x, PANEL_TOP + diff.y);
    }
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    expect(state.score).toBe(30 + 300 + 250);
    const playing = state;
    expect(advanceSpot(createSpot(0)).phase).toBe("playing");
    state = advanceSpot(state);
    expect(state.levelIndex).toBe(1);
    expect(state.score).toBe(playing.score);
    expect(state.phase).toBe("playing");
    expect(state.diffs.every((diff) => !diff.found)).toBe(true);

    const last = SPOT_LEVELS.length - 1;
    state = createSpot(last, 80);
    for (const diff of [...state.diffs]) state = tap(state, PANEL_X + diff.x, PANEL_TOP + diff.y);
    expect(state.score).toBe(80 + SPOT_LEVELS[last].diffs.length * 100 + 250);
    state = advanceSpot(state);
    expect(state.phase).toBe("done");
    expect(state.toast).toBe(`You finished all ${SPOT_LEVELS.length} levels.`);
    state = advanceSpot(state);
    expect(state.levelIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(state.phase).toBe("playing");
  });

  it("deals a new set and keeps it until the game ends", () => {
    const first = startSpot(11);
    const same = startSpot(11);
    const other = startSpot(29);
    const stamp = (levels: typeof first.levels) => levels.map((level) => [level.name, ...level.diffs.map((diff) => `${diff.id}:${diff.x},${diff.y}`)]);
    expect(stamp(same.levels)).toEqual(stamp(first.levels));
    expect(stamp(other.levels)).not.toEqual(stamp(first.levels));
    const counts = first.levels.map((level) => level.diffs.length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    for (const count of new Set(counts)) {
      const dealt = first.levels.filter((level) => level.diffs.length === count).map((level) => level.name).sort();
      const catalog = SPOT_LEVELS.filter((level) => level.diffs.length === count).map((level) => level.name).sort();
      expect(dealt).toEqual(catalog);
    }
    for (const level of first.levels) {
      const original = SPOT_LEVELS.find((picture) => picture.name === level.name);
      expect(level.diffs.map((diff) => diff.id)).toEqual(original?.diffs.map((diff) => diff.id));
      for (const diff of level.diffs) {
        expect(diff.x).toBeGreaterThan(30);
        expect(diff.y).toBeGreaterThan(24);
        expect(diff.x).toBeLessThan(PANEL_W - 30);
        expect(diff.y).toBeLessThan(PANEL_H - 24);
      }
      for (let i = 0; i < level.diffs.length; i += 1) {
        for (let j = i + 1; j < level.diffs.length; j += 1) {
          const a = level.diffs[i];
          const b = level.diffs[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
        }
      }
    }
    const moved = first.levels.some((level) => {
      const original = SPOT_LEVELS.find((picture) => picture.name === level.name);
      return level.diffs.some((diff, index) => diff.x !== original?.diffs[index].x || diff.y !== original?.diffs[index].y);
    });
    expect(moved).toBe(true);

    let state = first;
    for (const diff of state.diffs) state = tap(state, PANEL_X + diff.x, PANEL_TOP + diff.y);
    state = advanceSpot(state);
    expect(state.levelIndex).toBe(1);
    expect(state.levels[1].name).toBe(first.levels[1].name);
    expect(state.diffs.map((diff) => [diff.id, diff.x, diff.y])).toEqual(first.levels[1].diffs.map((diff) => [diff.id, diff.x, diff.y]));
    expect(state.reshuffle).toBe(true);

    state.phase = "done";
    const random = vi.spyOn(Math, "random").mockReturnValue(0.42);
    const replay = advanceSpot(state);
    random.mockRestore();
    const seed = 1 + Math.floor(0.42 * 2147483646);
    expect(replay.levelIndex).toBe(0);
    expect(replay.score).toBe(0);
    expect(stamp(replay.levels)).toEqual(stamp(dealSpot(seed)));
  });

  it("pauses and maps both pictures", () => {
    const paused = tickSpot(createSpot(0), { ...blankSpotInput(), pause: true }, STEP);
    expect(paused.phase).toBe("paused");
    const back = tickSpot(paused, { ...blankSpotInput(), pause: true, tap: true, x: PANEL_X + 72, y: PANEL_TOP + 158 }, STEP);
    expect(back.phase).toBe("playing");
    expect(back.diffs.every((diff) => !diff.found)).toBe(true);
    expect(panelLocal(PANEL_X + 10, PANEL_TOP + 10)).toEqual({ x: 10, y: 10 });
    expect(panelLocal(PANEL_X + 10, PANEL_TOP + PANEL_H + 22 + 15)).toEqual({ x: 10, y: 15 });
    expect(panelLocal(0, 400)).toBeNull();
  });
});
