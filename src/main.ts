import { cameraTop } from "./game/camera";
import { STEP_MS, VIEW_H, VIEW_W } from "./game/constants";
import { continueLabel } from "./game/copy";
import { blankInput, buttonToInput, keyDown, mergeInput } from "./game/input";
import { LEVELS } from "./game/levels";
import { createGame, tick } from "./game/sim";
import { applyTunes, defaultTunes, loadTunes, saveTunes, type LevelTune } from "./game/tune";
import type { InputFrame } from "./game/types";
import { mountLevelSettings } from "./settings/panel";
import { drawFrame } from "./render/draw";
import { CHARACTERS, characterById } from "./race/characters";
import { drawGarage, drawRace } from "./race/draw";
import { mountRaceView } from "./race/view";
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
import { advanceRascal, blankRascalInput, createRascal, hookAtPoint, rascalCameraX, tickRascal, type RascalInput, type RascalState } from "./rascal/sim";
import { drawCapy } from "./capy/draw";
import { JUNGLE_LEVELS } from "./capy/levels";
import { advanceCapy, blankCapyInput, createCapy, tickCapy, type CapyInput, type CapyState } from "./capy/sim";
import { capyTouchRead } from "./capy/touch";
import { drawWaddle } from "./waddle/draw";
import { ICE_LEVELS } from "./waddle/mazes";
import { advanceWaddle, blankWaddleInput, createWaddle, tickWaddle, type WaddleInput, type WaddleState } from "./waddle/sim";
import { drawSpot, drawSpotPick } from "./spot/draw";
import { advanceSpot, blankSpotInput, startSpot, tickSpot, type SpotInput, type SpotState } from "./spot/sim";
import { bindMenuCard } from "./game/menu";
import { drawPattern } from "./pattern/draw";
import { choiceAt, pauseAt } from "./pattern/levels";
import { advancePattern, blankPatternInput, startPattern, tickPattern, type PatternInput, type PatternState } from "./pattern/sim";
import { drawBurst } from "./burst/draw";
import { BURST_LEVELS } from "./burst/levels";
import { advanceBurst, blankBurstInput, createBurst, tickBurst, type BurstInput, type BurstState } from "./burst/sim";
import { drawHunt } from "./hunt/draw";
import { metrics as huntMetrics } from "./hunt/puzzles";
import { advanceHunt, blankHuntInput, startHunt, tickHunt, type HuntInput, type HuntState } from "./hunt/sim";
import { drawSkate } from "./skate/draw";
import { mountSkateView } from "./skate/view";
import { SKATE_LEVELS } from "./skate/levels";
import { advanceSkate, blankSkateInput, createSkate, tickSkate, type SkateInput, type SkateState } from "./skate/sim";
import { blankSkateTouch, readSkateTouch, skateOriginAt, skateTapJump, type SkatePointer, type SkateTouchHeld } from "./skate/touch";
import { AXO_SPOTS, CAPY_SPOTS, CRAB_SPOTS, FISH_SPOTS, LOOK_SPOTS, RACE_SPOTS, RASCAL_SPOTS, WADDLE_SPOTS } from "./game/pads";
import { TouchPad, drawTouchPad, runnerPush, runnerTap, sideSteer, slideDirection } from "./game/touchpad";

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
const raceWorld = document.querySelector<HTMLCanvasElement>("#race-world");
if (!raceWorld) throw new Error("missing race world");
const raceView = mountRaceView(raceWorld);
const raceFrameQuery = document.querySelector("#race-frame");
if (!(raceFrameQuery instanceof HTMLElement)) throw new Error("missing race frame");
const raceFrame: HTMLElement = raceFrameQuery;
const raceStage = document.querySelector<HTMLElement>("#race-stage");
const menu = document.querySelector<HTMLElement>("#menu");
const crabSection = document.querySelector<HTMLElement>("#crab");
const raceSection = document.querySelector<HTMLElement>("#race");
const settingsSection = document.querySelector<HTMLElement>("#settings");
const tuneTabs = document.querySelector<HTMLElement>("#tune-tabs");
const tuneForm = document.querySelector<HTMLElement>("#tune-form");
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
const waddleCanvas = document.querySelector<HTMLCanvasElement>("#waddle-canvas");
if (!waddleCanvas) throw new Error("missing waddle canvas");
const waddleSurface: HTMLCanvasElement = waddleCanvas;
const waddleContext = waddleCanvas.getContext("2d");
if (!waddleContext) throw new Error("missing waddle context");
const waddleGfx: CanvasRenderingContext2D = waddleContext;
const waddleStage = document.querySelector<HTMLElement>("#waddle-stage");
const waddleSection = document.querySelector<HTMLElement>("#waddle");
const waddleHeading = document.querySelector<HTMLElement>("#waddle-heading");
const waddleNext = document.querySelector<HTMLButtonElement>("#waddle-next");
const waddlePad = document.querySelector<HTMLElement>("#waddle-pad");
const spotCanvas = document.querySelector<HTMLCanvasElement>("#spot-canvas");
if (!spotCanvas) throw new Error("missing spot canvas");
const spotSurface: HTMLCanvasElement = spotCanvas;
const spotContext = spotCanvas.getContext("2d");
if (!spotContext) throw new Error("missing spot context");
const spotGfx: CanvasRenderingContext2D = spotContext;
const spotStage = document.querySelector<HTMLElement>("#spot-stage");
const spotSection = document.querySelector<HTMLElement>("#spot");
const spotHeading = document.querySelector<HTMLElement>("#spot-heading");
const spotAll = document.querySelector<HTMLButtonElement>("#spot-all");
const spotHard = document.querySelector<HTMLButtonElement>("#spot-hard");
const spotNext = document.querySelector<HTMLButtonElement>("#spot-next");
const spotPad = document.querySelector<HTMLElement>("#spot-pad");
const patternCanvas = document.querySelector<HTMLCanvasElement>("#pattern-canvas");
if (!patternCanvas) throw new Error("missing pattern canvas");
const patternSurface: HTMLCanvasElement = patternCanvas;
const patternContext = patternCanvas.getContext("2d");
if (!patternContext) throw new Error("missing pattern context");
const patternGfx: CanvasRenderingContext2D = patternContext;
const patternStage = document.querySelector<HTMLElement>("#pattern-stage");
const patternSection = document.querySelector<HTMLElement>("#pattern");
const patternHeading = document.querySelector<HTMLElement>("#pattern-heading");
const patternNext = document.querySelector<HTMLButtonElement>("#pattern-next");
const patternPad = document.querySelector<HTMLElement>("#pattern-pad");
const burstCanvas = document.querySelector<HTMLCanvasElement>("#burst-canvas");
if (!burstCanvas) throw new Error("missing burst canvas");
const burstSurface: HTMLCanvasElement = burstCanvas;
const burstContext = burstCanvas.getContext("2d");
if (!burstContext) throw new Error("missing burst context");
const burstGfx: CanvasRenderingContext2D = burstContext;
const burstStage = document.querySelector<HTMLElement>("#burst-stage");
const burstSection = document.querySelector<HTMLElement>("#burst");
const burstHeading = document.querySelector<HTMLElement>("#burst-heading");
const burstNext = document.querySelector<HTMLButtonElement>("#burst-next");
const burstPad = document.querySelector<HTMLElement>("#burst-pad");
const huntCanvas = document.querySelector<HTMLCanvasElement>("#hunt-canvas");
if (!huntCanvas) throw new Error("missing hunt canvas");
const huntSurface: HTMLCanvasElement = huntCanvas;
const huntContext = huntCanvas.getContext("2d");
if (!huntContext) throw new Error("missing hunt context");
const huntGfx: CanvasRenderingContext2D = huntContext;
const huntStage = document.querySelector<HTMLElement>("#hunt-stage");
const huntSection = document.querySelector<HTMLElement>("#hunt");
const huntHeading = document.querySelector<HTMLElement>("#hunt-heading");
const huntNext = document.querySelector<HTMLButtonElement>("#hunt-next");
const huntPad = document.querySelector<HTMLElement>("#hunt-pad");
const skateCanvas = document.querySelector<HTMLCanvasElement>("#skate-canvas");
if (!skateCanvas) throw new Error("missing skate canvas");
const skateSurface: HTMLCanvasElement = skateCanvas;
const skateContext = skateCanvas.getContext("2d");
if (!skateContext) throw new Error("missing skate context");
const skateGfx: CanvasRenderingContext2D = skateContext;
const skateWorld = document.querySelector<HTMLCanvasElement>("#skate-world");
if (!skateWorld) throw new Error("missing skate world");
const skateView = mountSkateView(skateWorld);
const skateStage = document.querySelector<HTMLElement>("#skate-stage");
const skateFrameQuery = document.querySelector("#skate-frame");
if (!(skateFrameQuery instanceof HTMLElement)) throw new Error("missing skate frame");
const skateFrame: HTMLElement = skateFrameQuery;
const skateSection = document.querySelector<HTMLElement>("#skate");
const skateHeading = document.querySelector<HTMLElement>("#skate-heading");
const skateNext = document.querySelector<HTMLButtonElement>("#skate-next");
const skatePad = document.querySelector<HTMLElement>("#skate-pad");

