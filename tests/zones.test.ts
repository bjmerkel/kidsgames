import { describe, expect, it } from "vitest";
import { detectHit } from "../src/game/zones";
import type { Crab, LevelDef } from "../src/game/types";

describe("zones", () => {
  it("distinguishes a car hit, a swing hit, water, and a fall", () => {
    const crab = makeCrab(240, 100);
    expect(detectHit(roadWithCar(270), crab, 0)).toBe("car");
    crab.mode = "tucked";
    expect(detectHit(roadWithCar(270), crab, 0)).toBeNull();
    crab.mode = "idle";
    expect(detectHit(pond(), crab, 0)).toBe("water");
    expect(detectHit(wallAboveLedge(), crab, 0)).toBe("fall");
    expect(detectHit(swingOnCrab(), crab, 0)).toBe("swing");
  });
});

function roadWithCar(x: number): LevelDef {
  return level([
    {
      id: "road",
      kind: "road",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [{ id: "car", x, y: 100, w: 40, h: 24, speed: 0, color: "#c81d25" }],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function pond(): LevelDef {
  return level([
    {
      id: "pond",
      kind: "pond",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function wallAboveLedge(): LevelDef {
  return level([
    {
      id: "wall",
      kind: "wall",
      y: 0,
      h: 200,
      ledgeH: 40,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function swingOnCrab(): LevelDef {
  return level([
    {
      id: "swings",
      kind: "swings",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [
        {
          id: "swing",
          pivotX: 240,
          pivotY: 30,
          length: 70,
          amplitude: 0,
          omega: 1,
          phase: 0,
          seatR: 12,
        },
      ],
      holds: [],
      chambers: [],
    },
  ]);
}

function level(segments: LevelDef["segments"]): LevelDef {
  return {
    id: 1,
    name: "Fixture",
    intro: "Emery is awesome.",
    timeLimitMs: 1000,
    width: 480,
    height: 200,
    segments,
  };
}

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