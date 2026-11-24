import { describe, expect, it } from "vitest";
import { advanceTide, blankTideInput, createTide, tickTide, tideClue, tideExitOpen, tideSafe, type TideState } from "../src/tide/sim";
import { MARK_ORDER, ROOMS, TIDE_MISSIONS, WHEEL_TURNS, type Spot } from "../src/tide/world";

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function still(state: TideState): TideState {
  let guard = 0;
  while ((state.hero.moveMs > 0 || state.hero.coolMs > 0) && guard < 40) {
    state = tickTide(state, blankTideInput(), 16);
    guard += 1;
  }
  return state;
}

function move(state: TideState, dx: number, dy: number): TideState {
  return still(tickTide(state, { ...blankTideInput(), dx, dy }, 16));
}

function act(state: TideState): TideState {
  return tickTide(state, { ...blankTideInput(), action: true }, 16);
}

function walkTo(state: TideState, x: number, y: number, onto: boolean): TideState {
  const start = { x: state.hero.x, y: state.hero.y };
  const arrived = (spot: Spot) => (onto ? spot.x === x && spot.y === y : Math.abs(spot.x - x) + Math.abs(spot.y - y) === 1);
  if (arrived(start)) return state;
  const queue = [start];
  const prev = new Map<string, string | null>([[`${start.x},${start.y}`, null]]);
  let found: Spot | null = null;
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    if (arrived(cur) && (cur.x !== start.x || cur.y !== start.y)) {
      found = cur;
      break;
    }
    for (const dir of DIRS) {
      const next = { x: cur.x + dir.x, y: cur.y + dir.y };
      const key = `${next.x},${next.y}`;
      if (prev.has(key)) continue;
      const stand = tideSafe(state, next.x, next.y) || (onto && next.x === x && next.y === y);
      if (!stand) continue;
      prev.set(key, `${cur.x},${cur.y}`);
      queue.push(next);
    }
  }
  if (!found) throw new Error(`no path to ${x},${y} in ${state.room} from ${start.x},${start.y}`);
  const steps: Spot[] = [];
  let cursor: string | null = `${found.x},${found.y}`;
  while (cursor) {
    const [sx, sy] = cursor.split(",").map(Number);
    steps.push({ x: sx, y: sy });
    cursor = prev.get(cursor) ?? null;
  }
  steps.pop();
  steps.reverse();
  for (const step of steps) {
    const room = state.room;
    const level = state.levelIndex;
    state = move(state, step.x - state.hero.x, step.y - state.hero.y);
    if (state.room !== room || state.levelIndex !== level) break;
    if (state.hero.x !== step.x || state.hero.y !== step.y) {
      throw new Error(`stopped at ${state.hero.x},${state.hero.y} wanted ${step.x},${step.y} (${state.toast})`);
    }
  }
  return state;
}

function lookAt(state: TideState, x: number, y: number): TideState {
  state = walkTo(state, x, y, false);
  return move(state, Math.sign(x - state.hero.x), Math.sign(y - state.hero.y));
}

function use(state: TideState, x: number, y: number): TideState {
  return act(lookAt(state, x, y));
}

function sail(state: TideState): TideState {
  const exit = ROOMS[state.room].exit;
  if (!exit) throw new Error(`no boat on ${state.room}`);
  return walkTo(state, exit.x, exit.y, true);
}

