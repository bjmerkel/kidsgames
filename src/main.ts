import { cameraTop } from "./game/camera";
import { STEP_MS, VIEW_H } from "./game/constants";
import { continueLabel } from "./game/copy";
import { blankInput, buttonToInput, keyDown, mergeInput } from "./game/input";
import { createGame, tick } from "./game/sim";
import type { InputFrame } from "./game/types";
import { drawFrame } from "./render/draw";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing canvas");
const maybeContext = canvas.getContext("2d");
if (!maybeContext) throw new Error("missing canvas context");
const context: CanvasRenderingContext2D = maybeContext;
const continueButton = document.querySelector<HTMLButtonElement>("#continue");

let state = createGame();
let pending = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

function queue(input: InputFrame): void {
  pending = mergeInput(pending, input);
}

window.addEventListener("keydown", (event) => {
  const input = keyDown(event.code, state.phase);
  if (input.dx || input.dy || input.tuck || input.pause || input.confirm || input.start) {
    event.preventDefault();
    queue(input);
  }
});

document.querySelectorAll<HTMLButtonElement>("button[data-input]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    queue(buttonToInput(button.dataset.input ?? ""));
  });
});

canvas.addEventListener("pointerdown", () => {
  if (state.phase !== "playing") queue({ ...blankInput(), confirm: true, start: true });
});

function frame(now: number): void {
  acc += Math.min(100, now - last);
  last = now;
  let steps = 0;
  while (acc >= STEP_MS && steps < 5) {
    state = tick(state, pending, STEP_MS);
    pending = blankInput();
    acc -= STEP_MS;
    steps += 1;
  }
  if (continueButton) continueButton.textContent = continueLabel(state.phase);
  const target = cameraTop(state.crab.y, state.level.height, VIEW_H);
  cam += (target - cam) * 0.12;
  drawFrame(context, state, cam, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);