const tuneStore = levelStore();
let tunes: LevelTune[] = loadTunes(LEVELS, tuneStore);
let state = createGame(applyTunes(LEVELS, tunes));
let pending = blankInput();
let held = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

type Mode = "menu" | "crab" | "race" | "fish" | "axo" | "rascal" | "capy" | "waddle" | "spot" | "burst" | "hunt" | "skate" | "pattern" | "settings";
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
let capyFieldJump = false;
let waddleState: WaddleState | null = null;
let waddleAcc = 0;
const waddleKeys = { left: false, right: false, up: false, down: false };
let waddleEdge = blankWaddleInput();
let spotState: SpotState | null = null;
let spotAcc = 0;
let spotEdge = blankSpotInput();
let patternState: PatternState | null = null;
let patternAcc = 0;
let patternEdge = blankPatternInput();
let burstState: BurstState | null = null;
let burstAcc = 0;
let burstEdge = blankBurstInput();
let huntState: HuntState | null = null;
let huntAcc = 0;
let huntEdge = blankHuntInput();
let huntDrag: { x: number; y: number; x2: number; y2: number; pointer: number } | null = null;
let skateState: SkateState | null = null;
let skateAcc = 0;
const skateKeys = { left: false, right: false, brake: false, crouch: false, jump: false };
let skateEdge = blankSkateInput();
let skatePointers: SkatePointer[] = [];
let skateTouchHeld: SkateTouchHeld = blankSkateTouch();
const touchClaims = new Set<number>();
type RunnerFinger = { id: number; x: number; y: number; x0: number; y0: number; t0: number };
const raceFingers = new Map<number, RunnerFinger>();
const rascalFingers = new Map<number, RunnerFinger>();
const axoFingers = new Map<number, RunnerFinger>();
const capyFingers = new Map<number, RunnerFinger>();
const waddleFingers = new Map<number, RunnerFinger>();
const crabTouch = new TouchPad(CRAB_SPOTS, (name) => {
  if (name === "tuck") queue({ ...blankInput(), tuck: true });
  if (name === "pause") queue({ ...blankInput(), pause: true });
});
const raceTouch = new TouchPad(RACE_SPOTS, (name) => {
  if (name === "use") raceEdge = { ...raceEdge, use: true };
  if (name === "pause") raceEdge = { ...raceEdge, pause: true };
});
const fishTouch = new TouchPad(FISH_SPOTS, (name) => {
  if (name === "catch") fishEdge = { ...fishEdge, catch: true };
  if (name === "pause") fishEdge = { ...fishEdge, pause: true };
});
const axoTouch = new TouchPad(AXO_SPOTS, (name) => {
  if (name === "pause") axoEdge = { ...axoEdge, pause: true };
});
const rascalTouch = new TouchPad(RASCAL_SPOTS, (name) => {
  if (name === "jump") rascalEdge = { ...rascalEdge, jump: true };
  if (name === "web") rascalEdge = { ...rascalEdge, web: true };
  if (name === "pause") rascalEdge = { ...rascalEdge, pause: true };
});
const capyTouch = new TouchPad(CAPY_SPOTS, (name) => {
  if (name === "jump") capyEdge = { ...capyEdge, jump: true };
  if (name === "pause") capyEdge = { ...capyEdge, pause: true };
});
const waddleTouch = new TouchPad(WADDLE_SPOTS, (name) => {
  if (name === "pause") waddleEdge = { ...waddleEdge, pause: true };
});
const spotTouch = new TouchPad(LOOK_SPOTS, (name) => {
  if (name === "hint") spotEdge = { ...spotEdge, hint: true };
  if (name === "pause") spotEdge = { ...spotEdge, pause: true };
});
const burstTouch = new TouchPad(LOOK_SPOTS, (name) => {
  if (name === "hint") burstEdge = { ...burstEdge, hint: true };
  if (name === "pause") burstEdge = { ...burstEdge, pause: true };
});
const huntTouch = new TouchPad(LOOK_SPOTS, (name) => {
  if (name === "hint") huntEdge = { ...huntEdge, hint: true };
  if (name === "pause") huntEdge = { ...huntEdge, pause: true };
});

function queue(input: InputFrame): void {
  pending = mergeInput(pending, input);
}

function fitBox(box: HTMLElement | null, target: HTMLElement): void {
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
  fitBox(raceStage, raceFrame);
  fitBox(fishStage, fishSurface);
  fitBox(axoStage, axoSurface);
  fitBox(rascalStage, rascalSurface);
  fitBox(capyStage, capySurface);
  fitBox(waddleStage, waddleSurface);
  fitBox(spotStage, spotSurface);
  fitBox(patternStage, patternSurface);
  fitBox(burstStage, burstSurface);
  fitBox(huntStage, huntSurface);
  fitBox(skateStage, skateFrame);
}

