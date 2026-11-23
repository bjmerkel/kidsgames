import { AXO_LEVELS, BUG_LOOK, axoLevel, type BugKind } from "./levels";

export type AxoPhase = "playing" | "paused" | "clear" | "retry" | "done";

export type AxoInput = {
  dx: number;
  fire: boolean;
  pause: boolean;
  confirm: boolean;
  aimX: number | null;
};

export type AxoBug = {
  id: number;
  kind: BugKind;
  hp: number;
  points: number;
  radius: number;
  slotX: number;
  slotY: number;
  x: number;
  y: number;
  mode: "enter" | "form" | "dive" | "gone";
  enterAt: number;
  diveMs: number;
  fired: number;
};

export type Shot = { x: number; y: number; vy: number };

export type AxoState = {
  phase: AxoPhase;
  levelIndex: number;
  elapsedMs: number;
  score: number;
  lives: number;
  invulnMs: number;
  playerX: number;
  playerY: number;
  cooldownMs: number;
  nextDiveMs: number;
  nextKingMs: number;
  diveCursor: number;
  bugs: AxoBug[];
  bubbles: Shot[];
  pellets: Shot[];
  toast: string;
  toastMs: number;
};

const PLAYER_Y = 620;
const PLAYER_R = 16;
const PLAYER_SPEED = 320;
const PLAYER_LEFT = 36;
const PLAYER_RIGHT = 444;
const BUBBLE_VY = -520;
const BUBBLE_R = 6;
const PELLET_R = 6;
const MAX_BUBBLES = 2;
const FIRE_COOLDOWN = 180;
const LIVES = 3;
const INVULN_MS = 1400;
const ENTER_GAP = 55;
const ENTER_MS = 400;

export function blankAxoInput(): AxoInput {
  return { dx: 0, fire: false, pause: false, confirm: false, aimX: null };
}

export function createAxo(levelIndex = 0, score = 0): AxoState {
  const index = Math.max(0, Math.min(AXO_LEVELS.length - 1, levelIndex));
  const level = AXO_LEVELS[index];
  const bugs: AxoBug[] = [];
  let id = 1;
  level.rows.forEach((kind, row) => {
    const gap = level.columns >= 5 ? 58 : 70;
    const width = (level.columns - 1) * gap;
    const start = (480 - width) / 2;
    for (let col = 0; col < level.columns; col += 1) {
      const look = BUG_LOOK[kind];
      const slotX = start + col * gap;
      const slotY = level.top + row * 48;
      bugs.push({
        id,
        kind,
        hp: look.hp,
        points: look.points,
        radius: look.radius,
        slotX,
        slotY,
        x: slotX,
        y: -40,
        mode: "enter",
        enterAt: (id - 1) * ENTER_GAP,
        diveMs: 0,
        fired: 0,
      });
      id += 1;
    }
  });
  if (level.king) {
    const look = BUG_LOOK.king;
    bugs.push({
      id,
      kind: "king",
      hp: look.hp,
      points: look.points,
      radius: look.radius,
      slotX: 240,
      slotY: level.top - 62,
      x: 240,
      y: -40,
      mode: "enter",
      enterAt: (id - 1) * ENTER_GAP,
      diveMs: 0,
      fired: 0,
    });
  }
  return {
    phase: "playing",
    levelIndex: index,
    elapsedMs: 0,
    score,
    lives: LIVES,
    invulnMs: 0,
    playerX: 240,
    playerY: PLAYER_Y,
    cooldownMs: 0,
    nextDiveMs: level.firstDiveMs,
    nextKingMs: level.kingDiveEvery ?? 0,
    diveCursor: 0,
    bugs,
    bubbles: [],
    pellets: [],
    toast: level.blurb,
    toastMs: 2000,
  };
}

function overlaps(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy <= reach * reach;
}

function placeBug(bug: AxoBug, elapsedMs: number, step: number): void {
  if (bug.mode === "gone" || bug.hp <= 0) return;
  if (bug.mode === "enter") {
    const t = Math.max(0, Math.min(1, (elapsedMs - bug.enterAt) / ENTER_MS));
    const ease = 1 - (1 - t) * (1 - t);
    const side = bug.id % 2 === 0 ? 1 : -1;
    bug.x = bug.slotX + (1 - ease) * 90 * side;
    bug.y = -40 + (bug.slotY + 40) * ease;
    if (t >= 1) bug.mode = "form";
    return;
  }
  if (bug.mode === "form") {
    const slide = Math.sin(elapsedMs / 700) * 28;
    bug.x = bug.slotX + slide + Math.sin((elapsedMs + bug.id * 50) / 220) * 4;
    bug.y = bug.slotY + Math.sin(elapsedMs / 380 + bug.id) * 4;
    return;
  }
  bug.diveMs += step;
  const duration = bug.kind === "king" ? 3200 : 2100;
  const u = Math.min(1, bug.diveMs / duration);
  const side = bug.id % 2 === 0 ? 1 : -1;
  if (u < 0.7) {
    const p = u / 0.7;
    bug.x = bug.slotX + Math.sin(p * Math.PI) * 110 * side;
    bug.y = bug.slotY + p * p * (690 - bug.slotY);
  } else {
    const p = (u - 0.7) / 0.3;
    bug.x = bug.slotX * p + (bug.slotX + 80 * side) * (1 - p);
    bug.y = -36 + p * (bug.slotY + 36);
  }
  if (bug.diveMs >= duration) {
    bug.mode = "form";
    bug.diveMs = 0;
    bug.fired = 0;
  }
}

