import {
  DOORS,
  ISLE_VINES,
  LAMP_ORDER,
  MARK_ORDER,
  ROOMS,
  RUIN_BOULDERS,
  WHEEL_TURNS,
  type Flag,
  type RoomId,
  type Spot,
} from "./world";

export type TidePhase = "playing" | "paused" | "done";

export type TideInput = {
  dx: number;
  dy: number;
  action: boolean;
  map: boolean;
  pause: boolean;
  confirm: boolean;
};

export type Hero = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dirX: number;
  dirY: number;
  moveMs: number;
  coolMs: number;
};

export type TideState = {
  phase: TidePhase;
  room: RoomId;
  hero: Hero;
  score: number;
  toast: string;
  toastMs: number;
  mapOpen: boolean;
  elapsedMs: number;
  chart: boolean;
  light: boolean;
  cutlass: boolean;
  lantern: boolean;
  cave: boolean;
  key: boolean;
  fort: boolean;
  gold: boolean;
  lamps: number;
  marks: number;
  wheel: number;
  boulders: Spot[];
  vines: { x: number; y: number; cut: boolean }[];
};

export const TIDE_STEP = 130;

export function blankTideInput(): TideInput {
  return { dx: 0, dy: 0, action: false, map: false, pause: false, confirm: false };
}

function heroAt(room: RoomId): Hero {
  const spawn = ROOMS[room].spawn;
  return { x: spawn.x, y: spawn.y, prevX: spawn.x, prevY: spawn.y, dirX: 0, dirY: -1, moveMs: 0, coolMs: 0 };
}

export function createTide(): TideState {
  return {
    phase: "playing",
    room: "isle",
    hero: heroAt("isle"),
    score: 0,
    toast: "Walk to the parrot. Tap Look.",
    toastMs: 2400,
    mapOpen: false,
    elapsedMs: 0,
    chart: false,
    light: false,
    cutlass: false,
    lantern: false,
    cave: false,
    key: false,
    fort: false,
    gold: false,
    lamps: 0,
    marks: 0,
    wheel: 0,
    boulders: RUIN_BOULDERS.map((spot) => ({ ...spot })),
    vines: ISLE_VINES.map((spot) => ({ ...spot, cut: false })),
  };
}

function canLook(state: TideState, spot: Spot): boolean {
  const room = ROOMS[state.room];
  if (room.parrot && sameSpot(room.parrot, spot.x, spot.y)) return true;
  if (room.lamps.some((lamp) => sameSpot(lamp, spot.x, spot.y))) return true;
  if (room.marks.some((mark) => sameSpot(mark, spot.x, spot.y))) return true;
  if (room.chests.some((chest) => sameSpot(chest, spot.x, spot.y))) return true;
  if (room.wheel && sameSpot(room.wheel, spot.x, spot.y)) return true;
  if (room.crystal && sameSpot(room.crystal, spot.x, spot.y)) return true;
  if (state.vines.some((vine) => !vine.cut && sameSpot(vine, spot.x, spot.y))) return true;
  return false;
}

function lookHelps(state: TideState): boolean {
  const spot = { x: state.hero.x + state.hero.dirX, y: state.hero.y + state.hero.dirY };
  const room = ROOMS[state.room];
  if (!state.chart && room.parrot && sameSpot(room.parrot, spot.x, spot.y)) return true;
  if (!state.light && room.lamps.some((lamp) => sameSpot(lamp, spot.x, spot.y))) return true;
  if (!state.cutlass && room.chests.some((chest) => chest.id === "ruins" && sameSpot(chest, spot.x, spot.y))) return true;
  if (state.cutlass && state.vines.some((vine) => !vine.cut && sameSpot(vine, spot.x, spot.y))) return true;
  if (!state.lantern && room.chests.some((chest) => chest.id === "lantern" && sameSpot(chest, spot.x, spot.y))) return true;
  if (state.lantern && !state.cave && room.crystal && sameSpot(room.crystal, spot.x, spot.y)) return true;
  if (!state.key && room.wheel && sameSpot(room.wheel, spot.x, spot.y)) return true;
  if (state.key && !state.fort && room.marks.some((mark) => sameSpot(mark, spot.x, spot.y))) return true;
  if (state.marks >= MARK_ORDER.length && !state.fort && room.chests.some((chest) => chest.id === "fort" && sameSpot(chest, spot.x, spot.y))) return true;
  if (state.fort && !state.gold && room.chests.some((chest) => chest.id === "gold" && sameSpot(chest, spot.x, spot.y))) return true;
  return false;
}

