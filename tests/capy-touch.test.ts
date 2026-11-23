import { describe, expect, it } from "vitest";
import { capyTouchRead } from "../src/capy/touch";

describe("capy touch", () => {
  it("jumps the moment a finger touches the picture", () => {
    const press = capyTouchRead({ edgeJump: false, keyHeld: false, buttonHeld: false, fieldDown: true, fieldHeld: true });
    expect(press).toEqual({ jump: true, jumpHeld: true });
    const held = capyTouchRead({ edgeJump: false, keyHeld: false, buttonHeld: false, fieldDown: false, fieldHeld: true });
    expect(held).toEqual({ jump: false, jumpHeld: true });
  });

  it("keeps Left and Right from jumping, and still jumps from the Jump button", () => {
    const steer = capyTouchRead({ edgeJump: false, keyHeld: false, buttonHeld: false, fieldDown: false, fieldHeld: false });
    expect(steer).toEqual({ jump: false, jumpHeld: false });
    const button = capyTouchRead({ edgeJump: true, keyHeld: false, buttonHeld: true, fieldDown: false, fieldHeld: false });
    expect(button).toEqual({ jump: true, jumpHeld: true });
  });
});
