export type Piece =
  | { kind: "flat"; w: number; y: number }
  | { kind: "ramp"; w: number; y0: number; y1: number }
  | { kind: "gap"; w: number }
  | { kind: "rail"; w: number; y: number }
  | { kind: "tunnel"; w: number; y: number; gap: number }
  | { kind: "finish"; w: number; y: number };

export type SkateLevel = {
  name: string;
  blurb: string;
  sky?: "day" | "dusk" | "night";
  pieces: Piece[];
};

const GROUND = 560;

export const SKATE_LEVELS: SkateLevel[] = [
  {
    name: "Milk Street",
    blurb: "Grab the orange fish. Hold a side, then let go for a boost.",
    pieces: [
      { kind: "flat", w: 240, y: GROUND },
      { kind: "ramp", w: 150, y0: GROUND, y1: 470 },
      { kind: "ramp", w: 170, y0: 470, y1: GROUND },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 450 },
      { kind: "flat", w: 280, y: GROUND },
      { kind: "tunnel", w: 320, y: GROUND, gap: 48 },
      { kind: "flat", w: 180, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Alley Rail",
    blurb: "Launch off the ramp and grind the rail.",
    pieces: [
      { kind: "flat", w: 220, y: GROUND },
      { kind: "ramp", w: 160, y0: GROUND, y1: 500 },
      { kind: "rail", w: 260, y: 530 },
      { kind: "flat", w: 220, y: GROUND },
      { kind: "tunnel", w: 240, y: GROUND, gap: 48 },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Tunnel Run",
    blurb: "Crouch or the tunnel roof stops you.",
    pieces: [
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 480 },
      { kind: "ramp", w: 180, y0: 480, y1: GROUND },
      { kind: "tunnel", w: 460, y: GROUND, gap: 46 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 450 },
      { kind: "flat", w: 240, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Gap Park",
    blurb: "Take the speed ramp and clear the gap.",
    pieces: [
      { kind: "flat", w: 200, y: GROUND },
      { kind: "ramp", w: 150, y0: GROUND, y1: 480 },
      { kind: "ramp", w: 160, y0: 480, y1: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 440 },
      { kind: "gap", w: 170 },
      { kind: "flat", w: 260, y: GROUND },
      { kind: "tunnel", w: 220, y: GROUND, gap: 48 },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Night Bowl",
    blurb: "Ramps, a tunnel, a gap, and a rail.",
    sky: "night",
    pieces: [
      { kind: "flat", w: 160, y: GROUND },
      { kind: "ramp", w: 120, y0: GROUND, y1: 490 },
      { kind: "ramp", w: 150, y0: 490, y1: GROUND },
      { kind: "tunnel", w: 280, y: GROUND, gap: 46 },
      { kind: "ramp", w: 130, y0: GROUND, y1: 450 },
      { kind: "gap", w: 150 },
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 120, y0: GROUND, y1: 500 },
      { kind: "rail", w: 220, y: 530 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Switchback",
    blurb: "Ride both bowls, then crouch the long tunnel.",
    pieces: [
      { kind: "flat", w: 220, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 470 },
      { kind: "ramp", w: 190, y0: 470, y1: GROUND },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 450 },
      { kind: "ramp", w: 210, y0: 450, y1: GROUND },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "gap", w: 180 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "tunnel", w: 680, y: GROUND, gap: 44 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "rail", w: 220, y: 530 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Jump Gap",
    blurb: "Ollie the gap. Coasting is not enough.",
    pieces: [
      { kind: "flat", w: 280, y: GROUND },
      { kind: "gap", w: 200 },
      { kind: "flat", w: 200, y: GROUND },
      { kind: "tunnel", w: 340, y: GROUND, gap: 44 },
      { kind: "flat", w: 120, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 480 },
      { kind: "rail", w: 260, y: 500 },
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 150, y0: GROUND, y1: 470 },
      { kind: "ramp", w: 180, y0: 470, y1: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Double Gap",
    blurb: "Two gaps in a row. Land, then jump again.",
    pieces: [
      { kind: "flat", w: 260, y: GROUND },
      { kind: "gap", w: 180 },
      { kind: "flat", w: 200, y: GROUND },
      { kind: "gap", w: 200 },
      { kind: "flat", w: 180, y: GROUND },
      { kind: "tunnel", w: 300, y: GROUND, gap: 44 },
      { kind: "flat", w: 120, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 490 },
      { kind: "rail", w: 280, y: 510 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 460 },
      { kind: "ramp", w: 170, y0: 460, y1: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Low Roof",
    blurb: "Crouch both tunnels, and ollie the gap between them.",
    pieces: [
      { kind: "flat", w: 200, y: GROUND },
      { kind: "tunnel", w: 560, y: GROUND, gap: 44 },
      { kind: "flat", w: 90, y: GROUND },
      { kind: "gap", w: 190 },
      { kind: "flat", w: 150, y: GROUND },
      { kind: "tunnel", w: 480, y: GROUND, gap: 44 },
      { kind: "flat", w: 120, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 500 },
      { kind: "rail", w: 300, y: 520 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Stair Drop",
    blurb: "Three speed drops, then a gap off the lip.",
    sky: "dusk",
    pieces: [
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 120, y0: GROUND, y1: 500 },
      { kind: "ramp", w: 160, y0: 500, y1: GROUND },
      { kind: "flat", w: 90, y: GROUND },
      { kind: "ramp", w: 110, y0: GROUND, y1: 470 },
      { kind: "ramp", w: 160, y0: 470, y1: GROUND },
      { kind: "flat", w: 90, y: GROUND },
      { kind: "ramp", w: 100, y0: GROUND, y1: 440 },
      { kind: "ramp", w: 170, y0: 440, y1: GROUND },
      { kind: "flat", w: 70, y: GROUND },
      { kind: "ramp", w: 120, y0: GROUND, y1: 430 },
      { kind: "gap", w: 210 },
      { kind: "flat", w: 200, y: GROUND },
      { kind: "tunnel", w: 300, y: GROUND, gap: 44 },
      { kind: "flat", w: 100, y: GROUND },
      { kind: "rail", w: 240, y: 520 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Overpass",
    blurb: "Tunnel, gap, rail, and one more gap.",
    sky: "dusk",
    pieces: [
      { kind: "flat", w: 200, y: GROUND },
      { kind: "tunnel", w: 380, y: GROUND, gap: 44 },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "gap", w: 180 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "ramp", w: 120, y0: GROUND, y1: 490 },
      { kind: "rail", w: 320, y: 510 },
      { kind: "flat", w: 100, y: GROUND },
      { kind: "gap", w: 200 },
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 460 },
      { kind: "ramp", w: 180, y0: 460, y1: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Wide Canyon",
    blurb: "Take the speed ramp, then ollie the wide gap.",
    sky: "dusk",
    pieces: [
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 450 },
      { kind: "ramp", w: 210, y0: 450, y1: GROUND },
      { kind: "flat", w: 70, y: GROUND },
      { kind: "gap", w: 260 },
      { kind: "flat", w: 220, y: GROUND },
      { kind: "tunnel", w: 360, y: GROUND, gap: 44 },
      { kind: "flat", w: 120, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 490 },
      { kind: "rail", w: 280, y: 510 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Pipe Run",
    blurb: "Crouch the high tunnel, drop, then crouch again.",
    sky: "night",
    pieces: [
      { kind: "flat", w: 180, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 470 },
      { kind: "tunnel", w: 520, y: 470, gap: 44 },
      { kind: "ramp", w: 170, y0: 470, y1: GROUND },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "gap", w: 180 },
      { kind: "flat", w: 150, y: GROUND },
      { kind: "tunnel", w: 500, y: GROUND, gap: 44 },
      { kind: "flat", w: 140, y: GROUND },
      { kind: "rail", w: 240, y: 530 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 480 },
      { kind: "ramp", w: 160, y0: 480, y1: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Sky Rail",
    blurb: "Launch off the lip, grind, then clear the gap.",
    sky: "night",
    pieces: [
      { kind: "flat", w: 200, y: GROUND },
      { kind: "ramp", w: 150, y0: GROUND, y1: 420 },
      { kind: "flat", w: 50, y: 500 },
      { kind: "rail", w: 280, y: 460 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "gap", w: 170 },
      { kind: "flat", w: 200, y: GROUND },
      { kind: "tunnel", w: 320, y: GROUND, gap: 44 },
      { kind: "flat", w: 120, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 480 },
      { kind: "ramp", w: 170, y0: 480, y1: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
  {
    name: "Midnight Final",
    blurb: "Speed, two tunnels, three gaps, and a long rail.",
    sky: "night",
    pieces: [
      { kind: "flat", w: 200, y: GROUND },
      { kind: "ramp", w: 140, y0: GROUND, y1: 460 },
      { kind: "ramp", w: 200, y0: 460, y1: GROUND },
      { kind: "tunnel", w: 420, y: GROUND, gap: 44 },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "gap", w: 190 },
      { kind: "flat", w: 150, y: GROUND },
      { kind: "ramp", w: 130, y0: GROUND, y1: 430 },
      { kind: "gap", w: 220 },
      { kind: "flat", w: 160, y: GROUND },
      { kind: "rail", w: 340, y: 500 },
      { kind: "flat", w: 90, y: GROUND },
      { kind: "tunnel", w: 380, y: GROUND, gap: 44 },
      { kind: "flat", w: 80, y: GROUND },
      { kind: "gap", w: 200 },
      { kind: "flat", w: 200, y: GROUND },
      { kind: "finish", w: 120, y: GROUND },
    ],
  },
];

export function courseWidth(level: SkateLevel): number {
  return level.pieces.reduce((sum, piece) => sum + piece.w, 0);
}

export function pieceAt(level: SkateLevel, x: number): { index: number; piece: Piece; local: number } | null {
  let start = 0;
  for (let index = 0; index < level.pieces.length; index += 1) {
    const piece = level.pieces[index];
    if (x < start + piece.w) return { index, piece, local: Math.max(0, x - start) };
    start += piece.w;
  }
  return null;
}

export type Surface = {
  index: number;
  kind: Piece["kind"] | "none";
  ground: number | null;
  ceiling: number | null;
  slope: number;
};

export function surfaceAt(level: SkateLevel, x: number): Surface {
  const found = pieceAt(level, Math.max(0, x));
  if (!found) return { index: -1, kind: "none", ground: null, ceiling: null, slope: 0 };
  const { index, piece, local } = found;
  if (piece.kind === "gap") return { index, kind: "gap", ground: null, ceiling: null, slope: 0 };
  if (piece.kind === "ramp") {
    const slope = (piece.y1 - piece.y0) / piece.w;
    return { index, kind: "ramp", ground: piece.y0 + slope * local, ceiling: null, slope };
  }
  if (piece.kind === "tunnel") return { index, kind: "tunnel", ground: piece.y, ceiling: piece.y - piece.gap, slope: 0 };
  if (piece.kind === "rail") return { index, kind: "rail", ground: piece.y, ceiling: null, slope: 0 };
  return { index, kind: piece.kind, ground: piece.y, ceiling: null, slope: 0 };
}
