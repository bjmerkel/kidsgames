# Hermit Crab Crossing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a five-level Frogger-style browser game where a hermit crab crosses Hot Wheels lanes, stepping stones, swings, and a climbing wall, then enters a tunnel that combines all four, and is congratulated for finishing the level.

**Architecture:** The rules live in a DOM-free TypeScript simulation (`tick(state, input, dt) -> state`) that Vitest runs in Node. Vite draws that state on one canvas and reads the keyboard and the on-screen pad. Levels are data: a curb, a road, a pond, swings, a wall, then a tunnel whose chambers run Hot Wheels, stones, swings, holds, and one combined chamber. A spine of supports sits on the crab's 48px hop lattice so a hop cannot fall through a gap; difficulty comes from traffic, swing timing, drift, sinking, and blinking.

**Tech Stack:** TypeScript 5.6, Vite 6, Vitest 2, one HTML page, no image files and no game engine. `@types/node` is only there so the page-copy test can read `index.html`.

The sources in this plan were executed together: `npx vitest run` reported 30 passed, and `npx tsc --noEmit` was clean. Copy them as written.

## Global Constraints

- The exact phrase `Emery is awesome` appears on the title, every level intro, the HUD, the pause banner, the tunnel sign, the try-again toast, the time-up toast, the retry banner, the level-clear banner, the campaign banner, and the HTML header.
- Level-clear title text is exactly `You finished the level!`
- Campaign body text includes exactly `You finished all 5 levels.`
- There are exactly 5 levels, in order: Emery's Driveway, Emery's Backyard, Emery's Playground, Emery's Obstacle Course, Emery's Tunnel.
- Every level's top segment is a tunnel. From the entrance toward the burrow the chambers are `hotwheels`, `stone`, `swing`, `hold`, `combined`.
- The combined chamber contains at least one car, one stepping stone, one swing, and one hold.
- The yard is 480px wide. Hops are 48px and take 140ms. The crab's open hurt radius is 14 and the tucked radius is 7.
- Spine stones and holds use radius 36. Reach is 50, which covers a 48px hop and the edge of a zone. Do not shrink them to make a level harder.
- The simulation does not touch the DOM. `tick` returns a new state and does not mutate the state it was given.
- Fixed step is `1000 / 60` ms, at most 5 steps per frame. `tick` clamps a single step to 50ms.
- Copy stays kid-safe: the failure line is `Try again. Emery is awesome.` Time running out uses `Time's up. Try again. Emery is awesome.`
- Lives are 4 and refill when a level starts. Score carries across levels and resets on a new game. Forward hop +25, safe checkpoint +100, burrow +500.
- Time limits are 90000, 80000, 70000, 60000, and 85000 ms.
- No accounts, leaderboards, audio, external art, or level editor.

## How the yard works

The crab starts on the curb at the bottom and hops north toward y = 0. Up is north. A diagonal press hops north or south and ignores the sideways part. A hop that would leave the yard is ignored.

```
burrow         lit hole. The crab's center entering it clears the level
combined       cars, stones, swings, and holds in one chamber
hold           climbing wall
swing          a seat on ropes
stone          water, with stepping stones
hotwheels      toy cars
mouth          safe tunnel entrance and the tunnel checkpoint
climbing wall  holds above a safe ledge
swings         a seat can knock the crab back to the checkpoint
pond           water everywhere a stone does not cover
road           Hot Wheels
curb           start
```

Rules, evaluated after hazards move and the crab moves:

- Road and Hot Wheels chambers: a car whose box touches the crab costs a life. Tucking shrinks the hurt circle, so a light clip can miss.
- Pond and stone chambers: the crab must overlap a stone that has not sunk. Standing on a stone adds that stone's motion to the crab. `sinkAfterMs` submerges the stone; after 800ms unoccupied it rises again.
- Swing bands and swing chambers: the seat is `pivot + (sin(angle) * length, cos(angle) * length)` with `angle = amplitude * sin(omega * seconds + phase)`. Touching the seat costs a life.
- Wall and hold chambers: the bottom `ledgeH` is safe ground. Above it the crab must overlap a visible hold. Holds can blink; the second half of `blinkPeriodMs` is hidden.
- Combined chamber: cars and swings can both hit. Above its ledge the crab needs a stone or a hold. A stone is preferred when both overlap, and the crab rides it.
- Mouth and curb are safe. The burrow clears the level. Goal is checked before hits, so the finish line itself cannot kill.
- A hit or a timeout returns the crab to the last checkpoint whose bottom center was safe, spends a life, and shows the try-again line. At 0 lives the retry banner says `Try the level again` and `Emery is awesome.` Confirming retries that level.
- Checkpoints move only upward, and only to a segment bottom that is safe at that moment. Pond bottoms are skipped because they are water. The tunnel is one segment, so its checkpoint is the mouth. Chambers are not checkpoints.
- Reaching the burrow on levels 1–4 opens the level-clear banner. Confirming loads the next level's intro and refills lives. Reaching it on level 5 opens the campaign banner with both congratulations. Confirming starts a new game.
- Level 1 cars are placed by `tutorialCarX` so each car reaches the spine 1.6s after a continuous hop would cross that lane. A straight hop up the middle clears level 1 with no lives lost. Level 1 swings stay off to the side, stones do not drift, and holds do not blink.
- Levels 2–5 put a real car on the spine, drift the stone column, blink the holds together, and swing seats across the middle. Every road lane is blocked at some moment in the first 8 seconds and clear at another. Hopping straight up level 2 loses a life to a car.

`pressure` is max car speed, plus max swing omega times 20, plus max stone speed, minus the shortest blink period in tenths of a second (a hold that never blinks counts as 10000ms). It rises on every level. Level 5's tunnel is taller than level 1's.

Painted, orthographic, and fair: the picture matches the hurt circles. Cars are top-down toys with a body, glass, and four wheels. Stones are wet ellipses and become ripples when submerged. Swings have two ropes and a plank. The wall is mortared and the holds are resin blobs with a hole. The crab has a shadowed shell, a spiral stroke, claws, and eyestalks; tuck hides the legs. The camera sits so the crab is about 62% down the view and eases 12% of the gap each frame.

## File map

