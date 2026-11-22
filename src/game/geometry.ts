export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy <= reach * reach;
}

export function circleHitsAabb(
  cx: number,
  cy: number,
  cr: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const left = x - w / 2;
  const top = y - h / 2;
  const nx = clamp(cx, left, left + w);
  const ny = clamp(cy, top, top + h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
}