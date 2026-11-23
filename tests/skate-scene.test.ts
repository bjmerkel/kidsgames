import { describe, expect, it } from "vitest";
import { VIEW_H } from "../src/game/constants";
import { courseWidth, SKATE_LEVELS } from "../src/skate/levels";
import { buildCourse, coursePose } from "../src/skate/course";
import { skateChase, skateProps, skateScreenY } from "../src/skate/scene";
import { createSkate } from "../src/skate/sim";

describe("ollie cat scene", () => {
  it("looks down the street from above and behind the cat", () => {
    const chase = skateChase(400, 160, 20, 0);
    expect(chase.x).toBeLessThan(400);
    expect(chase.y).toBeGreaterThan(160 + 200);
    expect(chase.lookX).toBeGreaterThan(400);
    expect(chase.lookY).toBeLessThan(chase.y);
    expect(chase.z).toBeCloseTo(20);

    const turn = skateChase(0, 160, 0, Math.PI / 2);
    expect(turn.z).toBeLessThan(0);
    expect(turn.lookZ).toBeGreaterThan(0);
  });

  it("bends every park into a course you can steer along", () => {
    for (const [index, level] of SKATE_LEVELS.entries()) {
      const course = buildCourse(level, index);
      expect(course[course.length - 1].s).toBeCloseTo(courseWidth(level), 0);
      const zs = course.map((point) => point.z);
      expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(70);
      const center = coursePose(course, 140, 0);
      const side = coursePose(course, 140, 50);
      expect(Math.hypot(side.x - center.x, side.z - center.z)).toBeCloseTo(50, 0);
    }
  });

  it("lifts canvas heights so the ground sits above the bottom of the screen", () => {
    expect(skateScreenY(0)).toBe(VIEW_H);
    expect(skateScreenY(560)).toBe(VIEW_H - 560);
  });

  it("builds a prop for every piece, including a ramp, a rail, a gap, and a tunnel", () => {
    const milk = SKATE_LEVELS[0];
    const props = skateProps(milk);
    expect(props.reduce((sum, prop) => sum + prop.w, 0)).toBe(courseWidth(milk));
    expect(props.map((prop) => prop.kind)).toEqual(milk.pieces.map((piece) => piece.kind));
    expect(props[0]).toMatchObject({ kind: "flat", x: 0, y0: 560, y1: 560 });
    expect(props.some((prop) => prop.kind === "ramp" && prop.y0 !== prop.y1)).toBe(true);
    expect(props.some((prop) => prop.kind === "tunnel" && (prop.gap ?? 0) > 0)).toBe(true);

    const kinds = new Set(SKATE_LEVELS.flatMap((level) => skateProps(level).map((prop) => prop.kind)));
    expect(kinds).toEqual(new Set(["flat", "ramp", "gap", "rail", "tunnel", "finish"]));

    const alley = skateProps(SKATE_LEVELS[1]);
    expect(alley.some((prop) => prop.kind === "rail")).toBe(true);
    const gap = skateProps(SKATE_LEVELS[3]);
    expect(gap.some((prop) => prop.kind === "gap")).toBe(true);
  });

  it("places the cat on the surface of a fresh park", () => {
    const state = createSkate(0);
    const pose = {
      x: state.x,
      y: skateScreenY(state.y),
    };
    expect(pose.x).toBe(48);
    expect(pose.y).toBe(skateScreenY(560));
  });
});
