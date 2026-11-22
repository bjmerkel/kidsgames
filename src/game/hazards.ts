import { SINK_RECOVER_MS } from "./constants";
import type { Car, Hold, LevelDef, Stone, Swing } from "./types";

export function seatPosition(swing: Swing, timeSec: number): { x: number; y: number } {
  const angle = swing.amplitude * Math.sin(swing.omega * timeSec + swing.phase);
  return {
    x: swing.pivotX + Math.sin(angle) * swing.length,
    y: swing.pivotY + Math.cos(angle) * swing.length,
  };
}

export function holdVisible(hold: Hold, timeMs: number): boolean {
  if (hold.blinkPeriodMs === null) return true;
  const t = (timeMs + hold.blinkPhaseMs) % hold.blinkPeriodMs;
  return t < hold.blinkPeriodMs / 2;
}

export function stepCar(car: Car, dtSec: number, width: number): void {
  car.x += car.speed * dtSec;
  const half = car.w / 2;
  const span = width + car.w;
  if (car.speed > 0) {
    while (car.x - half > width) car.x -= span;
  } else if (car.speed < 0) {
    while (car.x + half < 0) car.x += span;
  }
}

export function stepStone(stone: Stone, dtMs: number, supportId: string | null): void {
  const dtSec = dtMs / 1000;
  stone.x += stone.vx * dtSec;
  if (stone.x < stone.minX) {
    stone.x = stone.minX;
    stone.vx = Math.abs(stone.vx);
  }
  if (stone.x > stone.maxX) {
    stone.x = stone.maxX;
    stone.vx = -Math.abs(stone.vx);
  }
  if (supportId === stone.id) {
    stone.emptyMs = 0;
    stone.occupiedMs += dtMs;
    if (stone.sinkAfterMs !== null && stone.occupiedMs >= stone.sinkAfterMs) {
      stone.submerged = true;
    }
    return;
  }
  stone.occupiedMs = 0;
  if (!stone.submerged) return;
  stone.emptyMs += dtMs;
  if (stone.emptyMs >= SINK_RECOVER_MS) {
    stone.submerged = false;
    stone.emptyMs = 0;
  }
}

export function stepHold(hold: Hold, dtSec: number, timeMs: number): void {
  hold.x += hold.vx * dtSec;
  if (hold.x < hold.minX) {
    hold.x = hold.minX;
    hold.vx = Math.abs(hold.vx);
  }
  if (hold.x > hold.maxX) {
    hold.x = hold.maxX;
    hold.vx = -Math.abs(hold.vx);
  }
  hold.visible = holdVisible(hold, timeMs);
}

export function stepHazards(level: LevelDef, dtMs: number, timeMs: number, supportId: string | null): void {
  const dtSec = dtMs / 1000;
  for (const segment of level.segments) {
    for (const car of segment.cars) stepCar(car, dtSec, level.width);
    for (const stone of segment.stones) stepStone(stone, dtMs, supportId);
    for (const hold of segment.holds) stepHold(hold, dtSec, timeMs);
    for (const chamber of segment.chambers) {
      for (const car of chamber.cars) stepCar(car, dtSec, level.width);
      for (const stone of chamber.stones) stepStone(stone, dtMs, supportId);
      for (const hold of chamber.holds) stepHold(hold, dtSec, timeMs);
    }
  }
}