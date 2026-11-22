import { describe, expect, it } from "vitest";
import { circleHitsAabb, circlesOverlap } from "../src/game/geometry";

describe("geometry", () => {
  it("overlaps circles that touch", () => {
    expect(circlesOverlap(0, 0, 10, 20, 0, 10)).toBe(true);
    expect(circlesOverlap(0, 0, 10, 21, 0, 10)).toBe(false);
  });

  it("hits an aabb when the circle reaches the box", () => {
    expect(circleHitsAabb(0, 0, 10, 15, 0, 10, 10)).toBe(true);
    expect(circleHitsAabb(0, 0, 4, 15, 0, 10, 10)).toBe(false);
  });
});