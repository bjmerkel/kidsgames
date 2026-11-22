import { describe, expect, it } from "vitest";
import { holdVisible, seatPosition, stepCar, stepStone } from "../src/game/hazards";
import type { Car, Hold, Stone, Swing } from "../src/game/types";

describe("hazards", () => {
  it("hangs a swing straight down at phase zero and wraps a car across the yard", () => {
    const swing: Swing = {
      id: "s",
      pivotX: 240,
      pivotY: 40,
      length: 70,
      amplitude: 1,
      omega: 1,
      phase: 0,
      seatR: 12,
    };
    expect(seatPosition(swing, 0)).toEqual({ x: 240, y: 110 });
    const car: Car = { id: "c", x: 470, y: 20, w: 56, h: 24, speed: 40, color: "#c81d25" };
    stepCar(car, 1, 480);
    expect(car.x).toBeLessThan(0);
  });

  it("sinks a stone that is stood on and brings it back", () => {
    const stone: Stone = {
      id: "stone",
      x: 100,
      y: 40,
      r: 30,
      vx: 0,
      minX: 100,
      maxX: 100,
      sinkAfterMs: 50,
      occupiedMs: 0,
      emptyMs: 0,
      submerged: false,
    };
    stepStone(stone, 50, "stone");
    expect(stone.submerged).toBe(true);
    stepStone(stone, 800, null);
    expect(stone.submerged).toBe(false);
  });

  it("hides a hold for the second half of its blink", () => {
    const hold: Hold = {
      id: "h",
      x: 1,
      y: 1,
      r: 10,
      vx: 0,
      minX: 1,
      maxX: 1,
      blinkPeriodMs: 1000,
      blinkPhaseMs: 0,
      visible: true,
    };
    expect(holdVisible(hold, 100)).toBe(true);
    expect(holdVisible(hold, 700)).toBe(false);
  });
});