import type { InputFrame, Phase } from "./types";

export function blankInput(): InputFrame {
  return { dx: 0, dy: 0, tuck: false, start: false, pause: false, confirm: false };
}

export function keyDown(code: string, phase: Phase): InputFrame {
  const input = blankInput();
  if (code === "ArrowUp" || code === "KeyW") input.dy = -1;
  if (code === "ArrowDown" || code === "KeyS") input.dy = 1;
  if (code === "ArrowLeft" || code === "KeyA") input.dx = -1;
  if (code === "ArrowRight" || code === "KeyD") input.dx = 1;
  if (code === "Space") {
    if (phase === "playing") input.tuck = true;
    else input.confirm = true;
  }
  if (code === "Enter") {
    input.confirm = true;
    input.start = true;
  }
  if (code === "Escape") input.pause = true;
  return input;
}

export function buttonToInput(name: string): InputFrame {
  const input = blankInput();
  if (name === "n") input.dy = -1;
  if (name === "s") input.dy = 1;
  if (name === "w") input.dx = -1;
  if (name === "e") input.dx = 1;
  if (name === "tuck") input.tuck = true;
  if (name === "pause") input.pause = true;
  if (name === "confirm" || name === "start") {
    input.confirm = true;
    input.start = true;
  }
  return input;
}

export function mergeInput(current: InputFrame, next: InputFrame): InputFrame {
  return {
    dx: next.dx !== 0 ? next.dx : current.dx,
    dy: next.dy !== 0 ? next.dy : current.dy,
    tuck: current.tuck || next.tuck,
    start: current.start || next.start,
    pause: current.pause || next.pause,
    confirm: current.confirm || next.confirm,
  };
}