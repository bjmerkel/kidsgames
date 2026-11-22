import { describe, expect, it } from "vitest";
import { COPY } from "../src/game/copy";
import { blankInput } from "../src/game/input";
import { createGame, tick } from "../src/game/sim";
import { drawFrame } from "../src/render/draw";
import { startPlaying } from "./helpers";

describe("renderer", () => {
  it("draws the title, the play field, and the level-clear banner", () => {
    const ctx = fakeCtx();
    expect(() => drawFrame(ctx, createGame(), 0, 0)).not.toThrow();
    let state = startPlaying();
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(() => drawFrame(ctx, state, 0, 1200)).not.toThrow();
  });
});

function fakeCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width: 480, height: 720 },
    measureText: () => ({ width: 80 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  return new Proxy(target, {
    get(obj, prop: string) {
      if (prop in obj) return obj[prop];
      const fn = () => undefined;
      obj[prop] = fn;
      return fn;
    },
    set(obj, prop: string, value) {
      obj[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}