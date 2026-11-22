import { FISH_LEVELS, fishLevel, type Species } from "./levels";

export type PondFish = {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  r: number;
  scaredMs: number;
};

export type PondPhase = "playing" | "paused" | "clear" | "done";

export type PondInput = {
  dx: number;
  dy: number;
  catch: boolean;
  pause: boolean;
  confirm: boolean;
};

export type PondState = {
  phase: PondPhase;
  resumePhase: "playing";
  levelIndex: number;
  elapsedMs: number;
  hookX: number;
  hookY: number;
  fish: PondFish[];
  caught: Record<Species, number>;
  toast: string;
  toastMs: number;
};

const HOOK_R = 12;
const WATER_LEFT = 36;
const WATER_RIGHT = 444;
const WATER_TOP = 210;
const WATER_BOTTOM = 660;
const HOOK_SPEED = 240;

const RADII: Record<Species, number> = {
  bluegill: 18,
  sunfish: 18,
  perch: 18,
  bass: 26,
  trout: 22,
  catfish: 26,
  minnow: 12,
};

export function blankPondInput(): PondInput {
  return { dx: 0, dy: 0, catch: false, pause: false, confirm: false };
}

export function emptyCaught(): Record<Species, number> {
  return { bluegill: 0, sunfish: 0, perch: 0, bass: 0, trout: 0, catfish: 0, minnow: 0 };
}

export function goalMet(state: PondState): boolean {
  const level = fishLevel(state.levelIndex);
  return level.goals.every((goal) => (state.caught[goal.species] ?? 0) >= goal.need);
}

export function stillNeeded(state: PondState, species: Species): boolean {
  const goal = fishLevel(state.levelIndex).goals.find((entry) => entry.species === species);
  if (!goal) return false;
  return (state.caught[species] ?? 0) < goal.need;
}

export function createPond(levelIndex = 0): PondState {
  const level = fishLevel(levelIndex);
  return {
    phase: "playing",
    resumePhase: "playing",
    levelIndex: Math.max(0, Math.min(FISH_LEVELS.length - 1, levelIndex)),
    elapsedMs: 0,
    hookX: 240,
    hookY: 420,
    fish: level.fish.map((spawn, index) => ({
      id: index + 1,
      species: spawn.species,
      x: spawn.x,
      y: spawn.y,
      vx: spawn.vx,
      r: RADII[spawn.species],
      scaredMs: 0,
    })),
    caught: emptyCaught(),
    toast: level.blurb,
    toastMs: 2200,
  };
}

function overlaps(hookX: number, hookY: number, fish: PondFish): boolean {
  const dx = fish.x - hookX;
  const dy = fish.y - hookY;
  const reach = HOOK_R + fish.r;
  return dx * dx + dy * dy <= reach * reach;
}

export function tickPond(state: PondState, input: PondInput, dtMs: number): PondState {
  const step = Math.max(0, Math.min(50, dtMs));
  const dt = step / 1000;
  const next = structuredClone(state);
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "paused" ? "playing" : "paused";
    return next;
  }
  if (next.phase === "paused" || next.phase === "clear" || next.phase === "done") return next;

  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  next.hookX = Math.max(WATER_LEFT, Math.min(WATER_RIGHT, next.hookX + input.dx * HOOK_SPEED * dt));
  next.hookY = Math.max(WATER_TOP, Math.min(WATER_BOTTOM, next.hookY + input.dy * HOOK_SPEED * dt));

  for (const fish of next.fish) {
    fish.scaredMs = Math.max(0, fish.scaredMs - step);
    const speed = fish.scaredMs > 0 ? fish.vx * 2.4 : fish.vx;
    fish.x += speed * dt;
    if (fish.x < WATER_LEFT) fish.x = WATER_RIGHT;
    if (fish.x > WATER_RIGHT) fish.x = WATER_LEFT;
    fish.y += Math.sin((next.elapsedMs + fish.id * 400) / 420) * 10 * dt;
    fish.y = Math.max(WATER_TOP, Math.min(WATER_BOTTOM, fish.y));
  }

  if (input.catch) {
    const hits = next.fish
      .filter((fish) => fish.scaredMs <= 0 && overlaps(next.hookX, next.hookY, fish))
      .sort((a, b) => Number(stillNeeded(next, b.species)) - Number(stillNeeded(next, a.species)));
    const fish = hits[0];
    if (!fish) {
      next.toast = "The hook is empty.";
      next.toastMs = 700;
    } else if (stillNeeded(next, fish.species)) {
      next.caught[fish.species] += 1;
      next.fish = next.fish.filter((entry) => entry.id !== fish.id);
      next.toast = `${label(fish.species)}!`;
      next.toastMs = 900;
      if (goalMet(next)) {
        next.phase = "clear";
        next.toast = "You finished the level!";
        next.toastMs = 0;
      }
    } else {
      fish.scaredMs = 900;
      fish.vx = -fish.vx;
      next.toast = `Let the ${label(fish.species).toLowerCase()} go.`;
      next.toastMs = 1100;
    }
  }
  return next;
}

export function advancePond(state: PondState): PondState {
  if (state.phase === "done") return createPond(0);
  if (state.phase !== "clear") return state;
  if (state.levelIndex >= FISH_LEVELS.length - 1) return { ...structuredClone(state), phase: "done" };
  return createPond(state.levelIndex + 1);
}

function label(species: Species): string {
  if (species === "bluegill") return "Bluegill";
  if (species === "sunfish") return "Sunfish";
  if (species === "perch") return "Perch";
  if (species === "bass") return "Bass";
  if (species === "trout") return "Trout";
  if (species === "catfish") return "Catfish";
  return "Minnow";
}
