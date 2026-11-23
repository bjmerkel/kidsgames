import { VIEW_H, VIEW_W } from "./constants";

export type PadTone = "cream" | "gold" | "navy";

export type PadSpot = {
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: PadTone;
  hold: boolean;
  pulse: boolean;
};

export const PAD_W = 132;
export const PAD_H = 56;
export const PAD_GAP = 8;
export const DECK_TOP = VIEW_H - (PAD_H * 2 + PAD_GAP + 12);

const FILL: Record<PadTone, string> = { cream: "#f7f1e6", gold: "#f2c14e", navy: "#24357a" };
const HELD: Record<PadTone, string> = { cream: "#e0d3bc", gold: "#e0b03a", navy: "#18264f" };
const INK: Record<PadTone, string> = { cream: "#1c1915", gold: "#1c1915", navy: "#f7f1e6" };

export function cornerSpot(name: string, label: string, column: "left" | "right", row: 0 | 1, tone: PadTone, hold: boolean, pulse: boolean): PadSpot {
  return {
    name,
    label,
    x: column === "left" ? 16 : VIEW_W - 16 - PAD_W,
    y: DECK_TOP + row * (PAD_H + PAD_GAP),
    w: PAD_W,
    h: PAD_H,
    tone,
    hold,
    pulse,
  };
}

export function pauseSpot(y = 140): PadSpot {
  return { name: "pause", label: "Pause", x: VIEW_W - 108, y, w: 92, h: 40, tone: "cream", hold: false, pulse: true };
}

export function spotAt(spots: readonly PadSpot[], x: number, y: number): PadSpot | null {
  for (const spot of spots) {
    if (x >= spot.x && y >= spot.y && x < spot.x + spot.w && y < spot.y + spot.h) return spot;
  }
  return null;
}

export function slideDirection(x0: number, y0: number, x: number, y: number, slop = 20): { dx: number; dy: number } {
  const dx = x - x0;
  const dy = y - y0;
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) return { dx: 0, dy: 0 };
  if (Math.abs(dx) >= Math.abs(dy)) return { dx: dx > 0 ? 1 : -1, dy: 0 };
  return { dx: 0, dy: dy > 0 ? 1 : -1 };
}

export function sideSteer(x: number): number {
  if (x < 190) return -1;
  if (x > 290) return 1;
  return 0;
}

export const RUN_HOLD_MS = 160;
export const RUN_TAP_MS = 260;
export const RUN_TAP_SLOP = 24;

export function runnerPush(fingers: readonly { t0: number }[], now: number): boolean {
  return fingers.some((finger) => now - finger.t0 >= RUN_HOLD_MS);
}

export function runnerTap(finger: { x: number; y: number; x0: number; y0: number; t0: number }, now: number): boolean {
  return now - finger.t0 < RUN_TAP_MS && Math.hypot(finger.x - finger.x0, finger.y - finger.y0) < RUN_TAP_SLOP;
}

type Finger = { id: number; name: string };

export class TouchPad {
  private fingers: Finger[] = [];

  constructor(
    readonly spots: readonly PadSpot[],
    private onPulse: (name: string) => void,
  ) {}

  down(id: number, x: number, y: number): boolean {
    const spot = spotAt(this.spots, x, y);
    if (!spot) return false;
    const already = this.fingers.some((finger) => finger.id === id && finger.name === spot.name);
    this.fingers = this.fingers.filter((finger) => finger.id !== id).concat({ id, name: spot.name });
    if (spot.pulse && !already) this.onPulse(spot.name);
    return true;
  }

  up(id: number): void {
    this.fingers = this.fingers.filter((finger) => finger.id !== id);
  }

  clear(): void {
    this.fingers = [];
  }

  held(name: string): boolean {
    const spot = this.spots.find((item) => item.name === name);
    if (!spot?.hold) return false;
    return this.fingers.some((finger) => finger.name === name);
  }

  pressed(name: string): boolean {
    return this.fingers.some((finger) => finger.name === name);
  }
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawTouchPad(ctx: CanvasRenderingContext2D, spots: readonly PadSpot[], pressed: (name: string) => boolean, labels: Record<string, string> = {}): void {
  for (const spot of spots) {
    const on = pressed(spot.name);
    ctx.fillStyle = on ? HELD[spot.tone] : FILL[spot.tone];
    round(ctx, spot.x, spot.y, spot.w, spot.h, 14);
    ctx.fill();
    ctx.strokeStyle = "#1c1915";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = INK[spot.tone];
    ctx.textAlign = "center";
    ctx.font = spot.h < 48 ? "700 15px Trebuchet MS, sans-serif" : "700 18px Trebuchet MS, sans-serif";
    ctx.fillText(labels[spot.name] ?? spot.label, spot.x + spot.w / 2, spot.y + spot.h / 2 + 6);
  }
}
