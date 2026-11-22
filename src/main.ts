import { cameraTop } from "./game/camera";
import { STEP_MS, VIEW_H, VIEW_W } from "./game/constants";
import { continueLabel } from "./game/copy";
import { blankInput, buttonToInput, keyDown, mergeInput } from "./game/input";
import { createGame, tick } from "./game/sim";
import type { InputFrame } from "./game/types";
import { drawFrame } from "./render/draw";
import { CHARACTERS, characterById } from "./race/characters";
import { drawGarage, drawRace } from "./race/draw";
import { advanceCup, blankRaceInput, createRace, tickRace, type RaceInput, type RaceState } from "./race/sim";
import { TRACKS } from "./race/tracks";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing canvas");
const gameCanvas: HTMLCanvasElement = canvas;
const maybeContext = canvas.getContext("2d");
if (!maybeContext) throw new Error("missing canvas context");
const context: CanvasRenderingContext2D = maybeContext;
const raceCanvas = document.querySelector<HTMLCanvasElement>("#race-canvas");
if (!raceCanvas) throw new Error("missing race canvas");
const raceSurface: HTMLCanvasElement = raceCanvas;
const raceContext = raceCanvas.getContext("2d");
if (!raceContext) throw new Error("missing race context");
const raceGfx: CanvasRenderingContext2D = raceContext;
const continueButton = document.querySelector<HTMLButtonElement>("#continue");
const stage = document.querySelector<HTMLElement>("#stage");
const raceStage = document.querySelector<HTMLElement>("#race-stage");
const menu = document.querySelector<HTMLElement>("#menu");
const crabSection = document.querySelector<HTMLElement>("#crab");
const raceSection = document.querySelector<HTMLElement>("#race");
const picker = document.querySelector<HTMLElement>("#race-picker");
const racePad = document.querySelector<HTMLElement>("#race-pad");
const raceHeading = document.querySelector<HTMLElement>("#race-heading");
const raceNext = document.querySelector<HTMLButtonElement>("#race-next");
const raceUse = document.querySelector<HTMLButtonElement>("#race-pad button[data-race='use']");

let state = createGame();
let pending = blankInput();
let held = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

type Mode = "menu" | "crab" | "race";
let mode: Mode = "menu";
let raceScreen: "select" | "play" = "select";
let selectedId = "woody";
let raceState: RaceState | null = null;
let raceAcc = 0;
const raceKeys = { left: false, right: false, brake: false };
let raceEdge = blankRaceInput();

function queue(input: InputFrame): void {
  pending = mergeInput(pending, input);
}

function fitBox(box: HTMLElement | null, target: HTMLCanvasElement): void {
  if (!box) return;
  const scale = Math.min(box.clientWidth / VIEW_W, box.clientHeight / VIEW_H);
  target.style.width = `${Math.max(1, Math.floor(VIEW_W * scale))}px`;
  target.style.height = `${Math.max(1, Math.floor(VIEW_H * scale))}px`;
}

function fitShell(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  document.body.style.width = `${viewport.width}px`;
  document.body.style.height = `${viewport.height}px`;
}

function fit(): void {
  fitShell();
  fitBox(stage, gameCanvas);
  fitBox(raceStage, raceSurface);
}

fit();
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.visualViewport?.addEventListener("scroll", fit);
if (stage) new ResizeObserver(() => fitBox(stage, gameCanvas)).observe(stage);
if (raceStage) new ResizeObserver(() => fitBox(raceStage, raceSurface)).observe(raceStage);

function show(next: Mode): void {
  mode = next;
  if (menu) menu.hidden = next !== "menu";
  if (crabSection) crabSection.hidden = next !== "crab";
  if (raceSection) raceSection.hidden = next !== "race";
  document.title = next === "crab" ? "Hermit Crab Crossing" : next === "race" ? "Woodland Grand Prix" : "Kids Games";
  if (next === "crab") {
    state = createGame();
    pending = blankInput();
    held = blankInput();
    cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
  }
  if (next === "race") openGarage();
  requestAnimationFrame(() => fit());
}

function openGarage(): void {
  raceScreen = "select";
  raceState = null;
  raceEdge = blankRaceInput();
  syncRaceChrome();
}

function syncRaceChrome(): void {
  const character = characterById(selectedId);
  picker?.querySelectorAll<HTMLButtonElement>("button[data-character]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.character === selectedId);
  });
  const playing = raceScreen === "play" && raceState;
  if (picker) picker.hidden = Boolean(playing);
  if (racePad) racePad.hidden = !playing;
  if (!playing) {
    if (raceHeading) raceHeading.textContent = `${character.name} the ${character.species}`;
    return;
  }
  if (!raceState) return;
  const track = TRACKS[raceState.trackIndex];
  if (raceHeading) raceHeading.textContent = raceState.phase === "cup" ? "Woodland Cup" : track.name;
  const live = raceState.phase === "racing" || raceState.phase === "countdown" || raceState.phase === "paused";
  racePad?.querySelectorAll<HTMLButtonElement>("button[data-race]").forEach((button) => {
    button.hidden = !live;
  });
  if (raceNext) {
    raceNext.hidden = live;
    if (raceState.phase === "cup") raceNext.textContent = "Play again";
    else if (raceState.trackIndex >= TRACKS.length - 1) raceNext.textContent = "The cup";
    else raceNext.textContent = "Next level";
  }
  if (raceUse) {
    const item = raceState.racers[raceState.playerIndex]?.item;
    raceUse.textContent = item === "acorn" ? "Throw acorn" : item === "leaf" ? "Use leaf" : item === "honey" ? "Drop honey" : "Use";
  }
}

