import { clamp } from "./geometry";

export function cameraTop(crabY: number, levelH: number, viewH: number): number {
  if (levelH <= viewH) return 0;
  const ideal = crabY - viewH * 0.62;
  return clamp(ideal, 0, levelH - viewH);
}