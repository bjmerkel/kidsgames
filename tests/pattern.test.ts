import { describe, expect, it } from "vitest";
import { CHOICE_BOXES, expectedNext, PAUSE_BOX, PATTERN_LEVELS, pauseAt, choiceAt, sameBead } from "../src/pattern/levels";
import { advancePattern, blankPatternInput, createPattern, tickPattern, type PatternState } from "../src/pattern/sim";

function wait(state: PatternState, ms: number): PatternState {
  let next = state;
  let left = ms;
  while (left > 0) {
    const step = Math.min(16, left);
    next = tickPattern(next, blankPatternInput(), step);
    left -= step;
  }
  return next;
}

describe("pattern pals", () => {
  it("has five short rows and one right picture in each", () => {
    expect(PATTERN_LEVELS.map((level) => level.name)).toEqual([
      "Color Twins",
      "Shape Twins",
      "Three Friends",
      "Double Dots",
      "Big and Small",
    ]);
    for (const level of PATTERN_LEVELS) {
      expect(level.blurb.length).toBeGreaterThan(0);
      expect(level.blurb.length).toBeLessThan(32);
      expect(level.rounds).toHaveLength(4);
      for (const round of level.rounds) {
        expect(round.beads.length).toBeGreaterThanOrEqual(4);
        expect(round.choices).toHaveLength(3);
        const answer = expectedNext(round);
        expect(sameBead(round.choices[round.answer], answer)).toBe(true);
        expect(round.choices.filter((choice) => sameBead(choice, answer))).toHaveLength(1);
        const keys = new Set(round.choices.map((choice) => `${choice.shape}-${choice.color}-${choice.big}`));
        expect(keys.size).toBe(3);
      }
    }
  });

  it("keeps a miss on the same picture and scores a clean pick higher", () => {
    const start = createPattern(0);
    const wrong = tickPattern(start, { choice: (start && PATTERN_LEVELS[0].rounds[0].answer + 1) % 3, pause: false, confirm: false }, 16);
    expect(wrong.roundIndex).toBe(0);
    expect(wrong.score).toBe(0);
    expect(wrong.toast).toBe("Look again.");
    expect(wrong.misses).toBe(1);

    const ready = wait(wrong, 300);
    const fixed = tickPattern(ready, { choice: PATTERN_LEVELS[0].rounds[0].answer, pause: false, confirm: false }, 16);
    expect(fixed.roundIndex).toBe(0);
    expect(fixed.score).toBe(50);
    expect(fixed.toast).toBe("Yes!");
    expect(wait(fixed, 500).roundIndex).toBe(1);

    const fresh = tickPattern(start, { choice: PATTERN_LEVELS[0].rounds[0].answer, pause: false, confirm: false }, 16);
    expect(fresh.score).toBe(100);
    expect(start.roundIndex).toBe(0);
  });

  it("finishes a row, then all five rows, then starts over", () => {
    let state = createPattern(0);
    for (let round = 0; round < 4; round += 1) {
      const answer = PATTERN_LEVELS[0].rounds[round].answer;
      state = wait(state, 500);
      state = tickPattern(state, { choice: answer, pause: false, confirm: false }, 16);
    }
    expect(state.phase).toBe("clear");
    expect(state.toast).toBe("You finished the row!");
    expect(state.score).toBe(400);

    const next = advancePattern(state);
    expect(next.levelIndex).toBe(1);
    expect(next.score).toBe(400);
    expect(next.phase).toBe("playing");

    let last = createPattern(4, 1000);
    for (let round = 0; round < 4; round += 1) {
      last = wait(last, 500);
      last = tickPattern(last, { choice: PATTERN_LEVELS[4].rounds[round].answer, pause: false, confirm: false }, 16);
    }
    const done = advancePattern(last);
    expect(done.phase).toBe("done");
    expect(done.toast).toBe("You finished all 5 rows.");
    const again = advancePattern(done);
    expect(again.levelIndex).toBe(0);
    expect(again.score).toBe(0);
  });

  it("pauses and finds the three big pictures", () => {
    const paused = tickPattern(createPattern(0), { choice: null, pause: true, confirm: false }, 16);
    expect(paused.phase).toBe("paused");
    expect(tickPattern(paused, { choice: 0, pause: false, confirm: false }, 16).roundIndex).toBe(0);
    const playing = tickPattern(paused, { choice: null, pause: true, confirm: false }, 16);
    expect(playing.phase).toBe("playing");

    CHOICE_BOXES.forEach((box, index) => {
      expect(choiceAt(box.x + box.w / 2, box.y + box.h / 2)).toBe(index);
    });
    expect(choiceAt(240, 120)).toBeNull();
    expect(pauseAt(PAUSE_BOX.x + 10, PAUSE_BOX.y + 10)).toBe(true);
    expect(choiceAt(PAUSE_BOX.x + 10, PAUSE_BOX.y + 10)).toBeNull();
  });
});
