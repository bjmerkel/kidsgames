export type ShapeName = "circle" | "square" | "triangle" | "star";

export type BeadColor = "coral" | "gold" | "teal" | "grape";

export type Bead = {
  shape: ShapeName;
  color: BeadColor;
  big: boolean;
};

export type PatternKind = "abab" | "abc" | "aabb";

export type PatternRound = {
  kind: PatternKind;
  beads: Bead[];
  choices: Bead[];
  answer: number;
};

export type PatternLevel = {
  name: string;
  blurb: string;
  rounds: PatternRound[];
};

export const CHOICE_BOXES = [
  { x: 16, y: 500, w: 136, h: 160 },
  { x: 164, y: 500, w: 136, h: 160 },
  { x: 312, y: 500, w: 136, h: 160 },
];

export const PAUSE_BOX = { x: 364, y: 16, w: 100, h: 44 };

export function bead(shape: ShapeName, color: BeadColor, big = true): Bead {
  return { shape, color, big };
}

export function sameBead(a: Bead, b: Bead): boolean {
  return a.shape === b.shape && a.color === b.color && a.big === b.big;
}

export function expectedNext(round: PatternRound): Bead {
  const count = round.beads.length;
  if (round.kind === "abab") return round.beads[count % 2];
  if (round.kind === "abc") return round.beads[count % 3];
  const pair = Math.floor(count / 2) % 2;
  return pair === 0 ? round.beads[0] : round.beads[2];
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

const circle = (color: BeadColor, big = true) => bead("circle", color, big);
const square = (color: BeadColor, big = true) => bead("square", color, big);
const triangle = (color: BeadColor, big = true) => bead("triangle", color, big);
const star = (color: BeadColor, big = true) => bead("star", color, big);

export const PATTERN_LEVELS: PatternLevel[] = [
  {
    name: "Color Twins",
    blurb: "Same shape. Take turns.",
    rounds: [
      makeRound("abab", [circle("coral"), circle("gold"), circle("coral"), circle("gold")], [circle("teal"), circle("grape")], 1),
      makeRound("abab", [circle("teal"), circle("grape"), circle("teal"), circle("grape")], [circle("coral"), circle("gold")], 0),
      makeRound("abab", [circle("gold"), circle("coral"), circle("gold"), circle("coral")], [circle("grape"), circle("teal")], 2),
      makeRound("abab", [circle("grape"), circle("teal"), circle("grape"), circle("teal")], [circle("gold"), circle("coral")], 1),
    ],
  },
  {
    name: "Shape Twins",
    blurb: "Same color. Take turns.",
    rounds: [
      makeRound("abab", [circle("gold"), square("gold"), circle("gold"), square("gold")], [triangle("gold"), star("gold")], 0),
      makeRound("abab", [triangle("gold"), star("gold"), triangle("gold"), star("gold")], [circle("gold"), square("gold")], 2),
      makeRound("abab", [square("gold"), circle("gold"), square("gold"), circle("gold")], [star("gold"), triangle("gold")], 1),
      makeRound("abab", [star("gold"), triangle("gold"), star("gold"), triangle("gold")], [square("gold"), circle("gold")], 0),
    ],
  },
  {
    name: "Three Friends",
    blurb: "Three, then again.",
    rounds: [
      makeRound("abc", [circle("gold"), square("gold"), triangle("gold"), circle("gold"), square("gold")], [star("gold"), circle("gold")], 1),
      makeRound("abc", [star("coral"), circle("coral"), square("coral"), star("coral"), circle("coral")], [triangle("coral"), star("coral")], 0),
      makeRound("abc", [circle("coral"), circle("gold"), circle("teal"), circle("coral"), circle("gold")], [circle("grape"), circle("coral")], 2),
      makeRound("abc", [triangle("teal"), square("teal"), circle("teal"), triangle("teal"), square("teal")], [star("teal"), triangle("teal")], 1),
    ],
  },
  {
    name: "Double Dots",
    blurb: "Two, then two.",
    rounds: [
      makeRound("aabb", [circle("coral"), circle("coral"), circle("gold"), circle("gold")], [circle("gold"), circle("teal")], 1),
      makeRound("aabb", [circle("gold"), circle("gold"), square("gold"), square("gold")], [square("gold"), star("gold")], 2),
      makeRound("aabb", [circle("teal"), circle("teal"), circle("grape"), circle("grape")], [circle("grape"), circle("coral")], 0),
      makeRound("aabb", [star("coral"), star("coral"), triangle("coral"), triangle("coral")], [triangle("coral"), circle("coral")], 1),
    ],
  },
  {
    name: "Big and Small",
    blurb: "Big, small, big, small.",
    rounds: [
      makeRound("abab", [circle("coral", true), circle("coral", false), circle("coral", true), circle("coral", false)], [circle("coral", false), square("coral", true)], 0),
      makeRound("abab", [square("gold", true), square("gold", false), square("gold", true), square("gold", false)], [square("gold", false), circle("gold", true)], 2),
      makeRound("abab", [circle("coral", true), circle("gold", false), circle("coral", true), circle("gold", false)], [circle("gold", false), circle("gold", true)], 1),
      makeRound("abab", [triangle("teal", true), star("teal", false), triangle("teal", true), star("teal", false)], [star("teal", false), circle("teal", true)], 0),
    ],
  },
];

export function choiceAt(x: number, y: number): number | null {
  const index = CHOICE_BOXES.findIndex((box) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h);
  return index < 0 ? null : index;
}

export function pauseAt(x: number, y: number): boolean {
  return x >= PAUSE_BOX.x && x < PAUSE_BOX.x + PAUSE_BOX.w && y >= PAUSE_BOX.y && y < PAUSE_BOX.y + PAUSE_BOX.h;
}
