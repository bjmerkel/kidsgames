import { describe, expect, it } from "vitest";
import { AXO_LEVELS, BUG_LOOK } from "../src/axolotl/levels";
import { advanceAxo, blankAxoInput, createAxo, tickAxo, type AxoState } from "../src/axolotl/sim";

const STEP = 1000 / 60;

function withBubbleOn(state: AxoState, bugIndex: number): AxoState {
  const bug = state.bugs[bugIndex];
  bug.mode = "form";
  bug.x = bug.slotX;
  bug.y = bug.slotY;
  return {
    ...state,
    bubbles: [{ x: bug.x, y: bug.y, vy: 0 }],
  };
}

describe("axolotl patrol", () => {
  it("has 5 levels that add more diving bugs, then a king", () => {
    expect(AXO_LEVELS.map((level) => level.name)).toEqual([
      "Skimmer School",
      "Beetle Rows",
      "Dragonfly Dive",
      "Mixed Swarm",
      "King Beetle",
    ]);
    const counts = AXO_LEVELS.map((level) => createAxo(AXO_LEVELS.indexOf(level)).bugs.length);
    expect(counts).toEqual([8, 12, 15, 20, 13]);
    expect(AXO_LEVELS[4].king).toBe(true);
    expect(BUG_LOOK.king.hp).toBe(6);
    expect(createAxo(4).bugs.find((bug) => bug.kind === "king")?.hp).toBe(6);
    for (let i = 1; i < 4; i += 1) expect(AXO_LEVELS[i].diveEvery).toBeLessThan(AXO_LEVELS[i - 1].diveEvery);
  });

  it("pops a bug with a bubble and does not change the earlier state", () => {
    const before = createAxo(0);
    const aimed = withBubbleOn(before, 0);
    const popped = tickAxo(aimed, blankAxoInput(), STEP);
    expect(before.score).toBe(0);
    expect(before.bugs[0].hp).toBe(1);
    expect(before.bubbles).toHaveLength(0);
    expect(popped.score).toBe(100);
    expect(popped.bugs[0].hp).toBe(0);
    expect(popped.bugs[0].mode).toBe("gone");
    expect(popped.phase).toBe("playing");
    const stepped = tickAxo(before, blankAxoInput(), 1000);
    expect(before.elapsedMs).toBe(0);
    expect(stepped.elapsedMs).toBe(50);
  });

  it("keeps only two bubbles in the air", () => {
    let state = createAxo(0);
    const fire = { ...blankAxoInput(), fire: true };
    state = tickAxo(state, fire, STEP);
    expect(state.bubbles).toHaveLength(1);
    for (let i = 0; i < 4; i += 1) state = tickAxo(state, fire, 50);
    expect(state.bubbles).toHaveLength(2);
    state = tickAxo(state, fire, STEP);
    expect(state.bubbles).toHaveLength(2);
  });

  it("sends a bug diving and lets dragonflies drop water", () => {
    let state = createAxo(0);
    const steps = Math.ceil((state.nextDiveMs + 40) / 50);
    for (let i = 0; i < steps; i += 1) state = tickAxo(state, blankAxoInput(), 50);
    expect(state.bugs.some((bug) => bug.mode === "dive")).toBe(true);
    expect(state.pellets).toHaveLength(0);

    const dragon = createAxo(2);
    dragon.bugs[0].mode = "dive";
    dragon.bugs[0].diveMs = 690;
    dragon.bugs[0].fired = 0;
    const dropped = tickAxo(dragon, blankAxoInput(), STEP);
    expect(dropped.pellets.length).toBeGreaterThan(0);
    expect(dragon.pellets).toHaveLength(0);
  });

  it("costs a life when a drop hits, and the level ends when every bug is popped", () => {
    const before = createAxo(0);
    before.pellets.push({ x: before.playerX, y: before.playerY, vy: 0 });
    let state = tickAxo(before, blankAxoInput(), STEP);
    expect(before.lives).toBe(3);
    expect(state.lives).toBe(2);
    expect(state.phase).toBe("playing");
    expect(state.toast).toBe("Try again.");
    state.invulnMs = 0;
    state.pellets.push({ x: state.playerX, y: state.playerY, vy: 0 });
    state = tickAxo(state, blankAxoInput(), STEP);
    state.invulnMs = 0;
    state.pellets.push({ x: state.playerX, y: state.playerY, vy: 0 });
    state = tickAxo(state, blankAxoInput(), STEP);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe("retry");
    expect(state.toast).toBe("Try again.");
    state.score = 250;
    state = advanceAxo(state);
    expect(state.levelIndex).toBe(0);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(250);
    expect(state.phase).toBe("playing");

    let cleared = createAxo(0);
    cleared.score = 400;
    for (const bug of cleared.bugs) {
      bug.hp = 0;
      bug.mode = "gone";
    }
    cleared = tickAxo(cleared, blankAxoInput(), STEP);
    expect(cleared.phase).toBe("clear");
    expect(cleared.toast).toBe("You finished the level!");
    cleared = advanceAxo(cleared);
    expect(cleared.levelIndex).toBe(1);
    expect(cleared.score).toBe(400);
    expect(cleared.lives).toBe(3);

    let finale = createAxo(4);
    finale.phase = "clear";
    finale = advanceAxo(finale);
    expect(finale.phase).toBe("done");
    expect(finale.toast).toBe("You finished all 5 levels.");
    finale = advanceAxo(finale);
    expect(finale.levelIndex).toBe(0);
    expect(finale.score).toBe(0);
  });

  it("needs six bubbles to pop the king beetle", () => {
    let state = createAxo(4);
    const kingIndex = state.bugs.findIndex((bug) => bug.kind === "king");
    for (let hit = 0; hit < 5; hit += 1) {
      state = tickAxo(withBubbleOn(state, kingIndex), blankAxoInput(), STEP);
      expect(state.bugs[kingIndex].hp).toBe(5 - hit);
      expect(state.phase).toBe("playing");
    }
    state = tickAxo(withBubbleOn(state, kingIndex), blankAxoInput(), STEP);
    expect(state.bugs[kingIndex].hp).toBe(0);
    expect(state.bugs[kingIndex].mode).toBe("gone");
    expect(state.score).toBe(1000);
    expect(state.phase).toBe("playing");
  });
});
