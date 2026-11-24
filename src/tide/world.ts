export type RoomId = "isle" | "light" | "ruins" | "cave" | "wreck" | "fort" | "gold";

export type Flag = "chart" | "light" | "cutlass" | "lantern" | "cave" | "key" | "fort";

export type Door = {
  id: string;
  x: number;
  y: number;
  to: RoomId;
  need: Flag;
  lock: string;
  backX: number;
  backY: number;
};

export type Spot = { x: number; y: number };

export type Room = {
  id: RoomId;
  name: string;
  floor: string[];
  spawn: Spot;
  exit: Spot | null;
  lamps: { x: number; y: number; n: number }[];
  marks: { x: number; y: number; id: string }[];
  chests: { x: number; y: number; id: string }[];
  plates: Spot[];
  boulderSpawns: Spot[];
  wheel: Spot | null;
  crystal: Spot | null;
  parrot: Spot | null;
  vineSpawns: Spot[];
  doors: Spot[];
};

export const LAMP_ORDER = [0, 2, 1];
export const MARK_ORDER = ["a", "c", "b"];
export const WHEEL_TURNS = 3;

export const DOORS: Door[] = [
  { id: "light", x: 8, y: 2, to: "light", need: "chart", lock: "Talk to the parrot first.", backX: 8, backY: 3 },
  { id: "ruins", x: 2, y: 8, to: "ruins", need: "light", lock: "Light the lamps first.", backX: 3, backY: 8 },
  { id: "cave", x: 12, y: 8, to: "cave", need: "cutlass", lock: "Cut the vines first.", backX: 11, backY: 8 },
  { id: "wreck", x: 13, y: 16, to: "wreck", need: "cave", lock: "Wake the crystal first.", backX: 13, backY: 15 },
  { id: "fort", x: 6, y: 18, to: "fort", need: "key", lock: "Turn the wheel first.", backX: 6, backY: 19 },
  { id: "gold", x: 4, y: 20, to: "gold", need: "fort", lock: "Touch the fort marks first.", backX: 5, backY: 20 },
];

const WIDTH = 20;
const HEIGHT = 32;

function paintIsle(): string[] {
  const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill("~"));
  const put = (x: number, y: number, ch: string) => {
    if (y >= 0 && x >= 0 && y < HEIGHT && x < WIDTH) grid[y][x] = ch;
  };
  for (let y = 2; y <= 5; y += 1) {
    for (let x = 6; x <= 11; x += 1) put(x, y, ",");
  }
  for (let y = 2; y <= 22; y += 1) put(8, y, ".");
  put(8, 2, "D");
  for (let x = 2; x <= 8; x += 1) put(x, 8, ".");
  put(2, 8, "D");
  put(9, 8, "V");
  put(10, 8, "V");
  put(11, 8, "V");
  put(12, 8, "D");
  for (let y = 13; y <= 15; y += 1) {
    for (let x = 8; x <= 13; x += 1) put(x, y, ".");
  }
  put(13, 16, "D");
  put(8, 16, ".");
  for (let x = 6; x <= 8; x += 1) put(x, 18, ".");
  put(6, 18, "D");
  put(6, 19, ".");
  put(8, 19, ".");
  for (let x = 4; x <= 8; x += 1) put(x, 20, ".");
  put(4, 20, "D");
  put(7, 21, "P");
  put(8, 21, ".");
  put(8, 22, "S");
  return grid.map((row) => row.join(""));
}

const LIGHT_ROWS = [
  "#########",
  "#0.1.2..#",
  "#.......#",
  "#.......#",
  "#...*...#",
  "#...S...#",
  "#...E...#",
  "#########",
];

const RUINS_ROWS = [
  "###########",
  "#.........#",
  "#..B......#",
  "#.........#",
  "#..o......#",
  "#......B..#",
  "#.........#",
  "#......o..#",
  "#....*....#",
  "#....S....#",
  "#....E....#",
  "###########",
];

const CAVE_ROWS = [
  "#############",
  "#L........K.#",
  "#.#######.#.#",
  "#.#.....#...#",
  "#.#.###.###.#",
  "#...#.......#",
  "#.#####.###.#",
  "#S..........#",
  "#E..........#",
  "#############",
];

const WRECK_ROWS = [
  "############",
  "#E.#.....~W#",
  "#S.#.~.~.~.#",
  "#..#.#.#.#.#",
  "#..#.......#",
  "#..#######.#",
  "#..........#",
  "############",
];

const FORT_ROWS = [
  "#########",
  "#.a.b.c.#",
  "#.......#",
  "#...*...#",
  "#...S...#",
  "#...E...#",
  "#########",
];

const GOLD_ROWS = [
  "#######",
  "#..*..#",
  "#..S..#",
  "#..E..#",
  "#######",
];

function parseRoom(id: RoomId, name: string, rows: string[]): Room {
  const floor = rows.map((row) => row);
  const room: Room = {
    id,
    name,
    floor,
    spawn: { x: 1, y: 1 },
    exit: null,
    lamps: [],
    marks: [],
    chests: [],
    plates: [],
    boulderSpawns: [],
    wheel: null,
    crystal: null,
    parrot: null,
    vineSpawns: [],
    doors: [],
  };
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      const keep = "#.~w,><^v";
      if (keep.includes(ch)) continue;
      floor[y] = floor[y].slice(0, x) + "." + floor[y].slice(x + 1);
      if (ch === "S") room.spawn = { x, y };
      else if (ch === "E") room.exit = { x, y };
      else if (ch === "D") room.doors.push({ x, y });
      else if (ch === "B") room.boulderSpawns.push({ x, y });
      else if (ch === "o") {
        floor[y] = floor[y].slice(0, x) + "o" + floor[y].slice(x + 1);
        room.plates.push({ x, y });
      } else if (ch === "V") room.vineSpawns.push({ x, y });
      else if (ch === "P") room.parrot = { x, y };
      else if (ch === "0" || ch === "1" || ch === "2") room.lamps.push({ x, y, n: Number(ch) });
      else if (ch === "a" || ch === "b" || ch === "c") room.marks.push({ x, y, id: ch });
      else if (ch === "L") room.chests.push({ x, y, id: "lantern" });
      else if (ch === "*") room.chests.push({ x, y, id });
      else if (ch === "W") room.wheel = { x, y };
      else if (ch === "K") room.crystal = { x, y };
      else if (ch === "w") floor[y] = floor[y].slice(0, x) + "w" + floor[y].slice(x + 1);
    }
  });
  return room;
}

export const ROOMS: Record<RoomId, Room> = {
  isle: parseRoom("isle", "Gull Isle", paintIsle()),
  light: parseRoom("light", "North Light", LIGHT_ROWS),
  ruins: parseRoom("ruins", "Stone Sleep", RUINS_ROWS),
  cave: parseRoom("cave", "Vine Cave", CAVE_ROWS),
  wreck: parseRoom("wreck", "Wreck Wash", WRECK_ROWS),
  fort: parseRoom("fort", "Skull Fort", FORT_ROWS),
  gold: parseRoom("gold", "Gold Beach", GOLD_ROWS),
};

export const ISLE_VINES = ROOMS.isle.vineSpawns.map((spot) => ({ ...spot }));
export const RUIN_BOULDERS = ROOMS.ruins.boulderSpawns.map((spot) => ({ ...spot }));