fit();
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.visualViewport?.addEventListener("scroll", fit);
if (stage) new ResizeObserver(() => fitBox(stage, gameCanvas)).observe(stage);
if (raceStage) new ResizeObserver(() => fitBox(raceStage, raceFrame)).observe(raceStage);
if (fishStage) new ResizeObserver(() => fitBox(fishStage, fishSurface)).observe(fishStage);
if (axoStage) new ResizeObserver(() => fitBox(axoStage, axoSurface)).observe(axoStage);
if (rascalStage) new ResizeObserver(() => fitBox(rascalStage, rascalSurface)).observe(rascalStage);
if (capyStage) new ResizeObserver(() => fitBox(capyStage, capySurface)).observe(capyStage);
if (waddleStage) new ResizeObserver(() => fitBox(waddleStage, waddleSurface)).observe(waddleStage);
if (spotStage) new ResizeObserver(() => fitBox(spotStage, spotSurface)).observe(spotStage);
if (patternStage) new ResizeObserver(() => fitBox(patternStage, patternSurface)).observe(patternStage);
if (burstStage) new ResizeObserver(() => fitBox(burstStage, burstSurface)).observe(burstStage);
if (huntStage) new ResizeObserver(() => fitBox(huntStage, huntSurface)).observe(huntStage);
if (skateStage) new ResizeObserver(() => fitBox(skateStage, skateFrame)).observe(skateStage);

function show(next: Mode): void {
  mode = next;
  if (menu) menu.hidden = next !== "menu";
  if (crabSection) crabSection.hidden = next !== "crab";
  if (raceSection) raceSection.hidden = next !== "race";
  if (fishSection) fishSection.hidden = next !== "fish";
  if (axoSection) axoSection.hidden = next !== "axo";
  if (rascalSection) rascalSection.hidden = next !== "rascal";
  if (capySection) capySection.hidden = next !== "capy";
  if (waddleSection) waddleSection.hidden = next !== "waddle";
  if (spotSection) spotSection.hidden = next !== "spot";
  if (patternSection) patternSection.hidden = next !== "pattern";
  if (burstSection) burstSection.hidden = next !== "burst";
  if (huntSection) huntSection.hidden = next !== "hunt";
  if (skateSection) skateSection.hidden = next !== "skate";
  if (settingsSection) settingsSection.hidden = next !== "settings";
  const titles: Record<Mode, string> = {
    menu: "Kids Games",
    crab: "Hermit Crab Crossing",
    race: "Woodland Grand Prix",
    fish: "Pond Fishing",
    axo: "Axolotl Patrol",
    rascal: "Web Rascal",
    capy: "Capy Swing",
    waddle: "Ice Waddle",
    spot: "Silk Spot",
    pattern: "Pattern Pals",
    burst: "Berry Burst",
    hunt: "Word Hunt",
    skate: "Ollie Cat",
    settings: "Level settings",
  };
  document.title = titles[next];
  if (next === "crab") {
    state = createGame(applyTunes(LEVELS, tunes));
    pending = blankInput();
    held = blankInput();
    crabTouch.clear();
    cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
  }
  if (next === "race") openGarage();
  if (next === "fish") openPond();
  if (next === "axo") openAxo();
  if (next === "rascal") openRascal();
  if (next === "capy") openCapy();
  if (next === "waddle") openWaddle();
  if (next === "spot") openSpot();
  if (next === "pattern") openPattern();
  if (next === "burst") openBurst();
  if (next === "hunt") openHunt();
  if (next === "skate") openSkate();
  requestAnimationFrame(() => fit());
}

function openGarage(): void {
  raceScreen = "select";
  raceState = null;
  raceEdge = blankRaceInput();
  raceTouch.clear();
  raceFingers.clear();
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
  if (racePad) racePad.hidden = live;
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
  fishTouch.clear();
  syncFishChrome();
}

function syncFishChrome(): void {
  if (!fishState) return;
  const level = FISH_LEVELS[fishState.levelIndex];
  if (fishHeading) fishHeading.textContent = fishState.phase === "done" ? "Pond Fishing" : level.name;
  const live = fishState.phase === "playing" || fishState.phase === "paused";
  if (fishPad) fishPad.hidden = live;
  if (fishNext) {
    fishNext.hidden = live;
    fishNext.textContent = fishState.phase === "done" ? "Play again" : fishState.levelIndex >= FISH_LEVELS.length - 1 ? "The creel" : "Next level";
  }
}

function openAxo(): void {
  axoState = createAxo(0);
  axoAcc = 0;
  axoEdge = blankAxoInput();
  axoTouch.clear();
  axoFingers.clear();
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
  if (axoPad) axoPad.hidden = live;
  if (axoNext) {
    axoNext.hidden = live;
    axoNext.textContent = axoState.phase === "done" ? "Play again" : axoState.phase === "retry" ? "Try again" : axoState.levelIndex >= AXO_LEVELS.length - 1 ? "The patrol" : "Next level";
  }
}

function axoInput(): AxoInput {
  const finger = [...axoFingers.values()].at(-1);
  return {
    dx: (axoKeys.right || axoTouch.held("right") ? 1 : 0) - (axoKeys.left || axoTouch.held("left") ? 1 : 0),
    fire: axoKeys.fire || axoTouch.held("fire") || axoFingers.size > 0,
    pause: axoEdge.pause,
    confirm: axoEdge.confirm,
    aimX: finger ? finger.x : null,
  };
}

function openRascal(): void {
  rascalState = createRascal(0);
  rascalAcc = 0;
  rascalEdge = blankRascalInput();
  rascalTouch.clear();
  rascalFingers.clear();
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
  if (rascalPad) rascalPad.hidden = live;
  if (rascalNext) {
    rascalNext.hidden = live;
    rascalNext.textContent = rascalState.phase === "done" ? "Play again" : rascalState.phase === "retry" ? "Try again" : rascalState.levelIndex >= ROOF_LEVELS.length - 1 ? "The nest" : "Next level";
  }
}

function rascalInput(): RascalInput {
  const running = runnerPush([...rascalFingers.values()], performance.now());
  return {
    dx: (rascalKeys.right || rascalTouch.held("right") || running ? 1 : 0) - (rascalKeys.left || rascalTouch.held("left") ? 1 : 0),
    jump: rascalEdge.jump,
    jumpHeld: rascalKeys.jump || rascalTouch.held("jump"),
    web: rascalEdge.web,
    pause: rascalEdge.pause,
    confirm: rascalEdge.confirm,
  };
}

function openCapy(): void {
  capyState = createCapy(0);
  capyAcc = 0;
  capyEdge = blankCapyInput();
  capyFieldJump = false;
  capyTouch.clear();
  capyFingers.clear();
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
  if (capyPad) capyPad.hidden = live;
  if (capyNext) {
    capyNext.hidden = live;
    capyNext.textContent = capyState.phase === "done" ? "Play again" : capyState.phase === "retry" ? "Try again" : capyState.levelIndex >= JUNGLE_LEVELS.length - 1 ? "The pool" : "Next level";
  }
}

