export type ShapeName = "circle" | "square" | "triangle" | "star";

export type BeadColor = "coral" | "gold" | "teal" | "grape";

export type Bead = {
  shape: ShapeName;
  color: BeadColor;
  big: boolean;
};

export type PatternKind = "abab" | "abc" | "aabb";

export type PatternFocus = "color" | "shape" | "pair" | "three" | "size";

export type PatternRound = {
  kind: PatternKind;
  beads: Bead[];
  choices: Bead[];
  answer: number;
};

export type PatternLevel = {
  name: string;
  blurb: string;
  focus: PatternFocus;
  rounds: PatternRound[];
};

export const CHOICE_BOXES = [
  { x: 16, y: 500, w: 136, h: 160 },
  { x: 164, y: 500, w: 136, h: 160 },
  { x: 312, y: 500, w: 136, h: 160 },
];

export const PAUSE_BOX = { x: 364, y: 16, w: 100, h: 44 };

const SHAPES: ShapeName[] = ["circle", "square", "triangle", "star"];
const COLORS: BeadColor[] = ["coral", "gold", "teal", "grape"];

const BANDS: { focus: PatternFocus; name: string; blurb: string }[][] = [
  [
    { focus: "color", name: "Color Twins", blurb: "Same shape. Take turns." },
    { focus: "color", name: "Color Parade", blurb: "Same shape. Take turns." },
    { focus: "color", name: "Color Hop", blurb: "Same shape. Take turns." },
    { focus: "color", name: "Color Line", blurb: "Same shape. Take turns." },
    { focus: "color", name: "Color Again", blurb: "Same shape. Take turns." },
  ],
  [
    { focus: "shape", name: "Shape Twins", blurb: "Same color. Take turns." },
    { focus: "shape", name: "Shape Parade", blurb: "Same color. Take turns." },
    { focus: "shape", name: "Shape Hop", blurb: "Same color. Take turns." },
    { focus: "shape", name: "Shape Line", blurb: "Same color. Take turns." },
    { focus: "shape", name: "Shape Again", blurb: "Same color. Take turns." },
  ],
  [
    { focus: "pair", name: "Double Dots", blurb: "Two, then two." },
    { focus: "pair", name: "Two by Two", blurb: "Two, then two." },
    { focus: "pair", name: "Pair Row", blurb: "Two, then two." },
    { focus: "pair", name: "Pair Hop", blurb: "Two, then two." },
    { focus: "pair", name: "Pair Again", blurb: "Two, then two." },
  ],
  [
    { focus: "three", name: "Three Friends", blurb: "Three, then again." },
    { focus: "three", name: "Three Parade", blurb: "Three, then again." },
    { focus: "three", name: "Three Hop", blurb: "Three, then again." },
    { focus: "three", name: "Three Line", blurb: "Three, then again." },
    { focus: "three", name: "Three Again", blurb: "Three, then again." },
  ],
  [
    { focus: "size", name: "Big and Small", blurb: "Big, small, big, small." },
    { focus: "size", name: "Size Twins", blurb: "Big, small, big, small." },
    { focus: "size", name: "Size Parade", blurb: "Big, small, big, small." },
    { focus: "size", name: "Size Hop", blurb: "Big, small, big, small." },
    { focus: "size", name: "Size Again", blurb: "Big, small, big, small." },
  ],
];

export function bead(shape: ShapeName, color: BeadColor, big = true): Bead {
  return { shape, color, big };
}

export function sameBead(a: Bead, b: Bead): boolean {
  return a.shape === b.shape && a.color === b.color && a.big === b.big;
}

export function beadKey(item: Bead): string {
  return `${item.shape}-${item.color}-${item.big}`;
}

export function expectedNext(round: PatternRound): Bead {
  const count = round.beads.length;
  if (round.kind === "abab") return round.beads[count % 2];
  if (round.kind === "abc") return round.beads[count % 3];
  const pair = Math.floor(count / 2) % 2;
  return pair === 0 ? round.beads[0] : round.beads[2];
}

function rng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const hold = copy[index];
    copy[index] = copy[swap];
    copy[swap] = hold;
  }
  return copy;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function others<T>(items: readonly T[], used: T[], random: () => number, count: number): T[] {
  return shuffle(items.filter((item) => !used.includes(item)), random).slice(0, count);
}

function makeRound(kind: PatternKind, beads: Bead[], wrongs: [Bead, Bead], answerSlot: 0 | 1 | 2): PatternRound {
  const draft: PatternRound = { kind, beads, choices: [], answer: 0 };
  const answer = expectedNext(draft);
  const pool = [answer, wrongs[0], wrongs[1]];
  const order = answerSlot === 0 ? [0, 1, 2] : answerSlot === 1 ? [1, 0, 2] : [1, 2, 0];
  draft.choices = order.map((index) => pool[index]);
  draft.answer = order.indexOf(0);
  return draft;
}

