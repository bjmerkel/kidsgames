import {
  DOORS,
  LAMP_ORDER,
  MARK_ORDER,
  ROOMS,
  RUIN_BOULDERS,
  TIDE_MISSIONS,
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
  levelIndex: number;
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

const MISSION_ROOM: RoomId[] = ["isle", "ruins", "cave", "wreck", "fort"];

function missionToast(level: number): string {
  if (level === 0) return "Walk to the parrot. Tap Look.";
  if (level === 1) return "Stone Isle. Push the stones.";
  if (level === 2) return "Vine Isle. Cut the vines.";
  if (level === 3) return "Wreck Isle. Mind the water.";
  return "Fort Isle. Touch the marks.";
}

export function createTide(level = 0, score = 0): TideState {
  const room = MISSION_ROOM[level] ?? "isle";
  return {
    phase: "playing",
    levelIndex: level,
    room,
    hero: heroAt(room),
    score,
    toast: missionToast(level),
    toastMs: 2400,
    mapOpen: false,
    elapsedMs: 0,
    chart: level > 0,
    light: level > 0,
    cutlass: level > 1,
    lantern: level > 2,
    cave: level > 2,
    key: level > 3,
    fort: false,
    gold: false,
    lamps: 0,
    marks: 0,
    wheel: 0,
    boulders: room === "ruins" ? RUIN_BOULDERS.map((spot) => ({ ...spot })) : [],
    vines: ROOMS[room].vineSpawns.map((spot) => ({ ...spot, cut: false })),
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

export function tideExitOpen(state: TideState): boolean {
  if (state.levelIndex === 0 && state.room === "isle") return state.light;
  if (state.levelIndex === 1 && state.room === "ruins") return state.cutlass;
  if (state.levelIndex === 2 && state.room === "cave") return state.cave;
  if (state.levelIndex === 3 && state.room === "wreck") return state.key;
  return false;
}

function missionTask(state: TideState): string {
  if (state.levelIndex === 0) return state.chart ? "Lamps: 1, then 3, then 2." : "Walk to the parrot. Tap Look.";
  if (state.levelIndex === 1) return "Push the stones onto the plates.";
  if (state.levelIndex === 2) {
    if (state.vines.some((vine) => !vine.cut) && !state.lantern) return "Cut the vines.";
    if (!state.lantern) return "Take the lantern first.";
    return "Tap the crystal.";
  }
  if (state.levelIndex === 3) return "Stay off wavy water. Turn the wheel.";
  if (state.marks < MARK_ORDER.length) return "Marks: A, then C, then B, then D.";
  return "Open the beach chest.";
}

export function tideClue(state: TideState): string {
  if (state.phase === "playing" && lookHelps(state)) return "Tap Look.";
  if (state.phase === "playing" && tideExitOpen(state)) return "Step on the green Sail boat.";
  if (state.gold) return "The treasure is yours.";
  return missionTask(state);
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
  if (state.vines.some((vine) => !vine.cut && sameSpot(vine, x, y))) return true;
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
  const exit = ROOMS[state.room].exit;
  if (exit && sameSpot(exit, x, y)) return false;
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

function park(state: TideState, x: number, y: number, dirY = state.hero.dirY): void {
  state.hero.x = x;
  state.hero.y = y;
  state.hero.prevX = x;
  state.hero.prevY = y;
  state.hero.dirX = 0;
  state.hero.dirY = dirY;
  state.hero.moveMs = 0;
}

function startMission(state: TideState, level: number): void {
  const next = createTide(level, state.score);
  Object.assign(state, next);
}

function finishMove(state: TideState): void {
  const fromX = state.hero.prevX;
  const fromY = state.hero.prevY;
  const { x, y } = state.hero;
  state.hero.moveMs = 0;
  state.hero.prevX = x;
  state.hero.prevY = y;
  if (wash(state, x, y)) {
    const spawn = ROOMS.wreck.spawn;
    park(state, spawn.x, spawn.y, -1);
    say(state, "Stay off the wavy water.");
    return;
  }
  const exit = ROOMS[state.room].exit;
  if (exit && sameSpot(exit, x, y)) {
    if (tideExitOpen(state) && state.levelIndex < TIDE_MISSIONS.length - 1) {
      startMission(state, state.levelIndex + 1);
      return;
    }
    park(state, fromX, fromY);
    say(state, missionTask(state));
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
    if (chest.id === "light" || chest.id === "isle") {
      if (!state.chart) {
        say(state, "Walk to the parrot. Tap Look.");
        return;
      }
      if (state.lamps < LAMP_ORDER.length) {
        say(state, "Light the lamps first.");
        return;
      }
      if (!state.light) {
        state.light = true;
        award(state, 100);
      }
      say(state, "Step on the green Sail boat.");
      return;
    }
    if (chest.id === "ruins") {
      if (!platesFilled(state)) {
        say(state, "Push every stone onto a plate.");
        return;
      }
      if (!state.cutlass) {
        state.cutlass = true;
        award(state, 150);
      }
      say(state, "Step on the green Sail boat.");
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
      if (!state.gold) {
        state.fort = true;
        state.gold = true;
        award(state, 500);
      }
      state.phase = "done";
      say(state, "The treasure is yours.", 4000);
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
    say(state, "Step on the green Sail boat.");
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
      say(state, "Step on the green Sail boat.");
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
      say(state, state.marks >= MARK_ORDER.length ? "Open the beach chest." : "Yes. Keep that order.");
    } else {
      state.marks = 0;
      say(state, "Marks: A, then C, then B, then D.");
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