function capyInput(): CapyInput {
  const running = runnerPush([...capyFingers.values()], performance.now());
  const touch = capyTouchRead({
    edgeJump: capyEdge.jump,
    keyHeld: capyKeys.jump,
    buttonHeld: capyTouch.held("jump"),
    fieldDown: capyFieldJump,
    fieldHeld: capyFingers.size > 0,
  });
  return {
    dx: (capyKeys.right || capyTouch.held("right") || running ? 1 : 0) - (capyKeys.left || capyTouch.held("left") ? 1 : 0),
    jump: touch.jump,
    jumpHeld: touch.jumpHeld,
    pause: capyEdge.pause,
    confirm: capyEdge.confirm,
  };
}

function openWaddle(): void {
  waddleState = createWaddle(0);
  waddleAcc = 0;
  waddleEdge = blankWaddleInput();
  waddleTouch.clear();
  waddleFingers.clear();
  waddleKeys.left = false;
  waddleKeys.right = false;
  waddleKeys.up = false;
  waddleKeys.down = false;
  syncWaddleChrome();
}

function syncWaddleChrome(): void {
  if (!waddleState) return;
  const level = ICE_LEVELS[waddleState.levelIndex];
  if (waddleHeading) waddleHeading.textContent = waddleState.phase === "done" ? "Ice Waddle" : level.name;
  const live = waddleState.phase === "playing" || waddleState.phase === "paused";
  if (waddlePad) waddlePad.hidden = live;
  if (waddleNext) {
    waddleNext.hidden = live;
    waddleNext.textContent = waddleState.phase === "done" ? "Play again" : waddleState.phase === "retry" ? "Try again" : waddleState.levelIndex >= ICE_LEVELS.length - 1 ? "The ice" : "Next level";
  }
}

function waddleSlide(): { dx: number; dy: number } {
  for (const finger of waddleFingers.values()) {
    const dir = slideDirection(finger.x0, finger.y0, finger.x, finger.y);
    if (dir.dx || dir.dy) return dir;
  }
  return { dx: 0, dy: 0 };
}

function waddleInput(): WaddleInput {
  const slide = waddleSlide();
  return {
    dx: (waddleKeys.right || slide.dx > 0 ? 1 : 0) - (waddleKeys.left || slide.dx < 0 ? 1 : 0),
    dy: (waddleKeys.down || slide.dy > 0 ? 1 : 0) - (waddleKeys.up || slide.dy < 0 ? 1 : 0),
    pause: waddleEdge.pause,
    confirm: waddleEdge.confirm,
  };
}

function openSpot(): void {
  spotState = null;
  spotAcc = 0;
  spotEdge = blankSpotInput();
  spotTouch.clear();
  syncSpotChrome();
}

function beginSpot(hard: boolean): void {
  spotState = startSpot(undefined, hard);
  spotAcc = 0;
  spotEdge = blankSpotInput();
  spotTouch.clear();
  syncSpotChrome();
}

function syncSpotChrome(): void {
  const live = !!spotState && (spotState.phase === "playing" || spotState.phase === "paused");
  const showSets = !spotState || spotState.phase === "done";
  if (spotPad) spotPad.hidden = live;
  if (spotAll) spotAll.hidden = !showSets;
  if (spotHard) spotHard.hidden = !showSets;
  if (!spotState) {
    if (spotHeading) spotHeading.textContent = "Silk Spot";
    if (spotNext) spotNext.hidden = true;
    return;
  }
  const level = spotState.levels[spotState.levelIndex];
  if (spotHeading) spotHeading.textContent = spotState.phase === "done" ? "Silk Spot" : level.name;
  if (spotNext) {
    spotNext.hidden = live;
    spotNext.textContent = spotState.phase === "done" ? "Play again" : spotState.levelIndex >= spotState.levels.length - 1 ? "The last picture" : "Next picture";
  }
}

function spotInput(): SpotInput {
  return spotEdge;
}

function openPattern(): void {
  patternState = startPattern();
  patternAcc = 0;
  patternEdge = blankPatternInput();
  syncPatternChrome();
}

function syncPatternChrome(): void {
  if (!patternState) return;
  const level = patternState.levels[patternState.levelIndex];
  if (patternHeading) patternHeading.textContent = patternState.phase === "done" ? "Pattern Pals" : level.name;
  const live = patternState.phase === "playing" || patternState.phase === "paused";
  if (patternPad) patternPad.hidden = live;
  if (patternNext) {
    patternNext.hidden = live;
    patternNext.textContent = patternState.phase === "done" ? "Play again" : patternState.levelIndex >= patternState.levels.length - 1 ? "The last row" : "Next row";
  }
}

function patternInput(): PatternInput {
  return patternEdge;
}

function openBurst(): void {
  burstState = createBurst(0);
  burstAcc = 0;
  burstEdge = blankBurstInput();
  burstTouch.clear();
  syncBurstChrome();
}

function syncBurstChrome(): void {
  if (!burstState) return;
  const level = BURST_LEVELS[burstState.levelIndex];
  if (burstHeading) burstHeading.textContent = burstState.phase === "done" ? "Berry Burst" : level.name;
  const live = burstState.phase === "playing" || burstState.phase === "paused";
  if (burstPad) burstPad.hidden = live;
  if (burstNext) {
    burstNext.hidden = live;
    burstNext.textContent = burstState.phase === "done" ? "Play again" : burstState.phase === "retry" ? "Try again" : burstState.levelIndex >= BURST_LEVELS.length - 1 ? "The last garden" : "Next garden";
  }
}

function burstInput(): BurstInput {
  return burstEdge;
}

function openHunt(): void {
  huntState = startHunt();
  huntAcc = 0;
  huntEdge = blankHuntInput();
  huntTouch.clear();
  huntDrag = null;
  syncHuntChrome();
}

function syncHuntChrome(): void {
  if (!huntState) return;
  const level = huntState.levels[huntState.levelIndex];
  if (huntHeading) huntHeading.textContent = huntState.phase === "done" ? "Word Hunt" : level.name;
  const live = huntState.phase === "playing" || huntState.phase === "paused";
  if (huntPad) huntPad.hidden = live;
  if (huntNext) {
    huntNext.hidden = live;
    huntNext.textContent = huntState.phase === "done" ? "Play again" : huntState.levelIndex >= huntState.levels.length - 1 ? "The last puzzle" : "Next puzzle";
  }
}

function openSkate(): void {
  skateState = createSkate(0);
  skateAcc = 0;
  skateEdge = blankSkateInput();
  skateKeys.left = false;
  skateKeys.right = false;
  skateKeys.brake = false;
  skateKeys.crouch = false;
  skateKeys.jump = false;
  skatePointers = [];
  skateTouchHeld = blankSkateTouch();
  syncSkateChrome();
}

function syncSkateTouch(now = performance.now()): void {
  const reading = readSkateTouch(skatePointers, now);
  skatePointers = reading.pointers;
  skateTouchHeld = reading.held;
  if (reading.jump) skateEdge = { ...skateEdge, jump: true };
  if (reading.pause) skateEdge = { ...skateEdge, pause: true };
}

