import { CHECKPOINT_INSET, CRAB_R, HIT_FLASH_MS, INTRO_MS, LEVEL_SCORE, LIVES, MAX_FRAME_MS, SEGMENT_SCORE, TOAST_MS } from "./constants";
import { advanceHop, advanceTuck, beginHop } from "./crab";
import { COPY } from "./copy";
import { clamp } from "./geometry";
import { stepHazards } from "./hazards";
import { curbSegment, LEVELS, startPoint } from "./levels";
import type { Crab, FailReason, GameState, InputFrame, LevelDef } from "./types";
import { detectHit, pickSupport, segmentAt, zoneAt } from "./zones";

export function createGame(templates: LevelDef[] = LEVELS): GameState {
  const cloned = structuredClone(templates);
  const level = structuredClone(cloned[0]);
  const start = startPoint(level);
  const crab = makeCrab(start.x, start.y);
  return {
    phase: "title",
    levelIndex: 0,
    templates: cloned,
    level,
    crab,
    elapsedMs: 0,
    checkpointX: start.x,
    checkpointY: start.y,
    checkpointSegmentId: curbSegment(level).id,
    bannerTitle: "",
    bannerBody: "",
    toast: "",
    toastMs: 0,
    introMs: 0,
    hitFlashMs: 0,
    lastFail: null,
  };
}

export function tick(state: GameState, input: InputFrame, dtMs: number): GameState {
  const dt = Math.max(0, Math.min(MAX_FRAME_MS, dtMs));
  const next = structuredClone(state);

  if (next.phase === "title") {
    if (input.start || input.confirm) openIntro(next);
    return next;
  }
  if (next.phase === "intro") {
    next.introMs += dt;
    if (input.confirm || next.introMs >= INTRO_MS) beginPlay(next);
    return next;
  }
  if (next.phase === "paused") {
    if (input.pause || input.confirm) next.phase = "playing";
    return next;
  }
  if (next.phase === "level-clear") {
    if (input.confirm) return beginLevel(next, next.levelIndex + 1);
    return next;
  }
  if (next.phase === "campaign-clear") {
    if (input.confirm) return createGame(next.templates);
    return next;
  }
  if (next.phase === "retry") {
    if (input.confirm) return beginLevel(next, next.levelIndex);
    return next;
  }
  if (input.pause) {
    next.phase = "paused";
    next.bannerTitle = COPY.paused;
    next.bannerBody = `${COPY.emery}.`;
    return next;
  }

  next.elapsedMs += dt;
  stepHazards(next.level, dt, next.elapsedMs, next.crab.supportId);
  if (next.crab.mode === "hopping") advanceHop(next.crab, dt);
  advanceTuck(next.crab, dt, input.tuck);
  if (next.crab.mode === "idle" && !input.tuck) beginHop(next.crab, input.dx, input.dy, next.level);
  if (next.crab.mode === "hopping" && next.crab.hopElapsedMs === 0) advanceHop(next.crab, dt);
  attachSupport(next);
  decayFx(next, dt);

  if (zoneAt(next.level, next.crab.y).tag === "burrow") return reachGoal(next);
  const hit = detectHit(next.level, next.crab, next.elapsedMs / 1000);
  if (hit) return applyHit(next, hit);
  if (next.elapsedMs >= next.level.timeLimitMs) return applyHit(next, "time");
  updateCheckpoint(next);
  return next;
}

function openIntro(state: GameState): void {
  state.phase = "intro";
  state.introMs = 0;
  state.bannerTitle = state.level.name;
  state.bannerBody = state.level.intro;
}

function beginPlay(state: GameState): void {
  state.phase = "playing";
  state.elapsedMs = 0;
  state.bannerTitle = "";
  state.bannerBody = "";
}

