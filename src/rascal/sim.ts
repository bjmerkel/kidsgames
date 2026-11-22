import { VIEW_W } from "../game/constants";
import { RASCAL_H, RASCAL_W, ROOF_LEVELS, roofLevel, type Mover, type Plat } from "./levels";

export type RascalPhase = "playing" | "paused" | "clear" | "retry" | "done";

export type RascalInput = {
  dx: number;
  jump: boolean;
  jumpHeld: boolean;
  web: boolean;
  pause: boolean;
  confirm: boolean;
};

export type Body = { x: number; y: number; w: number; h: number; mover: number | null };

export type RascalBug = {
  x: number;
  y: number;
  w: number;
  h: number;
  left: number;
  right: number;
  dir: number;
  gone: boolean;
};

export type Zip = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  hookX: number;
  hookY: number;
  t: number;
};

export type RascalState = {
  phase: RascalPhase;
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
  zip: Zip | null;
  perchMs: number;
  perchX: number;
  perchY: number;
  webMs: number;
  bugs: RascalBug[];
  coinsGot: boolean[];
  spawnX: number;
  spawnY: number;
  toast: string;
  toastMs: number;
};

const GRAVITY = 2400;
const JUMP = -720;
const RUN = 230;
const MAX_FALL = 980;
const WEB_RANGE = 460;
const WEB_BUFFER_MS = 400;
const PERCH_MS = 1000;
const ZIP_MS = 160;
const LIVES = 3;
const INVULN_MS = 1100;
const BUG_SPEED = 70;

export function blankRascalInput(): RascalInput {
  return { dx: 0, jump: false, jumpHeld: false, web: false, pause: false, confirm: false };
}

export function createRascal(levelIndex = 0, score = 0): RascalState {
  const index = Math.max(0, Math.min(ROOF_LEVELS.length - 1, levelIndex));
  const level = ROOF_LEVELS[index];
  return {
    phase: "playing",
    levelIndex: index,
    elapsedMs: 0,
    score,
    lives: LIVES,
    invulnMs: 0,
    player: { x: level.spawnX, y: level.spawnY, w: RASCAL_W, h: RASCAL_H },
    vy: 0,
    face: 1,
    grounded: true,
    coyoteMs: 110,
    jumpBufferMs: 0,
    support: null,
    supportX: 0,
    zip: null,
    perchMs: 0,
    perchX: 0,
    perchY: 0,
    webMs: 0,
    bugs: level.bugs.map((bug) => ({
      x: bug.x,
      y: bug.y,
      w: 28,
      h: 22,
      left: bug.left,
      right: bug.right,
      dir: 1,
      gone: false,
    })),
    coinsGot: level.coins.map(() => false),
    spawnX: level.spawnX,
    spawnY: level.spawnY,
    toast: level.blurb,
    toastMs: 2200,
  };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moverX(mover: Mover, elapsedMs: number): number {
  return mover.origin + Math.sin(elapsedMs / 900 + mover.phase) * mover.span;
}

function solidsAt(levelIndex: number, elapsedMs: number): Body[] {
  const level = roofLevel(levelIndex);
  const platforms: Body[] = level.platforms.map((plat: Plat) => ({ ...plat, mover: null }));
  const movers: Body[] = level.movers.map((mover, index) => ({
    x: moverX(mover, elapsedMs),
    y: mover.y,
    w: mover.w,
    h: mover.h,
    mover: index,
  }));
  return [...platforms, ...movers];
}

export function rascalCameraX(state: RascalState): number {
  const level = roofLevel(state.levelIndex);
  return Math.max(0, Math.min(Math.max(0, level.width - VIEW_W), state.player.x - 170));
}

export function hookAtPoint(state: RascalState, worldX: number, worldY: number, radius = 64): boolean {
  const level = roofLevel(state.levelIndex);
  return level.webs.some((hook) => Math.hypot(hook.x - worldX, hook.y - worldY) <= radius);
}

function nearestWeb(state: RascalState): { x: number; y: number } | null {
  const level = roofLevel(state.levelIndex);
  const cx = state.player.x + state.player.w / 2;
  const cy = state.player.y + state.player.h / 2;
  let best: { x: number; y: number } | null = null;
  let bestDist = WEB_RANGE;
  for (const hook of level.webs) {
    if (hook.y > cy + 8) continue;
    const dx = hook.x - cx;
    const dy = hook.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist <= bestDist) {
      best = hook;
      bestDist = dist;
    }
  }
  return best;
}

