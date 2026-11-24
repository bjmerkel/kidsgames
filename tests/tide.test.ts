import { describe, expect, it } from "vitest";
import { advanceTide, blankTideInput, createTide, tickTide, tideClue, tideSafe, type TideState } from "../src/tide/sim";
import { DOORS, ROOMS, type Spot } from "../src/tide/world";

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
    state = move(state, step.x - state.hero.x, step.y - state.hero.y);
    if (state.room !== room) break;
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

describe("treasure tide", () => {
  it("builds an island whose gates open in order", () => {
    for (const room of Object.values(ROOMS)) {
      const width = room.floor[0].length;
      expect(room.floor.every((row) => row.length === width)).toBe(true);
      expect(room.spawn.x).toBeGreaterThanOrEqual(0);
    }
    for (const door of DOORS) expect(ROOMS.isle.doors).toContainEqual({ x: door.x, y: door.y });
    const start = createTide();
    expect(start.vines).toHaveLength(3);
    expect(start.boulders).toHaveLength(2);
    expect(ROOMS.light.lamps.map((lamp) => lamp.n).sort()).toEqual([0, 1, 2]);
    expect(ROOMS.wreck.wheel).not.toBeNull();
  });

  it("keeps the north light shut until the parrot shares the chart", () => {
    let state = createTide();
    const light = DOORS[0];
    state = lookAt(state, light.x, light.y);
    expect(state.room).toBe("isle");
    expect(state.toast).toBe("Talk to the parrot first.");
    const parrot = ROOMS.isle.parrot;
    if (!parrot) throw new Error("missing parrot");
    state = use(state, parrot.x, parrot.y);
    expect(state.chart).toBe(true);
    expect(state.toast).toBe("Lamps: 1, then 3, then 2.");
    state = walkTo(state, light.x, light.y, true);
    expect(state.room).toBe("light");
  });

  it("follows the chart from the parrot to the treasure", () => {
    let state = createTide();
    const parrot = ROOMS.isle.parrot;
    if (!parrot) throw new Error("missing parrot");
    state = use(state, parrot.x, parrot.y);
    state = walkTo(state, DOORS[0].x, DOORS[0].y, true);
    expect(state.room).toBe("light");
    for (const n of [0, 2, 1]) {
      const lamp = ROOMS.light.lamps.find((item) => item.n === n);
      if (!lamp) throw new Error("missing lamp");
      state = use(state, lamp.x, lamp.y);
    }
    expect(state.lamps).toBe(3);
    const lightChest = ROOMS.light.chests[0];
    state = use(state, lightChest.x, lightChest.y);
    expect(state.light).toBe(true);
    expect(state.toast).toBe("Push stones onto the plates.");
    const exit = ROOMS.light.exit;
    if (!exit) throw new Error("missing exit");
    state = walkTo(state, exit.x, exit.y, true);
    expect(state.room).toBe("isle");

    state = walkTo(state, DOORS[1].x, DOORS[1].y, true);
    expect(state.room).toBe("ruins");
    state = walkTo(state, 3, 1, true);
    state = move(state, 0, 1);
    state = move(state, 0, 1);
    state = walkTo(state, 7, 4, true);
    state = move(state, 0, 1);
    state = move(state, 0, 1);
    const ruinsChest = ROOMS.ruins.chests[0];
    state = use(state, ruinsChest.x, ruinsChest.y);
    expect(state.cutlass).toBe(true);
    const ruinsExit = ROOMS.ruins.exit;
    if (!ruinsExit) throw new Error("missing ruins exit");
    state = walkTo(state, ruinsExit.x, ruinsExit.y, true);
    expect(state.room).toBe("isle");

    for (const vine of [...state.vines]) state = use(state, vine.x, vine.y);
    expect(state.vines.every((vine) => vine.cut)).toBe(true);
    state = walkTo(state, DOORS[2].x, DOORS[2].y, true);
    expect(state.room).toBe("cave");
    const lantern = ROOMS.cave.chests[0];
    state = use(state, lantern.x, lantern.y);
    expect(state.lantern).toBe(true);
    const crystal = ROOMS.cave.crystal;
    if (!crystal) throw new Error("missing crystal");
    state = use(state, crystal.x, crystal.y);
    expect(state.cave).toBe(true);
    const caveExit = ROOMS.cave.exit;
    if (!caveExit) throw new Error("missing cave exit");
    state = walkTo(state, caveExit.x, caveExit.y, true);
    expect(state.room).toBe("isle");

    state = walkTo(state, DOORS[3].x, DOORS[3].y, true);
    expect(state.room).toBe("wreck");
    const wheel = ROOMS.wreck.wheel;
    if (!wheel) throw new Error("missing wheel");
    state = lookAt(state, wheel.x, wheel.y);
    state = act(state);
    state = act(state);
    state = act(state);
    expect(state.key).toBe(true);
    expect(state.toast).toBe("Marks: A, then C, then B.");
    const wreckExit = ROOMS.wreck.exit;
    if (!wreckExit) throw new Error("missing wreck exit");
    state = walkTo(state, wreckExit.x, wreckExit.y, true);
    expect(state.room).toBe("isle");

    state = walkTo(state, DOORS[4].x, DOORS[4].y, true);
    expect(state.room).toBe("fort");
    for (const id of ["a", "c", "b"]) {
      const mark = ROOMS.fort.marks.find((item) => item.id === id);
      if (!mark) throw new Error("missing mark");
      state = use(state, mark.x, mark.y);
    }
    expect(state.marks).toBe(3);
    state = use(state, ROOMS.fort.chests[0].x, ROOMS.fort.chests[0].y);
    expect(state.fort).toBe(true);
    const fortExit = ROOMS.fort.exit;
    if (!fortExit) throw new Error("missing fort exit");
    state = walkTo(state, fortExit.x, fortExit.y, true);
    expect(state.room).toBe("isle");

    state = walkTo(state, DOORS[5].x, DOORS[5].y, true);
    expect(state.room).toBe("gold");
    state = use(state, ROOMS.gold.chests[0].x, ROOMS.gold.chests[0].y);
    expect(state.phase).toBe("done");
    expect(state.toast).toBe("The treasure is yours.");
    expect(state.score).toBe(100 + 100 + 150 + 50 + 100 + 150 + 100 + 500);
    const again = advanceTide(state);
    expect(again.phase).toBe("playing");
    expect(again.chart).toBe(false);
    expect(again.score).toBe(0);
  });

  it("says the next step in plain words", () => {
    let state = createTide();
    expect(tideClue(state)).toBe("Walk to the parrot. Tap Look.");
    state = move(state, 0, -1);
    state = move(state, -1, 0);
    expect(state.chart).toBe(false);
    expect(state.toast).toBe("Tap Look.");
    expect(tideClue(state)).toBe("Tap Look.");
    state.chart = true;
    expect(tideClue(state)).toBe("Lamps: 1, then 3, then 2.");
    state.light = true;
    expect(tideClue(state)).toBe("Push stones onto the plates.");
    state.cutlass = true;
    expect(tideClue(state)).toBe("Cut the vines, then the cave.");
    state.vines = state.vines.map((vine) => ({ ...vine, cut: true }));
    expect(tideClue(state)).toBe("Take the lantern first.");
    state.lantern = true;
    expect(tideClue(state)).toBe("Tap the crystal.");
    state.cave = true;
    expect(tideClue(state)).toBe("Avoid wavy water. Turn the wheel.");
    state.key = true;
    expect(tideClue(state)).toBe("Marks: A, then C, then B.");
    state.fort = true;
    expect(tideClue(state)).toBe("Open the beach chest.");
  });

  it("resets a wrong lamp and sends a wash back to the deck", () => {
    let state = createTide();
    state.chart = true;
    state = walkTo(state, DOORS[0].x, DOORS[0].y, true);
    const lamp = ROOMS.light.lamps.find((item) => item.n === 1);
    if (!lamp) throw new Error("missing lamp");
    state = use(state, lamp.x, lamp.y);
    expect(state.lamps).toBe(0);
    expect(state.toast).toBe("Lamps: 1, then 3, then 2.");

    state.light = true;
    state.cutlass = true;
    state.cave = true;
    state.vines = state.vines.map((vine) => ({ ...vine, cut: true }));
    const exit = ROOMS.light.exit;
    if (!exit) throw new Error("missing exit");
    state = walkTo(state, exit.x, exit.y, true);
    state = walkTo(state, DOORS[3].x, DOORS[3].y, true);
    expect(state.room).toBe("wreck");
    state = walkTo(state, 8, 1, true);
    state = move(state, 1, 0);
    expect(state.hero.x).toBe(ROOMS.wreck.spawn.x);
    expect(state.hero.y).toBe(ROOMS.wreck.spawn.y);
    expect(state.toast).toBe("Stay off the wavy water.");
  });
});
