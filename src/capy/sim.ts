import { CAPY_H, CAPY_W, GROUND_Y, JUNGLE_LEVELS, jungleLevel, type Drift, type Plat } from "./levels";

export type CapyPhase = "playing" | "paused" | "clear" | "retry" | "done";

export type CapyInput = {
  dx: number;
  jump: boolean;
  jumpHeld: boolean;
  pause: boolean;
  confirm: boolean;
};

export type Swing = {
  vine: number;
  t: number;
  fromX: number;
  fromY: number;
  landX: number;
  vineX: number;
  vineTop: number;
};

export type CapyLog = {
  x: number;
  y: number;
  w: number;
  h: number;
  left: number;
  right: number;
  dir: number;
  speed: number;
};

export type CapyState = {
  phase: CapyPhase;
  levelIndex: number;
  elapsedMs: number;
  score: number;
  lives: number;
  invulnMs: number;
  player: { x: number; y: number; w: number; h: number };
  vy: number;
  face: number;
  grounded: boolean;
  coyoteMs: number;
  jumpBufferMs: number;
  support: number | null;
  supportX: number;
  swing: Swing | null;
  grabLockMs: number;
  logs: CapyLog[];
  mangoesGot: boolean[];
  spawnX: number;
  spawnY: number;
  toast: string;
  toastMs: number;
};

type Solid = Plat & { mover: number | null };

const GRAVITY = 2400;
const JUMP = -700;
const RUN = 220;
const MAX_FALL = 980;
const SWING_MS = 620;
const LIVES = 3;
const INVULN_MS = 1000;

export function blankCapyInput(): CapyInput {
  return { dx: 0, jump: false, jumpHeld: false, pause: false, confirm: false };
}

