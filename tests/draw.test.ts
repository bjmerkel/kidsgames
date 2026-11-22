import { describe, expect, it } from "vitest";
import { COPY } from "../src/game/copy";
import { blankInput } from "../src/game/input";
import { createGame, tick } from "../src/game/sim";
import { drawFrame } from "../src/render/draw";
import { startPlaying } from "./helpers";

describe("renderer", () => {
  it("draws the title, the play field, and the level-clear banner", () => {
    const { ctx, fillTexts, clearTexts } = fakeCtx();
    expect(() => drawFrame(ctx, createGame(), 0, 0)).not.toThrow();
    expect(painted(fillTexts, COPY.title)).toBe(true);
    expect(painted(fillTexts, COPY.emery)).toBe(true);
    expect(exactChunkCount(fillTexts, COPY.emery)).toBeGreaterThanOrEqual(2);

    clearTexts();
    let state = startPlaying();
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(() => drawFrame(ctx, state, 0, 1200)).not.toThrow();
    expect(painted(fillTexts, COPY.finishedLevel)).toBe(true);
    expect(painted(fillTexts, COPY.emery)).toBe(true);
    expect(exactChunk(fillTexts, `${COPY.emery}.`)).toBe(true);
  });

  it("paints the HUD and tunnel sign while playing level 1", () => {
    const { ctx, fillTexts } = fakeCtx();
    const state = startPlaying();
    expect(() => drawFrame(ctx, state, 0, 0)).not.toThrow();
    expect(painted(fillTexts, COPY.emery)).toBe(true);
    expect(painted(fillTexts, COPY.tunnel)).toBe(true);
    expect(exactChunk(fillTexts, COPY.emery)).toBe(true);
    expect(exactChunk(fillTexts, `${state.level.name}   ${COPY.score} ${state.crab.score}`)).toBe(
      true,
    );
    expect(exactChunk(fillTexts, `${COPY.emery}.`)).toBe(false);
  });

  it("paints time-up and try-again toasts with the Emery line", () => {
    for (const toast of [COPY.timeUp, COPY.tryAgain] as const) {
      const { ctx, fillTexts, clearTexts } = fakeCtx();
      const state = { ...startPlaying(), toast, toastMs: 2_000 };
      expect(() => drawFrame(ctx, state, 0, 0)).not.toThrow();
      expect(painted(fillTexts, toast)).toBe(true);
      expect(painted(fillTexts, COPY.emery)).toBe(true);
      clearTexts();
    }
  });

  it("paints intro, pause, retry, and campaign-clear banner copy via tick", () => {
    const { ctx, fillTexts, clearTexts } = fakeCtx();

    let state = createGame();
    state = tick(state, { ...blankInput(), start: true }, 16);
    expect(state.phase).toBe("intro");
    drawFrame(ctx, state, 0, 0);
    expect(painted(fillTexts, state.level.intro)).toBe(true);
    expect(painted(fillTexts, state.level.name)).toBe(true);
    clearTexts();

    state = startPlaying();
    state = tick(state, { ...blankInput(), pause: true }, 16);
    expect(state.phase).toBe("paused");
    drawFrame(ctx, state, 0, 0);
    expect(painted(fillTexts, COPY.paused)).toBe(true);
    expect(painted(fillTexts, `${COPY.emery}.`)).toBe(true);
    expect(exactChunk(fillTexts, `${COPY.emery}.`)).toBe(true);
    clearTexts();

    state = startPlaying();
    state.crab.lives = 1;
    const pond = state.level.segments.find((segment) => segment.kind === "pond");
    state.crab.x = 30;
    state.crab.y = (pond?.y ?? 0) + 20;
    state.crab.mode = "idle";
    state.crab.supportId = null;
    state = tick(state, blankInput(), 16);
    expect(state.phase).toBe("retry");
    drawFrame(ctx, state, 0, 0);
    expect(painted(fillTexts, COPY.tryLevel)).toBe(true);
    expect(painted(fillTexts, `${COPY.emery}.`)).toBe(true);
    expect(exactChunk(fillTexts, `${COPY.emery}.`)).toBe(true);
    clearTexts();

    state = startPlaying();
    state.levelIndex = 4;
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.phase).toBe("campaign-clear");
    drawFrame(ctx, state, 0, 1200);
    expect(painted(fillTexts, COPY.finishedAll)).toBe(true);
  });
});

function painted(fillTexts: string[], phrase: string): boolean {
  if (fillTexts.some((chunk) => chunk.includes(phrase))) return true;
  return fillTexts.join(" ").includes(phrase);
}

function exactChunk(fillTexts: string[], phrase: string): boolean {
  return fillTexts.some((chunk) => chunk === phrase);
}

function exactChunkCount(fillTexts: string[], phrase: string): number {
  return fillTexts.filter((chunk) => chunk === phrase).length;
}

function fakeCtx(): {
  ctx: CanvasRenderingContext2D;
  fillTexts: string[];
  clearTexts: () => void;
} {
  const fillTexts: string[] = [];
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width: 480, height: 720 },
    measureText: () => ({ width: 80 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillText: (text: string) => {
      fillTexts.push(text);
    },
  };
  const ctx = new Proxy(target, {
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
  return {
    ctx,
    fillTexts,
    clearTexts: () => {
      fillTexts.length = 0;
    },
  };
}