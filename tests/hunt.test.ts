import { describe, expect, it, vi } from "vitest";
import { dealHunt, HUNT_LEVELS, metrics } from "../src/hunt/puzzles";
import { advanceHunt, blankHuntInput, cellAt, createHunt, startHunt, tickHunt, type HuntState } from "../src/hunt/sim";

function point(size: number, x: number, y: number): { x: number; y: number } {
  const box = metrics(size);
  return { x: box.originX + x * box.tile + 4, y: box.originY + y * box.tile + 4 };
}

function center(size: number, x: number, y: number): { x: number; y: number } {
  const box = metrics(size);
  return { x: box.originX + x * box.tile + box.tile / 2, y: box.originY + y * box.tile + box.tile / 2 };
}

function countWord(level: (typeof HUNT_LEVELS)[number], word: string): number {
  const dirs = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];
  let count = 0;
  for (let y = 0; y < level.size; y += 1) {
    for (let x = 0; x < level.size; x += 1) {
      for (const dir of dirs) {
        let matches = true;
        for (let i = 0; i < word.length; i += 1) {
          const cx = x + dir.x * i;
          const cy = y + dir.y * i;
          if (cx < 0 || cy < 0 || cx >= level.size || cy >= level.size || level.grid[cy][cx] !== word[i]) {
            matches = false;
            break;
          }
        }
        if (matches) count += 1;
      }
    }
  }
  return count;
}

function drag(state: HuntState, x: number, y: number, x2: number, y2: number): HuntState {
  const size = state.levels[state.levelIndex].size;
  const start = point(size, x, y);
  const end = point(size, x2, y2);
  return tickHunt(state, { ...blankHuntInput(), drag: true, x: start.x, y: start.y, x2: end.x, y2: end.y }, 16);
}

