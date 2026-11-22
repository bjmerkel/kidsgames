import { LIVES } from "./constants";
import { clamp } from "./geometry";
import { allCars, allHolds, allStones, allSwings } from "./levels";
import type { LevelDef } from "./types";

export const TUNE_STORAGE_KEY = "kidsgames.crab-levels.v1";

export interface NamedSpeed {
  id: string;
  label: string;
  value: number;
}

export interface LevelTune {
  id: number;
  name: string;
  timeLimitSec: number;
  lives: number;
  stonesNeverSink: boolean;
  stoneSinkSec: number;
  stoneDrift: number;
  stoneTravel: number;
  stoneSize: number;
  holdsStay: boolean;
  holdBlinkSec: number;
  holdDrift: number;
  holdSize: number;
  cars: NamedSpeed[];
  swings: NamedSpeed[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultTunes(levels: LevelDef[]): LevelTune[] {
  return levels.map(describeLevel);
}

export function applyTunes(levels: LevelDef[], tunes: LevelTune[]): LevelDef[] {
  return levels.map((level) => {
    const copy = structuredClone(level);
    const tune = tunes.find((item) => item.id === level.id);
    if (tune) applyOne(copy, tune);
    return copy;
  });
}

export function mergeTunes(base: LevelTune[], saved: unknown): LevelTune[] {
  if (!Array.isArray(saved)) return base;
  return base.map((level) => {
    const found = saved.find((item) => isRecord(item) && item.id === level.id);
    if (!isRecord(found)) return level;
    return {
      ...level,
      timeLimitSec: num(found.timeLimitSec, level.timeLimitSec),
      lives: num(found.lives, level.lives),
      stonesNeverSink: bool(found.stonesNeverSink, level.stonesNeverSink),
      stoneSinkSec: num(found.stoneSinkSec, level.stoneSinkSec),
      stoneDrift: num(found.stoneDrift, level.stoneDrift),
      stoneTravel: num(found.stoneTravel, level.stoneTravel),
      stoneSize: num(found.stoneSize, level.stoneSize),
      holdsStay: bool(found.holdsStay, level.holdsStay),
      holdBlinkSec: num(found.holdBlinkSec, level.holdBlinkSec),
      holdDrift: num(found.holdDrift, level.holdDrift),
      holdSize: num(found.holdSize, level.holdSize),
      cars: mergeSpeeds(level.cars, found.cars),
      swings: mergeSpeeds(level.swings, found.swings),
    };
  });
}

export function loadTunes(levels: LevelDef[], store?: KeyValueStore | null): LevelTune[] {
  const defaults = defaultTunes(levels);
  if (!store) return defaults;
  try {
    const raw = store.getItem(TUNE_STORAGE_KEY);
    if (!raw) return defaults;
    return mergeTunes(defaults, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

export function saveTunes(tunes: LevelTune[], store?: KeyValueStore | null): void {
  store?.setItem(TUNE_STORAGE_KEY, JSON.stringify(tunes));
}

function describeLevel(level: LevelDef): LevelTune {
  const stones = allStones(level);
  const holds = allHolds(level);
  const center = level.width / 2;
  const stone = stones[0];
  const hold = holds[0];
  const sink = stones.find((item) => item.sinkAfterMs !== null)?.sinkAfterMs ?? null;
  const blink = holds.find((item) => item.blinkPeriodMs !== null)?.blinkPeriodMs ?? null;
  const travel = stone ? Math.max(Math.abs(stone.minX - center), Math.abs(stone.maxX - center)) : 0;
  return {
    id: level.id,
    name: level.name,
    timeLimitSec: round1(level.timeLimitMs / 1000),
    lives: level.lives ?? LIVES,
    stonesNeverSink: sink === null,
    stoneSinkSec: sink === null ? 4 : round1(sink / 1000),
    stoneDrift: Math.max(0, ...stones.map((item) => Math.abs(item.vx))),
    stoneTravel: round1(travel),
    stoneSize: stone?.r ?? 36,
    holdsStay: blink === null,
    holdBlinkSec: blink === null ? 2 : round1(blink / 1000),
    holdDrift: Math.max(0, ...holds.map((item) => Math.abs(item.vx))),
    holdSize: hold?.r ?? 36,
    cars: labelCars(level),
    swings: labelSwings(level),
  };
}

function labelCars(level: LevelDef): NamedSpeed[] {
  const rows: NamedSpeed[] = [];
  for (const segment of [...level.segments].sort((a, b) => b.y - a.y)) {
    if (segment.kind === "road") pushSpeeds(rows, segment.cars, "Yard road car", (car) => car.speed);
    for (const chamber of [...segment.chambers].sort((a, b) => b.y - a.y)) {
      const prefix = chamber.kind === "combined" ? "Final room car" : chamber.kind === "hotwheels" ? "Tunnel road car" : "";
      if (prefix) pushSpeeds(rows, chamber.cars, prefix, (car) => car.speed);
    }
  }
  return rows;
}

function labelSwings(level: LevelDef): NamedSpeed[] {
  const rows: NamedSpeed[] = [];
  for (const segment of [...level.segments].sort((a, b) => b.y - a.y)) {
    if (segment.kind === "swings") pushSpeeds(rows, segment.swings, "Yard swing", (swing) => swing.omega);
    for (const chamber of [...segment.chambers].sort((a, b) => b.y - a.y)) {
      const prefix = chamber.kind === "combined" ? "Final room swing" : chamber.kind === "swing" ? "Tunnel swing" : "";
      if (prefix) pushSpeeds(rows, chamber.swings, prefix, (swing) => swing.omega);
    }
  }
  return rows;
}

function pushSpeeds<T extends { id: string }>(
  rows: NamedSpeed[],
  items: T[],
  prefix: string,
  value: (item: T) => number,
): void {
  items.forEach((item, index) => {
    rows.push({ id: item.id, label: `${prefix} ${index + 1}`, value: value(item) });
  });
}

function applyOne(level: LevelDef, tune: LevelTune): void {
  level.timeLimitMs = Math.round(clampNum(tune.timeLimitSec, 15, 600) * 1000);
  level.lives = Math.round(clampNum(tune.lives, 1, 9));
  const sink = tune.stonesNeverSink ? null : Math.round(clampNum(tune.stoneSinkSec, 0.5, 120) * 1000);
  const drift = clampNum(tune.stoneDrift, 0, 200);
  const travel = clampNum(tune.stoneTravel, 0, 220);
  const stoneSize = clampNum(tune.stoneSize, 16, 80);
  const center = level.width / 2;
  for (const stone of allStones(level)) {
    stone.sinkAfterMs = sink;
    stone.vx = (stone.vx < 0 ? -1 : 1) * drift;
    stone.r = stoneSize;
    stone.minX = center - travel;
    stone.maxX = center + travel;
    stone.x = clamp(stone.x, stone.minX, stone.maxX);
  }
  const blink = tune.holdsStay ? null : Math.round(clampNum(tune.holdBlinkSec, 0.4, 20) * 1000);
  const holdDrift = clampNum(tune.holdDrift, 0, 200);
  const holdSize = clampNum(tune.holdSize, 16, 80);
  for (const hold of allHolds(level)) {
    hold.blinkPeriodMs = blink;
    hold.vx = (hold.vx < 0 ? -1 : 1) * holdDrift;
    hold.r = holdSize;
    if (holdDrift > 0) {
      hold.minX = 40;
      hold.maxX = level.width - 40;
    }
  }
  const cars = new Map(tune.cars.map((car) => [car.id, car.value]));
  for (const car of allCars(level)) {
    const speed = cars.get(car.id);
    if (speed !== undefined) car.speed = clampNum(speed, -400, 400);
  }
  const swings = new Map(tune.swings.map((swing) => [swing.id, swing.value]));
  for (const swing of allSwings(level)) {
    const omega = swings.get(swing.id);
    if (omega !== undefined) swing.omega = clampNum(omega, 0, 8);
  }
}

function mergeSpeeds(base: NamedSpeed[], saved: unknown): NamedSpeed[] {
  if (!Array.isArray(saved)) return base;
  return base.map((item) => {
    const found = saved.find((entry) => isRecord(entry) && entry.id === item.id);
    return { ...item, value: isRecord(found) ? num(found.value, item.value) : item.value };
  });
}

function clampNum(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
