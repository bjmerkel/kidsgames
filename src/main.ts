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
import { drawPond } from "./fish/draw";
import { FISH_LEVELS } from "./fish/levels";
import { advancePond, blankPondInput, createPond, tickPond, type PondInput, type PondState } from "./fish/sim";
import { drawAxo } from "./axolotl/draw";
import { AXO_LEVELS } from "./axolotl/levels";
import { advanceAxo, blankAxoInput, createAxo, tickAxo, type AxoInput, type AxoState } from "./axolotl/sim";
import { drawRascal } from "./rascal/draw";
import { ROOF_LEVELS } from "./rascal/levels";
import { advanceRascal, blankRascalInput, createRascal, tickRascal, type RascalInput, type RascalState } from "./rascal/sim";
import { drawCapy } from "./capy/draw";
import { JUNGLE_LEVELS } from "./capy/levels";
import { advanceCapy, blankCapyInput, createCapy, tickCapy, type CapyInput, type CapyState } from "./capy/sim";

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
const fishCanvas = document.querySelector<HTMLCanvasElement>("#fish-canvas");
if (!fishCanvas) throw new Error("missing fish canvas");
const fishSurface: HTMLCanvasElement = fishCanvas;
const fishContext = fishCanvas.getContext("2d");
if (!fishContext) throw new Error("missing fish context");
const fishGfx: CanvasRenderingContext2D = fishContext;
const fishStage = document.querySelector<HTMLElement>("#fish-stage");
const fishSection = document.querySelector<HTMLElement>("#fish");
const fishHeading = document.querySelector<HTMLElement>("#fish-heading");
const fishNext = document.querySelector<HTMLButtonElement>("#fish-next");
const fishPad = document.querySelector<HTMLElement>("#fish-pad");
const axoCanvas = document.querySelector<HTMLCanvasElement>("#axo-canvas");
if (!axoCanvas) throw new Error("missing axolotl canvas");
const axoSurface: HTMLCanvasElement = axoCanvas;
const axoContext = axoCanvas.getContext("2d");
if (!axoContext) throw new Error("missing axolotl context");
const axoGfx: CanvasRenderingContext2D = axoContext;
const axoStage = document.querySelector<HTMLElement>("#axo-stage");
const axoSection = document.querySelector<HTMLElement>("#axo");
const axoHeading = document.querySelector<HTMLElement>("#axo-heading");
const axoNext = document.querySelector<HTMLButtonElement>("#axo-next");
const axoPad = document.querySelector<HTMLElement>("#axo-pad");
const rascalCanvas = document.querySelector<HTMLCanvasElement>("#rascal-canvas");
if (!rascalCanvas) throw new Error("missing rascal canvas");
const rascalSurface: HTMLCanvasElement = rascalCanvas;
const rascalContext = rascalCanvas.getContext("2d");
if (!rascalContext) throw new Error("missing rascal context");
const rascalGfx: CanvasRenderingContext2D = rascalContext;
const rascalStage = document.querySelector<HTMLElement>("#rascal-stage");
const rascalSection = document.querySelector<HTMLElement>("#rascal");
const rascalHeading = document.querySelector<HTMLElement>("#rascal-heading");
const rascalNext = document.querySelector<HTMLButtonElement>("#rascal-next");
const rascalPad = document.querySelector<HTMLElement>("#rascal-pad");
const capyCanvas = document.querySelector<HTMLCanvasElement>("#capy-canvas");
if (!capyCanvas) throw new Error("missing capybara canvas");
const capySurface: HTMLCanvasElement = capyCanvas;
const capyContext = capyCanvas.getContext("2d");
if (!capyContext) throw new Error("missing capybara context");
const capyGfx: CanvasRenderingContext2D = capyContext;
const capyStage = document.querySelector<HTMLElement>("#capy-stage");
const capySection = document.querySelector<HTMLElement>("#capy");
const capyHeading = document.querySelector<HTMLElement>("#capy-heading");
const capyNext = document.querySelector<HTMLButtonElement>("#capy-next");
const capyPad = document.querySelector<HTMLElement>("#capy-pad");

let state = createGame();
let pending = blankInput();
let held = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

