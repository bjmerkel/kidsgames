import { SKATE_LEVELS, surfaceAt, type SkateLevel } from "./levels";

export type SkatePhase = "playing" | "paused" | "clear" | "retry" | "done";
export type AirTrick = "ollie" | "kickflip" | "grab";

export type SkateInput = {
  dx: number;
  crouch: boolean;
  jump: boolean;
  pause: boolean;
  confirm: boolean;
};

export type SkateState = {
  phase: SkatePhase;
  levelIndex: number;
  elapsedMs: number;
  score: number;
  scoreAtStart: number;
  bails: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  slope: number;
  grounded: boolean;
  grinding: boolean;
  crouched: boolean;
  airTrick: AirTrick | null;
  airMs: number;
  combo: number;
  comboMs: number;
  grindMs: number;
  spawnX: number;
  tunnelIndex: number;
  tunnelCrouched: boolean;
  awarded: number[];
  toast: string;
  toastMs: number;
};

const GRAVITY = 2200;
const PUSH = 980;
const BRAKE = 1500;
const FRICTION = 220;
const MAX_SPEED = 460;
const FAST = 640;
const OLLIE = -560;
const CROUCH_OLLIE = -700;
const MAX_FALL = 1100;
const STAND_H = 58;
const CROUCH_H = 34;
const BAILS = 3;
const CLEAR_BONUS = 500;

export function blankSkateInput(): SkateInput {
  return { dx: 0, crouch: false, jump: false, pause: false, confirm: false };
}

export function skateLevel(index: number): SkateLevel {
  return SKATE_LEVELS[Math.max(0, Math.min(SKATE_LEVELS.length - 1, index))];
}

export function catHeight(crouched: boolean): number {
  return crouched ? CROUCH_H : STAND_H;
}

export function createSkate(levelIndex = 0, score = 0): SkateState {
  const index = Math.max(0, Math.min(SKATE_LEVELS.length - 1, levelIndex));
  const level = SKATE_LEVELS[index];
  const ground = surfaceAt(level, 48).ground ?? 560;
  return {
    phase: "playing",
    levelIndex: index,
    elapsedMs: 0,
    score,
    scoreAtStart: score,
    bails: 0,
    x: 48,
    y: ground,
    vx: 0,
    vy: 0,
    slope: 0,
    grounded: true,
    grinding: false,
    crouched: false,
    airTrick: null,
    airMs: 0,
    combo: 0,
    comboMs: 0,
    grindMs: 0,
    spawnX: 48,
    tunnelIndex: -1,
    tunnelCrouched: true,
    awarded: [],
    toast: level.blurb,
    toastMs: 2200,
  };
}

function wipeout(state: SkateState, level: SkateLevel, message: string): void {
  state.bails += 1;
  state.combo = 0;
  state.comboMs = 0;
  state.airTrick = null;
  state.airMs = 0;
  state.vx = 0;
  state.vy = 0;
  state.grinding = false;
  state.grindMs = 0;
  state.slope = 0;
  if (state.bails >= BAILS) {
    state.phase = "retry";
    state.grounded = true;
    state.toast = "Three wipeouts. Try the park again.";
    state.toastMs = 0;
    return;
  }
  state.x = state.spawnX;
  state.y = surfaceAt(level, state.spawnX).ground ?? state.y;
  state.grounded = true;
  state.toast = message;
  state.toastMs = 900;
}

function land(state: SkateState): void {
  if (!state.airTrick || state.airMs < 90) {
    state.airTrick = null;
    state.airMs = 0;
    return;
  }
  const base = state.airTrick === "grab" ? 400 : state.airTrick === "kickflip" ? 250 : 100;
  state.combo = Math.min(8, state.combo + 1);
  state.comboMs = 1400;
  state.score += base * state.combo;
  const name = state.airTrick === "grab" ? "Grab" : state.airTrick === "kickflip" ? "Kickflip" : "Ollie";
  state.toast = state.combo > 1 ? `${name} x${state.combo}` : name;
  state.toastMs = 700;
  state.airTrick = null;
  state.airMs = 0;
}

function award(state: SkateState, index: number, points: number, message: string): void {
  if (state.awarded.includes(index)) return;
  state.awarded.push(index);
  state.score += points;
  state.toast = message;
  state.toastMs = 700;
}