function syncSkateChrome(): void {
  if (!skateState) return;
  const level = SKATE_LEVELS[skateState.levelIndex];
  if (skateHeading) skateHeading.textContent = skateState.phase === "done" ? "Ollie Cat" : level.name;
  const live = skateState.phase === "playing" || skateState.phase === "paused";
  if (skatePad) skatePad.hidden = live;
  if (skateNext) {
    skateNext.hidden = live;
    skateNext.textContent = skateState.phase === "done" ? "Play again" : skateState.phase === "retry" ? "Try again" : skateState.levelIndex >= SKATE_LEVELS.length - 1 ? "The park" : "Next level";
  }
}

function skateInput(): SkateInput {
  syncSkateTouch();
  return {
    dx: skateKeys.brake ? -1 : 0,
    steer: skateSteer(),
    crouch: skateKeys.crouch || skateTouchHeld.crouch,
    jump: skateEdge.jump,
    pause: skateEdge.pause,
    confirm: skateEdge.confirm,
  };
}

function skateSteer(): number {
  let steer = (skateKeys.right || skateTouchHeld.right ? 1 : 0) - (skateKeys.left || skateTouchHeld.left ? 1 : 0);
  for (const pointer of skatePointers) {
    if (pointer.origin !== "field") continue;
    steer += sideSteer(pointer.x);
  }
  return Math.max(-1, Math.min(1, steer));
}

function huntInput(): HuntInput {
  if (!huntDrag) return huntEdge;
  return { ...huntEdge, tracking: true, x: huntDrag.x, y: huntDrag.y, x2: huntDrag.x2, y2: huntDrag.y2 };
}

function canvasPoint(surface: HTMLCanvasElement, event: PointerEvent): { x: number; y: number } {
  const rect = surface.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * surface.width) / rect.width,
    y: ((event.clientY - rect.top) * surface.height) / rect.height,
  };
}

function fishInput(): PondInput {
  return {
    dx: (fishKeys.right || fishTouch.held("right") ? 1 : 0) - (fishKeys.left || fishTouch.held("left") ? 1 : 0),
    dy: (fishKeys.down || fishTouch.held("down") ? 1 : 0) - (fishKeys.up || fishTouch.held("up") ? 1 : 0),
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
  raceTouch.clear();
  raceFingers.clear();
  syncRaceChrome();
  requestAnimationFrame(() => fit());
}

function raceSteer(): number {
  let steer = (raceKeys.right || raceTouch.held("right") ? 1 : 0) - (raceKeys.left || raceTouch.held("left") ? 1 : 0);
  if (raceState?.phase === "racing") {
    for (const finger of raceFingers.values()) {
      const side = sideSteer(finger.x);
      if (side) steer += side;
    }
  }
  return steer;
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

function menuCard(id: string, next: Mode): void {
  const button = document.querySelector<HTMLElement>(id);
  if (button) bindMenuCard(button, () => show(next));
}
menuCard("#play-pattern", "pattern");
menuCard("#play-crab", "crab");
menuCard("#play-race", "race");
menuCard("#play-fish", "fish");
menuCard("#play-axo", "axo");
menuCard("#play-rascal", "rascal");
menuCard("#play-capy", "capy");
menuCard("#play-waddle", "waddle");
menuCard("#play-spot", "spot");
menuCard("#play-burst", "burst");
menuCard("#play-hunt", "hunt");
menuCard("#play-skate", "skate");
menuCard("#open-settings", "settings");
document.querySelector("#crab-settings")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("settings");
});
document.querySelector("#settings-play")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("crab");
});
document.querySelector("#settings-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
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
document.querySelector("#waddle-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#spot-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#pattern-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#burst-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#hunt-games")?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  show("menu");
});
document.querySelector("#skate-games")?.addEventListener("pointerdown", (event) => {
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
waddleNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!waddleState) return;
  waddleState = advanceWaddle(waddleState);
  syncWaddleChrome();
});
spotAll?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  beginSpot(false);
});
spotHard?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  beginSpot(true);
});
spotNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!spotState) return;
  spotState = advanceSpot(spotState);
  syncSpotChrome();
});
patternNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!patternState) return;
  patternState = advancePattern(patternState);
  syncPatternChrome();
});
burstNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!burstState) return;
  burstState = advanceBurst(burstState);
  syncBurstChrome();
});
huntNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!huntState) return;
  huntState = advanceHunt(huntState);
  syncHuntChrome();
});
skateNext?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!skateState) return;
  skateState = advanceSkate(skateState);
  syncSkateChrome();
});

if (tuneTabs && tuneForm) {
  mountLevelSettings(tuneTabs, tuneForm, tunes, defaultTunes(LEVELS), (next) => {
    tunes = next;
    saveTunes(tunes, tuneStore);
  });
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
  if (mode === "pattern") {
    if (event.code === "Digit1" || event.code === "Numpad1") patternEdge = { ...patternEdge, choice: 0 };
    if (event.code === "Digit2" || event.code === "Numpad2") patternEdge = { ...patternEdge, choice: 1 };
    if (event.code === "Digit3" || event.code === "Numpad3") patternEdge = { ...patternEdge, choice: 2 };
    if (event.code === "Escape") patternEdge = { ...patternEdge, pause: true };
    if (event.code === "Enter") patternEdge = { ...patternEdge, confirm: true };
    if (["Digit1", "Digit2", "Digit3", "Numpad1", "Numpad2", "Numpad3"].includes(event.code)) event.preventDefault();
    return;
  }
  if (mode === "hunt") {
    if (event.code === "KeyH") huntEdge = { ...huntEdge, hint: true };
    if (event.code === "Escape") huntEdge = { ...huntEdge, pause: true };
    if (event.code === "Enter") huntEdge = { ...huntEdge, confirm: true };
    if (event.code === "KeyH") event.preventDefault();
    return;
  }
  if (mode === "burst") {
    if (event.code === "KeyH") burstEdge = { ...burstEdge, hint: true };
    if (event.code === "Escape") burstEdge = { ...burstEdge, pause: true };
    if (event.code === "Enter") burstEdge = { ...burstEdge, confirm: true };
    if (event.code === "KeyH") event.preventDefault();
    return;
  }
  if (mode === "spot") {
    if (event.code === "KeyH") spotEdge = { ...spotEdge, hint: true };
    if (event.code === "Escape") spotEdge = { ...spotEdge, pause: true };
    if (event.code === "Enter") spotEdge = { ...spotEdge, confirm: true };
    if (event.code === "KeyH") event.preventDefault();
    return;
  }
  if (mode === "waddle") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") waddleKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") waddleKeys.right = true;
    if (event.code === "ArrowUp" || event.code === "KeyW") waddleKeys.up = true;
    if (event.code === "ArrowDown" || event.code === "KeyS") waddleKeys.down = true;
    if (event.code === "Escape") waddleEdge = { ...waddleEdge, pause: true };
    if (event.code === "Enter") waddleEdge = { ...waddleEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(event.code)) event.preventDefault();
    return;
  }
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
  if (mode === "skate") {
    if (event.code === "ArrowLeft" || event.code === "KeyA") skateKeys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") skateKeys.right = true;
    if (event.code === "ArrowDown" || event.code === "KeyS") skateKeys.crouch = true;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") skateKeys.brake = true;
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") skateKeys.jump = true;
    if (!event.repeat && (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW")) skateEdge = { ...skateEdge, jump: true };
    if (event.code === "Escape") skateEdge = { ...skateEdge, pause: true };
    if (event.code === "Enter") skateEdge = { ...skateEdge, confirm: true };
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"].includes(event.code)) event.preventDefault();
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
    waddleKeys.left = false;
    skateKeys.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    raceKeys.right = false;
    fishKeys.right = false;
    axoKeys.right = false;
    rascalKeys.right = false;
    capyKeys.right = false;
    waddleKeys.right = false;
    skateKeys.right = false;
  }
  if (event.code === "ArrowUp" || event.code === "KeyW") waddleKeys.up = false;
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    waddleKeys.down = false;
    skateKeys.crouch = false;
  }
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    rascalKeys.jump = false;
    capyKeys.jump = false;
    skateKeys.jump = false;
  }
  if (event.code === "Space") axoKeys.fire = false;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") skateKeys.brake = false;
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