type Mode = "menu" | "crab" | "race" | "fish" | "axo" | "rascal" | "capy";
let mode: Mode = "menu";
let raceScreen: "select" | "play" = "select";
let selectedId = "woody";
let raceState: RaceState | null = null;
let raceAcc = 0;
const raceKeys = { left: false, right: false, brake: false };
let raceEdge = blankRaceInput();
let fishState: PondState | null = null;
let fishAcc = 0;
const fishKeys = { left: false, right: false, up: false, down: false };
let fishEdge = blankPondInput();
let axoState: AxoState | null = null;
let axoAcc = 0;
const axoKeys = { left: false, right: false, fire: false };
let axoEdge = blankAxoInput();
let rascalState: RascalState | null = null;
let rascalAcc = 0;
const rascalKeys = { left: false, right: false, jump: false };
let rascalEdge = blankRascalInput();
let capyState: CapyState | null = null;
let capyAcc = 0;
const capyKeys = { left: false, right: false, jump: false };
let capyEdge = blankCapyInput();

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
  fitBox(fishStage, fishSurface);
  fitBox(axoStage, axoSurface);
  fitBox(rascalStage, rascalSurface);
  fitBox(capyStage, capySurface);
}

fit();
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.visualViewport?.addEventListener("scroll", fit);
if (stage) new ResizeObserver(() => fitBox(stage, gameCanvas)).observe(stage);
if (raceStage) new ResizeObserver(() => fitBox(raceStage, raceSurface)).observe(raceStage);
if (fishStage) new ResizeObserver(() => fitBox(fishStage, fishSurface)).observe(fishStage);
if (axoStage) new ResizeObserver(() => fitBox(axoStage, axoSurface)).observe(axoStage);
if (rascalStage) new ResizeObserver(() => fitBox(rascalStage, rascalSurface)).observe(rascalStage);
if (capyStage) new ResizeObserver(() => fitBox(capyStage, capySurface)).observe(capyStage);

