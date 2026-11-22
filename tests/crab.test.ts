import { describe, expect, it } from "vitest";
import { advanceHop, advanceTuck, beginHop } from "../src/game/crab";
import type { Crab, LevelDef } from "../src/game/types";

const level: LevelDef = {
  id: 1,
  name: "Pad",
  intro: "Emery is awesome.",
  timeLimitMs: 1000,
  width: 480,
  height: 400,
  segments: [],
};

describe("crab", () => {
  it("hops north, ignores a diagonal's sideways part, and stays inside the yard", () => {
    const crab = makeCrab(240, 200);
    expect(beginHop(crab, 1, -1, level)).toBe(true);
    expect(crab.hopToX).toBe(240);
    expect(crab.hopToY).toBe(152);
    advanceHop(crab, 140);
    expect(crab.mode).toBe("idle");
    expect(crab.y).toBe(152);
    expect(crab.score).toBe(25);
    const edge = makeCrab(240, 380);
    expect(beginHop(edge, 0, 1, level)).toBe(false);
  });

  it("refuses to hop while tucked", () => {
    const crab = makeCrab(240, 200);
    advanceTuck(crab, 16, true);
    expect(crab.mode).toBe("tucked");
    expect(beginHop(crab, 0, -1, level)).toBe(false);
  });
});

function makeCrab(x: number, y: number): Crab {
  return {
    x,
    y,
    facing: "n",
    mode: "idle",
    hopFromX: x,
    hopFromY: y,
    hopToX: x,
    hopToY: y,
    hopElapsedMs: 0,
    tuckElapsedMs: 0,
    tuckCooldownMs: 0,
    supportId: null,
    supportKind: null,
    rideOffsetX: 0,
    rideOffsetY: 0,
    lives: 4,
    score: 0,
  };
}