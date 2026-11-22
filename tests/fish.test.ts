import { describe, expect, it } from "vitest";
import { FISH_LEVELS, SPECIES } from "../src/fish/levels";
import { advancePond, blankPondInput, createPond, goalMet, tickPond, type PondState } from "../src/fish/sim";

const STEP = 1000 / 60;

function catchSpecies(state: PondState, species: PondState["fish"][number]["species"]): PondState {
  const fish = state.fish.find((entry) => entry.species === species);
  if (!fish) throw new Error(`missing ${species}`);
  const aimed = { ...state, hookX: fish.x, hookY: fish.y };
  return tickPond(aimed, { ...blankPondInput(), catch: true }, STEP);
}

describe("pond fishing", () => {
  it("asks for specific fish on each of 5 levels", () => {
    expect(FISH_LEVELS).toHaveLength(5);
    expect(FISH_LEVELS.map((level) => level.goals.map((goal) => `${goal.need} ${goal.species}`))).toEqual([
      ["3 bluegill"],
      ["2 sunfish", "1 perch"],
      ["2 bass"],
      ["1 catfish", "2 perch"],
      ["1 bluegill", "1 sunfish", "1 bass", "1 trout", "1 catfish"],
    ]);
    for (const level of FISH_LEVELS) {
      expect(level.goals.length).toBeGreaterThan(0);
      for (const goal of level.goals) expect(SPECIES).toContain(goal.species);
      for (const goal of level.goals) {
        const available = level.fish.filter((fish) => fish.species === goal.species).length;
        expect(available).toBeGreaterThanOrEqual(goal.need);
      }
    }
  });

  it("counts a goal fish and lets the others go", () => {
    const before = createPond(0);
    const caught = catchSpecies(before, "bluegill");
    expect(before.caught.bluegill).toBe(0);
    expect(caught.caught.bluegill).toBe(1);
    expect(caught.phase).toBe("playing");
    const missed = catchSpecies(caught, "minnow");
    expect(missed.caught.minnow).toBe(0);
    expect(missed.caught.bluegill).toBe(1);
    expect(missed.toast).toContain("minnow");
    expect(goalMet(missed)).toBe(false);
  });

  it("finishes the level only when every asked-for fish is caught", () => {
    let state = createPond(0);
    state = catchSpecies(state, "bluegill");
    state = catchSpecies(state, "bluegill");
    expect(state.phase).toBe("playing");
    state = catchSpecies(state, "bluegill");
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the level!");
    state = advancePond(state);
    expect(state.levelIndex).toBe(1);
    expect(state.phase).toBe("playing");
    expect(state.caught.sunfish).toBe(0);
  });

  it("ends the outing after the fifth level", () => {
    let state = createPond(4);
    state.phase = "clear";
    state = advancePond(state);
    expect(state.phase).toBe("done");
    state = advancePond(state);
    expect(state.levelIndex).toBe(0);
    expect(state.phase).toBe("playing");
  });
});
