import { describe, expect, it } from "vitest";
import { ICE_LEVELS } from "../src/waddle/mazes";
import { advanceWaddle, blankWaddleInput, createWaddle, tickWaddle } from "../src/waddle/sim";

const STEP = 1000 / 60;

function reach(rows: string[], sx: number, sy: number): Set<string> {
  const seen = new Set<string>();
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop() as number[];
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (y < 0 || x < 0 || y >= rows.length || x >= rows[y].length) continue;
    if (rows[y][x] === "#") continue;
    seen.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

describe("ice waddle", () => {
  it("has 5 mazes a penguin can clear, with more seals later", () => {
    expect(ICE_LEVELS.map((level) => level.name)).toEqual(["Snow Start", "Ice Lanes", "Fish Fort", "Seal Slide", "Night Ice"]);
    expect(ICE_LEVELS.map((level) => level.sealStep)).toEqual([230, 200, 180, 165, 155]);
    expect(ICE_LEVELS[4].night).toBe(true);
    const seals = ICE_LEVELS.map((level) => createWaddle(ICE_LEVELS.indexOf(level)).seals.length);
    expect(seals).toEqual([2, 2, 3, 4, 4]);
    for (const level of ICE_LEVELS) {
      const start = level.rows.flatMap((row, y) => [...row].map((ch, x) => ({ ch, x, y }))).find((cell) => cell.ch === "P");
      expect(start).toBeTruthy();
      const open = reach(level.rows, start!.x, start!.y);
      for (let y = 0; y < level.rows.length; y += 1) {
        for (let x = 0; x < level.rows[y].length; x += 1) {
          const ch = level.rows[y][x];
          if (ch !== "#" && ch !== " ") expect(open.has(`${x},${y}`)).toBe(true);
        }
      }
      expect(level.rows.join("").includes("o")).toBe(true);
    }
  });

  it("waddles into open ice, eats a fish, and stops at a wall", () => {
    const before = createWaddle(0);
    let state = before;
    for (let i = 0; i < 4; i += 1) state = tickWaddle(state, { ...blankWaddleInput(), dx: 1 }, 50);
    expect(before.penguin.tx).toBe(state.penguin.tx - 1);
    expect(before.score).toBe(0);
    expect(state.score).toBe(10);
    expect(state.pelletsLeft).toBe(before.pelletsLeft - 1);
    const blocked = tickWaddle(createWaddle(0), { ...blankWaddleInput(), dx: -1 }, 50);
    for (let i = 0; i < 4; i += 1) {
      /* keep trying the wall */
    }
    let stuck = createWaddle(0);
    for (let i = 0; i < 4; i += 1) stuck = tickWaddle(stuck, { ...blankWaddleInput(), dx: -1 }, 50);
    expect(stuck.penguin.tx).toBe(blocked.penguin.tx);
    expect(stuck.penguin.tx).toBe(createWaddle(0).penguin.tx);
    const clamped = tickWaddle(before, blankWaddleInput(), 1000);
    expect(before.elapsedMs).toBe(0);
    expect(clamped.elapsedMs).toBe(50);
  });

  it("makes the seals sleepy with a big fish, then sends one home", () => {
    const level = ICE_LEVELS[0];
    let big = { x: 0, y: 0 };
    level.rows.forEach((row, y) => {
      const x = row.indexOf("o");
      if (x >= 0 && big.y === 0) big = { x, y };
    });
    let state = createWaddle(0);
    state.penguin.tx = big.x;
    state.penguin.ty = big.y;
    state.penguin.prevX = big.x;
    state.penguin.prevY = big.y;
    state = tickWaddle(state, blankWaddleInput(), STEP);
    expect(state.seals.every((seal) => seal.scaredMs > 0)).toBe(true);
    expect(state.score).toBe(50);
    state.penguin.tx = state.seals[0].tx;
    state.penguin.ty = state.seals[0].ty;
    const tagged = tickWaddle(state, blankWaddleInput(), STEP);
    expect(state.lives).toBe(3);
    expect(tagged.lives).toBe(3);
    expect(tagged.score).toBe(250);
    expect(tagged.seals[0].homeMs).toBeGreaterThan(0);
    expect(tagged.seals[0].tx).toBe(tagged.seals[0].homeX);
  });

  it("loses a life to a seal, and the maze ends when every fish is gone", () => {
    const before = createWaddle(0);
    before.seals[0].tx = before.penguin.tx;
    before.seals[0].ty = before.penguin.ty;
    let state = tickWaddle(before, blankWaddleInput(), STEP);
    expect(before.lives).toBe(3);
    expect(state.lives).toBe(2);
    expect(state.phase).toBe("playing");
    expect(state.toast).toBe("Try again.");
    expect(state.pelletsLeft).toBe(before.pelletsLeft);
    state.seals[0].tx = state.penguin.tx;
    state.seals[0].ty = state.penguin.ty;
    state = tickWaddle(state, blankWaddleInput(), STEP);
    state.seals[0].tx = state.penguin.tx;
    state.seals[0].ty = state.penguin.ty;
    state = tickWaddle(state, blankWaddleInput(), STEP);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe("retry");
    state.score = 30;
    state = advanceWaddle(state);
    expect(state.levelIndex).toBe(0);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(30);

    let clear = createWaddle(0);
    clear.pelletsLeft = 0;
    clear.score = 80;
    clear = tickWaddle(clear, blankWaddleInput(), STEP);
    expect(clear.phase).toBe("clear");
    expect(clear.toast).toBe("You finished the level!");
    expect(clear.score).toBe(580);
    clear = advanceWaddle(clear);
    expect(clear.levelIndex).toBe(1);
    expect(clear.score).toBe(580);

    let finale = createWaddle(4);
    finale.phase = "clear";
    finale = advanceWaddle(finale);
    expect(finale.phase).toBe("done");
    expect(finale.toast).toBe("You finished all 5 levels.");
    finale = advanceWaddle(finale);
    expect(finale.levelIndex).toBe(0);
    expect(finale.score).toBe(0);
  });
});