function beginZip(state: RascalState, hook: { x: number; y: number }): void {
  state.zip = {
    fromX: state.player.x,
    fromY: state.player.y,
    toX: hook.x - state.player.w / 2,
    toY: hook.y + 18,
    hookX: hook.x,
    hookY: hook.y,
    t: 0,
  };
  state.grounded = false;
  state.support = null;
  state.vy = 0;
  state.perchMs = 0;
  state.webMs = 0;
  if (state.toast === "Jump closer to the web mark.") {
    state.toast = "";
    state.toastMs = 0;
  }
}

function hurt(state: RascalState, respawn: boolean): void {
  if (state.invulnMs > 0 || state.phase !== "playing") return;
  state.lives -= 1;
  state.invulnMs = INVULN_MS;
  state.toast = "Try again.";
  state.toastMs = state.lives > 0 ? 1000 : 0;
  state.zip = null;
  state.perchMs = 0;
  if (state.lives <= 0) {
    state.phase = "retry";
    return;
  }
  if (respawn) {
    state.player.x = state.spawnX;
    state.player.y = state.spawnY;
    state.vy = 0;
    state.grounded = true;
    state.support = null;
    return;
  }
  state.vy = -320;
  state.player.x += -state.face * 20;
  state.grounded = false;
}

export function tickRascal(state: RascalState, input: RascalInput, dtMs: number): RascalState {
  const step = Math.max(0, Math.min(50, dtMs));
  const dt = step / 1000;
  const next = structuredClone(state);
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "paused" ? "playing" : "paused";
    return next;
  }
  if (next.phase !== "playing") return next;

  const level = roofLevel(next.levelIndex);
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  next.invulnMs = Math.max(0, next.invulnMs - step);
  next.coyoteMs = Math.max(0, next.coyoteMs - step);
  next.jumpBufferMs = Math.max(0, next.jumpBufferMs - step);

  const solids = solidsAt(next.levelIndex, next.elapsedMs);
  if (next.grounded && next.support != null) {
    const mover = solids.find((solid) => solid.mover === next.support);
    if (mover) {
      next.player.x += mover.x - next.supportX;
      next.supportX = mover.x;
    }
  }

  const dx = Math.max(-1, Math.min(1, input.dx));
  if (dx !== 0) next.face = dx;
  if (!next.zip && next.perchMs <= 0) {
    next.player.x += dx * RUN * dt;
    next.player.x = Math.max(0, Math.min(level.width - next.player.w, next.player.x));
    for (const plat of solids) {
      if (!overlaps(next.player, plat)) continue;
      if (dx > 0) next.player.x = plat.x - next.player.w;
      else if (dx < 0) next.player.x = plat.x + plat.w;
    }
  }

  if (next.perchMs > 0) {
    next.perchMs = Math.max(0, next.perchMs - step);
    if (next.perchMs > 0) {
      next.coyoteMs = next.perchMs;
      next.vy = 0;
      next.grounded = false;
      next.support = null;
      if (input.jumpHeld) next.jumpBufferMs = 120;
    }
  }

  if (next.grounded) next.coyoteMs = 110;
  if (input.jump) next.jumpBufferMs = 120;
  const jumping = next.jumpBufferMs > 0 && next.coyoteMs > 0 && !next.zip;
  if (jumping) {
    next.vy = JUMP;
    next.grounded = false;
    next.coyoteMs = 0;
    next.jumpBufferMs = 0;
    next.support = null;
    next.perchMs = 0;
  }
  if (!input.jumpHeld && next.vy < -260) next.vy = -260;

  if (input.web) next.webMs = WEB_BUFFER_MS;
  if (next.webMs > 0 && !next.zip && next.perchMs <= 0) {
    const hook = nearestWeb(next);
    if (hook) beginZip(next, hook);
    else if (input.web) {
      next.toast = level.webs.length === 0 ? "No web mark on this roof." : "Jump closer to the web mark.";
      next.toastMs = 1200;
    }
  }
  if (!input.web) next.webMs = Math.max(0, next.webMs - step);

  if (next.zip) {
    next.zip.t += step;
    const u = Math.min(1, next.zip.t / ZIP_MS);
    const ease = 1 - (1 - u) * (1 - u);
    next.player.x = next.zip.fromX + (next.zip.toX - next.zip.fromX) * ease;
    next.player.y = next.zip.fromY + (next.zip.toY - next.zip.fromY) * ease;
    next.vy = 0;
    next.grounded = false;
    if (next.zip.t >= ZIP_MS) {
      next.player.x = next.zip.toX;
      next.player.y = next.zip.toY;
      next.perchX = next.zip.hookX;
      next.perchY = next.zip.hookY;
      next.zip = null;
      next.perchMs = PERCH_MS;
      next.coyoteMs = PERCH_MS;
      next.vy = 0;
      next.grounded = false;
    }
  } else if (next.perchMs > 0) {
    next.vy = 0;
    next.grounded = false;
  } else {
    next.vy = Math.min(MAX_FALL, next.vy + GRAVITY * dt);
    const prevBottom = next.player.y + next.player.h;
    next.player.y += next.vy * dt;
    let landed: Body | null = null;
    const ordered = [...solids].sort((a, b) => a.y - b.y);
    for (const plat of ordered) {
      if (!overlaps(next.player, plat)) continue;
      if (next.vy >= 0 && prevBottom <= plat.y + 3) {
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
  }

  for (const bug of next.bugs) {
    if (bug.gone) continue;
    bug.x += bug.dir * BUG_SPEED * dt;
    if (bug.x < bug.left) {
      bug.x = bug.left;
      bug.dir = 1;
    }
    if (bug.x + bug.w > bug.right) {
      bug.x = bug.right - bug.w;
      bug.dir = -1;
    }
  }

  const prevBottom = state.player.y + state.player.h;
  for (const bug of next.bugs) {
    if (bug.gone || next.phase !== "playing") continue;
    if (!overlaps(next.player, bug)) continue;
    const stomp = next.vy > 0 && prevBottom <= bug.y + 6;
    if (stomp) {
      bug.gone = true;
      next.vy = -420;
      next.grounded = false;
      next.score += 200;
      continue;
    }
    hurt(next, false);
  }

  const cx = next.player.x + next.player.w / 2;
  const cy = next.player.y + next.player.h / 2;
  level.coins.forEach((coin, index) => {
    if (next.coinsGot[index]) return;
    const dxCoin = coin.x - cx;
    const dyCoin = coin.y - cy;
    if (dxCoin * dxCoin + dyCoin * dyCoin <= 26 * 26) {
      next.coinsGot[index] = true;
      next.score += 50;
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

  if (next.phase === "playing" && overlaps(next.player, level.goal)) {
    next.phase = "clear";
    next.score += 500;
    next.toast = "You finished the level!";
    next.toastMs = 0;
    next.zip = null;
  }

  if (next.phase === "playing" && next.player.y > 780) hurt(next, true);
  return next;
}

export function advanceRascal(state: RascalState): RascalState {
  if (state.phase === "retry") return createRascal(state.levelIndex, state.score);
  if (state.phase === "clear" && state.levelIndex < ROOF_LEVELS.length - 1) return createRascal(state.levelIndex + 1, state.score);
  if (state.phase === "clear") {
    const next = structuredClone(state);
    next.phase = "done";
    next.toast = "You finished all 5 levels.";
    return next;
  }
  if (state.phase === "done") return createRascal(0);
  return structuredClone(state);
}
