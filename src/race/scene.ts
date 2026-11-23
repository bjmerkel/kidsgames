import type { TrackSample } from "./tracks";

const BACK = 168;
const HEIGHT = 128;
const LOOK = 110;

export function raceCamera(x: number, y: number, heading: number): {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
} {
  const aheadX = Math.cos(heading);
  const aheadZ = Math.sin(heading);
  return {
    x: x - aheadX * BACK,
    y: HEIGHT,
    z: y - aheadZ * BACK,
    lookX: x + aheadX * LOOK,
    lookY: 16,
    lookZ: y + aheadZ * LOOK,
  };
}

export function roadEdge(sample: TrackSample, halfWidth: number, side: 1 | -1): { x: number; z: number } {
  const nx = Math.cos(sample.heading + Math.PI / 2);
  const nz = Math.sin(sample.heading + Math.PI / 2);
  return { x: sample.x + nx * halfWidth * side, z: sample.y + nz * halfWidth * side };
}