function beginLevel(state: GameState, index: number): GameState {
  state.levelIndex = index;
  state.level = structuredClone(state.templates[index]);
  const start = startPoint(state.level);
  state.crab = makeCrab(start.x, start.y, state.crab.score);
  state.elapsedMs = 0;
  state.checkpointX = start.x;
  state.checkpointY = start.y;
  state.checkpointSegmentId = curbSegment(state.level).id;
  state.toast = "";
  state.toastMs = 0;
  state.hitFlashMs = 0;
  state.lastFail = null;
  openIntro(state);
  return state;
}

function reachGoal(state: GameState): GameState {
  state.crab.score += LEVEL_SCORE;
  state.crab.mode = "idle";
  state.lastFail = null;
  const last = state.levelIndex >= state.templates.length - 1;
  state.phase = last ? "campaign-clear" : "level-clear";
  state.bannerTitle = COPY.finishedLevel;
  state.bannerBody = last ? `${COPY.finishedAll} ${COPY.emery}.` : `${COPY.emery}.`;
  return state;
}

function applyHit(state: GameState, reason: FailReason): GameState {
  state.crab.lives -= 1;
  state.crab.mode = "idle";
  state.crab.supportId = null;
  state.crab.supportKind = null;
  state.crab.hopElapsedMs = 0;
  state.crab.x = state.checkpointX;
  state.crab.y = state.checkpointY;
  state.hitFlashMs = HIT_FLASH_MS;
  state.lastFail = reason;
  state.toast = reason === "time" ? COPY.timeUp : COPY.tryAgain;
  state.toastMs = TOAST_MS;
  if (state.crab.lives <= 0) {
    state.phase = "retry";
    state.bannerTitle = COPY.tryLevel;
    state.bannerBody = `${COPY.emery}.`;
  } else if (reason === "time") {
    state.elapsedMs = 0;
  }
  return state;
}

function updateCheckpoint(state: GameState): void {
  const segment = segmentAt(state.level, state.crab.y);
  if (!segment || segment.kind === "pond") return;
  const previous = state.level.segments.find((item) => item.id === state.checkpointSegmentId);
  if (!previous || segment.id === previous.id || segment.y >= previous.y) return;
  const x = state.level.width / 2;
  const y = segment.y + segment.h - CHECKPOINT_INSET;
  const probe: Crab = { ...state.crab, x, y, mode: "idle", supportId: null, supportKind: null };
  if (detectHit(state.level, probe, state.elapsedMs / 1000)) return;
  state.checkpointSegmentId = segment.id;
  state.checkpointX = x;
  state.checkpointY = y;
  state.crab.score += SEGMENT_SCORE;
}

function attachSupport(state: GameState): void {
  const crab = state.crab;
  if (crab.mode === "hopping") return;
  const support = pickSupport(state.level, crab);
  if (support.kind !== "stone" && support.kind !== "hold") {
    crab.supportId = null;
    crab.supportKind = null;
    return;
  }
  if (crab.supportId !== support.id) {
    crab.supportId = support.id;
    crab.supportKind = support.kind;
    crab.rideOffsetX = crab.x - support.x;
    crab.rideOffsetY = crab.y - support.y;
  }
  crab.x = clamp(support.x + crab.rideOffsetX, CRAB_R, state.level.width - CRAB_R);
  crab.y = support.y + crab.rideOffsetY;
}

function decayFx(state: GameState, dt: number): void {
  state.hitFlashMs = Math.max(0, state.hitFlashMs - dt);
  state.toastMs = Math.max(0, state.toastMs - dt);
  if (state.toastMs === 0) state.toast = "";
}

function makeCrab(x: number, y: number, score = 0): Crab {
  return {
    x,
    y,
    facing: "n",
    mode: "idle",
    hopFromX: x,
    hopFromY: y,
    hopToX: x,
    hopToY: y,
    hopElapsedMs: 0,
    tuckElapsedMs: 0,
    tuckCooldownMs: 0,
    supportId: null,
    supportKind: null,
    rideOffsetX: 0,
    rideOffsetY: 0,
    lives: LIVES,
    score,
  };
}