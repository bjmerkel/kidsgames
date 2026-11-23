import { describe, expect, it } from "vitest";
import { AXO_SPOTS, CAPY_SPOTS, CRAB_SPOTS, FISH_SPOTS, LOOK_SPOTS, RACE_SPOTS, RASCAL_SPOTS, WADDLE_SPOTS, spotsInside } from "../src/game/pads";
import { TouchPad, sideSteer, slideDirection, spotAt } from "../src/game/touchpad";

function apart(spots: readonly { x: number; y: number; w: number; h: number; label?: string; name: string }[]): void {
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      const a = spots[i];
      const b = spots[j];
      const clear = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(clear, `${a.name} overlaps ${b.name}`).toBe(true);
    }
  }
}

describe("touch pads", () => {
  it("keeps every control on the picture", () => {
    for (const spots of [CRAB_SPOTS, RACE_SPOTS, FISH_SPOTS, AXO_SPOTS, RASCAL_SPOTS, CAPY_SPOTS, WADDLE_SPOTS, LOOK_SPOTS]) {
      expect(spotsInside(spots)).toBe(true);
      apart(spots);
    }
    const axoLeft = AXO_SPOTS.find((spot) => spot.name === "left");
    const axoFire = AXO_SPOTS.find((spot) => spot.name === "fire");
    expect(axoLeft && axoFire).toBeTruthy();
    expect(axoLeft!.y).toBeGreaterThanOrEqual(620);
    expect(axoFire!.y).toBeGreaterThanOrEqual(620);
    expect(WADDLE_SPOTS[0].y + WADDLE_SPOTS[0].h).toBeLessThanOrEqual(88);
    expect(LOOK_SPOTS[0].y).toBeGreaterThanOrEqual(670);
    for (const spot of [...RASCAL_SPOTS, ...CAPY_SPOTS]) {
      if (spot.name !== "pause") expect(spot.y + spot.h).toBeLessThanOrEqual(580);
    }
    for (const spot of RACE_SPOTS) {
      if (spot.name !== "pause") expect(spot.y).toBeGreaterThanOrEqual(600);
    }
  });

  it("holds a direction and pulses tuck once", () => {
    const pulses: string[] = [];
    const pad = new TouchPad(CRAB_SPOTS, (name) => pulses.push(name));
    const up = CRAB_SPOTS[0];
    expect(pad.down(1, up.x + 4, up.y + 4)).toBe(true);
    expect(pad.held("up")).toBe(true);
    expect(pulses).toEqual([]);
    const tuck = CRAB_SPOTS.find((spot) => spot.name === "tuck");
    expect(tuck).toBeTruthy();
    pad.down(2, tuck!.x + 8, tuck!.y + 8);
    pad.down(2, tuck!.x + 8, tuck!.y + 8);
    expect(pulses).toEqual(["tuck"]);
    pad.up(1);
    expect(pad.held("up")).toBe(false);
    expect(spotAt(CRAB_SPOTS, 10, 10)).toBeNull();
  });

  it("reads a slide and a side steer", () => {
    expect(slideDirection(100, 100, 110, 104)).toEqual({ dx: 0, dy: 0 });
    expect(slideDirection(100, 100, 140, 110)).toEqual({ dx: 1, dy: 0 });
    expect(slideDirection(100, 100, 90, 40)).toEqual({ dx: 0, dy: -1 });
    expect(sideSteer(40)).toBe(-1);
    expect(sideSteer(240)).toBe(0);
    expect(sideSteer(400)).toBe(1);
  });
});