export function tideClue(state: TideState): string {
  if (state.phase === "playing" && lookHelps(state)) return "Tap Look.";
  if (!state.chart) return "Walk to the parrot. Tap Look.";
  if (!state.light) return "Lamps: 1, then 3, then 2.";
  if (!state.cutlass) return "Push stones onto the plates.";
  if (state.vines.some((vine) => !vine.cut)) return "Cut the vines, then the cave.";
  if (!state.lantern) return "Take the lantern first.";
  if (!state.cave) return "Tap the crystal.";
  if (!state.key) return "Avoid wavy water. Turn the wheel.";
  if (!state.fort) return "Marks: A, then C, then B.";
  if (!state.gold) return "Open the beach chest.";
  return "The treasure is yours.";
}

export type TideGoal = "parrot" | "light" | "ruins" | "cave" | "wreck" | "fort" | "gold";

export function tideGoal(state: TideState): TideGoal {
  if (!state.chart) return "parrot";
  if (!state.light) return "light";
  if (!state.cutlass) return "ruins";
  if (!state.cave) return "cave";
  if (!state.key) return "wreck";
  if (!state.fort) return "fort";
  return "gold";
}

function hasFlag(state: TideState, flag: Flag): boolean {
  return state[flag];
}

export function tideFloor(state: TideState, x: number, y: number): string {
  const room = ROOMS[state.room];
  if (y < 0 || x < 0 || y >= room.floor.length || x >= room.floor[0].length) return "#";
  return room.floor[y][x];
}

function sameSpot(spot: Spot, x: number, y: number): boolean {
  return spot.x === x && spot.y === y;
}

function occupied(state: TideState, x: number, y: number): boolean {
  const room = ROOMS[state.room];
  if (state.room === "ruins" && state.boulders.some((boulder) => sameSpot(boulder, x, y))) return true;
  if (state.room === "isle" && state.vines.some((vine) => !vine.cut && sameSpot(vine, x, y))) return true;
  if (room.parrot && sameSpot(room.parrot, x, y)) return true;
  if (room.lamps.some((lamp) => sameSpot(lamp, x, y))) return true;
  if (room.marks.some((mark) => sameSpot(mark, x, y))) return true;
  if (room.chests.some((chest) => sameSpot(chest, x, y))) return true;
  if (room.wheel && sameSpot(room.wheel, x, y)) return true;
  if (room.crystal && sameSpot(room.crystal, x, y)) return true;
  return false;
}

function wash(state: TideState, x: number, y: number): boolean {
  return state.room === "wreck" && tideFloor(state, x, y) === "~";
}

export function tideBlocks(state: TideState, x: number, y: number): boolean {
  const floor = tideFloor(state, x, y);
  if (floor === "#" || floor === "~" && state.room !== "wreck") return true;
  if (floor === "#") return true;
  if (occupied(state, x, y)) return true;
  const door = state.room === "isle" ? DOORS.find((item) => item.x === x && item.y === y) : undefined;
  if (door && !hasFlag(state, door.need)) return true;
  return false;
}

export function tideSafe(state: TideState, x: number, y: number): boolean {
  if (wash(state, x, y)) return false;
  return !tideBlocks(state, x, y);
}

function say(state: TideState, text: string, ms = 1600): void {
  state.toast = text;
  state.toastMs = ms;
}

function award(state: TideState, points: number): void {
  state.score += points;
}

function enter(state: TideState, room: RoomId): void {
  state.room = room;
  state.hero = heroAt(room);
  state.mapOpen = false;
  say(state, ROOMS[room].name, 1200);
}