function beginSkatePointer(event: PointerEvent): void {
  if (mode !== "skate" || !skateState) return;
  event.preventDefault();
  if (skateState.phase === "clear" || skateState.phase === "retry" || skateState.phase === "done") {
    skateEdge = { ...skateEdge, confirm: true };
    return;
  }
  if (skateState.phase === "paused") {
    skateEdge = { ...skateEdge, pause: true };
    return;
  }
  const point = canvasPoint(skateSurface, event);
  const pointer: SkatePointer = {
    id: event.pointerId,
    x: point.x,
    y: point.y,
    x0: point.x,
    y0: point.y,
    t0: performance.now(),
    origin: skateOriginAt(point.x, point.y),
    jumpSent: false,
    pauseSent: false,
  };
  skatePointers = skatePointers.filter((item) => item.id !== event.pointerId).concat(pointer);
  if (!skateSurface.hasPointerCapture(event.pointerId)) skateSurface.setPointerCapture(event.pointerId);
  syncSkateTouch();
}

function moveSkatePointer(event: PointerEvent): void {
  const pointer = skatePointers.find((item) => item.id === event.pointerId);
  if (!pointer || mode !== "skate") return;
  const point = canvasPoint(skateSurface, event);
  pointer.x = point.x;
  pointer.y = point.y;
  syncSkateTouch();
}

function endSkatePointer(event: PointerEvent): void {
  const pointer = skatePointers.find((item) => item.id === event.pointerId);
  skatePointers = skatePointers.filter((item) => item.id !== event.pointerId);
  if (pointer && skateState?.phase === "playing" && skateTapJump(pointer, performance.now())) skateEdge = { ...skateEdge, jump: true };
  if (skateSurface.hasPointerCapture(event.pointerId)) skateSurface.releasePointerCapture(event.pointerId);
  syncSkateTouch();
}

skateSurface.addEventListener("pointerdown", beginSkatePointer);
skateSurface.addEventListener("pointermove", moveSkatePointer);
skateSurface.addEventListener("pointerup", endSkatePointer);
skateSurface.addEventListener("pointercancel", endSkatePointer);
skateSurface.addEventListener("contextmenu", (event) => event.preventDefault());

document.querySelectorAll<HTMLButtonElement>("button[data-hunt]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.hunt ?? "";
    if (name === "hint") huntEdge = { ...huntEdge, hint: true };
    if (name === "pause") huntEdge = { ...huntEdge, pause: true };
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-burst]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.burst ?? "";
    if (name === "hint") burstEdge = { ...burstEdge, hint: true };
    if (name === "pause") burstEdge = { ...burstEdge, pause: true };
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-spot]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.spot ?? "";
    if (name === "hint") spotEdge = { ...spotEdge, hint: true };
    if (name === "pause") spotEdge = { ...spotEdge, pause: true };
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