function show(next: Mode): void {
  mode = next;
  if (menu) menu.hidden = next !== "menu";
  if (crabSection) crabSection.hidden = next !== "crab";
  if (raceSection) raceSection.hidden = next !== "race";
  if (fishSection) fishSection.hidden = next !== "fish";
  if (axoSection) axoSection.hidden = next !== "axo";
  if (rascalSection) rascalSection.hidden = next !== "rascal";
  if (capySection) capySection.hidden = next !== "capy";
  const titles: Record<Mode, string> = {
    menu: "Kids Games",
    crab: "Hermit Crab Crossing",
    race: "Woodland Grand Prix",
    fish: "Pond Fishing",
    axo: "Axolotl Patrol",
    rascal: "Web Rascal",
    capy: "Capy Swing",
  };
  document.title = titles[next];
  if (next === "crab") {
    state = createGame();
    pending = blankInput();
    held = blankInput();
    cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
  }
  if (next === "race") openGarage();
  if (next === "fish") openPond();
  if (next === "axo") openAxo();
  if (next === "rascal") openRascal();
  if (next === "capy") openCapy();
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

function openPond(): void {
  fishState = createPond(0);
  fishAcc = 0;
  fishEdge = blankPondInput();
  syncFishChrome();
}

function syncFishChrome(): void {
  if (!fishState) return;
  const level = FISH_LEVELS[fishState.levelIndex];
  if (fishHeading) fishHeading.textContent = fishState.phase === "done" ? "Pond Fishing" : level.name;
  const live = fishState.phase === "playing" || fishState.phase === "paused";
  fishPad?.querySelectorAll<HTMLButtonElement>("button[data-fish]").forEach((button) => {
    button.hidden = !live;
  });
  if (fishNext) {
    fishNext.hidden = live;
    fishNext.textContent = fishState.phase === "done" ? "Play again" : fishState.levelIndex >= FISH_LEVELS.length - 1 ? "The creel" : "Next level";
  }
}

function openAxo(): void {
  axoState = createAxo(0);
  axoAcc = 0;
  axoEdge = blankAxoInput();
  axoKeys.left = false;
  axoKeys.right = false;
  axoKeys.fire = false;
  syncAxoChrome();
}

function syncAxoChrome(): void {
  if (!axoState) return;
  const level = AXO_LEVELS[axoState.levelIndex];
  if (axoHeading) axoHeading.textContent = axoState.phase === "done" ? "Axolotl Patrol" : level.name;
  const live = axoState.phase === "playing" || axoState.phase === "paused";
  axoPad?.querySelectorAll<HTMLButtonElement>("button[data-axo]").forEach((button) => {
    button.hidden = !live;
  });
  if (axoNext) {
    axoNext.hidden = live;
    axoNext.textContent = axoState.phase === "done" ? "Play again" : axoState.phase === "retry" ? "Try again" : axoState.levelIndex >= AXO_LEVELS.length - 1 ? "The patrol" : "Next level";
  }
}

function axoInput(): AxoInput {
  return {
    dx: (axoKeys.right ? 1 : 0) - (axoKeys.left ? 1 : 0),
    fire: axoKeys.fire,
    pause: axoEdge.pause,
    confirm: axoEdge.confirm,
  };
}

function openRascal(): void {
  rascalState = createRascal(0);
  rascalAcc = 0;
  rascalEdge = blankRascalInput();
  rascalKeys.left = false;
  rascalKeys.right = false;
  rascalKeys.jump = false;
  syncRascalChrome();
}

function syncRascalChrome(): void {
  if (!rascalState) return;
  const level = ROOF_LEVELS[rascalState.levelIndex];
  if (rascalHeading) rascalHeading.textContent = rascalState.phase === "done" ? "Web Rascal" : level.name;
  const live = rascalState.phase === "playing" || rascalState.phase === "paused";
  rascalPad?.querySelectorAll<HTMLButtonElement>("button[data-rascal]").forEach((button) => {
    button.hidden = !live;
  });
  if (rascalNext) {
    rascalNext.hidden = live;
    rascalNext.textContent = rascalState.phase === "done" ? "Play again" : rascalState.phase === "retry" ? "Try again" : rascalState.levelIndex >= ROOF_LEVELS.length - 1 ? "The nest" : "Next level";
  }
}

function rascalInput(): RascalInput {
  return {
    dx: (rascalKeys.right ? 1 : 0) - (rascalKeys.left ? 1 : 0),
    jump: rascalEdge.jump,
    jumpHeld: rascalKeys.jump,
    web: rascalEdge.web,
    pause: rascalEdge.pause,
    confirm: rascalEdge.confirm,
  };
}

function openCapy(): void {
  capyState = createCapy(0);
  capyAcc = 0;
  capyEdge = blankCapyInput();
  capyKeys.left = false;
  capyKeys.right = false;
  capyKeys.jump = false;
  syncCapyChrome();
}

function syncCapyChrome(): void {
  if (!capyState) return;
  const level = JUNGLE_LEVELS[capyState.levelIndex];
  if (capyHeading) capyHeading.textContent = capyState.phase === "done" ? "Capy Swing" : level.name;
  const live = capyState.phase === "playing" || capyState.phase === "paused";
  capyPad?.querySelectorAll<HTMLButtonElement>("button[data-capy]").forEach((button) => {
    button.hidden = !live;
  });
  if (capyNext) {
    capyNext.hidden = live;
    capyNext.textContent = capyState.phase === "done" ? "Play again" : capyState.phase === "retry" ? "Try again" : capyState.levelIndex >= JUNGLE_LEVELS.length - 1 ? "The pool" : "Next level";
  }
}

function capyInput(): CapyInput {
  return {
    dx: (capyKeys.right ? 1 : 0) - (capyKeys.left ? 1 : 0),
    jump: capyEdge.jump,
    jumpHeld: capyKeys.jump,
    pause: capyEdge.pause,
    confirm: capyEdge.confirm,
  };
}

function fishInput(): PondInput {
  return {
    dx: (fishKeys.right ? 1 : 0) - (fishKeys.left ? 1 : 0),
    dy: (fishKeys.down ? 1 : 0) - (fishKeys.up ? 1 : 0),
    catch: fishEdge.catch,
    pause: fishEdge.pause,
    confirm: fishEdge.confirm,
  };
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
document.querySelector<HTMLButtonElement>("#play-fish")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("fish");
});
document.querySelector<HTMLButtonElement>("#play-axo")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("axo");
});
document.querySelector<HTMLButtonElement>("#play-rascal")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("rascal");
});
document.querySelector<HTMLButtonElement>("#play-capy")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("capy");
});
document.querySelector("#crab-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#race-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#fish-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#axo-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#rascal-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#capy-games")?.addEventListener("pointerdown", (event) => {
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
fishNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!fishState) return;
  fishState = advancePond(fishState);
  syncFishChrome();
});
axoNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!axoState) return;
  axoState = advanceAxo(axoState);
  syncAxoChrome();
});
rascalNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!rascalState) return;
  rascalState = advanceRascal(rascalState);
  syncRascalChrome();
});
capyNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!capyState) return;
  capyState = advanceCapy(capyState);
  syncCapyChrome();
});