function finishMove(state: TideState): void {
  const { x, y } = state.hero;
  state.hero.moveMs = 0;
  state.hero.prevX = x;
  state.hero.prevY = y;
  if (wash(state, x, y)) {
    const spawn = ROOMS.wreck.spawn;
    state.hero.x = spawn.x;
    state.hero.y = spawn.y;
    state.hero.prevX = spawn.x;
    state.hero.prevY = spawn.y;
    say(state, "Stay off the wavy water.");
    return;
  }
  if (state.room !== "isle" && ROOMS[state.room].exit && sameSpot(ROOMS[state.room].exit as Spot, x, y)) {
    const link = DOORS.find((door) => door.to === state.room);
    if (link) {
      state.room = "isle";
      state.hero = { ...heroAt("isle"), x: link.backX, y: link.backY, prevX: link.backX, prevY: link.backY, dirY: 1 };
    }
    return;
  }
  const door = state.room === "isle" ? DOORS.find((item) => item.x === x && item.y === y) : undefined;
  if (door && hasFlag(state, door.need)) enter(state, door.to);
}

function tryMove(state: TideState, dx: number, dy: number): void {
  const dirX = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
  const dirY = dirX === 0 && dy !== 0 ? (dy > 0 ? 1 : -1) : 0;
  if (dirX === 0 && dirY === 0) return;
  state.hero.dirX = dirX;
  state.hero.dirY = dirY;
  const nx = state.hero.x + dirX;
  const ny = state.hero.y + dirY;
  if (state.room === "ruins") {
    const boulder = state.boulders.find((item) => sameSpot(item, nx, ny));
    if (boulder) {
      const bx = nx + dirX;
      const by = ny + dirY;
      const floor = tideFloor(state, bx, by);
      const free = (floor === "." || floor === "o" || floor === ",") && !occupied({ ...state, boulders: state.boulders.filter((item) => item !== boulder) }, bx, by);
      if (!free) {
        state.hero.coolMs = 160;
        return;
      }
      boulder.x = bx;
      boulder.y = by;
    }
  }
  if (tideBlocks(state, nx, ny)) {
    const door = state.room === "isle" ? DOORS.find((item) => item.x === nx && item.y === ny) : undefined;
    const vine = state.vines.find((item) => !item.cut && sameSpot(item, nx, ny));
    if (door && !hasFlag(state, door.need)) say(state, door.lock);
    else if (vine) say(state, state.cutlass ? "Tap Look to cut." : "Get a sword from the ruins.");
    else if (canLook(state, { x: nx, y: ny })) say(state, "Tap Look.");
    state.hero.coolMs = 180;
    return;
  }
  state.hero.prevX = state.hero.x;
  state.hero.prevY = state.hero.y;
  state.hero.x = nx;
  state.hero.y = ny;
  state.hero.moveMs = TIDE_STEP;
}

function facing(state: TideState): Spot {
  return { x: state.hero.x + state.hero.dirX, y: state.hero.y + state.hero.dirY };
}

function platesFilled(state: TideState): boolean {
  return ROOMS.ruins.plates.every((plate) => state.boulders.some((boulder) => sameSpot(boulder, plate.x, plate.y)));
}

