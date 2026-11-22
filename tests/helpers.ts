import { blankInput } from "../src/game/input";
import { tick, createGame } from "../src/game/sim";
import type { GameState, InputFrame, LevelDef } from "../src/game/types";

export function north(): InputFrame {
  return { ...blankInput(), dy: -1 };
}

export function startPlaying(state: GameState = createGame()): GameState {
  let next = tick(state, { ...blankInput(), start: true }, 16);
  next = tick(next, { ...blankInput(), confirm: true }, 16);
  return next;
}

export function idle(state: GameState, ms: number): GameState {
  let next = state;
  let left = ms;
  while (left > 0) {
    const dt = Math.min(16, left);
    next = tick(next, blankInput(), dt);
    left -= dt;
  }
  return next;
}

export function hopNorth(state: GameState): GameState {
  let next = tick(state, north(), 16);
  let guard = 0;
  while (next.crab.mode === "hopping" && guard < 30) {
    next = tick(next, blankInput(), 16);
    guard += 1;
  }
  return next;
}

export function playStraight(levels?: LevelDef[]): GameState {
  let state = startPlaying(levels ? createGame(levels) : createGame());
  let guard = 0;
  while (state.phase === "playing" && guard < 8000) {
    state = state.crab.mode === "idle" ? tick(state, north(), 16) : tick(state, blankInput(), 16);
    guard += 1;
  }
  return state;
}

export function debugState(state: GameState): string {
  return `phase=${state.phase} fail=${state.lastFail} lives=${state.crab.lives} x=${state.crab.x.toFixed(1)} y=${state.crab.y.toFixed(1)} t=${state.elapsedMs} toast=${state.toast} score=${state.crab.score}`;
}