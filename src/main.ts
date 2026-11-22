import { cameraTop } from "./game/camera";
import { STEP_MS, VIEW_H, VIEW_W } from "./game/constants";
import { continueLabel } from "./game/copy";
import { blankInput, buttonToInput, keyDown, mergeInput } from "./game/input";
import { createGame, tick } from "./game/sim";
import type { InputFrame } from "./game/types";
import { drawFrame } from "./render/draw";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing canvas");
const gameCanvas: HTMLCanvasElement = canvas;
const maybeContext = canvas.getContext("2d");
if (!maybeContext) throw new Error("missing canvas context");
const context: CanvasRenderingContext2D = maybeContext;
const continueButton = document.querySelector<HTMLButtonElement>("#continue");
const stage = document.querySelector<HTMLElement>("#stage");

let state = createGame();
let pending = blankInput();
let held = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

function queue(input: InputFrame): void {
  pending = mergeInput(pending, input);
}

function fitShell(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  document.body.style.width = `${viewport.width}px`;
  document.body.style.height = `${viewport.height}px`;
}

function fitCanvas(): void {
  if (!stage) return;
  const scale = Math.min(stage.clientWidth / VIEW_W, stage.clientHeight / VIEW_H);
  gameCanvas.style.width = `${Math.max(1, Math.floor(VIEW_W * scale))}px`;
  gameCanvas.style.height = `${Math.max(1, Math.floor(VIEW_H * scale))}px`;
}

function fit(): void {
  fitShell();
  fitCanvas();
}

fit();
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.visualViewport?.addEventListener("scroll", fit);
if (stage) new ResizeObserver(() => fitCanvas()).observe(stage);

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
    const input = buttonToInput(button.dataset.input ?? "");
    if (input.dx !== 0 || input.dy !== 0) {
      held = { ...blankInput(), dx: input.dx, dy: input.dy };
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
    queue(input);
  });
  const release = (event: PointerEvent) => {
    const input = buttonToInput(button.dataset.input ?? "");
    button.classList.remove("is-held");
    if (input.dx !== 0 || input.dy !== 0) {
      if (held.dx === input.dx && held.dy === input.dy) held = blankInput();
    }
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

canvas.addEventListener("pointerdown", () => {
  if (state.phase !== "playing") queue({ ...blankInput(), confirm: true, start: true });
});

function frame(now: number): void {
  acc += Math.min(100, now - last);
  last = now;
  let steps = 0;
  while (acc >= STEP_MS && steps < 5) {
    state = tick(state, mergeInput(pending, held), STEP_MS);
    pending = blankInput();
    acc -= STEP_MS;
    steps += 1;
  }
  if (continueButton) {
    continueButton.textContent = continueLabel(state.phase);
    continueButton.hidden = state.phase === "playing";
  }
  const target = cameraTop(state.crab.y, state.level.height, VIEW_H);
  cam += (target - cam) * 0.12;
  drawFrame(context, state, cam, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);