function buildRound(focus: PatternFocus, random: () => number): PatternRound {
  const slot = Math.floor(random() * 3) as 0 | 1 | 2;
  if (focus === "color" || focus === "shape" || focus === "size") {
    const shown = random() < 0.45 ? 5 : 4;
    const shape = pick(SHAPES, random);
    const color = pick(COLORS, random);
    if (focus === "color") {
      const second = others(COLORS, [color], random, 1)[0];
      const beads = Array.from({ length: shown }, (_, index) => bead(shape, index % 2 === 0 ? color : second));
      const answer = expectedNext({ kind: "abab", beads, choices: [], answer: 0 });
      const [left, right] = others(COLORS, [answer.color], random, 2);
      return makeRound("abab", beads, [bead(shape, left), bead(shape, right)], slot);
    }
    if (focus === "shape") {
      const second = others(SHAPES, [shape], random, 1)[0];
      const beads = Array.from({ length: shown }, (_, index) => bead(index % 2 === 0 ? shape : second, color));
      const answer = expectedNext({ kind: "abab", beads, choices: [], answer: 0 });
      const [left, right] = others(SHAPES, [answer.shape], random, 2);
      return makeRound("abab", beads, [bead(left, color), bead(right, color)], slot);
    }
    const beads = Array.from({ length: shown }, (_, index) => bead(shape, color, index % 2 === 0));
    const answer = expectedNext({ kind: "abab", beads, choices: [], answer: 0 });
    const otherShape = others(SHAPES, [shape], random, 1)[0];
    return makeRound("abab", beads, [bead(shape, color, !answer.big), bead(otherShape, color, answer.big)], slot);
  }
  if (focus === "pair") {
    const shape = pick(SHAPES, random);
    const color = pick(COLORS, random);
    const byShape = random() < 0.5;
    const secondShape = others(SHAPES, [shape], random, 1)[0];
    const secondColor = others(COLORS, [color], random, 1)[0];
    const first = bead(shape, color);
    const second = byShape ? bead(secondShape, color) : bead(shape, secondColor);
    const beads = [first, first, second, second];
    const answer = expectedNext({ kind: "aabb", beads, choices: [], answer: 0 });
    const spare = byShape ? bead(others(SHAPES, [shape, secondShape], random, 1)[0], color) : bead(shape, others(COLORS, [color, secondColor], random, 1)[0]);
    return makeRound("aabb", beads, [second, spare], slot);
  }
  const byShape = random() < 0.5;
  const shape = pick(SHAPES, random);
  const color = pick(COLORS, random);
  const shapes = [shape, ...others(SHAPES, [shape], random, 2)];
  const colors = [color, ...others(COLORS, [color], random, 2)];
  const cycle = [0, 1, 2].map((index) => bead(byShape ? shapes[index] : shape, byShape ? color : colors[index]));
  const beads = [0, 1, 2, 0, 1].map((index) => cycle[index]);
  const answer = expectedNext({ kind: "abc", beads, choices: [], answer: 0 });
  return makeRound("abc", beads, [cycle[0], cycle[1]], slot);
}

function buildRounds(focus: PatternFocus, random: () => number): PatternRound[] {
  const rounds: PatternRound[] = [];
  let guard = 0;
  while (rounds.length < 4 && guard < 30) {
    guard += 1;
    const round = buildRound(focus, random);
    const key = round.beads.map(beadKey).join("|");
    if (rounds.some((existing) => existing.beads.map(beadKey).join("|") === key)) continue;
    rounds.push(round);
  }
  while (rounds.length < 4) rounds.push(buildRound(focus, random));
  return rounds;
}

export function dealPattern(seed: number): PatternLevel[] {
  const random = rng(seed);
  return BANDS.flatMap((band) => shuffle(band, random).map((level) => ({
    name: level.name,
    blurb: level.blurb,
    focus: level.focus,
    rounds: buildRounds(level.focus, random),
  })));
}

export const PATTERN_LEVELS = dealPattern(1);

export function choiceAt(x: number, y: number): number | null {
  const index = CHOICE_BOXES.findIndex((box) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);
  return index < 0 ? null : index;
}

export function pauseAt(x: number, y: number): boolean {
  return x >= PAUSE_BOX.x && x < PAUSE_BOX.x + PAUSE_BOX.w && y >= PAUSE_BOX.y && y < PAUSE_BOX.y + PAUSE_BOX.h;
}