describe("word hunt", () => {
  it("hides fifth-grade words on straight lines", () => {
    expect(HUNT_LEVELS.map((level) => level.name)).toEqual([
      "Space Lab",
      "Weather Watch",
      "Matter Lab",
      "Waterways",
      "Human Body",
      "Simple Machines",
      "Habitats",
      "Rock Lab",
      "Night Sky",
      "Plant Lab",
      "Forces",
      "Food Webs",
      "Math Lab",
      "Explorers",
      "Story Craft",
      "Civics",
      "Landforms",
      "Grammar Lab",
      "Earth Forces",
      "Science Fair",
    ]);
    expect(HUNT_LEVELS).toHaveLength(20);
    expect(HUNT_LEVELS.map((level) => level.words.length)).toEqual([6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8]);
    expect(HUNT_LEVELS.map((level) => level.size)).toEqual([8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    for (const level of HUNT_LEVELS) {
      expect(level.grid).toHaveLength(level.size);
      expect(new Set(level.words).size).toBe(level.words.length);
      for (const row of level.grid) {
        expect(row).toHaveLength(level.size);
        expect(row).toMatch(/^[A-Z]+$/);
      }
      for (const place of level.placed) {
        expect(level.words).toContain(place.word);
        const letters = place.cells.map((cell) => level.grid[cell.y][cell.x]).join("");
        expect(letters).toBe(place.word);
        expect(countWord(level, place.word)).toBe(1);
        if (place.cells.length > 1) {
          const dx = place.cells[1].x - place.cells[0].x;
          const dy = place.cells[1].y - place.cells[0].y;
          place.cells.forEach((cell, index) => {
            expect(cell.x).toBe(place.cells[0].x + dx * index);
            expect(cell.y).toBe(place.cells[0].y + dy * index);
          });
        }
      }
    }
    const box = metrics(8);
    expect(cellAt(box.originX + 2, box.originY + 2, 8)).toEqual({ x: 0, y: 0 });
    expect(cellAt(0, 0, 8)).toBeNull();
  });

  it("finds a word forward, backward, and by two taps", () => {
    const level = HUNT_LEVELS[0];
    const place = level.placed[0];
    const start = createHunt(0);
    const before = structuredClone(start);
    const last = place.cells[place.cells.length - 1];
    let state = drag(start, place.cells[0].x, place.cells[0].y, last.x, last.y);
    expect(start.found).toEqual(before.found);
    expect(state.found.map((found) => found.word)).toEqual([place.word]);
    expect(state.score).toBe(100);
    expect(state.toast).toBe(`Found ${place.word}!`);
    state = drag(state, place.cells[0].x, place.cells[0].y, last.x, last.y);
    expect(state.score).toBe(100);
    expect(state.toast).toBe("Already found.");

    const other = level.placed[1];
    const end = other.cells[other.cells.length - 1];
    state = drag(createHunt(0), end.x, end.y, other.cells[0].x, other.cells[0].y);
    expect(state.found[0].word).toBe(other.word);

    const third = level.placed[2];
    const from = point(level.size, third.cells[0].x, third.cells[0].y);
    const to = point(level.size, third.cells[third.cells.length - 1].x, third.cells[third.cells.length - 1].y);
    state = tickHunt(createHunt(0), { ...blankHuntInput(), tap: true, x: from.x, y: from.y }, 16);
    expect(state.selected).toEqual(third.cells[0]);
    state = tickHunt(state, { ...blankHuntInput(), tap: true, x: to.x, y: to.y }, 16);
    expect(state.found[0].word).toBe(third.word);
    expect(tickHunt(state, blankHuntInput(), 1000).elapsedMs - state.elapsedMs).toBe(50);
  });

  it("asks you to look again, then glows a first letter", () => {
    const level = HUNT_LEVELS[0];
    let state = drag(createHunt(0), 0, 0, 1, 1);
    const diagonalWord = level.placed.find((place) => {
      if (place.cells.length < 2) return false;
      const dx = place.cells[1].x - place.cells[0].x;
      const dy = place.cells[1].y - place.cells[0].y;
      return dx !== 0 && dy !== 0;
    });
    if (!diagonalWord) {
      expect(state.found).toHaveLength(0);
      expect(state.toast).toBe("Look again.");
    }
    state = tickHunt(createHunt(0), { ...blankHuntInput(), hint: true }, 16);
    const first = level.placed[0];
    expect(state.hint).toEqual(level.placed.find((place) => place.word === first.word)?.cells[0]);
    expect(state.toast).toBe("The first letter is glowing.");
  });

  it("finishes every puzzle and carries the score", () => {
    let state = createHunt(0, 40);
    for (const place of HUNT_LEVELS[0].placed) {
      const last = place.cells[place.cells.length - 1];
      state = drag(state, place.cells[0].x, place.cells[0].y, last.x, last.y);
    }
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    expect(state.score).toBe(40 + HUNT_LEVELS[0].words.length * 100 + 250);
    expect(advanceHunt(createHunt(0)).phase).toBe("playing");
    state = advanceHunt(state);
    expect(state.levelIndex).toBe(1);
    expect(state.score).toBe(40 + 6 * 100 + 250);
    expect(state.found).toHaveLength(0);

    const lastLevel = HUNT_LEVELS.length - 1;
    state = createHunt(lastLevel, 15);
    for (const place of HUNT_LEVELS[lastLevel].placed) {
      const last = place.cells[place.cells.length - 1];
      state = drag(state, place.cells[0].x, place.cells[0].y, last.x, last.y);
    }
    expect(state.phase).toBe("clear");
    state = advanceHunt(state);
    expect(state.phase).toBe("done");
    expect(state.toast).toBe("You finished all 20 levels.");
    state = advanceHunt(state);
    expect(state.levelIndex).toBe(0);
    expect(state.score).toBe(0);
  });

  it("selects the nearest letter when a tap lands just outside the grid", () => {
    const box = metrics(8);
    const state = tickHunt(createHunt(0), { ...blankHuntInput(), tap: true, x: box.originX - box.tile * 0.4, y: box.originY + box.tile * 0.4 }, 16);
    expect(state.selected).toEqual({ x: 0, y: 0 });
    const far = tickHunt(createHunt(0), { ...blankHuntInput(), tap: true, x: box.originX - box.tile * 1.2, y: box.originY - box.tile * 1.2 }, 16);
    expect(far.selected).toBeNull();
  });

  it("finds a word when the drag slips off the row or stops a letter early", () => {
    const level = HUNT_LEVELS[0];
    const meteor = level.placed.find((place) => place.word === "METEOR");
    const planet = level.placed.find((place) => place.word === "PLANET");
    expect(meteor).toBeTruthy();
    expect(planet).toBeTruthy();
    if (!meteor || !planet) return;
    const meteorEnd = meteor.cells[meteor.cells.length - 1];
    const slipped = center(level.size, meteorEnd.x, meteorEnd.y + 1);
    const start = center(level.size, meteor.cells[0].x, meteor.cells[0].y);
    let state = tickHunt(createHunt(0), { ...blankHuntInput(), drag: true, x: start.x, y: start.y, x2: slipped.x, y2: slipped.y }, 16);
    expect(state.found.map((found) => found.word)).toEqual(["METEOR"]);

    const shortEnd = center(level.size, meteorEnd.x - 1, meteorEnd.y);
    state = tickHunt(createHunt(0), { ...blankHuntInput(), drag: true, x: start.x, y: start.y, x2: shortEnd.x, y2: shortEnd.y }, 16);
    expect(state.found.map((found) => found.word)).toEqual(["METEOR"]);

    const planetEnd = planet.cells[planet.cells.length - 1];
    const early = center(level.size, planet.cells[0].x - 1, planet.cells[0].y);
    const last = center(level.size, planetEnd.x, planetEnd.y);
    state = tickHunt(createHunt(0), { ...blankHuntInput(), drag: true, x: early.x, y: early.y, x2: last.x, y2: last.y }, 16);
    expect(state.found.map((found) => found.word)).toEqual(["PLANET"]);
  });

  it("finds a diagonal word when the last letter is one cell off", () => {
    const levelIndex = HUNT_LEVELS.findIndex((level) => level.words.includes("EQUATOR"));
    const level = HUNT_LEVELS[levelIndex];
    const equator = level.placed.find((place) => place.word === "EQUATOR");
    expect(equator).toBeTruthy();
    if (!equator) return;
    const end = equator.cells[equator.cells.length - 1];
    const start = center(level.size, equator.cells[0].x, equator.cells[0].y);
    const slipped = center(level.size, end.x, end.y + 1);
    const state = tickHunt(createHunt(levelIndex), { ...blankHuntInput(), drag: true, x: start.x, y: start.y, x2: slipped.x, y2: slipped.y }, 16);
    expect(state.found.map((found) => found.word)).toEqual(["EQUATOR"]);
  });

  it("shows the snapped letters while the finger is still down", () => {
    const level = HUNT_LEVELS[0];
    const meteor = level.placed.find((place) => place.word === "METEOR");
    expect(meteor).toBeTruthy();
    if (!meteor) return;
    const end = meteor.cells[meteor.cells.length - 1];
    const start = center(level.size, meteor.cells[0].x, meteor.cells[0].y);
    const slipped = center(level.size, end.x, end.y + 1);
    let state = tickHunt(createHunt(0), { ...blankHuntInput(), tracking: true, x: start.x, y: start.y, x2: slipped.x, y2: slipped.y }, 16);
    expect(state.found).toHaveLength(0);
    expect(state.score).toBe(0);
    expect(state.trail?.map((cell) => level.grid[cell.y][cell.x]).join("")).toBe("METEOR");
    state = tickHunt(state, blankHuntInput(), 16);
    expect(state.trail).toBeNull();
  });

  it("deals a new hunt and keeps it until the game ends", () => {
    const first = startHunt(11);
    const same = startHunt(11);
    const other = startHunt(29);
    expect(same.levels.map((level) => [level.name, ...level.grid])).toEqual(first.levels.map((level) => [level.name, ...level.grid]));
    const changed = other.levels.some((level, index) => level.name !== first.levels[index].name || level.grid.join("") !== first.levels[index].grid.join(""));
    expect(changed).toBe(true);
    expect(first.levels.slice(0, 6).map((level) => level.name).sort()).toEqual(HUNT_LEVELS.slice(0, 6).map((level) => level.name).sort());
    expect(first.levels.slice(6, 12).map((level) => level.name).sort()).toEqual(HUNT_LEVELS.slice(6, 12).map((level) => level.name).sort());
    expect(first.levels.slice(12).map((level) => level.name).sort()).toEqual(HUNT_LEVELS.slice(12).map((level) => level.name).sort());
    for (const level of first.levels) {
      expect(level.placed).toHaveLength(level.words.length);
      for (const place of level.placed) expect(countWord(level, place.word)).toBe(1);
    }

    let state = first;
    for (const place of state.levels[0].placed) {
      const last = place.cells[place.cells.length - 1];
      state = drag(state, place.cells[0].x, place.cells[0].y, last.x, last.y);
    }
    state = advanceHunt(state);
    expect(state.levelIndex).toBe(1);
    expect(state.levels[1].grid).toEqual(first.levels[1].grid);
    expect(state.reshuffle).toBe(true);

    state.phase = "done";
    const random = vi.spyOn(Math, "random").mockReturnValue(0.42);
    const replay = advanceHunt(state);
    random.mockRestore();
    const seed = 1 + Math.floor(0.42 * 2147483646);
    expect(replay.levelIndex).toBe(0);
    expect(replay.score).toBe(0);
    expect(replay.levels.map((level) => [level.name, ...level.grid])).toEqual(dealHunt(seed).map((level) => [level.name, ...level.grid]));
  });

  it("pauses without accepting a word", () => {
    const level = HUNT_LEVELS[0];
    const place = level.placed[0];
    const last = place.cells[place.cells.length - 1];
    let state = tickHunt(createHunt(0), { ...blankHuntInput(), pause: true }, 16);
    expect(state.phase).toBe("paused");
    const start = point(level.size, place.cells[0].x, place.cells[0].y);
    const end = point(level.size, last.x, last.y);
    state = tickHunt(state, { ...blankHuntInput(), drag: true, x: start.x, y: start.y, x2: end.x, y2: end.y, pause: true }, 16);
    expect(state.phase).toBe("playing");
    expect(state.found).toHaveLength(0);
  });
});
