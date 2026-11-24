import { slideDirection } from "../game/touchpad";

export function tideFingerCommand(
  x0: number,
  y0: number,
  x: number,
  y: number,
  released: boolean,
): { dx: number; dy: number; action: boolean } {
  const slide = slideDirection(x0, y0, x, y, 24);
  if (slide.dx || slide.dy) return { dx: released ? 0 : slide.dx, dy: released ? 0 : slide.dy, action: false };
  return { dx: 0, dy: 0, action: released };
}
