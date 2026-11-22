import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../src/race/characters";
import { advanceCup, botInput, createRace, placeLabel, tickRace, type RaceState } from "../src/race/sim";
import { TRACKS } from "../src/race/tracks";

const STEP = 1000 / 60;

function drive(state: RaceState, ms: number): RaceState {
  let next = state;
  const steps = Math.ceil(ms / STEP);
  for (let index = 0; index < steps; index += 1) {
    next = tickRace(next, botInput(next), STEP);
    if (next.phase === "results") break;
  }
  return next;
}

describe("woodland grand prix", () => {
  it("has 10 woodland racers and a wood duck", () => {
    expect(CHARACTERS).toHaveLength(10);
    expect(new Set(CHARACTERS.map((character) => character.id)).size).toBe(10);
    const duck = CHARACTERS.find((character) => character.species === "Wood Duck");
    expect(duck?.name).toBe("Woody");
    expect(CHARACTERS.map((character) => character.species)).toEqual([
      "Wood Duck",
      "Rabbit",
      "Squirrel",
      "Raccoon",
      "Fox",
      "Owl",
      "Deer",
      "Hedgehog",
      "Chipmunk",
      "Beaver",
    ]);
  });

  it("has 5 tracks that get harder", () => {
    expect(TRACKS).toHaveLength(5);
    expect(TRACKS.map((track) => track.name)).toEqual([
      "Lily Pond",
      "Acorn Bend",
      "Fern Switchbacks",
      "Beaver Dam",
      "Starlit Hollow",
    ]);
    for (let index = 1; index < TRACKS.length; index += 1) {
      expect(TRACKS[index].ai).toBeGreaterThan(TRACKS[index - 1].ai);
      expect(TRACKS[index].length).toBeGreaterThan(1000);
      expect(TRACKS[index].samples.length).toBeGreaterThan(40);
    }
  });

  it("does not mutate the race it was given", () => {
    const state = createRace("woody", 0, undefined, 0);
    const speed = state.racers[0].speed;
    tickRace(state, { steer: 1, brake: false, use: false, pause: false, confirm: false }, STEP);
    expect(state.racers[0].speed).toBe(speed);
    expect(state.phase).toBe("countdown");
  });

  it("lets Woody finish Lily Pond", () => {
    const state = drive(createRace("woody", 0, undefined, 0), 90_000);
    expect(state.phase).toBe("results");
    expect(state.racers[0].lap).toBeGreaterThanOrEqual(3);
    expect(state.points.woody).toBeGreaterThan(0);
  });

  it("moves every later track forward under the same driver", () => {
    for (let index = 1; index < TRACKS.length; index += 1) {
      const started = createRace("woody", index, undefined, 0);
      const driven = drive(started, 12_000);
      const progress = driven.racers[0].lap * TRACKS[index].length + driven.racers[0].along;
      expect(progress).toBeGreaterThan(TRACKS[index].length * 0.3);
    }
  });

  it("gives a leaf boost when Use is pressed", () => {
    let state = createRace("woody", 0, undefined, 0);
    state.racers[0].item = "leaf";
    state = tickRace(state, { steer: 0, brake: false, use: true, pause: false, confirm: false }, STEP);
    expect(state.racers[0].item).toBeNull();
    expect(state.racers[0].boostMs).toBeGreaterThan(500);
  });

  it("walks the cup from the first race to all 5 levels", () => {
    let state = createRace("woody", 0);
    expect(placeLabel(0)).toBe("1st");
    expect(placeLabel(1)).toBe("2nd");
    expect(placeLabel(2)).toBe("3rd");
    state.scored = true;
    for (let index = 0; index < 4; index += 1) {
      state.phase = "results";
      state = advanceCup(state);
      expect(state.trackIndex).toBe(index + 1);
      expect(state.phase).toBe("countdown");
    }
    state.phase = "results";
    state = advanceCup(state);
    expect(state.phase).toBe("cup");
  });
});
