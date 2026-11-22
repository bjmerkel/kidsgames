import { describe, expect, it } from "vitest";
import { buttonToInput, keyDown, mergeInput, blankInput } from "../src/game/input";

describe("input", () => {
  it("maps arrows, WASD, tuck, pause, and confirm", () => {
    expect(keyDown("ArrowUp", "playing").dy).toBe(-1);
    expect(keyDown("KeyW", "playing").dy).toBe(-1);
    expect(keyDown("KeyA", "playing").dx).toBe(-1);
    expect(keyDown("KeyD", "playing").dx).toBe(1);
    expect(keyDown("ArrowDown", "playing").dy).toBe(1);
    expect(keyDown("Space", "playing").tuck).toBe(true);
    expect(keyDown("Space", "title").confirm).toBe(true);
    expect(keyDown("Enter", "intro").start).toBe(true);
    expect(keyDown("Escape", "playing").pause).toBe(true);
  });

  it("maps the on-screen pad", () => {
    expect(buttonToInput("n").dy).toBe(-1);
    expect(buttonToInput("tuck").tuck).toBe(true);
    expect(buttonToInput("confirm").start).toBe(true);
    expect(buttonToInput("nope")).toEqual(blankInput());
  });

  it("merges a hop and a tuck from the same frame", () => {
    const merged = mergeInput(buttonToInput("n"), buttonToInput("tuck"));
    expect(merged.dy).toBe(-1);
    expect(merged.tuck).toBe(true);
  });
});