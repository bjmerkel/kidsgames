import { crabRadius } from "./crab";
import { circlesOverlap, circleHitsAabb } from "./geometry";
import { seatPosition } from "./hazards";
import type { Car, Chamber, Crab, HazardHit, Hold, LevelDef, Segment, Stone, Swing } from "./types";

export type Zone =
  | { tag: "ground" }
  | { tag: "road"; cars: Car[] }
  | { tag: "water"; stones: Stone[] }
  | { tag: "swings"; swings: Swing[] }
  | { tag: "climb"; holds: Hold[]; ledge: boolean }
  | { tag: "combined"; cars: Car[]; stones: Stone[]; swings: Swing[]; holds: Hold[]; ledge: boolean }
  | { tag: "burrow" }
  | { tag: "mouth" };

export type Support =
  | { kind: "ground" }
  | { kind: "stone"; id: string; x: number; y: number }
  | { kind: "hold"; id: string; x: number; y: number }
  | { kind: "none" };

export function segmentAt(level: LevelDef, y: number): Segment | null {
  return level.segments.find((segment) => y >= segment.y && y < segment.y + segment.h) ?? null;
}

export function chamberAt(segment: Segment, y: number): Chamber | null {
  if (segment.kind !== "tunnel") return null;
  return segment.chambers.find((chamber) => y >= chamber.y && y < chamber.y + chamber.h) ?? null;
}

export function zoneAt(level: LevelDef, y: number): Zone {
  const segment = segmentAt(level, y);
  if (!segment) return { tag: "ground" };
  if (segment.kind === "curb") return { tag: "ground" };
  if (segment.kind === "road") return { tag: "road", cars: segment.cars };
  if (segment.kind === "pond") return { tag: "water", stones: segment.stones };
  if (segment.kind === "swings") return { tag: "swings", swings: segment.swings };
  if (segment.kind === "wall") {
    const ledge = y >= segment.y + segment.h - segment.ledgeH;
    return { tag: "climb", holds: segment.holds, ledge };
  }
  if (y < segment.y + segment.burrowH) return { tag: "burrow" };
  if (y >= segment.y + segment.h - segment.mouthH) return { tag: "mouth" };
  const chamber = chamberAt(segment, y);
  if (!chamber) return { tag: "ground" };
  if (chamber.kind === "hotwheels") return { tag: "road", cars: chamber.cars };
  if (chamber.kind === "stone") return { tag: "water", stones: chamber.stones };
  if (chamber.kind === "swing") return { tag: "swings", swings: chamber.swings };
  if (chamber.kind === "hold") {
    const ledge = y >= chamber.y + chamber.h - chamber.ledgeH;
    return { tag: "climb", holds: chamber.holds, ledge };
  }
  const ledge = y >= chamber.y + chamber.h - chamber.ledgeH;
  return {
    tag: "combined",
    cars: chamber.cars,
    stones: chamber.stones,
    swings: chamber.swings,
    holds: chamber.holds,
    ledge,
  };
}

export function detectHit(level: LevelDef, crab: Crab, timeSec: number): HazardHit | null {
  const zone = zoneAt(level, crab.y);
  const radius = crabRadius(crab);
  if (zone.tag === "ground" || zone.tag === "burrow" || zone.tag === "mouth") return null;
  if (zone.tag === "road") return carsHit(zone.cars, crab, radius) ? "car" : null;
  if (zone.tag === "water") return supportedByStone(zone.stones, crab, radius) ? null : "water";
  if (zone.tag === "swings") return swingsHit(zone.swings, crab, radius, timeSec) ? "swing" : null;
  if (zone.tag === "climb") {
    if (zone.ledge) return null;
    return supportedByHold(zone.holds, crab, radius) ? null : "fall";
  }
  if (carsHit(zone.cars, crab, radius)) return "car";
  if (swingsHit(zone.swings, crab, radius, timeSec)) return "swing";
  if (zone.ledge) return null;
  if (!supportedByStone(zone.stones, crab, radius) && !supportedByHold(zone.holds, crab, radius)) {
    return "water";
  }
  return null;
}

export function pickSupport(level: LevelDef, crab: Crab): Support {
  const zone = zoneAt(level, crab.y);
  const radius = crabRadius(crab);
  if (
    zone.tag === "ground" ||
    zone.tag === "road" ||
    zone.tag === "swings" ||
    zone.tag === "burrow" ||
    zone.tag === "mouth"
  ) {
    return { kind: "ground" };
  }
  if (zone.tag === "water") {
    const stone = nearestStone(zone.stones, crab, radius);
    return stone ? { kind: "stone", id: stone.id, x: stone.x, y: stone.y } : { kind: "none" };
  }
  if (zone.tag === "climb") {
    if (zone.ledge) return { kind: "ground" };
    const hold = nearestHold(zone.holds, crab, radius);
    return hold ? { kind: "hold", id: hold.id, x: hold.x, y: hold.y } : { kind: "none" };
  }
  if (zone.ledge) return { kind: "ground" };
  const stone = nearestStone(zone.stones, crab, radius);
  if (stone) return { kind: "stone", id: stone.id, x: stone.x, y: stone.y };
  const hold = nearestHold(zone.holds, crab, radius);
  if (hold) return { kind: "hold", id: hold.id, x: hold.x, y: hold.y };
  return { kind: "none" };
}

function carsHit(cars: Car[], crab: Crab, radius: number): boolean {
  return cars.some((car) => circleHitsAabb(crab.x, crab.y, radius, car.x, car.y, car.w, car.h));
}

function swingsHit(swings: Swing[], crab: Crab, radius: number, timeSec: number): boolean {
  return swings.some((swing) => {
    const seat = seatPosition(swing, timeSec);
    return circlesOverlap(crab.x, crab.y, radius, seat.x, seat.y, swing.seatR);
  });
}

function supportedByStone(stones: Stone[], crab: Crab, radius: number): boolean {
  return nearestStone(stones, crab, radius) !== null;
}

function supportedByHold(holds: Hold[], crab: Crab, radius: number): boolean {
  return nearestHold(holds, crab, radius) !== null;
}

function nearestStone(stones: Stone[], crab: Crab, radius: number): Stone | null {
  let best: Stone | null = null;
  let bestD = Infinity;
  for (const stone of stones) {
    if (stone.submerged) continue;
    if (!circlesOverlap(crab.x, crab.y, radius, stone.x, stone.y, stone.r)) continue;
    const dx = crab.x - stone.x;
    const dy = crab.y - stone.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = stone;
      bestD = d;
    }
  }
  return best;
}

function nearestHold(holds: Hold[], crab: Crab, radius: number): Hold | null {
  let best: Hold | null = null;
  let bestD = Infinity;
  for (const hold of holds) {
    if (!hold.visible) continue;
    if (!circlesOverlap(crab.x, crab.y, radius, hold.x, hold.y, hold.r)) continue;
    const dx = crab.x - hold.x;
    const dy = crab.y - hold.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = hold;
      bestD = d;
    }
  }
  return best;
}