describe("treasure tide", () => {
  it("builds five islands, each with its own mission", () => {
    expect(TIDE_MISSIONS.map((mission) => mission.name)).toEqual([
      "Lamp Isle",
      "Stone Isle",
      "Vine Isle",
      "Wreck Isle",
      "Fort Isle",
    ]);
    for (const room of [ROOMS.isle, ROOMS.ruins, ROOMS.cave, ROOMS.fort]) {
      expect(room.floor[0].includes("~")).toBe(true);
      expect(room.floor[0].split("").every((tile) => tile === "~")).toBe(true);
    }
    for (const room of [ROOMS.isle, ROOMS.ruins, ROOMS.cave, ROOMS.wreck]) {
      expect(room.exit).not.toBeNull();
      expect(room.exit).not.toEqual(room.spawn);
    }
    expect(ROOMS.fort.exit).toBeNull();
    const start = createTide();
    expect(start.levelIndex).toBe(0);
    expect(start.room).toBe("isle");
    expect(start.vines).toHaveLength(0);
    expect(ROOMS.isle.lamps.map((lamp) => lamp.n).sort()).toEqual([0, 1, 2]);
    expect(createTide(1).boulders).toHaveLength(3);
    expect(createTide(2).vines.length).toBeGreaterThan(3);
    expect(ROOMS.fort.marks.map((mark) => mark.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(WHEEL_TURNS).toBe(4);
  });

  it("keeps the Sail boat shut until the island's mission is done", () => {
    let state = createTide();
    const before = state.score;
    state = move(state, 0, 1);
    state = move(state, 0, 1);
    expect(state.levelIndex).toBe(0);
    expect(state.room).toBe("isle");
    expect(state.hero.x).toBe(ROOMS.isle.spawn.x);
    expect(state.hero.y).toBe(ROOMS.isle.spawn.y + 1);
    expect(state.toast).toBe("Walk to the parrot. Tap Look.");
    expect(state.score).toBe(before);
    expect(tideExitOpen(state)).toBe(false);
  });

  it("sails five islands and keeps the score", () => {
    let state = createTide();
    const parrot = ROOMS.isle.parrot;
    if (!parrot) throw new Error("missing parrot");
    state = use(state, parrot.x, parrot.y);
    expect(state.chart).toBe(true);
    expect(state.toast).toBe("Lamps: 1, then 3, then 2.");
    for (const n of [0, 2, 1]) {
      const lamp = ROOMS.isle.lamps.find((item) => item.n === n);
      if (!lamp) throw new Error("missing lamp");
      state = use(state, lamp.x, lamp.y);
    }
    expect(state.lamps).toBe(3);
    state = use(state, ROOMS.isle.chests[0].x, ROOMS.isle.chests[0].y);
    expect(state.light).toBe(true);
    expect(tideClue(state)).toBe("Step on the green Sail boat.");
    state = sail(state);
    expect(state.levelIndex).toBe(1);
    expect(state.room).toBe("ruins");
    expect(state.score).toBe(200);
    expect(state.toast).toBe("Stone Isle. Push the stones.");

    const pushes = ROOMS.ruins.boulderSpawns
      .map((boulder) => ({
        boulder,
        plate: ROOMS.ruins.plates.find((plate) => plate.x === boulder.x && plate.y > boulder.y),
      }))
      .sort((a, b) => a.boulder.y - b.boulder.y);
    for (const push of pushes) {
      if (!push.plate) throw new Error("missing plate");
      state = walkTo(state, push.boulder.x, push.boulder.y - 1, true);
      for (let step = push.boulder.y; step < push.plate.y; step += 1) state = move(state, 0, 1);
    }
    state = use(state, ROOMS.ruins.chests[0].x, ROOMS.ruins.chests[0].y);
    expect(state.cutlass).toBe(true);
    state = sail(state);
    expect(state.levelIndex).toBe(2);
    expect(state.room).toBe("cave");
    expect(state.score).toBe(350);

    const gate = state.vines.find((vine) => vine.x === state.hero.x);
    if (!gate) throw new Error("missing vine");
    state = use(state, gate.x, gate.y);
    expect(state.vines.find((vine) => vine.x === gate.x && vine.y === gate.y)?.cut).toBe(true);
    const lantern = ROOMS.cave.chests[0];
    state = use(state, lantern.x, lantern.y);
    expect(state.lantern).toBe(true);
    const crystal = ROOMS.cave.crystal;
    if (!crystal) throw new Error("missing crystal");
    state = use(state, crystal.x, crystal.y);
    expect(state.cave).toBe(true);
    state = sail(state);
    expect(state.levelIndex).toBe(3);
    expect(state.room).toBe("wreck");
    expect(state.score).toBe(500);

    state = walkTo(state, 2, 2, true);
    state = move(state, 1, 0);
    expect(state.hero.x).toBe(ROOMS.wreck.spawn.x);
    expect(state.hero.y).toBe(ROOMS.wreck.spawn.y);
    expect(state.toast).toBe("Stay off the wavy water.");
    const wheel = ROOMS.wreck.wheel;
    if (!wheel) throw new Error("missing wheel");
    state = lookAt(state, wheel.x, wheel.y);
    for (let turn = 0; turn < WHEEL_TURNS; turn += 1) state = act(state);
    expect(state.key).toBe(true);
    expect(state.toast).toBe("Step on the green Sail boat.");
    state = sail(state);
    expect(state.levelIndex).toBe(4);
    expect(state.room).toBe("fort");
    expect(state.score).toBe(650);

    const wrong = ROOMS.fort.marks.find((mark) => mark.id === "b");
    if (!wrong) throw new Error("missing mark");
    state = use(state, wrong.x, wrong.y);
    expect(state.marks).toBe(0);
    expect(state.toast).toBe("Marks: A, then C, then B, then D.");
    for (const id of MARK_ORDER) {
      const mark = ROOMS.fort.marks.find((item) => item.id === id);
      if (!mark) throw new Error("missing mark");
      state = use(state, mark.x, mark.y);
    }
    expect(state.marks).toBe(4);
    expect(state.toast).toBe("Open the beach chest.");
    state = use(state, ROOMS.fort.chests[0].x, ROOMS.fort.chests[0].y);
    expect(state.phase).toBe("done");
    expect(state.gold).toBe(true);
    expect(state.toast).toBe("The treasure is yours.");
    expect(state.score).toBe(100 + 100 + 150 + 50 + 100 + 150 + 500);
    const again = advanceTide(state);
    expect(again.levelIndex).toBe(0);
    expect(again.room).toBe("isle");
    expect(again.chart).toBe(false);
    expect(again.score).toBe(0);
  });

  it("says the next step for the island you are on", () => {
    let state = createTide();
    expect(tideClue(state)).toBe("Walk to the parrot. Tap Look.");
    state = move(state, 0, -1);
    state = move(state, -1, 0);
    expect(state.chart).toBe(false);
    expect(state.toast).toBe("Tap Look.");
    expect(tideClue(state)).toBe("Tap Look.");

    state = createTide(1);
    expect(tideClue(state)).toBe("Push the stones onto the plates.");
    state = createTide(2);
    expect(tideClue(state)).toBe("Cut the vines.");
    state.lantern = true;
    expect(tideClue(state)).toBe("Tap the crystal.");
    state = createTide(3);
    expect(tideClue(state)).toBe("Stay off wavy water. Turn the wheel.");
    state = createTide(4);
    expect(tideClue(state)).toBe("Marks: A, then C, then B, then D.");
    state.marks = MARK_ORDER.length;
    expect(tideClue(state)).toBe("Open the beach chest.");
  });
});
