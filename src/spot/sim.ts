import { PANEL_BOTTOM, PANEL_H, PANEL_TOP, PANEL_W, PANEL_X, SPOT_LEVELS, spotLevel, type SpotDiff } from "./scenes";

export type SpotPhase = "playing" | "paused" | "clear" | "done";

export type SpotInput = {
  tap: boolean;
  x: number;
  y: number;
  pause: boolean;
  confirm: boolean;
  hint: boolean;
};

export type FoundDiff = SpotDiff & { found: boolean };

export type SpotState = {
  phase: SpotPhase;
  levelIndex: number;
  score: number;
  misses: number;
  hintId: string | null;
  diffs: FoundDiff[];
  toast: string;
  toastMs: number;
  elapsedMs: number;
};

const CLEAR_BONUS = 250;
const FIND_POINTS = 100;

export function blankSpotInput(): SpotInput {
  return { tap: false, x: 0, y: 0, pause: false, confirm: false, hint: false };
}

export function createSpot(levelIndex = 0, score = 0): SpotState {
  const level = spotLevel(levelIndex);
  return {
    phase: "playing",
    levelIndex: spotLevel(levelIndex) === level ? Math.max(0, Math.min(SPOT_LEVELS.length - 1, levelIndex)) : 0,
    score,
    misses: 0,
    hintId: null,
    diffs: level.diffs.map((diff) => ({ ...diff, found: false })),
    toast: level.blurb,
    toastMs: 1800,
    elapsedMs: 0,
  };
}

export function panelLocal(x: number, y: number): { x: number; y: number } | null {
  if (x < PANEL_X || x > PANEL_X + PANEL_W) return null;
  if (y >= PANEL_TOP && y <= PANEL_TOP + PANEL_H) return { x: x - PANEL_X, y: y - PANEL_TOP };
  if (y >= PANEL_BOTTOM && y <= PANEL_BOTTOM + PANEL_H) return { x: x - PANEL_X, y: y - PANEL_BOTTOM };
  return null;
}

export function tickSpot(state: SpotState, input: SpotInput, dt: number): SpotState {
  const step = Math.max(0, Math.min(50, dt));
  const next = structuredClone(state);
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  if (next.phase === "paused") {
    if (input.pause) next.phase = "playing";
    return next;
  }
  if (next.phase !== "playing") return next;
  if (input.pause) {
    next.phase = "paused";
    return next;
  }
  if (input.hint && !next.hintId) {
    const left = next.diffs.find((diff) => !diff.found);
    if (left) next.hintId = left.id;
  }
  if (!input.tap) return next;
  const local = panelLocal(input.x, input.y);
  if (!local) return next;
  let best: FoundDiff | null = null;
  let bestDist = Infinity;
  for (const diff of next.diffs) {
    const dist = Math.hypot(diff.x - local.x, diff.y - local.y);
    if (dist <= diff.r && dist < bestDist) {
      best = diff;
      bestDist = dist;
    }
  }
  if (!best) {
    next.misses += 1;
    next.toast = "Look again.";
    next.toastMs = 800;
    if (next.misses >= 3 && !next.hintId) {
      const left = next.diffs.find((diff) => !diff.found);
      if (left) next.hintId = left.id;
    }
    return next;
  }
  if (best.found) {
    next.toast = "Already found.";
    next.toastMs = 700;
    return next;
  }
  best.found = true;
  next.score += FIND_POINTS;
  if (next.hintId === best.id) {
    const left = next.diffs.find((diff) => !diff.found);
    next.hintId = left ? left.id : null;
  }
  if (next.diffs.every((diff) => diff.found)) {
    next.score += CLEAR_BONUS;
    next.phase = "clear";
    next.toast = "You finished the level!";
    next.toastMs = 0;
    return next;
  }
  next.toast = "Found it!";
  next.toastMs = 900;
  return next;
}

export function advanceSpot(state: SpotState): SpotState {
  if (state.phase === "done") return createSpot(0, 0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= SPOT_LEVELS.length - 1) {
    const done = structuredClone(state);
    done.phase = "done";
    done.toast = `You finished all ${SPOT_LEVELS.length} levels.`;
    done.toastMs = 0;
    return done;
  }
  return createSpot(state.levelIndex + 1, state.score);
}
