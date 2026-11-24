export type Spot = {
  id: string;
  label: string;
  clue: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type EscapeRoom = {
  id: string;
  name: string;
  grade: string;
  code: string;
  blurb: string;
  wall: string;
  spots: Spot[];
};

export type KeyName = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "clear" | "open" | "pause" | "close";

export type KeySpot = {
  name: KeyName;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const NOTE_CLOSE: KeySpot = { name: "close", x: 160, y: 332, w: 160, h: 52 };

const KEY_W = 88;
const KEY_H = 52;

function keyAt(col: number, row: number, name: KeyName, w = KEY_W): KeySpot {
  return { name, x: 16 + col * 96, y: 468 + row * 60, w, h: KEY_H };
}

export const ESCAPE_KEYS: KeySpot[] = [
  keyAt(0, 0, "1"),
  keyAt(1, 0, "2"),
  keyAt(2, 0, "3"),
  keyAt(0, 1, "4"),
  keyAt(1, 1, "5"),
  keyAt(2, 1, "6"),
  keyAt(0, 2, "7"),
  keyAt(1, 2, "8"),
  keyAt(2, 2, "9"),
  keyAt(0, 3, "clear"),
  keyAt(1, 3, "0"),
  keyAt(2, 3, "open"),
  { name: "pause", x: 312, y: 648, w: 152, h: KEY_H },
];

function inside(spot: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= spot.x && y >= spot.y && x < spot.x + spot.w && y < spot.y + spot.h;
}

export function hitEscape(x: number, y: number, noteOpen: boolean): { kind: "spot"; id: string } | { kind: "key"; name: KeyName } | null {
  const key = ESCAPE_KEYS.find((spot) => inside(spot, x, y));
  if (key) return { kind: "key", name: key.name };
  if (noteOpen && inside(NOTE_CLOSE, x, y)) return { kind: "key", name: "close" };
  if (noteOpen && y < 420) return null;
  return null;
}

export const ESCAPE_ROOMS: EscapeRoom[] = [
  {
    id: "desk",
    name: "Desk Room",
    grade: "4th grade",
    code: "582",
    blurb: "Read the notes. Type the lock.",
    wall: "#d7ecf3",
    spots: [
      { id: "poster", label: "Poster", clue: "The first number is 5.", x: 24, y: 90, w: 200, h: 120 },
      { id: "clock", label: "Clock", clue: "The middle number is 8.", x: 244, y: 90, w: 200, h: 120 },
      { id: "book", label: "Book", clue: "The last number is 2.", x: 24, y: 230, w: 200, h: 150 },
      { id: "door", label: "Door", clue: "Put the three numbers in that order.", x: 244, y: 230, w: 200, h: 150 },
    ],
  },
  {
    id: "library",
    name: "Library",
    grade: "7th grade",
    code: "454",
    blurb: "Do the math on each note.",
    wall: "#efe4cf",
    spots: [
      { id: "note", label: "Note", clue: "The first digit is 12 divided by 3.", x: 24, y: 90, w: 420, h: 70 },
      { id: "shelf", label: "Shelf", clue: "Start with 9 books. Take away 4. That is the middle digit.", x: 24, y: 176, w: 200, h: 200 },
      { id: "sign", label: "Sign", clue: "The last digit is how many letters are in LOCK.", x: 244, y: 176, w: 200, h: 120 },
      { id: "door", label: "Door", clue: "Use the first, then the middle, then the last.", x: 244, y: 312, w: 200, h: 70 },
    ],
  },
  {
    id: "lab",
    name: "Science Lab",
    grade: "Freshman",
    code: "784",
    blurb: "Solve each clue, then the lock.",
    wall: "#d9f2e4",
    spots: [
      { id: "beaker", label: "Beaker", clue: "2 times a number is 14. The first digit is that number.", x: 24, y: 90, w: 130, h: 180 },
      { id: "chart", label: "Chart", clue: "The middle digit comes next: 2, 4, 6.", x: 170, y: 90, w: 270, h: 120 },
      { id: "tile", label: "Tile", clue: "A hexagon has 6 sides. Take away 2. That is the last digit.", x: 170, y: 226, w: 270, h: 150 },
      { id: "door", label: "Door", clue: "First, then middle, then last.", x: 24, y: 286, w: 130, h: 90 },
    ],
  },
  {
    id: "study",
    name: "Study",
    grade: "Senior",
    code: "453",
    blurb: "Only one code fits every note.",
    wall: "#e7e0f2",
    spots: [
      { id: "card", label: "Card", clue: "The middle digit is 5. The three digits add up to 12. No digit repeats.", x: 24, y: 90, w: 420, h: 100 },
      { id: "slip", label: "Slip", clue: "The first digit is even. The last digit is odd. The first is bigger than the last.", x: 24, y: 206, w: 200, h: 170 },
      { id: "margin", label: "Margin", clue: "The first digit is smaller than 5.", x: 244, y: 206, w: 200, h: 100 },
      { id: "door", label: "Door", clue: "Only one code fits every note.", x: 244, y: 322, w: 200, h: 60 },
    ],
  },
  {
    id: "archive",
    name: "Archive",
    grade: "College",
    code: "234",
    blurb: "Read carefully. Then open the lock.",
    wall: "#f3e3d4",
    spots: [
      { id: "page", label: "Page", clue: "The first digit is the remainder when 23 is divided by 7.", x: 24, y: 90, w: 200, h: 180 },
      { id: "slate", label: "Slate", clue: "The middle digit is the last digit of 7 times 7 times 7.", x: 244, y: 90, w: 200, h: 120 },
      { id: "list", label: "List", clue: "The last digit is how many prime numbers are smaller than 10.", x: 244, y: 226, w: 200, h: 150 },
      { id: "door", label: "Door", clue: "First, then middle, then last.", x: 24, y: 286, w: 200, h: 90 },
    ],
  },
];

export function roomSpots(levelIndex: number): Spot[] {
  return ESCAPE_ROOMS[levelIndex]?.spots ?? [];
}

export function spotHit(levelIndex: number, x: number, y: number, noteOpen: boolean): { kind: "spot"; id: string } | { kind: "key"; name: KeyName } | null {
  const key = hitEscape(x, y, noteOpen);
  if (key) return key;
  if (noteOpen) return null;
  const spot = roomSpots(levelIndex).find((item) => inside(item, x, y));
  return spot ? { kind: "spot", id: spot.id } : null;
}