export function tickSkate(state: SkateState, input: SkateInput, dtMs: number): SkateState {
  const step = Math.max(0, Math.min(50, dtMs));
  const next = structuredClone(state);
  const level = skateLevel(next.levelIndex);
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  next.comboMs = Math.max(0, next.comboMs - step);
  if (next.comboMs === 0) next.combo = 0;
  if (next.phase === "paused") {
    if (input.pause) next.phase = "playing";
    return next;
  }
  if (next.phase !== "playing") return next;
  if (input.pause) {
    next.phase = "paused";
    return next;
  }

  const dt = step / 1000;
  next.crouched = input.crouch;
  if (input.dx > 0 && (next.grounded || next.grinding)) next.vx = Math.min(MAX_SPEED, next.vx + PUSH * dt);
  else if (input.dx < 0) next.vx = Math.max(0, next.vx - BRAKE * dt);
  else if (next.grounded || next.grinding) next.vx = Math.max(0, next.vx - FRICTION * dt);

  if (input.jump) {
    if (next.grounded || next.grinding) {
      next.vy = next.crouched ? CROUCH_OLLIE : OLLIE;
      next.grounded = false;
      next.grinding = false;
      next.grindMs = 0;
      next.airTrick = "ollie";
      next.airMs = 0;
    } else if (next.airTrick === "ollie") next.airTrick = "kickflip";
    else if (next.airTrick === "kickflip") next.airTrick = "grab";
  }

  const prevY = next.y;
  if (!next.grounded && !next.grinding) {
    next.vy = Math.min(MAX_FALL, next.vy + GRAVITY * dt);
    next.y += next.vy * dt;
    next.airMs += step;
  }
  next.x += next.vx * dt;

  const here = surfaceAt(level, next.x);
  const height = catHeight(next.crouched);

  if ((here.kind === "gap" || here.kind === "none") && (next.grounded || next.grinding)) {
    next.grounded = false;
    next.grinding = false;
    next.grindMs = 0;
  }

  if (here.kind === "tunnel") {
    if (next.tunnelIndex !== here.index) {
      next.tunnelIndex = here.index;
      next.tunnelCrouched = true;
    }
    if (!next.crouched) next.tunnelCrouched = false;
  } else if (next.tunnelIndex >= 0) {
    if (next.tunnelCrouched) award(next, next.tunnelIndex, 150, "Tunnel speed");
    next.tunnelIndex = -1;
    next.tunnelCrouched = true;
  }

  const ridingInTunnel = next.grounded || (here.ground != null && next.y > here.ground - 10);
  if (here.ceiling != null && ridingInTunnel && next.y - height < here.ceiling) {
    wipeout(next, level, "The tunnel roof.");
    return next;
  }

  if (here.kind === "rail" && here.ground != null) {
    const close = next.y > here.ground - 48 && next.y < here.ground + 24;
    const crossed = prevY <= here.ground + 8 && next.y >= here.ground - 8 && next.vy >= 0;
    if (next.grinding || (close && (crossed || next.grounded))) {
      if (!next.grinding && !next.grounded) land(next);
      next.grinding = true;
      next.grounded = false;
      next.y = here.ground;
      next.vy = 0;
      next.slope = 0;
      next.grindMs += step;
      next.comboMs = 1400;
      if (next.grindMs >= 120) {
        next.score += 8;
        next.grindMs -= 120;
      }
    }
  } else if (next.grinding) {
    next.grinding = false;
    next.grindMs = 0;
  }

  if (!next.grinding && here.ground != null && here.kind !== "rail") {
    const drop = here.ground - next.y;
    if (next.grounded && drop > 42 && next.slope < -0.2) {
      next.grounded = false;
      next.vy = Math.min(next.vy, next.vx * next.slope * 1.8);
      next.airTrick = next.airTrick ?? "ollie";
      next.airMs = 0;
    } else if (!next.grounded && next.vy >= 0 && next.y >= here.ground - 4) {
      land(next);
      next.grounded = true;
      next.y = here.ground;
      next.slope = here.slope;
      next.vy = next.vx * here.slope;
    } else if (next.grounded) {
      next.y = here.ground;
      next.slope = here.slope;
      next.vy = next.vx * here.slope;
      if (here.slope > 0.25) next.vx = Math.min(FAST, next.vx + 720 * dt);
    }
  }

  if (!next.grounded && !next.grinding && (here.ground == null || here.kind === "gap" || here.kind === "none") && next.y > 700) {
    wipeout(next, level, "Missed the landing.");
    return next;
  }

  if (next.grounded && here.kind === "flat" && next.vx > 70) next.spawnX = next.x;
  if (here.kind === "ramp" && here.slope > 0.25 && next.grounded && next.vx > 380) award(next, here.index + 1000, 50, "Speed ramp");
  if (next.grounded && here.kind === "tunnel" && next.crouched) next.vx = Math.min(FAST, next.vx + 260 * dt);

  if (here.kind === "finish" && next.grounded) {
    next.score += CLEAR_BONUS;
    next.phase = "clear";
    next.vx = 0;
    next.toast = "You finished the level!";
    next.toastMs = 0;
  }
  return next;
}

export function advanceSkate(state: SkateState): SkateState {
  if (state.phase === "retry") return createSkate(state.levelIndex, state.scoreAtStart);
  if (state.phase === "done") return createSkate(0, 0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= SKATE_LEVELS.length - 1) {
    const done = structuredClone(state);
    done.phase = "done";
    done.toast = `You finished all ${SKATE_LEVELS.length} levels.`;
    done.toastMs = 0;
    return done;
  }
  return createSkate(state.levelIndex + 1, state.score);
}
