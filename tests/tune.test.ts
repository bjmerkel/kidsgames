import { describe, expect, it } from "vitest";
import { LIVES } from "../src/game/constants";
import { LEVELS, allCars, allHolds, allStones, allSwings } from "../src/game/levels";
import { createGame } from "../src/game/sim";
import { applyTunes, defaultTunes, loadTunes, mergeTunes, saveTunes, TUNE_STORAGE_KEY, type KeyValueStore } from "../src/game/tune";

describe("level settings", () => {
  it("reads the built-in backyard and driveway values", () => {
    const tunes = defaultTunes(LEVELS);
    const driveway = tunes[0];
    const backyard = tunes[1];
    expect(driveway.stonesNeverSink).toBe(true);
    expect(driveway.stoneDrift).toBe(0);
    expect(driveway.stoneTravel).toBe(0);
    expect(driveway.holdsStay).toBe(true);
    expect(driveway.lives).toBe(LIVES);
    expect(backyard.name).toBe("Emery's Backyard");
    expect(backyard.timeLimitSec).toBe(80);
    expect(backyard.stonesNeverSink).toBe(false);
    expect(backyard.stoneSinkSec).toBe(9.6);
    expect(backyard.stoneDrift).toBe(32);
    expect(backyard.stoneTravel).toBe(36);
    expect(backyard.holdsStay).toBe(false);
    expect(backyard.holdBlinkSec).toBe(1.6);
    expect(backyard.holdDrift).toBe(0);
    expect(backyard.cars.length).toBe(allCars(LEVELS[1]).length);
    expect(backyard.swings.length).toBe(allSwings(LEVELS[1]).length);
    expect(backyard.cars.map((car) => car.value)).toEqual(allCars(LEVELS[1]).map((car) => car.speed));
  });

  it("applies a backyard tune without changing the built-in level", () => {
    const before = structuredClone(LEVELS[1]);
    const tunes = defaultTunes(LEVELS);
    const backyard = tunes[1];
    backyard.timeLimitSec = 40;
    backyard.lives = 7;
    backyard.stoneSinkSec = 20;
    backyard.stoneDrift = 10;
    backyard.stoneTravel = 100;
    backyard.stoneSize = 20;
    backyard.holdsStay = true;
    backyard.holdDrift = 12;
    backyard.cars[0].value = 15;
    backyard.swings[0].value = 0.4;
    const tuned = applyTunes(LEVELS, tunes);
    const level = tuned[1];
    const center = level.width / 2;
    expect(level.timeLimitMs).toBe(40000);
    expect(level.lives).toBe(7);
    for (const stone of allStones(level)) {
      expect(stone.sinkAfterMs).toBe(20000);
      expect(Math.abs(stone.vx)).toBe(10);
      expect(stone.minX).toBe(center - 100);
      expect(stone.maxX).toBe(center + 100);
      expect(stone.r).toBe(20);
      expect(stone.x).toBeGreaterThanOrEqual(stone.minX);
      expect(stone.x).toBeLessThanOrEqual(stone.maxX);
    }
    for (const hold of allHolds(level)) {
      expect(hold.blinkPeriodMs).toBeNull();
      expect(Math.abs(hold.vx)).toBe(12);
    }
    expect(allCars(level)[0].speed).toBe(15);
    expect(allSwings(level)[0].omega).toBe(0.4);
    expect(LEVELS[1]).toEqual(before);
  });

  it("turns sinking off and leaves unknown cars alone", () => {
    const tunes = defaultTunes(LEVELS);
    tunes[1].stonesNeverSink = true;
    tunes[1].cars = [{ id: "missing", label: "Missing", value: 1 }];
    const level = applyTunes(LEVELS, tunes)[1];
    expect(allStones(level).every((stone) => stone.sinkAfterMs === null)).toBe(true);
    expect(allCars(level).map((car) => car.speed)).toEqual(allCars(LEVELS[1]).map((car) => car.speed));
  });

  it("keeps saved numbers and ignores a broken save", () => {
    const base = defaultTunes(LEVELS);
    const merged = mergeTunes(base, [{ id: 2, stoneSinkSec: 14, cars: [{ id: base[1].cars[0].id, value: 33 }] }]);
    expect(merged[1].stoneSinkSec).toBe(14);
    expect(merged[1].cars[0].value).toBe(33);
    expect(merged[1].stoneDrift).toBe(base[1].stoneDrift);
    expect(merged[0]).toEqual(base[0]);
    const store = memoryStore();
    saveTunes(merged, store);
    expect(loadTunes(LEVELS, store)[1].stoneSinkSec).toBe(14);
    store.setItem(TUNE_STORAGE_KEY, "{");
    expect(loadTunes(LEVELS, store)[1].stoneSinkSec).toBe(9.6);
  });

  it("starts a game from the tuned levels", () => {
    const tunes = defaultTunes(LEVELS);
    tunes[0].lives = 2;
    tunes[0].stonesNeverSink = false;
    tunes[0].stoneSinkSec = 1.5;
    const game = createGame(applyTunes(LEVELS, tunes));
    expect(game.crab.lives).toBe(2);
    expect(allStones(game.level).every((stone) => stone.sinkAfterMs === 1500)).toBe(true);
    expect(allStones(LEVELS[0]).every((stone) => stone.sinkAfterMs === null)).toBe(true);
  });
});

function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}
