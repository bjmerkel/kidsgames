import { describe, expect, it } from "vitest";
import { TIDE_SPOTS } from "../src/tide/pads";
import { tideFingerCommand } from "../src/tide/touch";
import { spotsInside } from "../src/game/pads";

describe("treasure tide touch", () => {
  it("walks when a finger slides across the picture", () => {
    expect(tideFingerCommand(200, 300, 200, 240, false)).toEqual({ dx: 0, dy: -1, action: false });
    expect(tideFingerCommand(200, 300, 260, 310, false)).toEqual({ dx: 1, dy: 0, action: false });
    expect(tideFingerCommand(200, 300, 150, 360, false)).toEqual({ dx: 0, dy: 1, action: false });
    expect(tideFingerCommand(200, 300, 140, 300, false)).toEqual({ dx: -1, dy: 0, action: false });
  });

  it("looks when a still finger lifts, and a slide does not", () => {
    expect(tideFingerCommand(200, 300, 208, 306, false)).toEqual({ dx: 0, dy: 0, action: false });
    expect(tideFingerCommand(200, 300, 208, 306, true)).toEqual({ dx: 0, dy: 0, action: true });
    expect(tideFingerCommand(200, 300, 260, 300, true)).toEqual({ dx: 0, dy: 0, action: false });
  });

  it("keeps Look, Chart, and Pause on the picture and leaves the island for the finger", () => {
    expect(spotsInside(TIDE_SPOTS)).toBe(true);
    expect(TIDE_SPOTS.map((spot) => spot.name)).toEqual(["look", "chart", "pause"]);
    for (const spot of TIDE_SPOTS) {
      expect(spot.y).toBeGreaterThanOrEqual(620);
      expect(spot.x + spot.w).toBeLessThanOrEqual(480);
    }
    const look = TIDE_SPOTS.find((spot) => spot.name === "look");
    expect(look?.w).toBeGreaterThanOrEqual(160);
  });
});
