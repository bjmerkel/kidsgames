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
export const MARK_ORDER = ["a", "c", "b", "d"];
export const WHEEL_TURNS = 4;

export const TIDE_MISSIONS = [
  { name: "Lamp Isle" },
  { name: "Stone Isle" },
  { name: "Vine Isle" },
  { name: "Wreck Isle" },
  { name: "Fort Isle" },
] as const;

export const DOORS: Door[] = [];

const DOCK_ROWS = [
  "~~~~~~~~~~~",
  "~.........~",
  "~.0.1.2...~",
  "~..P.*....~",
  "~...S.....~",
  "~.........~",
  "~...E.....~",
  "~~~~~~~~~~~",
];

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
  "~~~~~~~~~~~~~~~",
  "~.............~",
  "~..B..........~",
  "~.............~",
  "~..o..........~",
  "~..........B..~",
  "~..........o..~",
  "~..B..........~",
  "~..o..........~",
  "~....*........~",
  "~.....S.......~",
  "~.............~",
  "~.....E.......~",
  "~~~~~~~~~~~~~~~",
];

const CAVE_ROWS = [
  "~~~~~~~~~~~~~",
  "~.L.....K...~",
  "~...........~",
  "~VVVVVVVVVVV~",
  "~...........~",
  "~.....S.....~",
  "~...........~",
  "~.....E.....~",
  "~~~~~~~~~~~~~",
];

const WRECK_ROWS = [
  "############",
  "#..........#",
  "#..~.~.~.~.#",
  "#..#.#.#.#.#",
  "#..........#",
  "#..W.......#",
  "#S.........#",
  "#..........#",
  "#E.........#",
  "############",
];

const FORT_ROWS = [
  "~~~~~~~~~~~~~",
  "~.a...b.....~",
  "~....c......~",
  "~.......d...~",
  "~...........~",
  "~....*......~",
  "~.....S.....~",
  "~~~~~~~~~~~~~",
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
      else if (ch === "a" || ch === "b" || ch === "c" || ch === "d") room.marks.push({ x, y, id: ch });
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
  isle: parseRoom("isle", "Lamp Isle", DOCK_ROWS),
  light: parseRoom("light", "North Light", LIGHT_ROWS),
  ruins: parseRoom("ruins", "Stone Isle", RUINS_ROWS),
  cave: parseRoom("cave", "Vine Isle", CAVE_ROWS),
  wreck: parseRoom("wreck", "Wreck Isle", WRECK_ROWS),
  fort: parseRoom("fort", "Fort Isle", FORT_ROWS),
  gold: parseRoom("gold", "Gold Beach", GOLD_ROWS),
};

export const ISLE_VINES = ROOMS.isle.vineSpawns.map((spot) => ({ ...spot }));
export const RUIN_BOULDERS = ROOMS.ruins.boulderSpawns.map((spot) => ({ ...spot }));