function startDives(state: AxoState): void {
  const level = axoLevel(state.levelIndex);
  const entered = state.bugs.every((bug) => bug.hp <= 0 || state.elapsedMs >= bug.enterAt + ENTER_MS);
  if (!entered) return;
  let launches = 0;
  while (state.elapsedMs >= state.nextDiveMs && launches < 3) {
    for (let n = 0; n < level.diveCount; n += 1) {
      const formed = state.bugs.filter((bug) => bug.mode === "form" && bug.hp > 0 && bug.kind !== "king");
      if (formed.length === 0) break;
      const bug = formed[state.diveCursor % formed.length];
      state.diveCursor += 1;
      bug.mode = "dive";
      bug.diveMs = 0;
      bug.fired = 0;
    }
    state.nextDiveMs += level.diveEvery;
    launches += 1;
  }
  if (level.kingDiveEvery == null) return;
  const king = state.bugs.find((bug) => bug.kind === "king" && bug.hp > 0);
  if (king && king.mode === "form" && state.elapsedMs >= state.nextKingMs) {
    king.mode = "dive";
    king.diveMs = 0;
    king.fired = 0;
    state.nextKingMs = state.elapsedMs + level.kingDiveEvery;
  }
}

function dropPellets(state: AxoState): void {
  const level = axoLevel(state.levelIndex);
  for (const bug of state.bugs) {
    if (bug.mode !== "dive" || (bug.kind !== "dragonfly" && bug.kind !== "king")) continue;
    const marks = bug.kind === "king" ? [800, 1600] : [700];
    while (bug.fired < marks.length && bug.diveMs >= marks[bug.fired]) {
      state.pellets.push({ x: bug.x, y: bug.y + bug.radius * 0.4, vy: level.pelletSpeed });
      bug.fired += 1;
    }
  }
}

function hurt(state: AxoState): void {
  if (state.invulnMs > 0 || state.phase !== "playing") return;
  state.lives -= 1;
  state.invulnMs = INVULN_MS;
  state.pellets = [];
  state.toast = "Try again.";
  state.toastMs = 1200;
  if (state.lives <= 0) {
    state.phase = "retry";
    state.toast = "Try again.";
    state.toastMs = 0;
  }
}

export function tickAxo(state: AxoState, input: AxoInput, dtMs: number): AxoState {
  const step = Math.max(0, Math.min(50, dtMs));
  const dt = step / 1000;
  const next = structuredClone(state);
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "paused" ? "playing" : "paused";
    return next;
  }
  if (next.phase !== "playing") return next;

  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  next.invulnMs = Math.max(0, next.invulnMs - step);
  next.cooldownMs = Math.max(0, next.cooldownMs - step);
  if (input.aimX != null) {
    next.playerX = Math.max(PLAYER_LEFT, Math.min(PLAYER_RIGHT, input.aimX));
  } else {
    const dx = Math.max(-1, Math.min(1, input.dx));
    next.playerX = Math.max(PLAYER_LEFT, Math.min(PLAYER_RIGHT, next.playerX + dx * PLAYER_SPEED * dt));
  }

  if (input.fire && next.cooldownMs <= 0 && next.bubbles.length < MAX_BUBBLES) {
    next.bubbles.push({ x: next.playerX, y: next.playerY - 28, vy: BUBBLE_VY });
    next.cooldownMs = FIRE_COOLDOWN;
  }

  for (const bubble of next.bubbles) {
    bubble.y += bubble.vy * dt;
  }
  for (const bug of next.bugs) placeBug(bug, next.elapsedMs, step);
  startDives(next);
  dropPellets(next);
  for (const pellet of next.pellets) pellet.y += pellet.vy * dt;

  for (const bubble of next.bubbles) {
    if (bubble.vy === 0 && bubble.y > 800) continue;
    for (const bug of next.bugs) {
      if (bug.hp <= 0 || bug.y < 10) continue;
      if (!overlaps(bubble.x, bubble.y, BUBBLE_R, bug.x, bug.y, bug.radius)) continue;
      bug.hp -= 1;
      bubble.y = -999;
      if (bug.hp <= 0) {
        bug.mode = "gone";
        next.score += bug.points;
      }
      break;
    }
  }
  next.bubbles = next.bubbles.filter((bubble) => bubble.y > 16 && bubble.y < 760);

  if (next.invulnMs <= 0) {
    for (const pellet of next.pellets) {
      if (overlaps(pellet.x, pellet.y, PELLET_R, next.playerX, next.playerY, PLAYER_R)) {
        hurt(next);
        break;
      }
    }
  }
  if (next.phase === "playing" && next.invulnMs <= 0) {
    for (const bug of next.bugs) {
      if (bug.mode !== "dive" || bug.hp <= 0) continue;
      const body = Math.min(bug.radius * 0.65, 18);
      if (overlaps(bug.x, bug.y, body, next.playerX, next.playerY, PLAYER_R)) {
        hurt(next);
        break;
      }
    }
  }

  next.pellets = next.pellets.filter((pellet) => pellet.y < 710);
  if (next.phase === "playing" && next.bugs.every((bug) => bug.hp <= 0)) {
    next.phase = "clear";
    next.toast = "You finished the level!";
    next.toastMs = 0;
  }
  return next;
}

export function advanceAxo(state: AxoState): AxoState {
  if (state.phase === "retry") return createAxo(state.levelIndex, state.score);
  if (state.phase === "clear" && state.levelIndex < AXO_LEVELS.length - 1) return createAxo(state.levelIndex + 1, state.score);
  if (state.phase === "clear") {
    const next = structuredClone(state);
    next.phase = "done";
    next.toast = "You finished all 5 levels.";
    return next;
  }
  if (state.phase === "done") return createAxo(0);
  return structuredClone(state);
}
