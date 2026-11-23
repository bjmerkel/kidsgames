import { expectedNext, PATTERN_LEVELS, sameBead, type PatternLevel } from "./levels";

export type PatternPhase = "playing" | "paused" | "clear" | "done";

export type PatternInput = {
  choice: number | null;
  pause: boolean;
  confirm: boolean;
};

export type PatternState = {
  phase: PatternPhase;
  levelIndex: number;
  roundIndex: number;
  score: number;
  misses: number;
  toast: string;
  toastMs: number;
  waitMs: number;
  pending: boolean;
  elapsedMs: number;
};

export function blankPatternInput(): PatternInput {
  return { choice: null, pause: false, confirm: false };
}

export function createPattern(levelIndex = 0, score = 0): PatternState {
  const level = PATTERN_LEVELS[levelIndex] ?? PATTERN_LEVELS[0];
  return {
    phase: "playing",
    levelIndex: PATTERN_LEVELS[levelIndex] ? levelIndex : 0,
    roundIndex: 0,
    score,
    misses: 0,
    toast: level.blurb,
    toastMs: 1800,
    waitMs: 0,
    pending: false,
    elapsedMs: 0,
  };
}

export function patternLevel(state: PatternState): PatternLevel {
  return PATTERN_LEVELS[state.levelIndex];
}

export function tickPattern(state: PatternState, input: PatternInput, dtMs: number): PatternState {
  const step = Math.max(0, Math.min(dtMs, 50));
  const next: PatternState = { ...state };
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "playing" ? "paused" : "playing";
    return next;
  }
  if (next.phase !== "playing") return next;
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  const waiting = next.waitMs > 0;
  next.waitMs = Math.max(0, next.waitMs - step);
  if (waiting && next.waitMs === 0 && next.pending) {
    next.roundIndex += 1;
    next.misses = 0;
    next.pending = false;
  }
  if (next.waitMs > 0 || input.choice == null) return next;
  const level = patternLevel(next);
  const round = level.rounds[next.roundIndex];
  if (!round || input.choice < 0 || input.choice > 2) return next;
  const picked = round.choices[input.choice];
  if (sameBead(picked, expectedNext(round))) {
    next.score += next.misses === 0 ? 100 : 50;
    if (next.roundIndex >= level.rounds.length - 1) {
      next.phase = "clear";
      next.misses = 0;
      next.pending = false;
      next.toast = "You finished the row!";
      next.toastMs = 2400;
      next.waitMs = 0;
    } else {
      next.toast = "Yes!";
      next.toastMs = 700;
      next.waitMs = 420;
      next.pending = true;
    }
    return next;
  }
  next.misses += 1;
  next.toast = "Look again.";
  next.toastMs = 900;
  next.waitMs = 260;
  return next;
}

export function advancePattern(state: PatternState): PatternState {
  if (state.phase === "done") return createPattern(0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= PATTERN_LEVELS.length - 1) {
    return {
      ...state,
      phase: "done",
      toast: "You finished all 5 rows.",
      toastMs: 4000,
    };
  }
  return createPattern(state.levelIndex + 1, state.score);
}