| File | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.json`, `vite.config.ts` | Vite, Vitest, strict TypeScript |
| `index.html`, `src/styles.css`, `src/main.ts` | Page, pad, fixed-step loop |
| `src/game/constants.ts` | Sizes, timing, score, palette |
| `src/game/types.ts` | State, hazards, phases |
| `src/game/copy.ts` | Every player-facing line |
| `src/game/geometry.ts` | Clamp, circles, circle against a box |
| `src/game/crab.ts` | Hop, tuck, hurt radius |
| `src/game/input.ts` | Keys, buttons, merging one frame |
| `src/game/hazards.ts` | Car wrap, stone sink, hold blink, swing seat |
| `src/game/zones.ts` | Which rule applies at a y, and what hit it causes |
| `src/game/levels.ts` | Builder, spine, five drafts |
| `src/game/camera.ts` | View top from the crab's y |
| `src/game/sim.ts` | `createGame` and `tick` |
| `src/render/draw.ts` | Canvas drawing |
| `tests/*.test.ts`, `tests/helpers.ts` | Rules, levels, a full level-1 clear |

---

### Task 1: Scaffold the page and the Emery lines

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/game/constants.ts`
- Create: `src/game/types.ts`
- Create: `src/game/copy.ts`
- Test: `tests/copy.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `COPY`, `screenText(phase, level)`, `continueLabel(phase)`, and the constants and types the later tasks import by the names in those files

- [ ] **Step 1: Write the failing test**

Create `tests/copy.test.ts` with the contents in this step's code block.

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COPY, screenText } from "../src/game/copy";
import type { LevelDef, Phase } from "../src/game/types";

const sampleLevel = {
  name: "Emery's Driveway",
  intro: "Hot Wheels, stones, swings, and a wall. Then the tunnel. Emery is awesome.",
} as LevelDef;

describe("Emery is awesome throughout", () => {
  const phases: Phase[] = ["title", "intro", "playing", "paused", "level-clear", "campaign-clear", "retry"];

  it("puts the exact phrase on every screen", () => {
    for (const phase of phases) {
      expect(screenText(phase, sampleLevel)).toContain(COPY.emery);
    }
  });

  it("congratulates a finished level and a finished campaign", () => {
    expect(screenText("level-clear", sampleLevel)).toContain(COPY.finishedLevel);
    expect(screenText("campaign-clear", sampleLevel)).toContain(COPY.finishedLevel);
    expect(screenText("campaign-clear", sampleLevel)).toContain(COPY.finishedAll);
  });

  it("keeps the phrase on the page and in the standing lines", () => {
    expect(sampleLevel.intro).toContain(COPY.emery);
    expect(readFileSync("index.html", "utf8")).toContain(COPY.emery);
    expect(COPY.tunnel).toContain(COPY.emery);
    expect(COPY.tryAgain).toContain(COPY.emery);
    expect(COPY.timeUp).toContain(COPY.emery);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/copy.test.ts`

Expected: FAIL because `../src/game/copy` cannot be resolved.

- [ ] **Step 3: Write the scaffold and the copy**

Create each file below with the exact contents.

`package.json`

```json
{
  "name": "kidsgames",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^22.20.5",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"],
    "skipLibCheck": true,
    "useDefineForClassFields": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

`index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hermit Crab Crossing</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <header>
      <p class="emery">Emery is awesome</p>
      <h1>Hermit Crab Crossing</h1>
    </header>
    <canvas id="game" width="480" height="720" aria-label="Hermit Crab Crossing. Emery is awesome."></canvas>
    <div id="pad">
      <button type="button" data-input="n">Up</button>
      <button type="button" data-input="w">Left</button>
      <button type="button" data-input="e">Right</button>
      <button type="button" data-input="s">Down</button>
      <button type="button" data-input="tuck">Tuck</button>
      <button type="button" data-input="pause">Pause</button>
      <button type="button" data-input="confirm" id="continue">Play</button>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/styles.css`

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #d7ecf3;
  color: #1c1915;
  font-family: "Trebuchet MS", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

header {
  text-align: center;
}

h1 {
  margin: 0;
  font-family: Georgia, serif;
  font-size: 32px;
}

.emery {
  margin: 0 0 4px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

canvas {
  width: min(480px, 100%);
  height: auto;
  background: #9ec9e0;
  touch-action: none;
}

#pad {
  width: min(480px, 100%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

button {
  min-height: 64px;
  border: 2px solid #1c1915;
  background: #f7f1e6;
  color: #1c1915;
  font: 700 16px/1 "Trebuchet MS", sans-serif;
}

#continue {
  grid-column: 1 / -1;
}

button:active {
  background: #f2c14e;
}
```

`src/game/constants.ts`

```ts
export const WORLD_W = 480;
export const VIEW_W = 480;
export const VIEW_H = 720;
export const HOP = 48;
export const HOP_MS = 140;
export const CRAB_R = 14;
export const CRAB_R_TUCKED = 7;
export const TUCK_MS = 600;
export const TUCK_COOLDOWN_MS = 2400;
export const LIVES = 4;
export const START_INSET = 40;
export const CHECKPOINT_INSET = 10;
export const TUTORIAL_DELAY_SEC = 1.6;
export const FORWARD_SCORE = 25;
export const SEGMENT_SCORE = 100;
export const LEVEL_SCORE = 500;
export const INTRO_MS = 1600;
export const TOAST_MS = 1400;
export const HIT_FLASH_MS = 180;
export const SINK_RECOVER_MS = 800;
export const MAX_FRAME_MS = 50;
export const STEP_MS = 1000 / 60;

export const COLOR = {
  sky: "#9ec9e0",
  grass: "#6ea15a",
  grassDark: "#4f7d40",
  road: "#3e4248",
  roadLine: "#d8d2c4",
  water: "#3d7ea6",
  waterDeep: "#24556f",
  crabShell: "#c4622d",
  crabShellDark: "#8a3e16",
  crabBody: "#f0c9a0",
  crabClaw: "#e07a3d",
  eye: "#1c1915",
  carRed: "#c81d25",
  carYellow: "#f2c14e",
  carBlue: "#1f6feb",
  carGreen: "#2e7d32",
  carPurple: "#7b3fa1",
  carGlass: "#d7eef8",
  tire: "#1a1a1a",
  hub: "#c7c1b6",
  stone: "#8d8f93",
  stoneDark: "#5e6468",
  stoneRim: "#d5d8dc",
  rope: "#6b4f2a",
  seat: "#8b5a2b",
  wall: "#c4b29a",
  wallMortar: "#8c7b68",
  hold: "#d35400",
  holdHole: "#6e2c0a",
  tunnel: "#24262b",
  burrow: "#f6e2b3",
  sign: "#f4f1ea",
  ink: "#1c1915",
  cream: "#f7f1e6",
  shadow: "rgba(28, 25, 21, 0.28)",
};
```

`src/game/types.ts`

```ts
export type Dir = "n" | "s" | "e" | "w";

export type Phase =
  | "title"
  | "intro"
  | "playing"
  | "paused"
  | "level-clear"
  | "campaign-clear"
  | "retry";

export type SegmentKind = "curb" | "road" | "pond" | "swings" | "wall" | "tunnel";

export type ChamberKind = "hotwheels" | "stone" | "swing" | "hold" | "combined";

export type HazardHit = "car" | "water" | "swing" | "fall";

export type FailReason = HazardHit | "time";

export interface Car {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  color: string;
}

export interface Stone {
  id: string;
  x: number;
  y: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  sinkAfterMs: number | null;
  occupiedMs: number;
  emptyMs: number;
  submerged: boolean;
}

export interface Swing {
  id: string;
  pivotX: number;
  pivotY: number;
  length: number;
  amplitude: number;
  omega: number;
  phase: number;
  seatR: number;
}

export interface Hold {
  id: string;
  x: number;
  y: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  blinkPeriodMs: number | null;
  blinkPhaseMs: number;
  visible: boolean;
}

export interface Chamber {
  id: string;
  kind: ChamberKind;
  y: number;
  h: number;
  ledgeH: number;
  cars: Car[];
  stones: Stone[];
  swings: Swing[];
  holds: Hold[];
}

export interface Segment {
  id: string;
  kind: SegmentKind;
  y: number;
  h: number;
  ledgeH: number;
  mouthH: number;
  burrowH: number;
  cars: Car[];
  stones: Stone[];
  swings: Swing[];
  holds: Hold[];
  chambers: Chamber[];
}

export interface LevelDef {
  id: number;
  name: string;
  intro: string;
  timeLimitMs: number;
  width: number;
  height: number;
  segments: Segment[];
}

export interface Crab {
  x: number;
  y: number;
  facing: Dir;
  mode: "idle" | "hopping" | "tucked";
  hopFromX: number;
  hopFromY: number;
  hopToX: number;
  hopToY: number;
  hopElapsedMs: number;
  tuckElapsedMs: number;
  tuckCooldownMs: number;
  supportId: string | null;
  supportKind: "stone" | "hold" | null;
  rideOffsetX: number;
  rideOffsetY: number;
  lives: number;
  score: number;
}

export interface InputFrame {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  tuck: boolean;
  start: boolean;
  pause: boolean;
  confirm: boolean;
}

export interface GameState {
  phase: Phase;
  levelIndex: number;
  templates: LevelDef[];
  level: LevelDef;
  crab: Crab;
  elapsedMs: number;
  checkpointX: number;
  checkpointY: number;
  checkpointSegmentId: string;
  bannerTitle: string;
  bannerBody: string;
  toast: string;
  toastMs: number;
  introMs: number;
  hitFlashMs: number;
  lastFail: FailReason | null;
}
```

`src/game/copy.ts`

```ts
import type { LevelDef, Phase } from "./types";

export const COPY = {
  emery: "Emery is awesome",
  title: "Hermit Crab Crossing",
  finishedLevel: "You finished the level!",
  finishedAll: "You finished all 5 levels.",
  tryAgain: "Try again. Emery is awesome.",
  timeUp: "Time's up. Try again. Emery is awesome.",
  tryLevel: "Try the level again",
  paused: "Paused",
  tunnel: "Into the tunnel. Emery is awesome.",
  play: "Play",
  next: "Next level",
  again: "Play again",
  continue: "Continue",
  lives: "Lives",
  score: "Score",
  time: "Time",
};

export function screenText(phase: Phase, level: LevelDef): string {
  switch (phase) {
    case "title":
      return `${COPY.title}. ${COPY.emery}. ${COPY.play}.`;
    case "intro":
      return `${level.name}. ${level.intro}`;
    case "playing":
      return `${COPY.emery}. ${level.name}. ${COPY.lives}. ${COPY.score}. ${COPY.time}. ${COPY.tunnel}`;
    case "paused":
      return `${COPY.paused}. ${COPY.emery}.`;
    case "level-clear":
      return `${COPY.finishedLevel} ${COPY.emery}.`;
    case "campaign-clear":
      return `${COPY.finishedLevel} ${COPY.finishedAll} ${COPY.emery}.`;
    case "retry":
      return `${COPY.tryLevel}. ${COPY.emery}.`;
  }
}

export function continueLabel(phase: Phase): string {
  if (phase === "title") return COPY.play;
  if (phase === "level-clear") return COPY.next;
  if (phase === "campaign-clear" || phase === "retry") return COPY.again;
  return COPY.continue;
}
```

- [ ] **Step 4: Install and verify the test passes**

Run: `npm install`

Then: `npx vitest run tests/copy.test.ts`

Expected: 3 passed. Commit the generated `package-lock.json` with these files.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/styles.css src/game/constants.ts src/game/types.ts src/game/copy.ts tests/copy.test.ts
git commit -m "feat: scaffold Hermit Crab Crossing and the Emery lines"
```

---

### Task 2: Crab hops, shell tuck, and input

**Files:**
- Create: `src/game/geometry.ts`
- Create: `src/game/crab.ts`
- Create: `src/game/input.ts`
- Test: `tests/geometry.test.ts`
- Test: `tests/crab.test.ts`
- Test: `tests/input.test.ts`

**Interfaces:**
- Consumes: `CRAB_R`, `CRAB_R_TUCKED`, `FORWARD_SCORE`, `HOP`, `HOP_MS`, `TUCK_MS`, `TUCK_COOLDOWN_MS`, `Crab`, `Dir`, `LevelDef`, `InputFrame`, `Phase`
- Produces: `clamp`, `circlesOverlap`, `circleHitsAabb`, `crabRadius(crab)`, `beginHop(crab, dx, dy, level) -> boolean`, `advanceHop(crab, dtMs)`, `advanceTuck(crab, dtMs, tuckPressed)`, `blankInput()`, `keyDown(code, phase)`, `buttonToInput(name)`, `mergeInput(current, next)`

- [ ] **Step 1: Write the failing tests**

`tests/geometry.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { circleHitsAabb, circlesOverlap } from "../src/game/geometry";

describe("geometry", () => {
  it("overlaps circles that touch", () => {
    expect(circlesOverlap(0, 0, 10, 20, 0, 10)).toBe(true);
    expect(circlesOverlap(0, 0, 10, 21, 0, 10)).toBe(false);
  });

  it("hits an aabb when the circle reaches the box", () => {
    expect(circleHitsAabb(0, 0, 10, 15, 0, 10, 10)).toBe(true);
    expect(circleHitsAabb(0, 0, 4, 15, 0, 10, 10)).toBe(false);
  });
});
```

`tests/crab.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { advanceHop, advanceTuck, beginHop } from "../src/game/crab";
import type { Crab, LevelDef } from "../src/game/types";

const level: LevelDef = {
  id: 1,
  name: "Pad",
  intro: "Emery is awesome.",
  timeLimitMs: 1000,
  width: 480,
  height: 400,
  segments: [],
};

describe("crab", () => {
  it("hops north, ignores a diagonal's sideways part, and stays inside the yard", () => {
    const crab = makeCrab(240, 200);
    expect(beginHop(crab, 1, -1, level)).toBe(true);
    expect(crab.hopToX).toBe(240);
    expect(crab.hopToY).toBe(152);
    advanceHop(crab, 140);
    expect(crab.mode).toBe("idle");
    expect(crab.y).toBe(152);
    expect(crab.score).toBe(25);
    const edge = makeCrab(240, 380);
    expect(beginHop(edge, 0, 1, level)).toBe(false);
  });

  it("refuses to hop while tucked", () => {
    const crab = makeCrab(240, 200);
    advanceTuck(crab, 16, true);
    expect(crab.mode).toBe("tucked");
    expect(beginHop(crab, 0, -1, level)).toBe(false);
  });
});

function makeCrab(x: number, y: number): Crab {
  return {
    x,
    y,
    facing: "n",
    mode: "idle",
    hopFromX: x,
    hopFromY: y,
    hopToX: x,
    hopToY: y,
    hopElapsedMs: 0,
    tuckElapsedMs: 0,
    tuckCooldownMs: 0,
    supportId: null,
    supportKind: null,
    rideOffsetX: 0,
    rideOffsetY: 0,
    lives: 4,
    score: 0,
  };
}
```

`tests/input.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buttonToInput, keyDown, mergeInput, blankInput } from "../src/game/input";

describe("input", () => {
  it("maps arrows, WASD, tuck, pause, and confirm", () => {
    expect(keyDown("ArrowUp", "playing").dy).toBe(-1);
    expect(keyDown("KeyW", "playing").dy).toBe(-1);
    expect(keyDown("KeyA", "playing").dx).toBe(-1);
    expect(keyDown("KeyD", "playing").dx).toBe(1);
    expect(keyDown("ArrowDown", "playing").dy).toBe(1);
    expect(keyDown("Space", "playing").tuck).toBe(true);
    expect(keyDown("Space", "title").confirm).toBe(true);
    expect(keyDown("Enter", "intro").start).toBe(true);
    expect(keyDown("Escape", "playing").pause).toBe(true);
  });

  it("maps the on-screen pad", () => {
    expect(buttonToInput("n").dy).toBe(-1);
    expect(buttonToInput("tuck").tuck).toBe(true);
    expect(buttonToInput("confirm").start).toBe(true);
    expect(buttonToInput("nope")).toEqual(blankInput());
  });

  it("merges a hop and a tuck from the same frame", () => {
    const merged = mergeInput(buttonToInput("n"), buttonToInput("tuck"));
    expect(merged.dy).toBe(-1);
    expect(merged.tuck).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/geometry.test.ts tests/crab.test.ts tests/input.test.ts`

Expected: FAIL because the modules cannot be resolved.

- [ ] **Step 3: Write the implementations**

`src/game/geometry.ts`

```ts
export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy <= reach * reach;
}

export function circleHitsAabb(
  cx: number,
  cy: number,
  cr: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const left = x - w / 2;
  const top = y - h / 2;
  const nx = clamp(cx, left, left + w);
  const ny = clamp(cy, top, top + h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
}
```

`src/game/crab.ts`

```ts
import { CRAB_R, CRAB_R_TUCKED, FORWARD_SCORE, HOP, HOP_MS, TUCK_COOLDOWN_MS, TUCK_MS } from "./constants";
import type { Crab, Dir, LevelDef } from "./types";

export function crabRadius(crab: Crab): number {
  return crab.mode === "tucked" ? CRAB_R_TUCKED : CRAB_R;
}

export function beginHop(crab: Crab, dx: number, dy: number, level: LevelDef): boolean {
  if (crab.mode !== "idle") return false;
  let mx = dx;
  let my = dy;
  if (mx !== 0 && my !== 0) mx = 0;
  if (mx === 0 && my === 0) return false;
  const toX = crab.x + mx * HOP;
  const toY = crab.y + my * HOP;
  if (toX < CRAB_R || toX > level.width - CRAB_R) return false;
  if (toY < CRAB_R || toY > level.height - CRAB_R) return false;
  crab.mode = "hopping";
  crab.facing = facingFrom(mx, my);
  crab.hopFromX = crab.x;
  crab.hopFromY = crab.y;
  crab.hopToX = toX;
  crab.hopToY = toY;
  crab.hopElapsedMs = 0;
  crab.supportId = null;
  crab.supportKind = null;
  return true;
}

export function advanceHop(crab: Crab, dtMs: number): void {
  if (crab.mode !== "hopping") return;
  crab.hopElapsedMs += dtMs;
  const t = Math.min(1, crab.hopElapsedMs / HOP_MS);
  const eased = 1 - (1 - t) * (1 - t);
  crab.x = crab.hopFromX + (crab.hopToX - crab.hopFromX) * eased;
  crab.y = crab.hopFromY + (crab.hopToY - crab.hopFromY) * eased;
  if (t >= 1) {
    crab.x = crab.hopToX;
    crab.y = crab.hopToY;
    crab.mode = "idle";
    if (crab.hopToY < crab.hopFromY) crab.score += FORWARD_SCORE;
  }
}

export function advanceTuck(crab: Crab, dtMs: number, tuckPressed: boolean): void {
  if (crab.tuckCooldownMs > 0) {
    crab.tuckCooldownMs = Math.max(0, crab.tuckCooldownMs - dtMs);
  }
  if (crab.mode === "tucked") {
    crab.tuckElapsedMs += dtMs;
    if (crab.tuckElapsedMs >= TUCK_MS) {
      crab.mode = "idle";
      crab.tuckCooldownMs = TUCK_COOLDOWN_MS;
    }
    return;
  }
  if (tuckPressed && crab.mode === "idle" && crab.tuckCooldownMs === 0) {
    crab.mode = "tucked";
    crab.tuckElapsedMs = 0;
    crab.supportId = null;
    crab.supportKind = null;
  }
}

function facingFrom(dx: number, dy: number): Dir {
  if (dy < 0) return "n";
  if (dy > 0) return "s";
  if (dx < 0) return "w";
  return "e";
}
```

`src/game/input.ts`

```ts
import type { InputFrame, Phase } from "./types";

export function blankInput(): InputFrame {
  return { dx: 0, dy: 0, tuck: false, start: false, pause: false, confirm: false };
}

export function keyDown(code: string, phase: Phase): InputFrame {
  const input = blankInput();
  if (code === "ArrowUp" || code === "KeyW") input.dy = -1;
  if (code === "ArrowDown" || code === "KeyS") input.dy = 1;
  if (code === "ArrowLeft" || code === "KeyA") input.dx = -1;
  if (code === "ArrowRight" || code === "KeyD") input.dx = 1;
  if (code === "Space") {
    if (phase === "playing") input.tuck = true;
    else input.confirm = true;
  }
  if (code === "Enter") {
    input.confirm = true;
    input.start = true;
  }
  if (code === "Escape") input.pause = true;
  return input;
}

export function buttonToInput(name: string): InputFrame {
  const input = blankInput();
  if (name === "n") input.dy = -1;
  if (name === "s") input.dy = 1;
  if (name === "w") input.dx = -1;
  if (name === "e") input.dx = 1;
  if (name === "tuck") input.tuck = true;
  if (name === "pause") input.pause = true;
  if (name === "confirm" || name === "start") {
    input.confirm = true;
    input.start = true;
  }
  return input;
}

export function mergeInput(current: InputFrame, next: InputFrame): InputFrame {
  return {
    dx: next.dx !== 0 ? next.dx : current.dx,
    dy: next.dy !== 0 ? next.dy : current.dy,
    tuck: current.tuck || next.tuck,
    start: current.start || next.start,
    pause: current.pause || next.pause,
    confirm: current.confirm || next.confirm,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/geometry.test.ts tests/crab.test.ts tests/input.test.ts`

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/geometry.ts src/game/crab.ts src/game/input.ts tests/geometry.test.ts tests/crab.test.ts tests/input.test.ts
git commit -m "feat: add hermit crab hops, shell tuck, and input"
```

---

### Task 3: Hot Wheels, stones, swings, holds, and hit rules

**Files:**
- Create: `src/game/hazards.ts`
- Create: `src/game/zones.ts`
- Test: `tests/hazards.test.ts`
- Test: `tests/zones.test.ts`

**Interfaces:**
- Consumes: `crabRadius`, `circlesOverlap`, `circleHitsAabb`, `SINK_RECOVER_MS`, hazard types
- Produces: `seatPosition(swing, timeSec)`, `holdVisible(hold, timeMs)`, `stepCar(car, dtSec, width)`, `stepStone(stone, dtMs, supportId)`, `stepHold(hold, dtSec, timeMs)`, `stepHazards(level, dtMs, timeMs, supportId)`, `segmentAt(level, y)`, `chamberAt(segment, y)`, `zoneAt(level, y)`, `detectHit(level, crab, timeSec)`, `pickSupport(level, crab)`

- [ ] **Step 1: Write the failing tests**

`tests/hazards.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { holdVisible, seatPosition, stepCar, stepStone } from "../src/game/hazards";
import type { Car, Hold, Stone, Swing } from "../src/game/types";

describe("hazards", () => {
  it("hangs a swing straight down at phase zero and wraps a car across the yard", () => {
    const swing: Swing = {
      id: "s",
      pivotX: 240,
      pivotY: 40,
      length: 70,
      amplitude: 1,
      omega: 1,
      phase: 0,
      seatR: 12,
    };
    expect(seatPosition(swing, 0)).toEqual({ x: 240, y: 110 });
    const car: Car = { id: "c", x: 470, y: 20, w: 56, h: 24, speed: 40, color: "#c81d25" };
    stepCar(car, 1, 480);
    expect(car.x).toBeLessThan(0);
  });

  it("sinks a stone that is stood on and brings it back", () => {
    const stone: Stone = {
      id: "stone",
      x: 100,
      y: 40,
      r: 30,
      vx: 0,
      minX: 100,
      maxX: 100,
      sinkAfterMs: 50,
      occupiedMs: 0,
      emptyMs: 0,
      submerged: false,
    };
    stepStone(stone, 50, "stone");
    expect(stone.submerged).toBe(true);
    stepStone(stone, 800, null);
    expect(stone.submerged).toBe(false);
  });

  it("hides a hold for the second half of its blink", () => {
    const hold: Hold = {
      id: "h",
      x: 1,
      y: 1,
      r: 10,
      vx: 0,
      minX: 1,
      maxX: 1,
      blinkPeriodMs: 1000,
      blinkPhaseMs: 0,
      visible: true,
    };
    expect(holdVisible(hold, 100)).toBe(true);
    expect(holdVisible(hold, 700)).toBe(false);
  });
});
```

`tests/zones.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { detectHit } from "../src/game/zones";
import type { Crab, LevelDef } from "../src/game/types";

describe("zones", () => {
  it("distinguishes a car hit, a swing hit, water, and a fall", () => {
    const crab = makeCrab(240, 100);
    expect(detectHit(roadWithCar(270), crab, 0)).toBe("car");
    crab.mode = "tucked";
    expect(detectHit(roadWithCar(270), crab, 0)).toBeNull();
    crab.mode = "idle";
    expect(detectHit(pond(), crab, 0)).toBe("water");
    expect(detectHit(wallAboveLedge(), crab, 0)).toBe("fall");
    expect(detectHit(swingOnCrab(), crab, 0)).toBe("swing");
  });
});

function roadWithCar(x: number): LevelDef {
  return level([
    {
      id: "road",
      kind: "road",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [{ id: "car", x, y: 100, w: 40, h: 24, speed: 0, color: "#c81d25" }],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function pond(): LevelDef {
  return level([
    {
      id: "pond",
      kind: "pond",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function wallAboveLedge(): LevelDef {
  return level([
    {
      id: "wall",
      kind: "wall",
      y: 0,
      h: 200,
      ledgeH: 40,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [],
      holds: [],
      chambers: [],
    },
  ]);
}

function swingOnCrab(): LevelDef {
  return level([
    {
      id: "swings",
      kind: "swings",
      y: 0,
      h: 200,
      ledgeH: 0,
      mouthH: 0,
      burrowH: 0,
      cars: [],
      stones: [],
      swings: [
        {
          id: "swing",
          pivotX: 240,
          pivotY: 30,
          length: 70,
          amplitude: 0,
          omega: 1,
          phase: 0,
          seatR: 12,
        },
      ],
      holds: [],
      chambers: [],
    },
  ]);
}

function level(segments: LevelDef["segments"]): LevelDef {
  return {
    id: 1,
    name: "Fixture",
    intro: "Emery is awesome.",
    timeLimitMs: 1000,
    width: 480,
    height: 200,
    segments,
  };
}

function makeCrab(x: number, y: number): Crab {
  return {
    x,
    y,
    facing: "n",
    mode: "idle",
    hopFromX: x,
    hopFromY: y,
    hopToX: x,
    hopToY: y,
    hopElapsedMs: 0,
    tuckElapsedMs: 0,
    tuckCooldownMs: 0,
    supportId: null,
    supportKind: null,
    rideOffsetX: 0,
    rideOffsetY: 0,
    lives: 4,
    score: 0,
  };
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/hazards.test.ts tests/zones.test.ts`

Expected: FAIL because the modules cannot be resolved.

- [ ] **Step 3: Write the implementations**

`src/game/hazards.ts`

```ts
import { SINK_RECOVER_MS } from "./constants";
import type { Car, Hold, LevelDef, Stone, Swing } from "./types";

export function seatPosition(swing: Swing, timeSec: number): { x: number; y: number } {
  const angle = swing.amplitude * Math.sin(swing.omega * timeSec + swing.phase);
  return {
    x: swing.pivotX + Math.sin(angle) * swing.length,
    y: swing.pivotY + Math.cos(angle) * swing.length,
  };
}

export function holdVisible(hold: Hold, timeMs: number): boolean {
  if (hold.blinkPeriodMs === null) return true;
  const t = (timeMs + hold.blinkPhaseMs) % hold.blinkPeriodMs;
  return t < hold.blinkPeriodMs / 2;
}

export function stepCar(car: Car, dtSec: number, width: number): void {
  car.x += car.speed * dtSec;
  const half = car.w / 2;
  const span = width + car.w;
  if (car.speed > 0) {
    while (car.x - half > width) car.x -= span;
  } else if (car.speed < 0) {
    while (car.x + half < 0) car.x += span;
  }
}

export function stepStone(stone: Stone, dtMs: number, supportId: string | null): void {
  const dtSec = dtMs / 1000;
  stone.x += stone.vx * dtSec;
  if (stone.x < stone.minX) {
    stone.x = stone.minX;
    stone.vx = Math.abs(stone.vx);
  }
  if (stone.x > stone.maxX) {
    stone.x = stone.maxX;
    stone.vx = -Math.abs(stone.vx);
  }
  if (supportId === stone.id) {
    stone.emptyMs = 0;
    stone.occupiedMs += dtMs;
    if (stone.sinkAfterMs !== null && stone.occupiedMs >= stone.sinkAfterMs) {
      stone.submerged = true;
    }
    return;
  }
  stone.occupiedMs = 0;
  if (!stone.submerged) return;
  stone.emptyMs += dtMs;
  if (stone.emptyMs >= SINK_RECOVER_MS) {
    stone.submerged = false;
    stone.emptyMs = 0;
  }
}

export function stepHold(hold: Hold, dtSec: number, timeMs: number): void {
  hold.x += hold.vx * dtSec;
  if (hold.x < hold.minX) {
    hold.x = hold.minX;
    hold.vx = Math.abs(hold.vx);
  }
  if (hold.x > hold.maxX) {
    hold.x = hold.maxX;
    hold.vx = -Math.abs(hold.vx);
  }
  hold.visible = holdVisible(hold, timeMs);
}

export function stepHazards(level: LevelDef, dtMs: number, timeMs: number, supportId: string | null): void {
  const dtSec = dtMs / 1000;
  for (const segment of level.segments) {
    for (const car of segment.cars) stepCar(car, dtSec, level.width);
    for (const stone of segment.stones) stepStone(stone, dtMs, supportId);
    for (const hold of segment.holds) stepHold(hold, dtSec, timeMs);
    for (const chamber of segment.chambers) {
      for (const car of chamber.cars) stepCar(car, dtSec, level.width);
      for (const stone of chamber.stones) stepStone(stone, dtMs, supportId);
      for (const hold of chamber.holds) stepHold(hold, dtSec, timeMs);
    }
  }
}
```

`src/game/zones.ts`

```ts
import { crabRadius } from "./crab";
import { circlesOverlap, circleHitsAabb } from "./geometry";
import { seatPosition } from "./hazards";
import type { Car, Chamber, Crab, HazardHit, Hold, LevelDef, Segment, Stone, Swing } from "./types";

export type Zone =
  | { tag: "ground" }
  | { tag: "road"; cars: Car[] }
  | { tag: "water"; stones: Stone[] }
  | { tag: "swings"; swings: Swing[] }
  | { tag: "climb"; holds: Hold[]; ledge: boolean }
  | { tag: "combined"; cars: Car[]; stones: Stone[]; swings: Swing[]; holds: Hold[]; ledge: boolean }
  | { tag: "burrow" }
  | { tag: "mouth" };

export type Support =
  | { kind: "ground" }
  | { kind: "stone"; id: string; x: number; y: number }
  | { kind: "hold"; id: string; x: number; y: number }
  | { kind: "none" };

export function segmentAt(level: LevelDef, y: number): Segment | null {
  return level.segments.find((segment) => y >= segment.y && y < segment.y + segment.h) ?? null;
}

export function chamberAt(segment: Segment, y: number): Chamber | null {
  if (segment.kind !== "tunnel") return null;
  return segment.chambers.find((chamber) => y >= chamber.y && y < chamber.y + chamber.h) ?? null;
}

export function zoneAt(level: LevelDef, y: number): Zone {
  const segment = segmentAt(level, y);
  if (!segment) return { tag: "ground" };
  if (segment.kind === "curb") return { tag: "ground" };
  if (segment.kind === "road") return { tag: "road", cars: segment.cars };
  if (segment.kind === "pond") return { tag: "water", stones: segment.stones };
  if (segment.kind === "swings") return { tag: "swings", swings: segment.swings };
  if (segment.kind === "wall") {
    const ledge = y >= segment.y + segment.h - segment.ledgeH;
    return { tag: "climb", holds: segment.holds, ledge };
  }
  if (y < segment.y + segment.burrowH) return { tag: "burrow" };
  if (y >= segment.y + segment.h - segment.mouthH) return { tag: "mouth" };
  const chamber = chamberAt(segment, y);
  if (!chamber) return { tag: "ground" };
  if (chamber.kind === "hotwheels") return { tag: "road", cars: chamber.cars };
  if (chamber.kind === "stone") return { tag: "water", stones: chamber.stones };
  if (chamber.kind === "swing") return { tag: "swings", swings: chamber.swings };
  if (chamber.kind === "hold") {
    const ledge = y >= chamber.y + chamber.h - chamber.ledgeH;
    return { tag: "climb", holds: chamber.holds, ledge };
  }
  const ledge = y >= chamber.y + chamber.h - chamber.ledgeH;
  return {
    tag: "combined",
    cars: chamber.cars,
    stones: chamber.stones,
    swings: chamber.swings,
    holds: chamber.holds,
    ledge,
  };
}

export function detectHit(level: LevelDef, crab: Crab, timeSec: number): HazardHit | null {
  const zone = zoneAt(level, crab.y);
  const radius = crabRadius(crab);
  if (zone.tag === "ground" || zone.tag === "burrow" || zone.tag === "mouth") return null;
  if (zone.tag === "road") return carsHit(zone.cars, crab, radius) ? "car" : null;
  if (zone.tag === "water") return supportedByStone(zone.stones, crab, radius) ? null : "water";
  if (zone.tag === "swings") return swingsHit(zone.swings, crab, radius, timeSec) ? "swing" : null;
  if (zone.tag === "climb") {
    if (zone.ledge) return null;
    return supportedByHold(zone.holds, crab, radius) ? null : "fall";
  }
  if (carsHit(zone.cars, crab, radius)) return "car";
  if (swingsHit(zone.swings, crab, radius, timeSec)) return "swing";
  if (zone.ledge) return null;
  if (!supportedByStone(zone.stones, crab, radius) && !supportedByHold(zone.holds, crab, radius)) {
    return "water";
  }
  return null;
}

export function pickSupport(level: LevelDef, crab: Crab): Support {
  const zone = zoneAt(level, crab.y);
  const radius = crabRadius(crab);
  if (
    zone.tag === "ground" ||
    zone.tag === "road" ||
    zone.tag === "swings" ||
    zone.tag === "burrow" ||
    zone.tag === "mouth"
  ) {
    return { kind: "ground" };
  }
  if (zone.tag === "water") {
    const stone = nearestStone(zone.stones, crab, radius);
    return stone ? { kind: "stone", id: stone.id, x: stone.x, y: stone.y } : { kind: "none" };
  }
  if (zone.tag === "climb") {
    if (zone.ledge) return { kind: "ground" };
    const hold = nearestHold(zone.holds, crab, radius);
    return hold ? { kind: "hold", id: hold.id, x: hold.x, y: hold.y } : { kind: "none" };
  }
  if (zone.ledge) return { kind: "ground" };
  const stone = nearestStone(zone.stones, crab, radius);
  if (stone) return { kind: "stone", id: stone.id, x: stone.x, y: stone.y };
  const hold = nearestHold(zone.holds, crab, radius);
  if (hold) return { kind: "hold", id: hold.id, x: hold.x, y: hold.y };
  return { kind: "none" };
}

function carsHit(cars: Car[], crab: Crab, radius: number): boolean {
  return cars.some((car) => circleHitsAabb(crab.x, crab.y, radius, car.x, car.y, car.w, car.h));
}

function swingsHit(swings: Swing[], crab: Crab, radius: number, timeSec: number): boolean {
  return swings.some((swing) => {
    const seat = seatPosition(swing, timeSec);
    return circlesOverlap(crab.x, crab.y, radius, seat.x, seat.y, swing.seatR);
  });
}

function supportedByStone(stones: Stone[], crab: Crab, radius: number): boolean {
  return nearestStone(stones, crab, radius) !== null;
}

function supportedByHold(holds: Hold[], crab: Crab, radius: number): boolean {
  return nearestHold(holds, crab, radius) !== null;
}

function nearestStone(stones: Stone[], crab: Crab, radius: number): Stone | null {
  let best: Stone | null = null;
  let bestD = Infinity;
  for (const stone of stones) {
    if (stone.submerged) continue;
    if (!circlesOverlap(crab.x, crab.y, radius, stone.x, stone.y, stone.r)) continue;
    const dx = crab.x - stone.x;
    const dy = crab.y - stone.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = stone;
      bestD = d;
    }
  }
  return best;
}

function nearestHold(holds: Hold[], crab: Crab, radius: number): Hold | null {
  let best: Hold | null = null;
  let bestD = Infinity;
  for (const hold of holds) {
    if (!hold.visible) continue;
    if (!circlesOverlap(crab.x, crab.y, radius, hold.x, hold.y, hold.r)) continue;
    const dx = crab.x - hold.x;
    const dy = crab.y - hold.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = hold;
      bestD = d;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/hazards.test.ts tests/zones.test.ts`

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/hazards.ts src/game/zones.ts tests/hazards.test.ts tests/zones.test.ts
git commit -m "feat: add cars, stones, swings, holds, and hit rules"
```

---

### Task 4: Five levels and the combined tunnel

**Files:**
- Create: `src/game/levels.ts`
- Test: `tests/levels.test.ts`

**Interfaces:**
- Consumes: `zoneAt`, `WORLD_W`, `HOP`, `HOP_MS`, `START_INSET`, `TUTORIAL_DELAY_SEC`, `CRAB_R`, `COLOR`
- Produces: `buildLevel(draft)`, `buildCampaign()`, `LEVELS`, `tutorialCarX(startY, laneY, speed)`, `startPoint(level)`, `latticeYs(fromY, minY, step)`, `curbSegment(level)`, `allCars`, `allStones`, `allSwings`, `allHolds`, `pressure(level)`, plus the draft types in that file

- [ ] **Step 1: Write the failing test**

`tests/levels.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { CRAB_R, HOP, HOP_MS, TUTORIAL_DELAY_SEC, WORLD_W } from "../src/game/constants";
import { seatPosition } from "../src/game/hazards";
import {
  LEVELS,
  allCars,
  allHolds,
  allStones,
  allSwings,
  pressure,
  startPoint,
} from "../src/game/levels";
import type { LevelDef } from "../src/game/types";

describe("five levels", () => {
  it("names Emery's five crossings and ends each one in a combined tunnel", () => {
    for (const level of LEVELS) expect(level.intro).toContain("Emery is awesome");
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Emery's Driveway",
      "Emery's Backyard",
      "Emery's Playground",
      "Emery's Obstacle Course",
      "Emery's Tunnel",
    ]);
    for (const level of LEVELS) {
      const tunnel = [...level.segments].sort((a, b) => a.y - b.y)[0];
      expect(tunnel.kind).toBe("tunnel");
      const playOrder = [...tunnel.chambers].sort((a, b) => b.y - a.y).map((chamber) => chamber.kind);
      expect(playOrder).toEqual(["hotwheels", "stone", "swing", "hold", "combined"]);
      const combined = tunnel.chambers.find((chamber) => chamber.kind === "combined");
      expect(combined?.cars.length).toBeGreaterThan(0);
      expect(combined?.stones.length).toBeGreaterThan(0);
      expect(combined?.swings.length).toBeGreaterThan(0);
      expect(combined?.holds.length).toBeGreaterThan(0);
    }
  });

  it("raises the pressure from level to level and makes the last tunnel the longest", () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(pressure(LEVELS[i])).toBeGreaterThan(pressure(LEVELS[i - 1]));
    }
    const tunnelH = (level: LevelDef) => level.segments.find((segment) => segment.kind === "tunnel")?.h ?? 0;
    expect(tunnelH(LEVELS[4])).toBeGreaterThan(tunnelH(LEVELS[0]));
    expect(LEVELS.map((level) => level.timeLimitMs)).toEqual([90000, 80000, 70000, 60000, 85000]);
  });

  it("keeps level 1 cars off the spine when a straight hop would cross them", () => {
    const level = LEVELS[0];
    const hopSpeed = HOP / (HOP_MS / 1000);
    const startY = startPoint(level).y;
    for (const car of allCars(level)) {
      const tCross = (startY - car.y) / hopSpeed;
      const xAtCross = car.x + car.speed * tCross;
      expect(Math.abs(xAtCross - WORLD_W / 2)).toBeGreaterThan(CRAB_R + car.w / 2 + 10);
      expect(xAtCross).toBeCloseTo(WORLD_W / 2 - car.speed * TUTORIAL_DELAY_SEC, 5);
    }
    for (const swing of allSwings(level)) {
      for (let t = 0; t < 8; t += 0.05) {
        const seat = seatPosition(swing, t);
        expect(Math.abs(seat.x - WORLD_W / 2)).toBeGreaterThan(80);
      }
    }
    expect(allHolds(level).every((hold) => hold.blinkPeriodMs === null)).toBe(true);
    expect(allStones(level).every((stone) => stone.vx === 0)).toBe(true);
  });

  it("gives later levels a real gap and a real threat in every road lane", () => {
    for (const level of LEVELS.slice(1)) {
      const lanes = new Map<number, typeof level.segments[0]["cars"]>();
      for (const car of allCars(level)) {
        const lane = lanes.get(car.y) ?? [];
        lane.push(car);
        lanes.set(car.y, lane);
      }
      for (const [, cars] of lanes) {
        let blocked = false;
        let clear = false;
        for (let t = 0; t <= 8; t += 0.1) {
          const hit = cars.some((car) => {
            const x = wrappedX(car.x + car.speed * t, car.w, level.width);
            return Math.abs(x - WORLD_W / 2) <= CRAB_R + car.w / 2;
          });
          blocked = blocked || hit;
          clear = clear || !hit;
        }
        expect(blocked).toBe(true);
        expect(clear).toBe(true);
      }
      expect(allSwings(level).some((swing) => swing.pivotX === WORLD_W / 2)).toBe(true);
      expect(allStones(level).some((stone) => stone.vx !== 0)).toBe(true);
      expect(allHolds(level).some((hold) => hold.blinkPeriodMs !== null)).toBe(true);
    }
  });
});

function wrappedX(x: number, w: number, width: number): number {
  const half = w / 2;
  const span = width + w;
  let next = x;
  while (next - half > width) next -= span;
  while (next + half < 0) next += span;
  return next;
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/levels.test.ts`

Expected: FAIL because `../src/game/levels` cannot be resolved.

- [ ] **Step 3: Write the level builder and the five drafts**

The spine places a support on every needy lattice point even when a neighbor's circle already kisses that point. Skipping those points opens a gap the hop falls through.

`src/game/levels.ts`

```ts
import {
  COLOR,
  CRAB_R,
  HOP,
  HOP_MS,
  START_INSET,
  TUTORIAL_DELAY_SEC,
  WORLD_W,
} from "./constants";
import type { Car, Chamber, Hold, LevelDef, Segment, Stone, Swing } from "./types";
import { zoneAt } from "./zones";

export interface LaneDraft {
  mode: "tutorial" | "authored";
  localY: number;
  speed: number;
  color: string;
  x?: number;
  w?: number;
  h?: number;
}

export interface StoneDraft {
  x: number;
  localY: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  sinkAfterMs: number | null;
}

export interface SwingDraft {
  x: number;
  localY: number;
  length: number;
  amplitude: number;
  omega: number;
  phase: number;
  seatR: number;
}

export interface HoldDraft {
  x: number;
  localY: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  blinkPeriodMs: number | null;
  blinkPhaseMs: number;
}

export interface SpineDraft {
  stoneR: number;
  stoneVx: number;
  stoneMinX: number;
  stoneMaxX: number;
  sinkAfterMs: number | null;
  holdR: number;
  holdVx: number;
  holdMinX: number;
  holdMaxX: number;
  blinkPeriodMs: number | null;
}

export interface ChamberDraft {
  kind: "hotwheels" | "stone" | "swing" | "hold" | "combined";
  h: number;
  ledgeH: number;
  lanes: LaneDraft[];
  stones: StoneDraft[];
  swings: SwingDraft[];
  holds: HoldDraft[];
}

export type BandDraft =
  | { kind: "curb"; h: number }
  | { kind: "road"; h: number; lanes: LaneDraft[] }
  | { kind: "pond"; h: number; stones: StoneDraft[] }
  | { kind: "swings"; h: number; swings: SwingDraft[] }
  | { kind: "wall"; h: number; ledgeH: number; holds: HoldDraft[] }
  | { kind: "tunnel"; mouthH: number; burrowH: number; chambers: ChamberDraft[] };

export interface LevelDraft {
  id: number;
  name: string;
  intro: string;
  timeLimitMs: number;
  width: number;
  spine: SpineDraft | null;
  bands: BandDraft[];
}

export function tutorialCarX(startY: number, laneY: number, speed: number): number {
  const hopSpeed = HOP / (HOP_MS / 1000);
  const tCross = (startY - laneY) / hopSpeed;
  return WORLD_W / 2 - speed * (tCross + TUTORIAL_DELAY_SEC);
}

export function startPoint(level: LevelDef): { x: number; y: number } {
  return { x: level.width / 2, y: level.height - START_INSET };
}

export function latticeYs(fromY: number, minY: number, step: number): number[] {
  const ys: number[] = [];
  for (let y = fromY - step; y >= minY; y -= step) ys.push(y);
  return ys;
}

export function curbSegment(level: LevelDef): Segment {
  const curb = level.segments.find((segment) => segment.kind === "curb");
  if (!curb) throw new Error("level is missing a curb");
  return curb;
}

export function allCars(level: LevelDef): Car[] {
  return level.segments.flatMap((segment) => [...segment.cars, ...segment.chambers.flatMap((chamber) => chamber.cars)]);
}

export function allStones(level: LevelDef): Stone[] {
  return level.segments.flatMap((segment) => [
    ...segment.stones,
    ...segment.chambers.flatMap((chamber) => chamber.stones),
  ]);
}

export function allSwings(level: LevelDef): Swing[] {
  return level.segments.flatMap((segment) => [
    ...segment.swings,
    ...segment.chambers.flatMap((chamber) => chamber.swings),
  ]);
}

export function allHolds(level: LevelDef): Hold[] {
  return level.segments.flatMap((segment) => [
    ...segment.holds,
    ...segment.chambers.flatMap((chamber) => chamber.holds),
  ]);
}

export function pressure(level: LevelDef): number {
  const maxSpeed = Math.max(...allCars(level).map((car) => Math.abs(car.speed)));
  const maxOmega = Math.max(...allSwings(level).map((swing) => swing.omega));
  const drift = Math.max(...allStones(level).map((stone) => Math.abs(stone.vx)));
  const blink = Math.min(...allHolds(level).map((hold) => hold.blinkPeriodMs ?? 10_000));
  return maxSpeed + maxOmega * 20 + drift - blink / 100;
}

export function buildLevel(draft: LevelDraft): LevelDef {
  const height = draft.bands.reduce((sum, band) => sum + bandHeight(band), 0);
  const startY = height - START_INSET;
  let top = height;
  const segments = draft.bands.map((band, index) => {
    const h = bandHeight(band);
    top -= h;
    return realizeBand(draft, band, index, top, h, startY);
  });
  const level: LevelDef = {
    id: draft.id,
    name: draft.name,
    intro: draft.intro,
    timeLimitMs: draft.timeLimitMs,
    width: draft.width,
    height,
    segments,
  };
  if (draft.spine) placeSpine(level, draft.spine);
  return level;
}

export function buildCampaign(): LevelDef[] {
  return campaignDrafts().map(buildLevel);
}

export const LEVELS: LevelDef[] = buildCampaign();

function bandHeight(band: BandDraft): number {
  if (band.kind === "tunnel") {
    return band.mouthH + band.burrowH + band.chambers.reduce((sum, chamber) => sum + chamber.h, 0);
  }
  return band.h;
}

function realizeBand(
  draft: LevelDraft,
  band: BandDraft,
  index: number,
  y: number,
  h: number,
  startY: number,
): Segment {
  const id = `${draft.id}-${index}-${band.kind}`;
  const segment: Segment = {
    id,
    kind: band.kind,
    y,
    h,
    ledgeH: band.kind === "wall" ? band.ledgeH : 0,
    mouthH: band.kind === "tunnel" ? band.mouthH : 0,
    burrowH: band.kind === "tunnel" ? band.burrowH : 0,
    cars: [],
    stones: [],
    swings: [],
    holds: [],
    chambers: [],
  };
  if (band.kind === "road") segment.cars = realizeLanes(band.lanes, y, startY, id);
  if (band.kind === "pond") segment.stones = band.stones.map((stone, i) => realizeStone(stone, y, `${id}-stone-${i}`));
  if (band.kind === "swings") segment.swings = band.swings.map((swing, i) => realizeSwing(swing, y, `${id}-swing-${i}`));
  if (band.kind === "wall") segment.holds = band.holds.map((hold, i) => realizeHold(hold, y, `${id}-hold-${i}`));
  if (band.kind === "tunnel") segment.chambers = realizeChambers(band, y, h, startY, id);
  return segment;
}

function realizeChambers(band: Extract<BandDraft, { kind: "tunnel" }>, y: number, h: number, startY: number, id: string): Chamber[] {
  let cursor = y + h - band.mouthH;
  return band.chambers.map((draft, index) => {
    cursor -= draft.h;
    const chamberId = `${id}-${index}-${draft.kind}`;
    return {
      id: chamberId,
      kind: draft.kind,
      y: cursor,
      h: draft.h,
      ledgeH: draft.ledgeH,
      cars: realizeLanes(draft.lanes, cursor, startY, chamberId),
      stones: draft.stones.map((stone, i) => realizeStone(stone, cursor, `${chamberId}-stone-${i}`)),
      swings: draft.swings.map((swing, i) => realizeSwing(swing, cursor, `${chamberId}-swing-${i}`)),
      holds: draft.holds.map((hold, i) => realizeHold(hold, cursor, `${chamberId}-hold-${i}`)),
    };
  });
}

function realizeLanes(lanes: LaneDraft[], regionY: number, startY: number, idPrefix: string): Car[] {
  return lanes.map((lane, index) => {
    const y = regionY + lane.localY;
    const x = lane.mode === "tutorial" ? tutorialCarX(startY, y, lane.speed) : (lane.x ?? WORLD_W / 2);
    return {
      id: `${idPrefix}-car-${index}`,
      x,
      y,
      w: lane.w ?? 56,
      h: lane.h ?? 24,
      speed: lane.speed,
      color: lane.color,
    };
  });
}

function realizeStone(draft: StoneDraft, regionY: number, id: string): Stone {
  return {
    id,
    x: draft.x,
    y: regionY + draft.localY,
    r: draft.r,
    vx: draft.vx,
    minX: draft.minX,
    maxX: draft.maxX,
    sinkAfterMs: draft.sinkAfterMs,
    occupiedMs: 0,
    emptyMs: 0,
    submerged: false,
  };
}

function realizeSwing(draft: SwingDraft, regionY: number, id: string): Swing {
  return {
    id,
    pivotX: draft.x,
    pivotY: regionY + draft.localY,
    length: draft.length,
    amplitude: draft.amplitude,
    omega: draft.omega,
    phase: draft.phase,
    seatR: draft.seatR,
  };
}

function realizeHold(draft: HoldDraft, regionY: number, id: string): Hold {
  return {
    id,
    x: draft.x,
    y: regionY + draft.localY,
    r: draft.r,
    vx: draft.vx,
    minX: draft.minX,
    maxX: draft.maxX,
    blinkPeriodMs: draft.blinkPeriodMs,
    blinkPhaseMs: draft.blinkPhaseMs,
    visible: true,
  };
}

function placeSpine(level: LevelDef, spine: SpineDraft): void {
  const x = level.width / 2;
  let n = 0;
  for (const y of latticeYs(startPoint(level).y, CRAB_R, HOP)) {
    const zone = zoneAt(level, y);
    if ((zone.tag === "water" || zone.tag === "combined") && !(zone.tag === "combined" && zone.ledge)) {
      if (!hasSupportAt(zone.stones, x, y)) {
        zone.stones.push(spineStone(level.id, n, x, y, spine));
        n += 1;
      }
    }
    if ((zone.tag === "climb" || zone.tag === "combined") && !zone.ledge) {
      if (!hasSupportAt(zone.holds, x, y)) {
        zone.holds.push(spineHold(level.id, n, x, y, spine));
        n += 1;
      }
    }
  }
}

function hasSupportAt(supports: { x: number; y: number }[], x: number, y: number): boolean {
  return supports.some((support) => Math.abs(support.x - x) < 1 && Math.abs(support.y - y) < 1);
}

function spineStone(levelId: number, n: number, x: number, y: number, spine: SpineDraft): Stone {
  const moving = spine.stoneVx !== 0;
  return {
    id: `${levelId}-spine-stone-${n}`,
    x,
    y,
    r: spine.stoneR,
    vx: spine.stoneVx,
    minX: moving ? spine.stoneMinX : x,
    maxX: moving ? spine.stoneMaxX : x,
    sinkAfterMs: spine.sinkAfterMs,
    occupiedMs: 0,
    emptyMs: 0,
    submerged: false,
  };
}

function spineHold(levelId: number, n: number, x: number, y: number, spine: SpineDraft): Hold {
  const moving = spine.holdVx !== 0;
  return {
    id: `${levelId}-spine-hold-${n}`,
    x,
    y,
    r: spine.holdR,
    vx: spine.holdVx,
    minX: moving ? spine.holdMinX : x,
    maxX: moving ? spine.holdMaxX : x,
    blinkPeriodMs: spine.blinkPeriodMs,
    blinkPhaseMs: 0,
    visible: true,
  };
}

function sideSwing(x: number, omega: number): SwingDraft {
  return { x, localY: 28, length: 48, amplitude: 0.5, omega, phase: 0.4, seatR: 12 };
}

function crossSwing(omega: number, phase = 0): SwingDraft {
  return { x: WORLD_W / 2, localY: 24, length: 70, amplitude: 1.05, omega, phase, seatR: 12 };
}

function tutorialLane(localY: number, speed: number, color: string): LaneDraft {
  return { mode: "tutorial", localY, speed, color, w: 56, h: 24 };
}

function authoredLane(localY: number, x: number, speed: number, color: string, w = 56): LaneDraft {
  return { mode: "authored", localY, x, speed, color, w, h: 24 };
}

function staticSpine(): SpineDraft {
  return {
    stoneR: 36,
    stoneVx: 0,
    stoneMinX: 40,
    stoneMaxX: 440,
    sinkAfterMs: null,
    holdR: 36,
    holdVx: 0,
    holdMinX: 40,
    holdMaxX: 440,
    blinkPeriodMs: null,
  };
}

function driftSpine(stoneVx: number, sinkAfterMs: number, blinkPeriodMs: number): SpineDraft {
  return {
    stoneR: 36,
    stoneVx,
    stoneMinX: 70,
    stoneMaxX: 410,
    sinkAfterMs,
    holdR: 36,
    holdVx: 0,
    holdMinX: 40,
    holdMaxX: 440,
    blinkPeriodMs,
  };
}

function tunnelBand(
  hotwheels: LaneDraft[],
  swing: SwingDraft,
  combinedLanes: LaneDraft[],
  combinedSwing: SwingDraft,
  chamberH: number,
): Extract<BandDraft, { kind: "tunnel" }> {
  return {
    kind: "tunnel",
    mouthH: 48,
    burrowH: 36,
    chambers: [
      { kind: "hotwheels", h: chamberH, ledgeH: 0, lanes: hotwheels, stones: [], swings: [], holds: [] },
      { kind: "stone", h: chamberH, ledgeH: 0, lanes: [], stones: [], swings: [], holds: [] },
      { kind: "swing", h: chamberH, ledgeH: 0, lanes: [], stones: [], swings: [swing], holds: [] },
      { kind: "hold", h: chamberH, ledgeH: 48, lanes: [], stones: [], swings: [], holds: [] },
      {
        kind: "combined",
        h: chamberH,
        ledgeH: 48,
        lanes: combinedLanes,
        stones: [],
        swings: [combinedSwing],
        holds: [],
      },
    ],
  };
}

function campaignDrafts(): LevelDraft[] {
  return [
    {
      id: 1,
      name: "Emery's Driveway",
      intro: "Hot Wheels, stones, swings, and a wall. Then the tunnel. Emery is awesome.",
      timeLimitMs: 90_000,
      width: WORLD_W,
      spine: staticSpine(),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 112,
          lanes: [
            tutorialLane(84, 70, COLOR.carRed),
            tutorialLane(28, -70, COLOR.carYellow),
          ],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 160, swings: [sideSwing(78, 1.1)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [tutorialLane(126, 64, COLOR.carBlue), tutorialLane(84, -60, COLOR.carGreen), tutorialLane(42, 70, COLOR.carPurple)],
          sideSwing(72, 1.1),
          [tutorialLane(84, -70, COLOR.carRed)],
          sideSwing(70, 1.1),
          168,
        ),
      ],
    },
    {
      id: 2,
      name: "Emery's Backyard",
      intro: "The toys drive faster and the stones drift. Emery is awesome.",
      timeLimitMs: 80_000,
      width: WORLD_W,
      spine: driftSpine(32, 1600, 1600),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 36, COLOR.carRed, 64),
            authoredLane(84, 80, -110, COLOR.carYellow),
            authoredLane(42, 400, 90, COLOR.carBlue),
          ],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 160, swings: [crossSwing(1.8)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(84, 240, 80, COLOR.carGreen)],
          crossSwing(1.8, 0.2),
          [authoredLane(84, 360, 100, COLOR.carPurple)],
          crossSwing(1.8, 1.1),
          168,
        ),
      ],
    },
    {
      id: 3,
      name: "Emery's Playground",
      intro: "Swings cross your path and holds blink. Emery is awesome.",
      timeLimitMs: 70_000,
      width: WORLD_W,
      spine: driftSpine(46, 1300, 1400),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 48, COLOR.carYellow, 64),
            authoredLane(84, 420, -150, COLOR.carRed),
            authoredLane(42, 60, 120, COLOR.carBlue),
          ],
        },
        { kind: "pond", h: 160, stones: [] },
        { kind: "swings", h: 180, swings: [crossSwing(2.3), crossSwing(2.0, 1.4)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(100, 240, 130, COLOR.carPurple), authoredLane(52, 80, -140, COLOR.carGreen)],
          crossSwing(2.3, 0.2),
          [authoredLane(84, 240, 110, COLOR.carRed, 60)],
          crossSwing(2.3, 1.1),
          180,
        ),
      ],
    },
    {
      id: 4,
      name: "Emery's Obstacle Course",
      intro: "Everything moves. The tunnel is the real course. Emery is awesome.",
      timeLimitMs: 60_000,
      width: WORLD_W,
      spine: driftSpine(58, 1100, 1200),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 54, COLOR.carBlue, 68),
            authoredLane(84, 450, -190, COLOR.carYellow),
            authoredLane(42, 40, 160, COLOR.carRed),
          ],
        },
        { kind: "pond", h: 160, stones: [] },
        { kind: "swings", h: 180, swings: [crossSwing(2.8), crossSwing(2.4, 2)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(110, 240, 160, COLOR.carGreen), authoredLane(60, 400, -170, COLOR.carPurple)],
          crossSwing(2.8, 0.2),
          [authoredLane(90, 200, 190, COLOR.carYellow), authoredLane(50, 420, -150, COLOR.carRed)],
          crossSwing(2.8, 1.1),
          190,
        ),
      ],
    },
    {
      id: 5,
      name: "Emery's Tunnel",
      intro: "The whole backyard is in the tunnel. Emery is awesome.",
      timeLimitMs: 85_000,
      width: WORLD_W,
      spine: driftSpine(70, 900, 1000),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 112,
          lanes: [authoredLane(64, 240, 60, COLOR.carRed, 70), authoredLane(28, 460, -230, COLOR.carYellow)],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 150, swings: [crossSwing(3.4)] },
        { kind: "wall", h: 192, ledgeH: 48, holds: [] },
        tunnelBand(
          [
            authoredLane(150, 240, 180, COLOR.carBlue, 64),
            authoredLane(100, 80, -230, COLOR.carGreen),
            authoredLane(52, 420, 200, COLOR.carPurple),
          ],
          crossSwing(3.4, 0.2),
          [authoredLane(120, 240, 210, COLOR.carRed, 64), authoredLane(70, 400, -220, COLOR.carYellow)],
          crossSwing(3.4, 1.1),
          210,
        ),
      ],
    },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/levels.test.ts`

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game/levels.ts tests/levels.test.ts
git commit -m "feat: add five levels that end in a combined tunnel"
```

---

### Task 5: Lives, checkpoints, the burrow, and the congratulations

**Files:**
- Create: `src/game/camera.ts`
- Create: `src/game/sim.ts`
- Create: `tests/helpers.ts`
- Test: `tests/sim.test.ts`

**Interfaces:**
- Consumes: crab, hazards, zones, levels, `COPY`, and the constants for lives, score, intro, toast, flash, and checkpoint inset
- Produces: `createGame(templates?)`, `tick(state, input, dtMs)`, `cameraTop(crabY, levelH, viewH)`

- [ ] **Step 1: Write the failing tests**

`tests/helpers.ts`

```ts
import { blankInput } from "../src/game/input";
import { tick, createGame } from "../src/game/sim";
import type { GameState, InputFrame, LevelDef } from "../src/game/types";

export function north(): InputFrame {
  return { ...blankInput(), dy: -1 };
}

export function startPlaying(state: GameState = createGame()): GameState {
  let next = tick(state, { ...blankInput(), start: true }, 16);
  next = tick(next, { ...blankInput(), confirm: true }, 16);
  return next;
}

export function idle(state: GameState, ms: number): GameState {
  let next = state;
  let left = ms;
  while (left > 0) {
    const dt = Math.min(16, left);
    next = tick(next, blankInput(), dt);
    left -= dt;
  }
  return next;
}

export function hopNorth(state: GameState): GameState {
  let next = tick(state, north(), 16);
  let guard = 0;
  while (next.crab.mode === "hopping" && guard < 30) {
    next = tick(next, blankInput(), 16);
    guard += 1;
  }
  return next;
}

export function playStraight(levels?: LevelDef[]): GameState {
  let state = startPlaying(levels ? createGame(levels) : createGame());
  let guard = 0;
  while (state.phase === "playing" && guard < 8000) {
    state = state.crab.mode === "idle" ? tick(state, north(), 16) : tick(state, blankInput(), 16);
    guard += 1;
  }
  return state;
}

export function debugState(state: GameState): string {
  return `phase=${state.phase} fail=${state.lastFail} lives=${state.crab.lives} x=${state.crab.x.toFixed(1)} y=${state.crab.y.toFixed(1)} t=${state.elapsedMs} toast=${state.toast} score=${state.crab.score}`;
}
```

`tests/sim.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { VIEW_H } from "../src/game/constants";
import { cameraTop } from "../src/game/camera";
import { COPY } from "../src/game/copy";
import { blankInput } from "../src/game/input";
import { buildLevel, LEVELS, startPoint, type LevelDraft } from "../src/game/levels";
import { createGame, tick } from "../src/game/sim";
import { debugState, hopNorth, idle, playStraight, startPlaying } from "./helpers";

describe("simulation", () => {
  it("does not mutate the previous state", () => {
    const state = startPlaying();
    const before = state.crab.lives;
    tick(state, { ...blankInput(), dy: -1 }, 16);
    expect(state.crab.lives).toBe(before);
    expect(state.crab.mode).toBe("idle");
  });

  it("hops north, prefers north over a diagonal, and refuses the map edge", () => {
    let state = startPlaying();
    const startY = state.crab.y;
    state = hopNorth(state);
    expect(state.crab.y).toBe(startY - 48);
    expect(state.crab.score).toBe(25);
    state = tick(state, { ...blankInput(), dx: 1, dy: -1 }, 16);
    state = hopUntilIdle(state);
    expect(state.crab.x).toBe(240);
    const south = tick(startPlaying(), { ...blankInput(), dy: 1 }, 16);
    expect(south.crab.y).toBe(startPoint(LEVELS[0]).y);
    expect(south.crab.mode).toBe("idle");
  });

  it("tucks, then waits out the cooldown", () => {
    let state = startPlaying();
    state = tick(state, { ...blankInput(), tuck: true }, 16);
    expect(state.crab.mode).toBe("tucked");
    state = tick(state, { ...blankInput(), dy: -1 }, 16);
    expect(state.crab.mode).toBe("tucked");
    state = idle(state, 700);
    expect(state.crab.mode).toBe("idle");
    expect(state.crab.tuckCooldownMs).toBeGreaterThan(0);
    state = tick(state, { ...blankInput(), tuck: true }, 16);
    expect(state.crab.mode).toBe("idle");
  });

  it("lets a tucked shell dodge a clip that would hit an open crab", () => {
    const level = buildLevel(tiny({
      bands: [
        { kind: "curb", h: 400 },
        { kind: "road", h: 80, lanes: [{ mode: "authored", localY: 40, x: 270, speed: 0, color: "#c81d25", w: 40, h: 24 }] },
      ],
    }));
    const state = startPlaying(createGame([level]));
    state.crab.x = 240;
    state.crab.y = level.segments[1].y + 40;
    const open = tick(state, blankInput(), 16);
    expect(open.lastFail).toBe("car");
    state.crab.mode = "tucked";
    const tucked = tick(state, blankInput(), 16);
    expect(tucked.lastFail).toBeNull();
    expect(tucked.crab.lives).toBe(state.crab.lives);
  });

  it("sinks a stood-on stone and drops the crab in the water", () => {
    const level = buildLevel(tiny({
      bands: [
        { kind: "curb", h: 200 },
        {
          kind: "pond",
          h: 120,
          stones: [{ x: 240, localY: 60, r: 30, vx: 0, minX: 240, maxX: 240, sinkAfterMs: 100 }],
        },
      ],
    }));
    let state = startPlaying(createGame([level]));
    const stone = state.level.segments[1].stones[0];
    state.crab.x = stone.x;
    state.crab.y = stone.y;
    state = idle(state, 250);
    expect(state.lastFail).toBe("water");
    expect(state.crab.lives).toBe(3);
    expect(state.toast).toBe(COPY.tryAgain);
  });

  it("ends the level on time and offers the level again with the score kept", () => {
    const level = buildLevel(tiny({ timeLimitMs: 80, bands: [{ kind: "curb", h: 200 }] }));
    let state = startPlaying(createGame([level]));
    state.crab.score = 40;
    state = idle(state, 120);
    expect(state.lastFail).toBe("time");
    expect(state.toast).toBe(COPY.timeUp);
    state.crab.lives = 1;
    state = tick(state, blankInput(), 16);
    expect(state.phase).toBe("retry");
    expect(state.bannerTitle).toBe(COPY.tryLevel);
    expect(state.bannerBody).toContain(COPY.emery);
    const score = state.crab.score;
    state = tick(state, { ...blankInput(), confirm: true }, 16);
    expect(state.phase).toBe("intro");
    expect(state.crab.lives).toBe(4);
    expect(state.crab.score).toBe(score);
  });

  it("congratulates a cleared level and the full campaign", () => {
    let state = startPlaying();
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.phase).toBe("level-clear");
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(state.bannerBody).toContain(COPY.emery);
    expect(state.crab.score).toBeGreaterThanOrEqual(500);
    state = tick(state, { ...blankInput(), confirm: true }, 16);
    expect(state.levelIndex).toBe(1);
    expect(state.phase).toBe("intro");
    expect(state.bannerBody).toContain(COPY.emery);

    let finale = startPlaying();
    finale.levelIndex = 4;
    finale.crab.y = 10;
    finale = tick(finale, blankInput(), 16);
    expect(finale.phase).toBe("campaign-clear");
    expect(finale.bannerTitle).toBe(COPY.finishedLevel);
    expect(finale.bannerBody).toContain("You finished all 5 levels.");
    expect(finale.bannerBody).toContain(COPY.emery);
  });

  it("respawns at the last safe checkpoint", () => {
    let state = startPlaying();
    const before = state.checkpointY;
    for (let i = 0; i < 6; i += 1) state = hopNorth(state);
    expect(state.checkpointY).toBeLessThan(before);
    const checkpoint = state.checkpointY;
    const lives = state.crab.lives;
    const pond = state.level.segments.find((segment) => segment.kind === "pond");
    expect(pond).toBeTruthy();
    state.crab.x = 30;
    state.crab.y = (pond?.y ?? 0) + 20;
    state.crab.mode = "idle";
    state.crab.supportId = null;
    state = tick(state, blankInput(), 16);
    expect(state.lastFail).toBe("water");
    expect(state.crab.lives).toBe(lives - 1);
    expect(state.crab.y).toBe(checkpoint);
    expect(state.crab.x).toBe(240);
  });

  it("finishes level 1 by hopping straight up the spine", () => {
    const state = playStraight();
    expect(state.phase, debugState(state)).toBe("level-clear");
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(state.elapsedMs).toBeLessThan(15000);
    expect(state.crab.lives).toBe(4);
  });

  it("punishes a straight hop on level 2", () => {
    let state = startPlaying(createGame(LEVELS));
    state = beginLevelIndex(state, 1);
    let hops = 0;
    while (state.phase === "playing" && state.crab.lives === 4 && hops < 12) {
      state = hopNorth(state);
      hops += 1;
    }
    expect(state.crab.lives, debugState(state)).toBeLessThan(4);
    expect(state.lastFail).toBe("car");
  });

  it("frames the crab with the camera", () => {
    const level = LEVELS[0];
    const start = startPoint(level);
    expect(cameraTop(start.y, level.height, VIEW_H)).toBe(level.height - VIEW_H);
    expect(cameraTop(20, level.height, VIEW_H)).toBe(0);
  });
});

function hopUntilIdle(state: ReturnType<typeof tick>): ReturnType<typeof tick> {
  let next = state;
  let guard = 0;
  while (next.crab.mode === "hopping" && guard < 30) {
    next = tick(next, blankInput(), 16);
    guard += 1;
  }
  return next;
}

function beginLevelIndex(state: ReturnType<typeof tick>, index: number): ReturnType<typeof tick> {
  let next = state;
  while (next.levelIndex < index) {
    next.crab.y = 10;
    next = tick(next, blankInput(), 16);
    next = tick(next, { ...blankInput(), confirm: true }, 16);
    next = tick(next, { ...blankInput(), confirm: true }, 16);
  }
  return next;
}

function tiny(overrides: Partial<LevelDraft> & Pick<LevelDraft, "bands">): LevelDraft {
  return {
    id: 99,
    name: "Tiny",
    intro: "Emery is awesome.",
    timeLimitMs: 30000,
    width: 480,
    spine: null,
    ...overrides,
  };
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/sim.test.ts`

Expected: FAIL because `../src/game/sim` cannot be resolved.

- [ ] **Step 3: Write the camera and the simulation**

`tick` clones with `structuredClone` before it changes anything. Burrow is tested before hits. A hop both starts and advances on the frame it begins, so hop timing stays on the 140ms clock.

`src/game/camera.ts`

```ts
import { clamp } from "./geometry";

export function cameraTop(crabY: number, levelH: number, viewH: number): number {
  if (levelH <= viewH) return 0;
  const ideal = crabY - viewH * 0.62;
  return clamp(ideal, 0, levelH - viewH);
}
```

`src/game/sim.ts`

```ts
import { CHECKPOINT_INSET, CRAB_R, HIT_FLASH_MS, INTRO_MS, LEVEL_SCORE, LIVES, MAX_FRAME_MS, SEGMENT_SCORE, TOAST_MS } from "./constants";
import { advanceHop, advanceTuck, beginHop } from "./crab";
import { COPY } from "./copy";
import { clamp } from "./geometry";
import { stepHazards } from "./hazards";
import { curbSegment, LEVELS, startPoint } from "./levels";
import type { Crab, FailReason, GameState, InputFrame, LevelDef } from "./types";
import { detectHit, pickSupport, segmentAt, zoneAt } from "./zones";

export function createGame(templates: LevelDef[] = LEVELS): GameState {
  const cloned = structuredClone(templates);
  const level = structuredClone(cloned[0]);
  const start = startPoint(level);
  const crab = makeCrab(start.x, start.y);
  return {
    phase: "title",
    levelIndex: 0,
    templates: cloned,
    level,
    crab,
    elapsedMs: 0,
    checkpointX: start.x,
    checkpointY: start.y,
    checkpointSegmentId: curbSegment(level).id,
    bannerTitle: "",
    bannerBody: "",
    toast: "",
    toastMs: 0,
    introMs: 0,
    hitFlashMs: 0,
    lastFail: null,
  };
}

export function tick(state: GameState, input: InputFrame, dtMs: number): GameState {
  const dt = Math.max(0, Math.min(MAX_FRAME_MS, dtMs));
  const next = structuredClone(state);

  if (next.phase === "title") {
    if (input.start || input.confirm) openIntro(next);
    return next;
  }
  if (next.phase === "intro") {
    next.introMs += dt;
    if (input.confirm || next.introMs >= INTRO_MS) beginPlay(next);
    return next;
  }
  if (next.phase === "paused") {
    if (input.pause || input.confirm) next.phase = "playing";
    return next;
  }
  if (next.phase === "level-clear") {
    if (input.confirm) return beginLevel(next, next.levelIndex + 1);
    return next;
  }
  if (next.phase === "campaign-clear") {
    if (input.confirm) return createGame(next.templates);
    return next;
  }
  if (next.phase === "retry") {
    if (input.confirm) return beginLevel(next, next.levelIndex);
    return next;
  }
  if (input.pause) {
    next.phase = "paused";
    next.bannerTitle = COPY.paused;
    next.bannerBody = `${COPY.emery}.`;
    return next;
  }

  next.elapsedMs += dt;
  stepHazards(next.level, dt, next.elapsedMs, next.crab.supportId);
  if (next.crab.mode === "hopping") advanceHop(next.crab, dt);
  advanceTuck(next.crab, dt, input.tuck);
  if (next.crab.mode === "idle" && !input.tuck) beginHop(next.crab, input.dx, input.dy, next.level);
  if (next.crab.mode === "hopping" && next.crab.hopElapsedMs === 0) advanceHop(next.crab, dt);
  attachSupport(next);
  decayFx(next, dt);

  if (zoneAt(next.level, next.crab.y).tag === "burrow") return reachGoal(next);
  const hit = detectHit(next.level, next.crab, next.elapsedMs / 1000);
  if (hit) return applyHit(next, hit);
  if (next.elapsedMs >= next.level.timeLimitMs) return applyHit(next, "time");
  updateCheckpoint(next);
  return next;
}

function openIntro(state: GameState): void {
  state.phase = "intro";
  state.introMs = 0;
  state.bannerTitle = state.level.name;
  state.bannerBody = state.level.intro;
}

function beginPlay(state: GameState): void {
  state.phase = "playing";
  state.elapsedMs = 0;
  state.bannerTitle = "";
  state.bannerBody = "";
}

function beginLevel(state: GameState, index: number): GameState {
  state.levelIndex = index;
  state.level = structuredClone(state.templates[index]);
  const start = startPoint(state.level);
  state.crab = makeCrab(start.x, start.y, state.crab.score);
  state.elapsedMs = 0;
  state.checkpointX = start.x;
  state.checkpointY = start.y;
  state.checkpointSegmentId = curbSegment(state.level).id;
  state.toast = "";
  state.toastMs = 0;
  state.hitFlashMs = 0;
  state.lastFail = null;
  openIntro(state);
  return state;
}

function reachGoal(state: GameState): GameState {
  state.crab.score += LEVEL_SCORE;
  state.crab.mode = "idle";
  state.lastFail = null;
  const last = state.levelIndex >= state.templates.length - 1;
  state.phase = last ? "campaign-clear" : "level-clear";
  state.bannerTitle = COPY.finishedLevel;
  state.bannerBody = last ? `${COPY.finishedAll} ${COPY.emery}.` : `${COPY.emery}.`;
  return state;
}

function applyHit(state: GameState, reason: FailReason): GameState {
  state.crab.lives -= 1;
  state.crab.mode = "idle";
  state.crab.supportId = null;
  state.crab.supportKind = null;
  state.crab.hopElapsedMs = 0;
  state.crab.x = state.checkpointX;
  state.crab.y = state.checkpointY;
  state.hitFlashMs = HIT_FLASH_MS;
  state.lastFail = reason;
  state.toast = reason === "time" ? COPY.timeUp : COPY.tryAgain;
  state.toastMs = TOAST_MS;
  if (state.crab.lives <= 0) {
    state.phase = "retry";
    state.bannerTitle = COPY.tryLevel;
    state.bannerBody = `${COPY.emery}.`;
  }
  return state;
}

function updateCheckpoint(state: GameState): void {
  const segment = segmentAt(state.level, state.crab.y);
  if (!segment) return;
  const previous = state.level.segments.find((item) => item.id === state.checkpointSegmentId);
  if (!previous || segment.id === previous.id || segment.y >= previous.y) return;
  const x = state.level.width / 2;
  const y = segment.y + segment.h - CHECKPOINT_INSET;
  const probe: Crab = { ...state.crab, x, y, mode: "idle", supportId: null, supportKind: null };
  if (detectHit(state.level, probe, state.elapsedMs / 1000)) return;
  state.checkpointSegmentId = segment.id;
  state.checkpointX = x;
  state.checkpointY = y;
  state.crab.score += SEGMENT_SCORE;
}

function attachSupport(state: GameState): void {
  const crab = state.crab;
  if (crab.mode !== "idle") return;
  const support = pickSupport(state.level, crab);
  if (support.kind !== "stone" && support.kind !== "hold") {
    crab.supportId = null;
    crab.supportKind = null;
    return;
  }
  if (crab.supportId !== support.id) {
    crab.supportId = support.id;
    crab.supportKind = support.kind;
    crab.rideOffsetX = crab.x - support.x;
    crab.rideOffsetY = crab.y - support.y;
  }
  crab.x = clamp(support.x + crab.rideOffsetX, CRAB_R, state.level.width - CRAB_R);
  crab.y = support.y + crab.rideOffsetY;
}

function decayFx(state: GameState, dt: number): void {
  state.hitFlashMs = Math.max(0, state.hitFlashMs - dt);
  state.toastMs = Math.max(0, state.toastMs - dt);
  if (state.toastMs === 0) state.toast = "";
}

function makeCrab(x: number, y: number, score = 0): Crab {
  return {
    x,
    y,
    facing: "n",
    mode: "idle",
    hopFromX: x,
    hopFromY: y,
    hopToX: x,
    hopToY: y,
    hopElapsedMs: 0,
    tuckElapsedMs: 0,
    tuckCooldownMs: 0,
    supportId: null,
    supportKind: null,
    rideOffsetX: 0,
    rideOffsetY: 0,
    lives: LIVES,
    score,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/sim.test.ts`

Expected: 11 passed, including a straight clear of level 1 and a car hit on a straight hop of level 2.

- [ ] **Step 5: Commit**

```bash
git add src/game/camera.ts src/game/sim.ts tests/helpers.ts tests/sim.test.ts
git commit -m "feat: simulate lives, checkpoints, and finishing a level"
```

---

### Task 6: Draw the yard and run the loop

**Files:**
- Create: `src/render/draw.ts`
- Create: `src/main.ts`
- Test: `tests/draw.test.ts`

**Interfaces:**
- Consumes: `createGame`, `tick`, `cameraTop`, `continueLabel`, `COPY`, `seatPosition`, `crabRadius`, input helpers, `STEP_MS`, `VIEW_H`, `VIEW_W`
- Produces: `drawFrame(ctx, state, camY, nowMs)`, `initialCamera(state)`, and the `frame` loop in `src/main.ts`

- [ ] **Step 1: Write the failing test**

`tests/draw.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { COPY } from "../src/game/copy";
import { blankInput } from "../src/game/input";
import { createGame, tick } from "../src/game/sim";
import { drawFrame } from "../src/render/draw";
import { startPlaying } from "./helpers";

describe("renderer", () => {
  it("draws the title, the play field, and the level-clear banner", () => {
    const ctx = fakeCtx();
    expect(() => drawFrame(ctx, createGame(), 0, 0)).not.toThrow();
    let state = startPlaying();
    state.crab.y = 10;
    state = tick(state, blankInput(), 16);
    expect(state.bannerTitle).toBe(COPY.finishedLevel);
    expect(() => drawFrame(ctx, state, 0, 1200)).not.toThrow();
  });
});

function fakeCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width: 480, height: 720 },
    measureText: () => ({ width: 80 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  return new Proxy(target, {
    get(obj, prop: string) {
      if (prop in obj) return obj[prop];
      const fn = () => undefined;
      obj[prop] = fn;
      return fn;
    },
    set(obj, prop: string, value) {
      obj[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/draw.test.ts`

Expected: FAIL because `../src/render/draw` cannot be resolved.

- [ ] **Step 3: Write the renderer and the loop**

The HUD draws `Emery is awesome` on every playing frame. The banner draws `state.bannerTitle` and `state.bannerBody`, which already contain the congratulations.

`src/render/draw.ts`

```ts
import { cameraTop } from "../game/camera";
import { COLOR, VIEW_H, VIEW_W } from "../game/constants";
import { COPY, continueLabel } from "../game/copy";
import { crabRadius } from "../game/crab";
import { seatPosition } from "../game/hazards";
import type { Car, GameState, Hold, Stone, Swing } from "../game/types";

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camY: number,
  nowMs: number,
): void {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (state.hitFlashMs > 0) {
    const kick = (state.hitFlashMs / 180) * 4;
    ctx.translate(Math.sin(nowMs * 0.08) * kick, 0);
  }
  ctx.translate(0, -camY);
  drawWorld(ctx, state, nowMs);
  drawCrab(ctx, state, nowMs);
  ctx.restore();
  drawHud(ctx, state);
  if (state.toastMs > 0 && state.phase === "playing") drawToast(ctx, state.toast);
  if (state.phase !== "playing") drawBanner(ctx, state, nowMs);
}

export function initialCamera(state: GameState): number {
  return cameraTop(state.crab.y, state.level.height, VIEW_H);
}

function drawWorld(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  for (const segment of state.level.segments) {
    drawSegmentGround(ctx, segment.kind, segment.y, segment.h);
    if (segment.kind === "wall") drawBricks(ctx, segment.y, segment.h);
    for (const stone of segment.stones) drawStone(ctx, stone);
    for (const hold of segment.holds) drawHold(ctx, hold);
    for (const swing of segment.swings) drawSwing(ctx, swing, state.elapsedMs / 1000);
    for (const car of segment.cars) drawCar(ctx, car, nowMs);
    if (segment.kind === "tunnel") {
      drawTunnel(ctx, segment.y, segment.h, segment.mouthH, segment.burrowH);
      for (const chamber of segment.chambers) {
        for (const stone of chamber.stones) drawStone(ctx, stone);
        for (const hold of chamber.holds) drawHold(ctx, hold);
        for (const swing of chamber.swings) drawSwing(ctx, swing, state.elapsedMs / 1000);
        for (const car of chamber.cars) drawCar(ctx, car, nowMs);
      }
    }
  }
}

function drawSegmentGround(ctx: CanvasRenderingContext2D, kind: string, y: number, h: number): void {
  ctx.fillStyle =
    kind === "road" ? COLOR.road : kind === "pond" ? COLOR.water : kind === "wall" ? COLOR.wall : kind === "tunnel" ? COLOR.tunnel : COLOR.grass;
  ctx.fillRect(0, y, VIEW_W, h);
  if (kind === "road") {
    ctx.strokeStyle = COLOR.roadLine;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(0, y + h / 2);
    ctx.lineTo(VIEW_W, y + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (kind === "pond") {
    ctx.fillStyle = COLOR.waterDeep;
    for (let i = 0; i < 4; i += 1) ctx.fillRect(20 + i * 120, y + 18 + (i % 2) * 36, 70, 6);
  }
  if (kind === "grass" || kind === "curb" || kind === "swings") {
    ctx.fillStyle = COLOR.grassDark;
    for (let x = 8; x < VIEW_W; x += 28) ctx.fillRect(x, y + 8, 3, h - 16);
  }
}

function drawBricks(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.strokeStyle = COLOR.wallMortar;
  ctx.lineWidth = 2;
  for (let row = 0; row < h; row += 24) {
    const offset = (row / 24) % 2 === 0 ? 0 : 20;
    for (let x = -20 + offset; x < VIEW_W; x += 40) {
      ctx.strokeRect(x, y + row, 40, 24);
    }
  }
}

function drawTunnel(ctx: CanvasRenderingContext2D, y: number, h: number, mouthH: number, burrowH: number): void {
  ctx.fillStyle = "rgba(20, 22, 26, 0.45)";
  ctx.fillRect(18, y, VIEW_W - 36, h);
  ctx.fillStyle = COLOR.burrow;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, y + burrowH * 0.45, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.sign;
  ctx.fillRect(110, y + h - mouthH - 36, 260, 28);
  ctx.fillStyle = COLOR.ink;
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(COPY.tunnel, VIEW_W / 2, y + h - mouthH - 17);
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, nowMs: number): void {
  const left = car.x - car.w / 2;
  const top = car.y - car.h / 2;
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(car.x, car.y + car.h * 0.45, car.w * 0.46, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, left, top, car.w, car.h, 6);
  ctx.fill();
  ctx.fillStyle = COLOR.carGlass;
  roundRect(ctx, left + car.w * 0.28, top + 3, car.w * 0.32, car.h - 6, 3);
  ctx.fill();
  const spin = (car.x + nowMs * 0.02) / 6;
  for (const wheel of [
    [left + 8, top - 2],
    [left + car.w - 14, top - 2],
    [left + 8, top + car.h - 4],
    [left + car.w - 14, top + car.h - 4],
  ]) {
    ctx.save();
    ctx.translate(wheel[0] + 3, wheel[1] + 3);
    ctx.rotate(spin);
    ctx.fillStyle = COLOR.tire;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = COLOR.hub;
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, stone: Stone): void {
  if (stone.submerged) {
    ctx.strokeStyle = COLOR.stoneRim;
    ctx.beginPath();
    ctx.ellipse(stone.x, stone.y, stone.r * 0.7, stone.r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y + stone.r * 0.35, stone.r * 0.8, stone.r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const shade = ctx.createLinearGradient(stone.x, stone.y - stone.r, stone.x, stone.y + stone.r);
  shade.addColorStop(0, COLOR.stoneRim);
  shade.addColorStop(0.45, COLOR.stone);
  shade.addColorStop(1, COLOR.stoneDark);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y, stone.r, stone.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwing(ctx: CanvasRenderingContext2D, swing: Swing, timeSec: number): void {
  const seat = seatPosition(swing, timeSec);
  ctx.strokeStyle = COLOR.rope;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(swing.pivotX - 8, swing.pivotY);
  ctx.lineTo(seat.x - 10, seat.y);
  ctx.moveTo(swing.pivotX + 8, swing.pivotY);
  ctx.lineTo(seat.x + 10, seat.y);
  ctx.stroke();
  ctx.fillStyle = COLOR.seat;
  roundRect(ctx, seat.x - 16, seat.y - 4, 32, 8, 2);
  ctx.fill();
}

function drawHold(ctx: CanvasRenderingContext2D, hold: Hold): void {
  if (!hold.visible) return;
  ctx.fillStyle = COLOR.hold;
  ctx.beginPath();
  ctx.arc(hold.x, hold.y, hold.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.holdHole;
  ctx.beginPath();
  ctx.arc(hold.x, hold.y, hold.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrab(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  const crab = state.crab;
  const radius = crabRadius(crab);
  const scuttle = crab.mode === "hopping" ? Math.sin(nowMs * 0.04) * 2 : 0;
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(crab.x, crab.y + radius * 0.8, radius * 1.1, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(crab.x, crab.y);
  if (crab.facing === "s") ctx.rotate(Math.PI);
  if (crab.facing === "e") ctx.rotate(Math.PI / 2);
  if (crab.facing === "w") ctx.rotate(-Math.PI / 2);
  if (crab.mode !== "tucked") {
    ctx.strokeStyle = COLOR.crabClaw;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const y = -6 + i * 6;
      ctx.beginPath();
      ctx.moveTo(-8, y);
      ctx.lineTo(-18 - scuttle, y - 4);
      ctx.moveTo(8, y);
      ctx.lineTo(18 + scuttle, y - 4);
      ctx.stroke();
    }
    ctx.fillStyle = COLOR.crabClaw;
    ctx.beginPath();
    ctx.ellipse(-16, -radius, 7, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(16, -radius, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOR.crabBody;
    ctx.beginPath();
    ctx.moveTo(-4, -radius);
    ctx.lineTo(-7, -radius - 10);
    ctx.moveTo(4, -radius);
    ctx.lineTo(7, -radius - 10);
    ctx.stroke();
    ctx.fillStyle = COLOR.eye;
    ctx.beginPath();
    ctx.arc(-7, -radius - 12, 2.2, 0, Math.PI * 2);
    ctx.arc(7, -radius - 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const shell = ctx.createRadialGradient(-4, -6, 2, 0, 0, radius + 4);
  shell.addColorStop(0, COLOR.crabBody);
  shell.addColorStop(0.55, COLOR.crabShell);
  shell.addColorStop(1, COLOR.crabShellDark);
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(0, 2, radius, radius * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.crabShellDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 2, radius * 0.45, 0.4, 3.4);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "rgba(247, 241, 230, 0.92)";
  ctx.fillRect(0, 0, VIEW_W, 58);
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "left";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(COPY.emery, 12, 22);
  ctx.font = "14px Trebuchet MS, sans-serif";
  ctx.fillText(`${state.level.name}   ${COPY.score} ${state.crab.score}`, 12, 44);
  ctx.textAlign = "right";
  const seconds = Math.max(0, Math.ceil((state.level.timeLimitMs - state.elapsedMs) / 1000));
  ctx.fillText(`${COPY.time} ${seconds}`, VIEW_W - 12, 44);
  for (let i = 0; i < state.crab.lives; i += 1) {
    ctx.fillStyle = COLOR.crabShell;
    ctx.beginPath();
    ctx.ellipse(VIEW_W - 28 - i * 18, 18, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawToast(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = COLOR.cream;
  ctx.fillRect(36, VIEW_H - 72, VIEW_W - 72, 40);
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.fillText(text, VIEW_W / 2, VIEW_H - 47);
}

function drawBanner(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (state.phase === "level-clear" || state.phase === "campaign-clear") drawConfetti(ctx, nowMs);
  ctx.fillStyle = COLOR.cream;
  roundRect(ctx, 36, 220, VIEW_W - 72, 230, 12);
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  const title =
    state.phase === "title"
      ? COPY.title
      : state.bannerTitle || state.level.name;
  const body =
    state.phase === "title"
      ? COPY.emery
      : state.bannerBody || state.level.intro;
  ctx.font = "700 28px Georgia, serif";
  wrapText(ctx, title, VIEW_W / 2, 280, VIEW_W - 120, 34);
  ctx.font = "18px Trebuchet MS, sans-serif";
  wrapText(ctx, body, VIEW_W / 2, 360, VIEW_W - 120, 26);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(continueLabel(state.phase), VIEW_W / 2, 420);
}

function drawConfetti(ctx: CanvasRenderingContext2D, nowMs: number): void {
  const colors = [COLOR.carRed, COLOR.carYellow, COLOR.carBlue, COLOR.carGreen, COLOR.crabShell];
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 97 + nowMs * 0.04) % VIEW_W;
    const y = (i * 53 + nowMs * 0.08) % 220;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y + 80, 6, 10);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (textWidth(ctx, trial) > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x, cursor);
}

function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const measured = ctx.measureText(text);
  return measured && typeof measured.width === "number" ? measured.width : text.length * 8;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
```

`src/main.ts`

```ts
import { cameraTop } from "./game/camera";
import { STEP_MS, VIEW_H } from "./game/constants";
import { continueLabel } from "./game/copy";
import { blankInput, buttonToInput, keyDown, mergeInput } from "./game/input";
import { createGame, tick } from "./game/sim";
import type { InputFrame } from "./game/types";
import { drawFrame } from "./render/draw";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing canvas");
const maybeContext = canvas.getContext("2d");
if (!maybeContext) throw new Error("missing canvas context");
const context: CanvasRenderingContext2D = maybeContext;
const continueButton = document.querySelector<HTMLButtonElement>("#continue");

let state = createGame();
let pending = blankInput();
let cam = cameraTop(state.crab.y, state.level.height, VIEW_H);
let last = performance.now();
let acc = 0;

function queue(input: InputFrame): void {
  pending = mergeInput(pending, input);
}

window.addEventListener("keydown", (event) => {
  const input = keyDown(event.code, state.phase);
  if (input.dx || input.dy || input.tuck || input.pause || input.confirm || input.start) {
    event.preventDefault();
    queue(input);
  }
});

document.querySelectorAll<HTMLButtonElement>("button[data-input]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    queue(buttonToInput(button.dataset.input ?? ""));
  });
});

canvas.addEventListener("pointerdown", () => {
  if (state.phase !== "playing") queue({ ...blankInput(), confirm: true, start: true });
});

function frame(now: number): void {
  acc += Math.min(100, now - last);
  last = now;
  let steps = 0;
  while (acc >= STEP_MS && steps < 5) {
    state = tick(state, pending, STEP_MS);
    pending = blankInput();
    acc -= STEP_MS;
    steps += 1;
  }
  if (continueButton) continueButton.textContent = continueLabel(state.phase);
  const target = cameraTop(state.crab.y, state.level.height, VIEW_H);
  cam += (target - cam) * 0.12;
  drawFrame(context, state, cam, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

- [ ] **Step 4: Run the test and the typecheck**

Run: `npx vitest run tests/draw.test.ts && npx tsc --noEmit`

Expected: 1 passed, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/render/draw.ts src/main.ts tests/draw.test.ts
git commit -m "feat: draw the yard and wire the game loop"
```

---

### Task 7: Player readme and the full check

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the controls and level rules above
- Produces: the player instructions

- [ ] **Step 1: Write the readme**

`README.md`

````markdown
# Hermit Crab Crossing

A Frogger-style crossing game. You play a hermit crab. Five backyards stand between the crab and the burrow, and every one of them ends in a tunnel.

Emery is awesome.

## Play

```bash
npm install
npm run dev
```

Then open the local address Vite prints. `npm test` runs the rules. `npm run build` typechecks and bundles the game.

## Controls

- Arrow keys or WASD, or the on-screen pad: hop one step.
- Space, or Tuck: pull into the shell. A tucked crab is harder to clip. You cannot hop while tucked, and the tuck has to cool down.
- Esc, or Pause: pause. Enter, a tap on the picture, or the big button: start, skip the intro, and continue.
- Up is toward the burrow.

## Levels

1. Emery's Driveway. The safe path is up the middle while you learn the toys.
2. Emery's Backyard. Stones drift, holds blink, and a Hot Wheels car owns the first lane until you wait.
3. Emery's Playground. Faster cars and swings that cross the middle.
4. Emery's Obstacle Course. Shorter time, quicker drift, a denser tunnel.
5. Emery's Tunnel. The tunnel is the longest part of the yard, and the last chamber runs every challenge at once.

Each level is a curb, a Hot Wheels road, stepping stones over water, swings, a climbing wall, and then the tunnel. The tunnel chambers, from the entrance to the burrow, are Hot Wheels, stepping stones, swings, climbing holds, and one combined chamber with all four. Reaching the lit burrow shows **You finished the level!** Finishing level 5 also tells you that you finished all 5 levels.

You get 4 lives, shown as shells. A hit returns you to the last safe entrance and says "Try again. Emery is awesome." The timer running out does the same. Lives refill at the next level. The score carries until a new game.

## Manual check

1. The title says Hermit Crab Crossing and Emery is awesome. The page header says it too.
2. Play level 1 by holding Up. The crab reaches the burrow without losing a life, and the banner says you finished the level.
3. On level 2, hop straight into the first lane and lose a life. Wait and cross after the car passes.
4. Tuck next to a car that only clips the legs. The shell saves you.
5. Stand on a drifting stone until it sinks, then hop off before it does.
6. Finish level 5. The banner congratulates the level and all 5 levels, and it says Emery is awesome.
````

- [ ] **Step 2: Run the full check**

Run: `npx vitest run && npx tsc --noEmit`

Expected: 30 passed, and `tsc` prints nothing.

- [ ] **Step 3: Play level 1 and level 2 by hand**

Run: `npm run dev` and open the printed local address.

Confirm all of these:

1. The title and the page header say Hermit Crab Crossing and Emery is awesome.
2. Holding Up on level 1 reaches the burrow with 4 lives left. The banner says `You finished the level!` and `Emery is awesome.`
3. On level 2, hopping straight into the first lane spends a life and says `Try again. Emery is awesome.`
4. Waiting for that car, then hopping, gets past the lane.
5. The HUD, pause screen, and tunnel sign all show Emery is awesome.
6. Finishing level 5 says you finished the level and that you finished all 5 levels.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: explain how to play Hermit Crab Crossing"
```

## Requirement map

| Request | Where it is locked |
| --- | --- |
| Frogger-style crossing | 48px hops, lanes, lives, timer, checkpoints in Tasks 2 and 5 |
| Hermit crab | Shell, tuck, smaller hurt circle in Tasks 2 and 6 |
| Realistic toys and yard | Orthographic canvas materials in Task 6 |
| Hot Wheels, stepping stones, swings, climbing wall | Tasks 3, 4, and 6 |
| Tunnel ending that combines every challenge | `tunnelBand` and the chamber-order test in Task 4 |
| Congratulate finishing the level | `COPY.finishedLevel` and the burrow branch inside `tick` in Tasks 1 and 5, drawn in Task 6 |
| Five levels | `campaignDrafts` and the name test in Task 4 |
| Emery is awesome throughout | `COPY`, `screenText`, the HUD, the tunnel sign, and `index.html` |

---
