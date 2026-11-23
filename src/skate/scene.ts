import { VIEW_H, VIEW_W } from "../game/constants";
import { type Piece, type SkateLevel } from "./levels";

export function skateCameraX(catX: number, width: number): number {
  return Math.max(0, Math.min(Math.max(0, width - VIEW_W), catX - 160));
}

export function skateScreenY(canvasY: number): number {
  return VIEW_H - canvasY;
}

export type SkateProp = {
  kind: Piece["kind"];
  x: number;
  w: number;
  y0: number;
  y1: number;
  gap: number;
};

export function skateProps(level: SkateLevel): SkateProp[] {
  let x = 0;
  return level.pieces.map((piece) => {
    const prop = propFor(piece, x);
    x += piece.w;
    return prop;
  });
}

function propFor(piece: Piece, x: number): SkateProp {
  if (piece.kind === "ramp") return { kind: "ramp", x, w: piece.w, y0: piece.y0, y1: piece.y1, gap: 0 };
  if (piece.kind === "gap") return { kind: "gap", x, w: piece.w, y0: 680, y1: 680, gap: 0 };
  if (piece.kind === "tunnel") return { kind: "tunnel", x, w: piece.w, y0: piece.y, y1: piece.y, gap: piece.gap };
  if (piece.kind === "rail") return { kind: "rail", x, w: piece.w, y0: piece.y, y1: piece.y, gap: 0 };
  return { kind: piece.kind, x, w: piece.w, y0: piece.y, y1: piece.y, gap: 0 };
}
