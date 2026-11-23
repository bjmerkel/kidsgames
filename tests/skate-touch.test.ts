import { describe, expect, it } from "vitest";
import { VIEW_H, VIEW_W } from "../src/game/constants";
import {
  blankSkateTouch,
  readSkateTouch,
  SKATE_CROUCH_DY,
  SKATE_FLICK_DY,
  SKATE_HOLD_MS,
  SKATE_SPOTS,
  SKATE_TAP_MS,
  SKATE_TAP_SLOP,
  skateDeckTop,
  skateOriginAt,
  skateSpotAt,
  skateTapJump,
  type SkatePointer,
} from "../src/skate/touch";

function pointer(partial: Partial<SkatePointer> & Pick<SkatePointer, "origin">): SkatePointer {
  return {
    id: 1,
    x: 200,
    y: 200,
    x0: 200,
    y0: 200,
    t0: 0,
    jumpSent: false,
    pauseSent: false,
    ...partial,
  };
}

describe("ollie cat touch", () => {
  it("puts brake, push, ollie, and crouch on the screen below the riding line", () => {
    expect(SKATE_SPOTS.map((spot) => spot.label)).toEqual(["Brake", "Push", "Ollie", "Crouch", "Pause"]);
    for (const spot of SKATE_SPOTS) {
      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(spot.y).toBeGreaterThanOrEqual(0);
      expect(spot.x + spot.w).toBeLessThanOrEqual(VIEW_W);
      expect(spot.y + spot.h).toBeLessThanOrEqual(VIEW_H);
      if (spot.name !== "pause") expect(spot.y).toBeGreaterThanOrEqual(560);
    }
    expect(skateDeckTop()).toBeGreaterThanOrEqual(560);
    for (let i = 0; i < SKATE_SPOTS.length; i += 1) {
      for (let j = i + 1; j < SKATE_SPOTS.length; j += 1) {
        const a = SKATE_SPOTS[i];
        const b = SKATE_SPOTS[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.label} overlaps ${b.label}`).toBe(true);
      }
    }
  });

  it("reads each on-screen command from where the finger is", () => {
    const brake = SKATE_SPOTS[0];
    const push = SKATE_SPOTS[1];
    const ollie = SKATE_SPOTS[2];
    const crouch = SKATE_SPOTS[3];
    const pause = SKATE_SPOTS[4];
    expect(skateSpotAt(brake.x + 4, brake.y + 4)).toBe("left");
    expect(skateSpotAt(push.x + 4, push.y + 4)).toBe("right");
    expect(skateSpotAt(ollie.x + 4, ollie.y + 4)).toBe("jump");
    expect(skateSpotAt(crouch.x + 4, crouch.y + 4)).toBe("crouch");
    expect(skateSpotAt(pause.x + 4, pause.y + 4)).toBe("pause");
    expect(skateOriginAt(VIEW_W / 2, skateDeckTop() + 8)).toBe("dead");
    expect(skateOriginAt(VIEW_W / 2, 300)).toBe("field");
  });

  it("holds push on the street, crouches when the finger slides down, and ollies on a tap or flick", () => {
    const early = readSkateTouch([pointer({ origin: "field", t0: 0 })], SKATE_HOLD_MS - 1);
    expect(early.held).toEqual(blankSkateTouch());
    const pushing = readSkateTouch([pointer({ origin: "field", t0: 0 })], SKATE_HOLD_MS);
    expect(pushing.held.right).toBe(true);
    expect(pushing.jump).toBe(false);

    const low = pointer({ origin: "field", y: 200 + SKATE_CROUCH_DY, y0: 200 });
    const crouched = readSkateTouch([low], 20);
    expect(crouched.held.crouch).toBe(true);
    expect(crouched.held.right).toBe(true);

    const flicked = readSkateTouch([pointer({ origin: "field", y: 200 + SKATE_FLICK_DY, y0: 200 })], 30);
    expect(flicked.jump).toBe(true);
    const again = readSkateTouch(flicked.pointers, 40);
    expect(again.jump).toBe(false);

    const tap = pointer({ origin: "field", t0: 0 });
    expect(skateTapJump(tap, SKATE_TAP_MS - 1)).toBe(true);
    expect(skateTapJump({ ...tap, x: tap.x0 + SKATE_TAP_SLOP }, 40)).toBe(false);
    expect(skateTapJump(tap, SKATE_TAP_MS)).toBe(false);
    expect(skateTapJump({ ...low, t0: 0 }, 40)).toBe(false);
  });

  it("fires ollie and pause once, and lets two fingers push and crouch together", () => {
    const ollie = readSkateTouch([pointer({ origin: "jump" })], 0);
    expect(ollie.jump).toBe(true);
    expect(ollie.held.ollie).toBe(true);
    expect(readSkateTouch(ollie.pointers, 16).jump).toBe(false);

    const pause = readSkateTouch([pointer({ origin: "pause" })], 0);
    expect(pause.pause).toBe(true);
    expect(readSkateTouch(pause.pointers, 16).pause).toBe(false);

    const both = readSkateTouch(
      [pointer({ id: 1, origin: "right" }), pointer({ id: 2, origin: "crouch" })],
      0,
    );
    expect(both.held.right).toBe(true);
    expect(both.held.crouch).toBe(true);
    expect(both.held.left).toBe(false);
  });
});
