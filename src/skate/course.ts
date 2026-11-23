import { SKATE_LEVELS, type Piece, type SkateLevel } from "./levels";

export const ROAD_HALF = 150;
export const RAIL_REACH = 36;

export type CoursePoint = {
  s: number;
  x: number;
  z: number;
  heading: number;
  kind: Piece["kind"];
  ground: number | null;
  ceiling: number | null;
  rail: number | null;
};

const STEP = 10;

export function pieceTurn(levelIndex: number, pieceIndex: number, kind: Piece["kind"]): number {
  if (kind === "finish" || kind === "gap") return 0;
  const sign = (levelIndex + pieceIndex) % 2 === 0 ? 1 : -1;
  if (kind === "tunnel") return sign * 0.3;
  if (kind === "rail") return sign * 0.22;
  return sign * 0.5;
}

export function buildCourse(level: SkateLevel, levelIndex: number): CoursePoint[] {
  const points: CoursePoint[] = [];
  let s = 0;
  let x = 0;
  let z = 0;
  let heading = 0;
  level.pieces.forEach((piece, index) => {
    const turn = pieceTurn(levelIndex, index, piece.kind);
    const steps = Math.max(1, Math.ceil(piece.w / STEP));
    for (let step = 0; step <= steps; step += 1) {
      if (step === 0 && points.length > 0) continue;
      const local = (piece.w * step) / steps;
      const along = heading + turn * (step / steps);
      if (step > 0) {
        const ds = piece.w / steps;
        const mid = heading + turn * ((step - 0.5) / steps);
        x += Math.cos(mid) * ds;
        z += Math.sin(mid) * ds;
        s += ds;
      }
      points.push({
        s,
        x,
        z,
        heading: along,
        kind: piece.kind,
        ground: surfaceHeight(piece, local),
        ceiling: piece.kind === "tunnel" ? piece.y - piece.gap : null,
        rail: piece.kind === "rail" ? piece.y : null,
      });
    }
    heading += turn;
  });
  return points;
}

const COURSES: CoursePoint[][] = [];

export type CourseTreat = { id: number; s: number; lane: number };

const TREAT_LANE = 58;

export function courseTreats(level: SkateLevel, levelIndex: number): CourseTreat[] {
  const course = buildCourse(level, levelIndex);
  const end = course[course.length - 1]?.s ?? 0;
  const treats: CourseTreat[] = [];
  let next = 280;
  let side = levelIndex % 2 === 0 ? 1 : -1;
  for (const point of course) {
    if (point.s + 80 > end) break;
    if (point.s < next) continue;
    if (point.ground == null || point.kind === "tunnel" || point.kind === "finish") continue;
    treats.push({ id: treats.length, s: point.s, lane: side * TREAT_LANE });
    side *= -1;
    next = point.s + 260;
  }
  return treats;
}

export function courseFor(levelIndex: number): CoursePoint[] {
  if (!COURSES[levelIndex]) COURSES[levelIndex] = buildCourse(SKATE_LEVELS[levelIndex], levelIndex);
  return COURSES[levelIndex];
}

export function coursePose(points: readonly CoursePoint[], distance: number, lane: number): { x: number; z: number; heading: number } {
  if (points.length === 0) return { x: 0, z: 0, heading: 0 };
  let index = 0;
  const s = Math.max(0, distance);
  while (index < points.length - 2 && points[index + 1].s < s) index += 1;
  const a = points[index];
  const b = points[Math.min(index + 1, points.length - 1)];
  const span = Math.max(0.001, b.s - a.s);
  const t = Math.max(0, Math.min(1, (s - a.s) / span));
  const heading = a.heading + (b.heading - a.heading) * t;
  const cx = a.x + (b.x - a.x) * t;
  const cz = a.z + (b.z - a.z) * t;
  return {
    x: cx - Math.sin(heading) * lane,
    z: cz + Math.cos(heading) * lane,
    heading,
  };
}

function surfaceHeight(piece: Piece, local: number): number | null {
  if (piece.kind === "gap" || piece.kind === "rail") return null;
  if (piece.kind === "ramp") return piece.y0 + ((piece.y1 - piece.y0) * local) / piece.w;
  return piece.y;
}