export function createCapy(levelIndex = 0, score = 0): CapyState {
  const index = Math.max(0, Math.min(JUNGLE_LEVELS.length - 1, levelIndex));
  const level = JUNGLE_LEVELS[index];
  return {
    phase: "playing",
    levelIndex: index,
    elapsedMs: 0,
    score,
    lives: LIVES,
    invulnMs: 0,
    player: { x: level.spawnX, y: level.spawnY, w: CAPY_W, h: CAPY_H },
    vy: 0,
    face: 1,
    grounded: true,
    coyoteMs: 110,
    jumpBufferMs: 0,
    support: null,
    supportX: 0,
    swing: null,
    grabLockMs: 0,
    logs: level.logs.map((log) => ({
      x: log.x,
      y: GROUND_Y - 24,
      w: 48,
      h: 24,
      left: log.left,
      right: log.right,
      dir: 1,
      speed: log.speed,
    })),
    mangoesGot: level.mangoes.map(() => false),
    spawnX: level.spawnX,
    spawnY: level.spawnY,
    toast: level.blurb,
    toastMs: 2200,
  };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function driftX(drift: Drift, elapsedMs: number): number {
  return drift.origin + Math.sin(elapsedMs / 800 + drift.phase) * drift.span;
}

function solidsAt(levelIndex: number, elapsedMs: number): Solid[] {
  const level = jungleLevel(levelIndex);
  const ground: Solid[] = level.platforms.map((plat) => ({ ...plat, mover: null }));
  const pads: Solid[] = level.drifts.map((drift, index) => ({
    x: driftX(drift, elapsedMs),
    y: drift.y,
    w: drift.w,
    h: drift.h,
    mover: index,
  }));
  return [...ground, ...pads];
}

function bezier(fromX: number, fromY: number, vineX: number, vineTop: number, landX: number, landY: number, u: number): { x: number; y: number } {
  const c1x = vineX - CAPY_W / 2;
  const c1y = vineTop + 36;
  const abx = fromX + (c1x - fromX) * u;
  const aby = fromY + (c1y - fromY) * u;
  const bcx = c1x + (landX - c1x) * u;
  const bcy = c1y + (landY - c1y) * u;
  return { x: abx + (bcx - abx) * u, y: aby + (bcy - aby) * u };
}

function hurt(state: CapyState): void {
  if (state.invulnMs > 0 || state.phase !== "playing") return;
  state.lives -= 1;
  state.invulnMs = INVULN_MS;
  state.toast = "Try again.";
  state.toastMs = state.lives > 0 ? 1000 : 0;
  state.swing = null;
  state.vy = 0;
  state.grabLockMs = 0;
  if (state.lives <= 0) {
    state.phase = "retry";
    return;
  }
  state.player.x = state.spawnX;
  state.player.y = state.spawnY;
  state.grounded = true;
  state.support = null;
}

function tryGrab(state: CapyState): void {
  if (state.swing || state.grabLockMs > 0 || state.grounded) return;
  const level = jungleLevel(state.levelIndex);
  const cx = state.player.x + state.player.w / 2;
  const top = state.player.y;
  const bottom = state.player.y + state.player.h;
  for (let i = 0; i < level.vines.length; i += 1) {
    const vine = level.vines[i];
    const ropeBottom = vine.top + vine.length;
    if (Math.abs(cx - vine.x) > 40) continue;
    if (bottom < vine.top + 80 || top > ropeBottom) continue;
    state.swing = {
      vine: i,
      t: 0,
      fromX: state.player.x,
      fromY: state.player.y,
      landX: vine.landX,
      vineX: vine.x,
      vineTop: vine.top,
    };
    state.vy = 0;
    state.grounded = false;
    state.support = null;
    state.face = vine.landX >= vine.x ? 1 : -1;
    return;
  }
}

export function tickCapy(state: CapyState, input: CapyInput, dtMs: number): CapyState {
  const step = Math.max(0, Math.min(50, dtMs));
  const dt = step / 1000;
  const next = structuredClone(state);
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "paused" ? "playing" : "paused";
    return next;
  }
  if (next.phase !== "playing") return next;

  const level = jungleLevel(next.levelIndex);
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  next.invulnMs = Math.max(0, next.invulnMs - step);
  next.coyoteMs = Math.max(0, next.coyoteMs - step);
  next.jumpBufferMs = Math.max(0, next.jumpBufferMs - step);
  next.grabLockMs = Math.max(0, next.grabLockMs - step);

  const solids = solidsAt(next.levelIndex, next.elapsedMs);
  if (next.grounded && next.support != null && !next.swing) {
    const pad = solids.find((solid) => solid.mover === next.support);
    if (pad) {
      next.player.x += pad.x - next.supportX;
      next.supportX = pad.x;
    }
  }

  const dx = Math.max(-1, Math.min(1, input.dx));
  if (dx !== 0 && !next.swing) next.face = dx;

  if (next.swing && input.jump && next.swing.t > 120) {
    next.swing = null;
    next.vy = -260;
    next.grounded = false;
    next.grabLockMs = 280;
  }

  if (next.swing) {
    next.swing.t += step;
    const u = Math.min(1, next.swing.t / SWING_MS);
    const ease = 1 - (1 - u) * (1 - u);
    const point = bezier(next.swing.fromX, next.swing.fromY, next.swing.vineX, next.swing.vineTop, next.swing.landX, level.spawnY, ease);
    next.player.x = point.x;
    next.player.y = point.y;
    next.vy = 0;
    next.grounded = false;
    if (next.swing.t >= SWING_MS) {
      next.player.x = next.swing.landX;
      next.player.y = level.spawnY;
      next.swing = null;
      next.grounded = true;
      next.vy = 0;
      next.coyoteMs = 110;
      next.grabLockMs = 200;
    }
  } else {
    next.player.x += dx * RUN * dt;
    next.player.x = Math.max(0, Math.min(level.width - next.player.w, next.player.x));
    for (const plat of solids) {
      if (!overlaps(next.player, plat)) continue;
      if (dx > 0) next.player.x = plat.x - next.player.w;
      else if (dx < 0) next.player.x = plat.x + plat.w;
    }

    if (next.grounded) next.coyoteMs = 110;
    if (input.jump) next.jumpBufferMs = 120;
    if (next.jumpBufferMs > 0 && next.coyoteMs > 0) {
      next.vy = JUMP;
      next.grounded = false;
      next.coyoteMs = 0;
      next.jumpBufferMs = 0;
      next.support = null;
    }
    if (!input.jumpHeld && next.vy < -240) next.vy = -240;

    next.vy = Math.min(MAX_FALL, next.vy + GRAVITY * dt);
    const prevBottom = next.player.y + next.player.h;
    next.player.y += next.vy * dt;
    let landed: Solid | null = null;
    for (const plat of [...solids].sort((a, b) => a.y - b.y)) {
      if (!overlaps(next.player, plat)) continue;
      if (next.vy >= 0 && prevBottom <= plat.y + 4) {
        landed = plat;
        break;
      }
      if (next.vy < 0 && prevBottom > plat.y + plat.h) {
        next.player.y = plat.y + plat.h;
        next.vy = 0;
        break;
      }
    }
    if (landed) {
      next.player.y = landed.y - next.player.h;
      next.vy = 0;
      next.grounded = true;
      next.coyoteMs = 110;
      next.support = landed.mover;
      next.supportX = landed.x;
    } else if (next.vy > 40) {
      next.grounded = false;
      next.support = null;
    }
    tryGrab(next);
  }

  for (const log of next.logs) {
    log.x += log.dir * log.speed * dt;
    if (log.x < log.left) {
      log.x = log.left;
      log.dir = 1;
    }
    if (log.x + log.w > log.right) {
      log.x = log.right - log.w;
      log.dir = -1;
    }
  }

  if (!next.swing && next.phase === "playing") {
    for (const log of next.logs) {
      if (overlaps(next.player, log)) {
        hurt(next);
        break;
      }
    }
  }

  const cx = next.player.x + next.player.w / 2;
  const cy = next.player.y + next.player.h / 2;
  level.mangoes.forEach((mango, index) => {
    if (next.mangoesGot[index]) return;
    const dxM = mango.x - cx;
    const dyM = mango.y - cy;
    if (dxM * dxM + dyM * dyM <= 34 * 34) {
      next.mangoesGot[index] = true;
      next.score += 100;
    }
  });

  if (next.grounded) {
    for (const flag of level.checks) {
      if (next.player.x >= flag && next.spawnX < flag) {
        next.spawnX = flag;
        next.spawnY = next.player.y;
      }
    }
  }

  if (next.phase === "playing" && overlaps(next.player, level.pool)) {
    next.phase = "clear";
    next.score += 500;
    next.toast = "You finished the level!";
    next.toastMs = 0;
    next.swing = null;
  }

  if (next.phase === "playing" && !next.swing && next.player.y > GROUND_Y + 24) hurt(next);
  return next;
}

export function advanceCapy(state: CapyState): CapyState {
  if (state.phase === "retry") return createCapy(state.levelIndex, state.score);
  if (state.phase === "clear" && state.levelIndex < JUNGLE_LEVELS.length - 1) return createCapy(state.levelIndex + 1, state.score);
  if (state.phase === "clear") {
    const next = structuredClone(state);
    next.phase = "done";
    next.toast = "You finished all 5 levels.";
    return next;
  }
  if (state.phase === "done") return createCapy(0);
  return structuredClone(state);
}
