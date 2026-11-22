import { CRAB_R, CRAB_R_TUCKED, FORWARD_SCORE, HOP, HOP_MS, TUCK_COOLDOWN_MS, TUCK_MS } from "./constants";
import type { Crab, Dir, LevelDef } from "./types";

export function crabRadius(crab: Crab): number {
  return crab.mode === "tucked" ? CRAB_R_TUCKED : CRAB_R;
}

export function beginHop(crab: Crab, dx: number, dy: number, level: LevelDef): boolean {
  if (crab.mode !== "idle") return false;
  let mx = dx;
  let my = dy;
  if (mx !== 0 && my !== 0) mx = 0;
  if (mx === 0 && my === 0) return false;
  const toX = crab.x + mx * HOP;
  const toY = crab.y + my * HOP;
  if (toX < CRAB_R || toX > level.width - CRAB_R) return false;
  if (toY < CRAB_R || toY > level.height - CRAB_R) return false;
  crab.mode = "hopping";
  crab.facing = facingFrom(mx, my);
  crab.hopFromX = crab.x;
  crab.hopFromY = crab.y;
  crab.hopToX = toX;
  crab.hopToY = toY;
  crab.hopElapsedMs = 0;
  crab.supportId = null;
  crab.supportKind = null;
  return true;
}

export function advanceHop(crab: Crab, dtMs: number): void {
  if (crab.mode !== "hopping") return;
  crab.hopElapsedMs += dtMs;
  const t = Math.min(1, crab.hopElapsedMs / HOP_MS);
  const eased = 1 - (1 - t) * (1 - t);
  crab.x = crab.hopFromX + (crab.hopToX - crab.hopFromX) * eased;
  crab.y = crab.hopFromY + (crab.hopToY - crab.hopFromY) * eased;
  if (t >= 1) {
    crab.x = crab.hopToX;
    crab.y = crab.hopToY;
    crab.mode = "idle";
    if (crab.hopToY < crab.hopFromY) crab.score += FORWARD_SCORE;
  }
}

export function advanceTuck(crab: Crab, dtMs: number, tuckPressed: boolean): void {
  if (crab.tuckCooldownMs > 0) {
    crab.tuckCooldownMs = Math.max(0, crab.tuckCooldownMs - dtMs);
  }
  if (crab.mode === "tucked") {
    crab.tuckElapsedMs += dtMs;
    if (crab.tuckElapsedMs >= TUCK_MS) {
      crab.mode = "idle";
      crab.tuckCooldownMs = TUCK_COOLDOWN_MS;
    }
    return;
  }
  if (tuckPressed && crab.mode === "idle" && crab.tuckCooldownMs === 0) {
    crab.mode = "tucked";
    crab.tuckElapsedMs = 0;
    crab.supportId = null;
    crab.supportKind = null;
  }
}

function facingFrom(dx: number, dy: number): Dir {
  if (dy < 0) return "n";
  if (dy > 0) return "s";
  if (dx < 0) return "w";
  return "e";
}