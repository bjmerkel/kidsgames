import { describe, expect, it } from "vitest";
import { ESCAPE_KEYS, ESCAPE_ROOMS, hitEscape, type Spot } from "../src/escape/rooms";
import { advanceEscape, blankEscapeInput, createEscape, tickEscape, type EscapeState } from "../src/escape/sim";

function tap(state: EscapeState, x: number, y: number): EscapeState {
  return tickEscape(state, { ...blankEscapeInput(), x, y }, 16);
}

function press(state: EscapeState, digit: number): EscapeState {
  return tickEscape(state, { ...blankEscapeInput(), digit }, 16);
}

function openLock(state: EscapeState): EscapeState {
  return tickEscape(state, { ...blankEscapeInput(), open: true }, 16);
}

function typeCode(state: EscapeState, code: string): EscapeState {
  for (const ch of code) state = press(state, Number(ch));
  return openLock(state);
}

function center(spot: Spot): { x: number; y: number } {
  return { x: spot.x + spot.w / 2, y: spot.y + spot.h / 2 };
}

describe("escape room", () => {
  it("has five rooms from fourth grade to college", () => {
    expect(ESCAPE_ROOMS.map((room) => room.grade)).toEqual([
      "4th grade",
      "7th grade",
      "Freshman",
      "Senior",
      "College",
    ]);
    expect(ESCAPE_ROOMS.map((room) => room.code)).toEqual(["582", "454", "784", "453", "234"]);
    expect(`${12 / 3}${9 - 4}${"LOCK".length}`).toBe(ESCAPE_ROOMS[1].code);
    expect(`${14 / 2}${6 + 2}${6 - 2}`).toBe(ESCAPE_ROOMS[2].code);
    expect(`${23 % 7}${(7 * 7 * 7) % 10}${[2, 3, 5, 7].length}`).toBe(ESCAPE_ROOMS[4].code);
    const fits = [];
    for (let first = 0; first <= 9; first += 1) {
      for (let last = 0; last <= 9; last += 1) {
        const code = `${first}5${last}`;
        const distinct = new Set(code).size === 3;
        const evenFirst = first % 2 === 0;
        const oddLast = last % 2 === 1;
        if (distinct && first + 5 + last === 12 && evenFirst && oddLast && first > last && first < 5) fits.push(code);
      }
    }
    expect(fits).toEqual([ESCAPE_ROOMS[3].code]);
    for (const room of ESCAPE_ROOMS) {
      expect(room.spots.length).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < room.spots.length; i += 1) {
        const spot = room.spots[i];
        expect(spot.x).toBeGreaterThanOrEqual(16);
        expect(spot.y).toBeGreaterThanOrEqual(78);
        expect(spot.x + spot.w).toBeLessThanOrEqual(464);
        expect(spot.y + spot.h).toBeLessThanOrEqual(400);
        for (let j = i + 1; j < room.spots.length; j += 1) {
          const other = room.spots[j];
          const apart = spot.x + spot.w <= other.x || other.x + other.w <= spot.x || spot.y + spot.h <= other.y || other.y + other.h <= spot.y;
          expect(apart).toBe(true);
        }
      }
    }
    for (let i = 0; i < ESCAPE_KEYS.length; i += 1) {
      const key = ESCAPE_KEYS[i];
      expect(key.y + key.h).toBeLessThanOrEqual(720);
      for (let j = i + 1; j < ESCAPE_KEYS.length; j += 1) {
        const other = ESCAPE_KEYS[j];
        const apart = key.x + key.w <= other.x || other.x + other.w <= key.x || key.y + key.h <= other.y || other.y + other.h <= key.y;
        expect(apart).toBe(true);
      }
    }
  });

  it("opens a note when you tap it and keeps the keypad free", () => {
    let state = createEscape();
    const poster = ESCAPE_ROOMS[0].spots[0];
    const at = center(poster);
    state = tap(state, at.x, at.y);
    expect(state.noteId).toBe(poster.id);
    expect(state.read).toContain(poster.id);
    const digit = ESCAPE_KEYS.find((key) => key.name === "5");
    if (!digit) throw new Error("missing key");
    state = tap(state, digit.x + 4, digit.y + 4);
    expect(state.entry).toBe("5");
    expect(state.noteId).toBe(poster.id);
    const close = hitEscape(240, 350, true);
    expect(close).toEqual({ kind: "key", name: "close" });
    if (!close || close.kind !== "key") throw new Error("missing close");
    state = tap(state, 240, 350);
    expect(state.noteId).toBeNull();
  });

  it("opens the door on the right code and carries the score", () => {
    let state = createEscape();
    state = typeCode(state, "111");
    expect(state.phase).toBe("playing");
    expect(state.entry).toBe("");
    expect(state.toast).toBe("Look again.");
    expect(state.score).toBe(0);
    state = typeCode(state, "582");
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("The door opens.");
    expect(state.score).toBe(80);
    state = advanceEscape(state);
    expect(state.levelIndex).toBe(1);
    expect(state.room).toBe("library");
    expect(state.score).toBe(80);
    state = typeCode(state, ESCAPE_ROOMS[1].code);
    expect(state.phase).toBe("clear");
    expect(state.score).toBe(80 + 150);
  });

  it("pays more for a clean first try and resets after the last door", () => {
    let state = createEscape();
    state = openLock(state);
    expect(state.toast).toBe("The lock wants 3 numbers.");
    state = typeCode(state, "582");
    expect(state.score).toBe(150);
    state = advanceEscape(state);
    state = typeCode(state, "454");
    state = advanceEscape(state);
    state = typeCode(state, "784");
    state = advanceEscape(state);
    state = typeCode(state, "453");
    state = advanceEscape(state);
    expect(state.levelIndex).toBe(4);
    expect(state.room).toBe("archive");
    state = typeCode(state, "234");
    expect(state.phase).toBe("clear");
    state = advanceEscape(state);
    expect(state.phase).toBe("done");
    expect(state.score).toBe(150 * 5);
    const again = advanceEscape(state);
    expect(again.levelIndex).toBe(0);
    expect(again.score).toBe(0);
    expect(again.phase).toBe("playing");
  });

  it("pauses and ignores a lock tap while paused", () => {
    let state = createEscape();
    state = tickEscape(state, { ...blankEscapeInput(), pause: true }, 16);
    expect(state.phase).toBe("paused");
    state = press(state, 5);
    expect(state.entry).toBe("");
    state = tickEscape(state, { ...blankEscapeInput(), pause: true }, 16);
    expect(state.phase).toBe("playing");
  });
});