function startRace(): void {
  raceState = createRace(selectedId);
  raceScreen = "play";
  raceAcc = 0;
  raceEdge = blankRaceInput();
  syncRaceChrome();
  requestAnimationFrame(() => fit());
}

function raceSteer(): number {
  return (raceKeys.right ? 1 : 0) - (raceKeys.left ? 1 : 0);
}

function holdRaceButton(button: HTMLButtonElement, event: PointerEvent): void {
  const name = button.dataset.race ?? "";
  if (name === "left") raceKeys.left = true;
  if (name === "right") raceKeys.right = true;
  if (name === "brake") raceKeys.brake = true;
  if (name === "use" || name === "pause") {
    raceEdge = {
      ...raceEdge,
      use: raceEdge.use || name === "use",
      pause: raceEdge.pause || name === "pause",
    };
  }
  if (name === "left" || name === "right" || name === "brake") {
    button.classList.add("is-held");
    if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
  }
}

function releaseRaceButton(button: HTMLButtonElement, event: PointerEvent): void {
  const name = button.dataset.race ?? "";
  if (name === "left") raceKeys.left = false;
  if (name === "right") raceKeys.right = false;
  if (name === "brake") raceKeys.brake = false;
  button.classList.remove("is-held");
  if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
}

if (picker) {
  for (const character of CHARACTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.character = character.id;
    button.innerHTML = `${character.name}<small>${character.species}</small>`;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectedId = character.id;
      syncRaceChrome();
    });
    picker.append(button);
  }
  const start = document.createElement("button");
  start.type = "button";
  start.id = "race-start";
  start.textContent = "Start race";
  start.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startRace();
  });
  picker.append(start);
}

document.querySelector<HTMLButtonElement>("#play-crab")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("crab");
});
document.querySelector<HTMLButtonElement>("#play-race")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("race");
});
document.querySelector("#crab-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#race-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
raceNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!raceState) return;
  if (raceState.phase === "cup") openGarage();
  else raceState = advanceCup(raceState);
  syncRaceChrome();
});

window.addEventListener("keydown", (event) => {
  if (mode === "race") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") raceKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") raceKeys.right = true;
    if (event.code === "ArrowDown" || event.code === "KeyS") raceKeys.brake = true;
    if (event.code === "Space") raceEdge = { ...raceEdge, use: true };
    if (event.code === "Escape") raceEdge = { ...raceEdge, pause: true };
    if (event.code === "Enter") raceEdge = { ...raceEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "KeyA", "KeyD", "KeyS", "Space"].includes(event.code)) event.preventDefault();
    return;
  }
  if (mode !== "crab") return;
  const input = keyDown(event.code, state.phase);
  if (input.dx || input.dy || input.tuck || input.pause || input.confirm || input.start) {
    event.preventDefault();
    queue(input);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") raceKeys.left = false;
  if (event.code === "ArrowRight" || event.code === "KeyD") raceKeys.right = false;
  if (event.code === "ArrowDown" || event.code === "KeyS") raceKeys.brake = false;
});

document.querySelectorAll<HTMLButtonElement>("button[data-input]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    if (mode !== "crab") return;
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

document.querySelectorAll<HTMLButtonElement>("button[data-race]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    holdRaceButton(button, event);
  });
  const release = (event: PointerEvent) => releaseRaceButton(button, event);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

canvas.addEventListener("pointerdown", () => {
  if (mode === "crab" && state.phase !== "playing") queue({ ...blankInput(), confirm: true, start: true });
});

raceSurface.addEventListener("pointerdown", () => {
  if (mode !== "race" || !raceState) return;
  if (raceState.phase === "countdown") raceEdge = { ...raceEdge, confirm: true };
  if (raceState.phase === "results" || raceState.phase === "cup") {
    if (raceState.phase === "cup") openGarage();
    else raceState = advanceCup(raceState);
    syncRaceChrome();
  }
});

function raceInput(): RaceInput {
  return {
    steer: raceSteer(),
    brake: raceKeys.brake,
    use: raceEdge.use,
    pause: raceEdge.pause,
    confirm: raceEdge.confirm,
  };
}

function frame(now: number): void {
  const delta = Math.min(100, now - last);
  last = now;
  if (mode === "crab") {
    acc += delta;
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
  }
  if (mode === "race") {
    if (raceScreen === "select") {
      if (raceEdge.confirm) {
        raceEdge = blankRaceInput();
        startRace();
      } else drawGarage(raceGfx, characterById(selectedId), now);
    } else if (raceState) {
      raceAcc += delta;
      let steps = 0;
      while (raceAcc >= STEP_MS && steps < 5 && raceScreen === "play" && raceState) {
        const input = raceInput();
        if (input.confirm && raceState.phase === "cup") {
          openGarage();
          break;
        }
        if (input.confirm && raceState.phase === "results") raceState = advanceCup(raceState);
        else raceState = tickRace(raceState, input, STEP_MS);
        raceEdge = blankRaceInput();
        raceAcc -= STEP_MS;
        steps += 1;
      }
      if (raceScreen === "play" && raceState) {
        drawRace(raceGfx, raceState, now);
        syncRaceChrome();
      }
    }
  }
  requestAnimationFrame(frame);
}

syncRaceChrome();
requestAnimationFrame(frame);