function act(state: TideState): void {
  const room = ROOMS[state.room];
  const spot = facing(state);
  if (room.parrot && sameSpot(room.parrot, spot.x, spot.y)) {
    if (!state.chart) {
      state.chart = true;
      award(state, 100);
    }
    say(state, "Lamps: 1, then 3, then 2.");
    return;
  }
  const vine = state.vines.find((item) => !item.cut && sameSpot(item, spot.x, spot.y));
  if (vine) {
    if (!state.cutlass) {
      say(state, "Get a sword from the ruins.");
      return;
    }
    vine.cut = true;
    say(state, "The vines fall.");
    return;
  }
  const lamp = room.lamps.find((item) => sameSpot(item, spot.x, spot.y));
  if (lamp) {
    if (state.lamps >= LAMP_ORDER.length) {
      say(state, "The lamps are lit.");
      return;
    }
    if (lamp.n === LAMP_ORDER[state.lamps]) {
      state.lamps += 1;
      say(state, state.lamps >= LAMP_ORDER.length ? "The lamps are lit." : "Yes. Keep that order.");
    } else {
      state.lamps = 0;
      say(state, "Lamps: 1, then 3, then 2.");
    }
    return;
  }
  const chest = room.chests.find((item) => sameSpot(item, spot.x, spot.y));
  if (chest) {
    if (chest.id === "light") {
      if (state.lamps < LAMP_ORDER.length) {
        say(state, "Light the lamps first.");
        return;
      }
      if (!state.light) {
        state.light = true;
        award(state, 100);
      }
      say(state, "Push stones onto the plates.");
      return;
    }
    if (chest.id === "ruins") {
      if (!platesFilled(state)) {
        say(state, "Push both stones onto the plates.");
        return;
      }
      if (!state.cutlass) {
        state.cutlass = true;
        award(state, 150);
      }
      say(state, "Cut the vines, then the cave.");
      return;
    }
    if (chest.id === "lantern") {
      if (!state.lantern) {
        state.lantern = true;
        award(state, 50);
      }
      say(state, "Now tap the crystal.");
      return;
    }
    if (chest.id === "fort") {
      if (state.marks < MARK_ORDER.length) {
        say(state, "Touch the marks in order.");
        return;
      }
      if (!state.fort) {
        state.fort = true;
        award(state, 100);
      }
      say(state, "Open the beach chest.");
      return;
    }
    if (chest.id === "gold") {
      if (!state.gold) {
        state.gold = true;
        award(state, 500);
      }
      state.phase = "done";
      say(state, "The treasure is yours.", 4000);
    }
    return;
  }
  if (room.crystal && sameSpot(room.crystal, spot.x, spot.y)) {
    if (!state.lantern) {
      say(state, "Take the lantern first.");
      return;
    }
    if (!state.cave) {
      state.cave = true;
      award(state, 100);
    }
    say(state, "Avoid wavy water. Turn the wheel.");
    return;
  }
  if (room.wheel && sameSpot(room.wheel, spot.x, spot.y)) {
    if (state.key) {
      say(state, "The wheel is set.");
      return;
    }
    state.wheel += 1;
    if (state.wheel >= WHEEL_TURNS) {
      state.key = true;
      award(state, 150);
      say(state, "Marks: A, then C, then B.");
    } else {
      say(state, `Turn ${state.wheel} of ${WHEEL_TURNS}.`);
    }
    return;
  }
  const mark = room.marks.find((item) => sameSpot(item, spot.x, spot.y));
  if (mark) {
    if (state.marks >= MARK_ORDER.length) {
      say(state, "The marks are set.");
      return;
    }
    if (mark.id === MARK_ORDER[state.marks]) {
      state.marks += 1;
      say(state, state.marks >= MARK_ORDER.length ? "The marks are set." : "Yes. Keep that order.");
    } else {
      state.marks = 0;
      say(state, "Marks: A, then C, then B.");
    }
  }
}

export function tickTide(state: TideState, input: TideInput, dtMs: number): TideState {
  const step = Math.max(0, Math.min(dtMs, 50));
  const next: TideState = {
    ...state,
    hero: { ...state.hero },
    boulders: state.boulders.map((boulder) => ({ ...boulder })),
    vines: state.vines.map((vine) => ({ ...vine })),
  };
  if (input.pause && (next.phase === "playing" || next.phase === "paused")) {
    next.phase = next.phase === "playing" ? "paused" : "playing";
    next.mapOpen = false;
    return next;
  }
  if (next.phase !== "playing") return next;
  next.elapsedMs += step;
  next.toastMs = Math.max(0, next.toastMs - step);
  if (input.map) {
    if (!next.chart) say(next, "No chart yet.");
    else next.mapOpen = !next.mapOpen;
    return next;
  }
  if (next.mapOpen) return next;
  if (input.action && next.hero.moveMs === 0) {
    act(next);
    return next;
  }
  if (next.hero.moveMs > 0) {
    next.hero.moveMs = Math.max(0, next.hero.moveMs - step);
    if (next.hero.moveMs === 0) finishMove(next);
    return next;
  }
  if (next.hero.coolMs > 0) {
    next.hero.coolMs = Math.max(0, next.hero.coolMs - step);
    return next;
  }
  if (input.dx || input.dy) {
    tryMove(next, input.dx, input.dy);
    return next;
  }
  if (input.action) act(next);
  return next;
}

export function advanceTide(state: TideState): TideState {
  if (state.phase === "done") return createTide();
  return state;
}