window.addEventListener("keydown", (event) => {
  if (mode === "capy") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") capyKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") capyKeys.right = true;
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") capyKeys.jump = true;
    if (!event.repeat && (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW")) capyEdge = { ...capyEdge, jump: true };
    if (event.code === "Escape") capyEdge = { ...capyEdge, pause: true };
    if (event.code === "Enter") capyEdge = { ...capyEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space"].includes(event.code)) event.preventDefault();
    return;
  }
  if (mode === "rascal") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") rascalKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") rascalKeys.right = true;
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") rascalKeys.jump = true;
    if (!event.repeat && (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW")) rascalEdge = { ...rascalEdge, jump: true };
    if (!event.repeat && (event.code === "KeyF" || event.code === "ShiftLeft" || event.code === "ShiftRight")) rascalEdge = { ...rascalEdge, web: true };
    if (event.code === "Escape") rascalEdge = { ...rascalEdge, pause: true };
    if (event.code === "Enter") rascalEdge = { ...rascalEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space", "KeyF"].includes(event.code)) event.preventDefault();
    return;
  }
  if (mode === "axo") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") axoKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") axoKeys.right = true;
    if (event.code === "Space") axoKeys.fire = true;
    if (event.code === "Escape") axoEdge = { ...axoEdge, pause: true };
    if (event.code === "Enter") axoEdge = { ...axoEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) event.preventDefault();
    return;
  }
  if (mode === "fish") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") fishKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") fishKeys.right = true;
    if (event.code === "ArrowUp" || event.code === "KeyW") fishKeys.up = true;
    if (event.code === "ArrowDown" || event.code === "KeyS") fishKeys.down = true;
    if (event.code === "Space") fishEdge = { ...fishEdge, catch: true };
    if (event.code === "Escape") fishEdge = { ...fishEdge, pause: true };
    if (event.code === "Enter") fishEdge = { ...fishEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"].includes(event.code)) event.preventDefault();
    return;
  }
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
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    raceKeys.left = false;
    fishKeys.left = false;
    axoKeys.left = false;
    rascalKeys.left = false;
    capyKeys.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    raceKeys.right = false;
    fishKeys.right = false;
    axoKeys.right = false;
    rascalKeys.right = false;
    capyKeys.right = false;
  }
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    rascalKeys.jump = false;
    capyKeys.jump = false;
  }
  if (event.code === "Space") axoKeys.fire = false;
  if (event.code === "ArrowUp" || event.code === "KeyW") fishKeys.up = false;
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    raceKeys.brake = false;
    fishKeys.down = false;
  }
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

