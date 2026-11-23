import { describe, expect, it } from "vitest";
import { MENU_SLOP, menuDragged } from "../src/game/menu";

describe("home screen taps", () => {
  it("keeps a small wiggle as a tap", () => {
    expect(menuDragged(100, 200, 108, 206)).toBe(false);
    expect(menuDragged(100, 200, 100, 200 + MENU_SLOP)).toBe(false);
  });

  it("treats a finger slide as a scroll", () => {
    expect(menuDragged(100, 200, 100, 200 + MENU_SLOP + 1)).toBe(true);
    expect(menuDragged(40, 80, 10, 140)).toBe(true);
  });
});
