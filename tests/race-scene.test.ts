import { describe, expect, it } from "vitest";
import { raceCamera, roadEdge } from "../src/race/scene";
import { TRACKS } from "../src/race/tracks";

describe("woodland race scene", () => {
  it("puts the camera behind the kart and looks ahead", () => {
    const camera = raceCamera(100, 200, 0);
    expect(camera.x).toBeLessThan(100);
    expect(camera.z).toBeCloseTo(200);
    expect(camera.y).toBeGreaterThan(40);
    expect(camera.lookX).toBeGreaterThan(100);
    expect(camera.lookZ).toBeCloseTo(200);

    const down = raceCamera(0, 0, Math.PI / 2);
    expect(down.z).toBeLessThan(0);
    expect(down.lookZ).toBeGreaterThan(0);
  });

  it("offsets the road edges by half the track width", () => {
    const sample = { x: 10, y: 20, dist: 0, heading: 0 };
    const left = roadEdge(sample, 40, 1);
    const right = roadEdge(sample, 40, -1);
    expect(left.x).toBeCloseTo(10);
    expect(right.x).toBeCloseTo(10);
    expect(Math.hypot(left.x - right.x, left.z - right.z)).toBeCloseTo(80);
  });

  it("builds a closed ribbon for every track", () => {
    for (const track of TRACKS) {
      expect(track.samples.length).toBeGreaterThan(8);
      const first = roadEdge(track.samples[0], track.width / 2, 1);
      const last = roadEdge(track.samples[track.samples.length - 1], track.width / 2, 1);
      expect(Math.hypot(first.x - last.x, first.z - last.z)).toBeLessThan(track.spacing * 2);
    }
  });
});
