import { ESCAPE_ROOMS, spotHit, type KeyName } from "./rooms";

export type EscapePhase = "playing" | "paused" | "clear" | "done";

export type EscapeInput = {
  x: number | null;
  y: number | null;
  digit: number | null;
  back: boolean;
  clear: boolean;
  open: boolean;
  pause: boolean;
  confirm: boolean;
};

export type EscapeState = {
  phase: EscapePhase;
  levelIndex: number;
  room: string;
  score: number;
  misses: number;
  entry: string;
  noteId: string | null;
  read: string[];
  toast: string;
  toastMs: number;
  elapsedMs: number;
};

export function blankEscapeInput(): EscapeInput {
  return { x: null, y: null, digit: null, back: false, clear: false, open: false, pause: false, confirm: false };
}

export function createEscape(level = 0, score = 0): EscapeState {
  const index = ESCAPE_ROOMS[level] ? level : 0;
  const room = ESCAPE_ROOMS[index];
  return {
    phase: "playing",
    levelIndex: index,
    room: room.id,
    score,
    misses: 0,
    entry: "",
    noteId: null,
    read: [],
    toast: room.blurb,
    toastMs: 2200,
    elapsedMs: 0,
  };
}

function say(state: EscapeState, text: string, ms = 1400): void {
  state.toast = text;
  state.toastMs = ms;
}

function pushDigit(state: EscapeState, digit: number): void {
  if (digit < 0 || digit > 9) return;
  const room = ESCAPE_ROOMS[state.levelIndex];
  if (state.entry.length >= room.code.length) return;
  state.entry += String(digit);
}

function tryOpen(state: EscapeState): void {
  const room = ESCAPE_ROOMS[state.levelIndex];
  if (state.entry.length < room.code.length) {
    say(state, `The lock wants ${room.code.length} numbers.`);
    return;
  }
  if (state.entry === room.code) {
    state.score += state.misses === 0 ? 150 : 80;
    state.phase = "clear";
    state.noteId = null;
    say(state, "The door opens.", 2400);
    return;
  }
  state.misses += 1;
  state.entry = "";
  say(state, "Look again.");
}

function applyKey(state: EscapeState, name: KeyName): void {
  if (name === "close") {
    state.noteId = null;
    return;
  }
  if (name === "pause") {
    state.phase = "paused";
    return;
  }
  if (name === "clear") {
    state.entry = "";
    return;
  }
  if (name === "open") {
    tryOpen(state);
    return;
  }
  pushDigit(state, Number(name));
}

export function tickEscape(state: EscapeState, input: EscapeInput, dtMs: number): EscapeState {
  const step = Math.max(0, Math.min(dtMs, 50));
  const next: EscapeState = { ...state, read: [...state.read] };
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "playing" ? "paused" : "playing";
    return next;
  }
  if (next.phase !== "playing") return next;
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  if (input.x != null && input.y != null) {
    const hit = spotHit(next.levelIndex, input.x, input.y, next.noteId != null);
    if (hit?.kind === "spot") {
      next.noteId = hit.id;
      if (!next.read.includes(hit.id)) next.read.push(hit.id);
    } else if (hit?.kind === "key") applyKey(next, hit.name);
  }
  if (input.digit != null) pushDigit(next, input.digit);
  if (input.back) next.entry = next.entry.slice(0, -1);
  if (input.clear) next.entry = "";
  if (input.open) tryOpen(next);
  return next;
}

export function advanceEscape(state: EscapeState): EscapeState {
  if (state.phase === "done") return createEscape();
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= ESCAPE_ROOMS.length - 1) {
    return { ...state, phase: "done", toast: "You opened every door.", toastMs: 4000 };
  }
  return createEscape(state.levelIndex + 1, state.score);
}