document.querySelectorAll<HTMLButtonElement>("button[data-waddle]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const name = button.dataset.waddle ?? "";
    if (name === "left") waddleKeys.left = true;
    if (name === "right") waddleKeys.right = true;
    if (name === "up") waddleKeys.up = true;
    if (name === "down") waddleKeys.down = true;
    if (name === "pause") waddleEdge = { ...waddleEdge, pause: true };
    if (name !== "pause") {
      button.classList.add("is-held");
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
  });
  const release = (event: PointerEvent) => {
    const name = button.dataset.waddle ?? "";
    if (name === "left") waddleKeys.left = false;
    if (name === "right") waddleKeys.right = false;
    if (name === "up") waddleKeys.up = false;
    if (name === "down") waddleKeys.down = false;
    button.classList.remove("is-held");
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
    if (name === "left" || name === "right" || name === "jump" || name === "web") {
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

function bindPad(
  surface: HTMLCanvasElement,
  pad: TouchPad,
  opts: {
    active: () => boolean;
    armed: () => boolean;
    paused: () => boolean;
    resume: () => void;
    fingers?: Map<number, RunnerFinger>;
    allow?: (x: number, y: number) => boolean;
    onDown?: () => void;
    onTap?: () => void;
  },
): void {
  surface.addEventListener("pointerdown", (event) => {
    if (!opts.active()) return;
    if (opts.paused()) {
      opts.resume();
      touchClaims.add(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!opts.armed()) return;
    const point = canvasPoint(surface, event);
    if (pad.down(event.pointerId, point.x, point.y)) {
      touchClaims.add(event.pointerId);
      if (!surface.hasPointerCapture(event.pointerId)) surface.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (opts.fingers && (opts.allow?.(point.x, point.y) ?? true)) {
      opts.fingers.set(event.pointerId, { id: event.pointerId, x: point.x, y: point.y, x0: point.x, y0: point.y, t0: performance.now() });
      opts.onDown?.();
    }
  }, true);
  surface.addEventListener("pointermove", (event) => {
    const finger = opts.fingers?.get(event.pointerId);
    if (!finger) return;
    const point = canvasPoint(surface, event);
    finger.x = point.x;
    finger.y = point.y;
  }, true);
  const end = (event: PointerEvent) => {
    const finger = opts.fingers?.get(event.pointerId);
    pad.up(event.pointerId);
    opts.fingers?.delete(event.pointerId);
    if (finger && opts.armed() && opts.onTap && runnerTap(finger, performance.now())) opts.onTap();
    if (touchClaims.delete(event.pointerId) && surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
  };
  surface.addEventListener("pointerup", end, true);
  surface.addEventListener("pointercancel", end, true);
  surface.addEventListener("contextmenu", (event) => event.preventDefault());
}

bindPad(canvas, crabTouch, {
  active: () => mode === "crab",
  armed: () => state.phase === "playing",
  paused: () => state.phase === "paused",
  resume: () => queue({ ...blankInput(), pause: true }),
});
bindPad(raceSurface, raceTouch, {
  active: () => mode === "race" && raceScreen === "play" && !!raceState,
  armed: () => raceState?.phase === "racing",
  paused: () => raceState?.phase === "paused",
  resume: () => { raceEdge = { ...raceEdge, pause: true }; },
  fingers: raceFingers,
});
bindPad(fishSurface, fishTouch, {
  active: () => mode === "fish" && !!fishState,
  armed: () => fishState?.phase === "playing",
  paused: () => fishState?.phase === "paused",
  resume: () => { fishEdge = { ...fishEdge, pause: true }; },
});
bindPad(axoSurface, axoTouch, {
  active: () => mode === "axo" && !!axoState,
  armed: () => axoState?.phase === "playing",
  paused: () => axoState?.phase === "paused",
  resume: () => { axoEdge = { ...axoEdge, pause: true }; },
  fingers: axoFingers,
});
bindPad(rascalSurface, rascalTouch, {
  active: () => mode === "rascal" && !!rascalState,
  armed: () => rascalState?.phase === "playing",
  paused: () => rascalState?.phase === "paused",
  resume: () => { rascalEdge = { ...rascalEdge, pause: true }; },
  fingers: rascalFingers,
  allow: (x, y) => !(rascalState && hookAtPoint(rascalState, x + rascalCameraX(rascalState), y)),
  onTap: () => { rascalEdge = { ...rascalEdge, jump: true }; },
});
bindPad(capySurface, capyTouch, {
  active: () => mode === "capy" && !!capyState,
  armed: () => capyState?.phase === "playing",
  paused: () => capyState?.phase === "paused",
  resume: () => { capyEdge = { ...capyEdge, pause: true }; },
  fingers: capyFingers,
  onDown: () => { capyFieldJump = true; },
});
bindPad(waddleSurface, waddleTouch, {
  active: () => mode === "waddle" && !!waddleState,
  armed: () => waddleState?.phase === "playing",
  paused: () => waddleState?.phase === "paused",
  resume: () => { waddleEdge = { ...waddleEdge, pause: true }; },
  fingers: waddleFingers,
});
bindPad(spotSurface, spotTouch, {
  active: () => mode === "spot" && !!spotState,
  armed: () => spotState?.phase === "playing",
  paused: () => spotState?.phase === "paused",
  resume: () => { spotEdge = { ...spotEdge, pause: true }; },
});
bindPad(burstSurface, burstTouch, {
  active: () => mode === "burst" && !!burstState,
  armed: () => burstState?.phase === "playing",
  paused: () => burstState?.phase === "paused",
  resume: () => { burstEdge = { ...burstEdge, pause: true }; },
});
bindPad(huntSurface, huntTouch, {
  active: () => mode === "hunt" && !!huntState,
  armed: () => huntState?.phase === "playing",
  paused: () => huntState?.phase === "paused",
  resume: () => { huntEdge = { ...huntEdge, pause: true }; },
});

canvas.addEventListener("pointerdown", () => {
  if (mode === "crab" && state.phase !== "playing") queue({ ...blankInput(), confirm: true, start: true });
});

document.querySelectorAll<HTMLElement>("#pad .dpad, #pad .actions").forEach((el) => {
  el.hidden = true;
});

waddleSurface.addEventListener("pointerdown", () => {
  if (mode !== "waddle" || !waddleState) return;
  if (waddleState.phase === "clear" || waddleState.phase === "retry" || waddleState.phase === "done") {
    waddleState = advanceWaddle(waddleState);
    syncWaddleChrome();
  }
});

spotSurface.addEventListener("pointerdown", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (mode !== "spot" || !spotState) return;
  if (spotState.phase === "clear" || spotState.phase === "done") {
    spotState = advanceSpot(spotState);
    syncSpotChrome();
    return;
  }
  const rect = spotSurface.getBoundingClientRect();
  spotEdge = {
    ...spotEdge,
    tap: true,
    x: ((event.clientX - rect.left) * spotSurface.width) / rect.width,
    y: ((event.clientY - rect.top) * spotSurface.height) / rect.height,
  };
});

patternSurface.addEventListener("pointerdown", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (mode !== "pattern" || !patternState) return;
  if (patternState.phase === "paused") {
    patternEdge = { ...patternEdge, pause: true };
    return;
  }
  if (patternState.phase === "clear" || patternState.phase === "done") {
    patternState = advancePattern(patternState);
    syncPatternChrome();
    return;
  }
  const rect = patternSurface.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * patternSurface.width) / rect.width;
  const y = ((event.clientY - rect.top) * patternSurface.height) / rect.height;
  if (pauseAt(x, y)) {
    patternEdge = { ...patternEdge, pause: true };
    return;
  }
  const choice = choiceAt(x, y);
  if (choice != null) patternEdge = { ...patternEdge, choice };
});
burstSurface.addEventListener("pointerdown", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (mode !== "burst" || !burstState) return;
  if (burstState.phase === "clear" || burstState.phase === "retry" || burstState.phase === "done") {
    burstState = advanceBurst(burstState);
    syncBurstChrome();
    return;
  }
  const rect = burstSurface.getBoundingClientRect();
  burstEdge = {
    ...burstEdge,
    tap: true,
    x: ((event.clientX - rect.left) * burstSurface.width) / rect.width,
    y: ((event.clientY - rect.top) * burstSurface.height) / rect.height,
  };
});

huntSurface.addEventListener("pointerdown", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (mode !== "hunt" || !huntState) return;
  if (huntState.phase === "clear" || huntState.phase === "done") {
    huntState = advanceHunt(huntState);
    syncHuntChrome();
    return;
  }
  const point = canvasPoint(huntSurface, event);
  huntDrag = { x: point.x, y: point.y, x2: point.x, y2: point.y, pointer: event.pointerId };
  if (!huntSurface.hasPointerCapture(event.pointerId)) huntSurface.setPointerCapture(event.pointerId);
});
huntSurface.addEventListener("pointermove", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (!huntDrag || huntDrag.pointer !== event.pointerId || mode !== "hunt") return;
  const point = canvasPoint(huntSurface, event);
  huntDrag.x2 = point.x;
  huntDrag.y2 = point.y;
});
const finishHuntDrag = (event: PointerEvent) => {
  if (touchClaims.has(event.pointerId)) return;
  if (!huntDrag || huntDrag.pointer !== event.pointerId || mode !== "hunt" || !huntState) return;
  const point = canvasPoint(huntSurface, event);
  const tile = huntMetrics(huntState.levels[huntState.levelIndex].size).tile;
  const moved = Math.hypot(point.x - huntDrag.x, point.y - huntDrag.y) > tile * 0.55;
  huntEdge = moved
    ? { ...huntEdge, drag: true, x: huntDrag.x, y: huntDrag.y, x2: point.x, y2: point.y }
    : { ...huntEdge, tap: true, x: point.x, y: point.y };
  huntDrag = null;
};
huntSurface.addEventListener("pointerup", finishHuntDrag);
huntSurface.addEventListener("pointercancel", () => {
  huntDrag = null;
});

capySurface.addEventListener("pointerdown", () => {
  if (mode !== "capy" || !capyState) return;
  if (capyState.phase === "clear" || capyState.phase === "retry" || capyState.phase === "done") {
    capyState = advanceCapy(capyState);
    syncCapyChrome();
  }
});

