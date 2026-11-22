import { describe, expect, it } from "vitest";
import { CRAB_R, HOP, HOP_MS, TUTORIAL_DELAY_SEC, WORLD_W } from "../src/game/constants";
import { seatPosition } from "../src/game/hazards";
import {
  LEVELS,
  allCars,
  allHolds,
  allStones,
  allSwings,
  pressure,
  startPoint,
} from "../src/game/levels";
import type { LevelDef } from "../src/game/types";

describe("five levels", () => {
  it("names Emery's five crossings and ends each one in a combined tunnel", () => {
    for (const level of LEVELS) expect(level.intro).toContain("Emery is awesome");
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Emery's Driveway",
      "Emery's Backyard",
      "Emery's Playground",
      "Emery's Obstacle Course",
      "Emery's Tunnel",
    ]);
    for (const level of LEVELS) {
      const tunnel = [...level.segments].sort((a, b) => a.y - b.y)[0];
      expect(tunnel.kind).toBe("tunnel");
      const playOrder = [...tunnel.chambers].sort((a, b) => b.y - a.y).map((chamber) => chamber.kind);
      expect(playOrder).toEqual(["hotwheels", "stone", "swing", "hold", "combined"]);
      const combined = tunnel.chambers.find((chamber) => chamber.kind === "combined");
      expect(combined?.cars.length).toBeGreaterThan(0);
      expect(combined?.stones.length).toBeGreaterThan(0);
      expect(combined?.swings.length).toBeGreaterThan(0);
      expect(combined?.holds.length).toBeGreaterThan(0);
    }
  });

  it("raises the pressure from level to level and makes the last tunnel the longest", () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(pressure(LEVELS[i])).toBeGreaterThan(pressure(LEVELS[i - 1]));
    }
    const tunnelH = (level: LevelDef) => level.segments.find((segment) => segment.kind === "tunnel")?.h ?? 0;
    expect(tunnelH(LEVELS[4])).toBeGreaterThan(tunnelH(LEVELS[0]));
    expect(LEVELS.map((level) => level.timeLimitMs)).toEqual([90000, 80000, 70000, 60000, 85000]);
    expect(allStones(LEVELS[0]).every((stone) => stone.sinkAfterMs === null)).toBe(true);
    expect(LEVELS.slice(1).map((level) => new Set(allStones(level).map((stone) => stone.sinkAfterMs)))).toEqual([
      new Set([9600]),
      new Set([9300]),
      new Set([9100]),
      new Set([8900]),
    ]);
  });

  it("keeps level 1 cars off the spine when a straight hop would cross them", () => {
    const level = LEVELS[0];
    const hopSpeed = HOP / (HOP_MS / 1000);
    const startY = startPoint(level).y;
    for (const car of allCars(level)) {
      const tCross = (startY - car.y) / hopSpeed;
      const xAtCross = car.x + car.speed * tCross;
      expect(Math.abs(xAtCross - WORLD_W / 2)).toBeGreaterThan(CRAB_R + car.w / 2 + 10);
      expect(xAtCross).toBeCloseTo(WORLD_W / 2 - car.speed * TUTORIAL_DELAY_SEC, 5);
    }
    for (const swing of allSwings(level)) {
      for (let t = 0; t < 8; t += 0.05) {
        const seat = seatPosition(swing, t);
        expect(Math.abs(seat.x - WORLD_W / 2)).toBeGreaterThan(80);
      }
    }
    expect(allHolds(level).every((hold) => hold.blinkPeriodMs === null)).toBe(true);
    expect(allStones(level).every((stone) => stone.vx === 0)).toBe(true);
  });

  it("gives later levels a real gap and a real threat in every road lane", () => {
    for (const level of LEVELS.slice(1)) {
      const lanes = new Map<number, typeof level.segments[0]["cars"]>();
      for (const car of allCars(level)) {
        const lane = lanes.get(car.y) ?? [];
        lane.push(car);
        lanes.set(car.y, lane);
      }
      for (const [, cars] of lanes) {
        let blocked = false;
        let clear = false;
        for (let t = 0; t <= 8; t += 0.1) {
          const hit = cars.some((car) => {
            const x = wrappedX(car.x + car.speed * t, car.w, level.width);
            return Math.abs(x - WORLD_W / 2) <= CRAB_R + car.w / 2;
          });
          blocked = blocked || hit;
          clear = clear || !hit;
        }
        expect(blocked).toBe(true);
        expect(clear).toBe(true);
      }
      expect(allSwings(level).some((swing) => swing.pivotX === WORLD_W / 2)).toBe(true);
      expect(allStones(level).some((stone) => stone.vx !== 0)).toBe(true);
      expect(allHolds(level).some((hold) => hold.blinkPeriodMs !== null)).toBe(true);
    }
  });
});

function wrappedX(x: number, w: number, width: number): number {
  const half = w / 2;
  const span = width + w;
  let next = x;
  while (next - half > width) next -= span;
  while (next + half < 0) next += span;
  return next;
}