document.querySelectorAll<HTMLButtonElement>("button[data-capy]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.capy ?? "";
    if (name === "left") capyKeys.left = true;
    if (name === "right") capyKeys.right = true;
    if (name === "jump") {
      capyKeys.jump = true;
      capyEdge = { ...capyEdge, jump: true };
    }
    if (name === "pause") capyEdge = { ...capyEdge, pause: true };
    if (name === "left" || name === "right" || name === "jump") {
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
  });
  const release = (event: PointerEvent) => {
    const name = button.dataset.capy ?? "";
    if (name === "left") capyKeys.left = false;
    if (name === "right") capyKeys.right = false;
    if (name === "jump") capyKeys.jump = false;
    button.classList.remove("is-held");
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-rascal]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.rascal ?? "";
    if (name === "left") rascalKeys.left = true;
    if (name === "right") rascalKeys.right = true;
    if (name === "jump") {
      rascalKeys.jump = true;
      rascalEdge = { ...rascalEdge, jump: true };
    }
    if (name === "web") rascalEdge = { ...rascalEdge, web: true };
    if (name === "pause") rascalEdge = { ...rascalEdge, pause: true };
    if (name === "left" || name === "right" || name === "jump") {
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
  });
  const release = (event: PointerEvent) => {
    const name = button.dataset.rascal ?? "";
    if (name === "left") rascalKeys.left = false;
    if (name === "right") rascalKeys.right = false;
    if (name === "jump") rascalKeys.jump = false;
    button.classList.remove("is-held");
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-axo]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.axo ?? "";
    if (name === "left") axoKeys.left = true;
    if (name === "right") axoKeys.right = true;
    if (name === "fire") axoKeys.fire = true;
    if (name === "pause") axoEdge = { ...axoEdge, pause: true };
    if (name === "left" || name === "right" || name === "fire") {
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
  });
  const release = (event: PointerEvent) => {
    const name = button.dataset.axo ?? "";
    if (name === "left") axoKeys.left = false;
    if (name === "right") axoKeys.right = false;
    if (name === "fire") axoKeys.fire = false;
    button.classList.remove("is-held");
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-fish]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.fish ?? "";
    if (name === "left") fishKeys.left = true;
    if (name === "right") fishKeys.right = true;
    if (name === "up") fishKeys.up = true;
    if (name === "down") fishKeys.down = true;
    if (name === "catch") fishEdge = { ...fishEdge, catch: true };
    if (name === "pause") fishEdge = { ...fishEdge, pause: true };
    if (name === "left" || name === "right" || name === "up" || name === "down") {
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
  });
  const release = (event: PointerEvent) => {
    const name = button.dataset.fish ?? "";
    if (name === "left") fishKeys.left = false;
    if (name === "right") fishKeys.right = false;
    if (name === "up") fishKeys.up = false;
    if (name === "down") fishKeys.down = false;
    button.classList.remove("is-held");
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

capySurface.addEventListener("pointerdown", () => {
  if (mode !== "capy" || !capyState) return;
  if (capyState.phase === "clear" || capyState.phase === "retry" || capyState.phase === "done") {
    capyState = advanceCapy(capyState);
    syncCapyChrome();
  }
});

rascalSurface.addEventListener("pointerdown", () => {
  if (mode !== "rascal" || !rascalState) return;
  if (rascalState.phase === "clear" || rascalState.phase === "retry" || rascalState.phase === "done") {
    rascalState = advanceRascal(rascalState);
    syncRascalChrome();
  }
});

axoSurface.addEventListener("pointerdown", () => {
  if (mode !== "axo" || !axoState) return;
  if (axoState.phase === "clear" || axoState.phase === "retry" || axoState.phase === "done") {
    axoState = advanceAxo(axoState);
    syncAxoChrome();
  }
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
  if (mode === "fish" && fishState) {
    fishAcc += delta;
    let steps = 0;
    while (fishAcc >= STEP_MS && steps < 5) {
      const input = fishInput();
      if (input.confirm && (fishState.phase === "clear" || fishState.phase === "done")) fishState = advancePond(fishState);
      else fishState = tickPond(fishState, input, STEP_MS);
      fishEdge = blankPondInput();
      fishAcc -= STEP_MS;
      steps += 1;
    }
    drawPond(fishGfx, fishState, now);
    syncFishChrome();
  }
  if (mode === "axo" && axoState) {
    axoAcc += delta;
    let steps = 0;
    while (axoAcc >= STEP_MS && steps < 5) {
      const input = axoInput();
      if (input.confirm && (axoState.phase === "clear" || axoState.phase === "retry" || axoState.phase === "done")) axoState = advanceAxo(axoState);
      else axoState = tickAxo(axoState, input, STEP_MS);
      axoEdge = blankAxoInput();
      axoAcc -= STEP_MS;
      steps += 1;
    }
    drawAxo(axoGfx, axoState, now);
    syncAxoChrome();
  }
  if (mode === "rascal" && rascalState) {
    rascalAcc += delta;
    let steps = 0;
    while (rascalAcc >= STEP_MS && steps < 5) {
      const input = rascalInput();
      if (input.confirm && (rascalState.phase === "clear" || rascalState.phase === "retry" || rascalState.phase === "done")) rascalState = advanceRascal(rascalState);
      else rascalState = tickRascal(rascalState, input, STEP_MS);
      rascalEdge = blankRascalInput();
      rascalAcc -= STEP_MS;
      steps += 1;
    }
    drawRascal(rascalGfx, rascalState, now);
    syncRascalChrome();
  }
  if (mode === "capy" && capyState) {
    capyAcc += delta;
    let steps = 0;
    while (capyAcc >= STEP_MS && steps < 5) {
      const input = capyInput();
      if (input.confirm && (capyState.phase === "clear" || capyState.phase === "retry" || capyState.phase === "done")) capyState = advanceCapy(capyState);
      else capyState = tickCapy(capyState, input, STEP_MS);
      capyEdge = blankCapyInput();
      capyAcc -= STEP_MS;
      steps += 1;
    }
    drawCapy(capyGfx, capyState, now);
    syncCapyChrome();
  }
  requestAnimationFrame(frame);
}

syncRaceChrome();
requestAnimationFrame(frame);