rascalSurface.addEventListener("pointerdown", (event) => {
  if (touchClaims.has(event.pointerId)) return;
  if (mode !== "rascal" || !rascalState) return;
  if (rascalState.phase === "clear" || rascalState.phase === "retry" || rascalState.phase === "done") {
    rascalState = advanceRascal(rascalState);
    syncRascalChrome();
    return;
  }
  if (rascalState.phase !== "playing") return;
  const rect = rascalSurface.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const viewY = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  if (hookAtPoint(rascalState, viewX + rascalCameraX(rascalState), viewY)) {
    rascalEdge = { ...rascalEdge, web: true };
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
    brake: raceKeys.brake || raceTouch.held("brake"),
    use: raceEdge.use,
    pause: raceEdge.pause,
    confirm: raceEdge.confirm,
  };
}

function frame(now: number): void {
  const delta = Math.min(100, now - last);
  last = now;
  if (mode === "crab") {
    const touchX = ((crabTouch.held("right") ? 1 : 0) - (crabTouch.held("left") ? 1 : 0)) as -1 | 0 | 1;
    const touchY = ((crabTouch.held("down") ? 1 : 0) - (crabTouch.held("up") ? 1 : 0)) as -1 | 0 | 1;
    if (touchX || touchY) held = { ...blankInput(), dx: touchX, dy: touchY };
    else if (!pending.dx && !pending.dy) held = { ...held, dx: 0, dy: 0 };
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
    if (state.phase === "playing") drawTouchPad(context, crabTouch.spots, (name) => crabTouch.pressed(name));
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
        raceView.render(raceState, now);
        drawRace(raceGfx, raceState, now);
        if (raceState.phase === "racing" && raceState.goMs <= 0) {
          const item = raceState.racers[raceState.playerIndex]?.item;
          const use = item === "acorn" ? "Acorn" : item === "leaf" ? "Leaf" : item === "honey" ? "Honey" : "Use";
          drawTouchPad(raceGfx, raceTouch.spots, (name) => raceTouch.pressed(name), { use });
        }
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
    if (fishState.phase === "playing") drawTouchPad(fishGfx, fishTouch.spots, (name) => fishTouch.pressed(name));
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
    if (axoState.phase === "playing") drawTouchPad(axoGfx, axoTouch.spots, (name) => axoTouch.pressed(name));
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
    if (rascalState.phase === "playing") drawTouchPad(rascalGfx, rascalTouch.spots, (name) => rascalTouch.pressed(name));
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
      capyFieldJump = false;
      capyAcc -= STEP_MS;
      steps += 1;
    }
    drawCapy(capyGfx, capyState, now);
    if (capyState.phase === "playing") drawTouchPad(capyGfx, capyTouch.spots, (name) => capyTouch.pressed(name));
    syncCapyChrome();
  }
  if (mode === "waddle" && waddleState) {
    waddleAcc += delta;
    let steps = 0;
    while (waddleAcc >= STEP_MS && steps < 5) {
      const input = waddleInput();
      if (input.confirm && (waddleState.phase === "clear" || waddleState.phase === "retry" || waddleState.phase === "done")) waddleState = advanceWaddle(waddleState);
      else waddleState = tickWaddle(waddleState, input, STEP_MS);
      waddleEdge = blankWaddleInput();
      waddleAcc -= STEP_MS;
      steps += 1;
    }
    drawWaddle(waddleGfx, waddleState, now);
    if (waddleState.phase === "playing") drawTouchPad(waddleGfx, waddleTouch.spots, (name) => waddleTouch.pressed(name));
    syncWaddleChrome();
  }
  if (mode === "spot") {
    if (!spotState) {
      drawSpotPick(spotGfx);
      syncSpotChrome();
    } else {
      spotAcc += delta;
      let steps = 0;
      while (spotAcc >= STEP_MS && steps < 5) {
        const input = spotInput();
        if (input.confirm && (spotState.phase === "clear" || spotState.phase === "done")) spotState = advanceSpot(spotState);
        else spotState = tickSpot(spotState, input, STEP_MS);
        spotEdge = blankSpotInput();
        spotAcc -= STEP_MS;
        steps += 1;
      }
      drawSpot(spotGfx, spotState, now);
      if (spotState.phase === "playing") drawTouchPad(spotGfx, spotTouch.spots, (name) => spotTouch.pressed(name));
      syncSpotChrome();
    }
  }
  if (mode === "pattern" && patternState) {
    patternAcc += delta;
    let steps = 0;
    while (patternAcc >= STEP_MS && steps < 5) {
      const input = patternInput();
      if (input.confirm && (patternState.phase === "clear" || patternState.phase === "done")) patternState = advancePattern(patternState);
      else patternState = tickPattern(patternState, input, STEP_MS);
      patternEdge = blankPatternInput();
      patternAcc -= STEP_MS;
      steps += 1;
    }
    drawPattern(patternGfx, patternState, now);
    syncPatternChrome();
  }
  if (mode === "burst" && burstState) {
    burstAcc += delta;
    let steps = 0;
    while (burstAcc >= STEP_MS && steps < 5) {
      const input = burstInput();
      if (input.confirm && (burstState.phase === "clear" || burstState.phase === "retry" || burstState.phase === "done")) burstState = advanceBurst(burstState);
      else burstState = tickBurst(burstState, input, STEP_MS);
      burstEdge = blankBurstInput();
      burstAcc -= STEP_MS;
      steps += 1;
    }
    drawBurst(burstGfx, burstState, now);
    if (burstState.phase === "playing") drawTouchPad(burstGfx, burstTouch.spots, (name) => burstTouch.pressed(name));
    syncBurstChrome();
  }
  if (mode === "hunt" && huntState) {
    huntAcc += delta;
    let steps = 0;
    while (huntAcc >= STEP_MS && steps < 5) {
      const input = huntInput();
      if (input.confirm && (huntState.phase === "clear" || huntState.phase === "done")) huntState = advanceHunt(huntState);
      else huntState = tickHunt(huntState, input, STEP_MS);
      huntEdge = blankHuntInput();
      huntAcc -= STEP_MS;
      steps += 1;
    }
    drawHunt(huntGfx, huntState, now);
    if (huntState.phase === "playing") drawTouchPad(huntGfx, huntTouch.spots, (name) => huntTouch.pressed(name));
    syncHuntChrome();
  }
  if (mode === "skate" && skateState) {
    skateAcc += delta;
    let steps = 0;
    while (skateAcc >= STEP_MS && steps < 5) {
      const input = skateInput();
      if (input.confirm && (skateState.phase === "clear" || skateState.phase === "retry" || skateState.phase === "done")) skateState = advanceSkate(skateState);
      else skateState = tickSkate(skateState, input, STEP_MS);
      skateEdge = blankSkateInput();
      skateAcc -= STEP_MS;
      steps += 1;
    }
    skateView.render(skateState, now);
    drawSkate(skateGfx, skateState, now, skateTouchHeld);
    syncSkateChrome();
  }
  requestAnimationFrame(frame);
}

function levelStore(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

syncRaceChrome();
requestAnimationFrame(frame);
