import { VIEW_H, VIEW_W } from "./constants";
import { PAD_GAP, pauseSpot, type PadSpot } from "./touchpad";

const CHIP_Y = 676;
const CHIP_H = 36;

function chip(name: string, label: string, x: number): PadSpot {
  return { name, label, x, y: CHIP_Y, w: 210, h: CHIP_H, tone: "cream", hold: false, pulse: true };
}

export const CRAB_SPOTS: readonly PadSpot[] = [
  { name: "up", label: "Up", x: 78, y: 552, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "left", label: "Left", x: 12, y: 606, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "right", label: "Right", x: 144, y: 606, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "down", label: "Down", x: 78, y: 660, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "tuck", label: "Tuck", x: 292, y: 606, w: 172, h: 96, tone: "gold", hold: false, pulse: true },
  pauseSpot(),
];

export const RACE_SPOTS: readonly PadSpot[] = [
  { name: "left", label: "Left", x: 12, y: 624, w: 108, h: 80, tone: "cream", hold: true, pulse: false },
  { name: "brake", label: "Brake", x: 128, y: 624, w: 108, h: 80, tone: "navy", hold: true, pulse: false },
  { name: "right", label: "Right", x: 244, y: 624, w: 108, h: 80, tone: "cream", hold: true, pulse: false },
  { name: "use", label: "Use", x: 360, y: 624, w: 108, h: 80, tone: "gold", hold: false, pulse: true },
  pauseSpot(116),
];

export const FISH_SPOTS: readonly PadSpot[] = [
  { name: "up", label: "Up", x: 78, y: 552, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "left", label: "Left", x: 12, y: 606, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "right", label: "Right", x: 144, y: 606, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "down", label: "Down", x: 78, y: 660, w: 78, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "catch", label: "Catch", x: 292, y: 606, w: 172, h: 96, tone: "gold", hold: false, pulse: true },
  pauseSpot(),
];

export const AXO_SPOTS: readonly PadSpot[] = [
  { name: "left", label: "Left", x: 12, y: 400, w: 100, h: 150, tone: "cream", hold: true, pulse: false },
  { name: "right", label: "Right", x: VIEW_W - 112, y: 400, w: 100, h: 150, tone: "cream", hold: true, pulse: false },
  { name: "fire", label: "Bubble", x: 150, y: 668, w: 180, h: 44, tone: "gold", hold: true, pulse: false },
  pauseSpot(),
];

const RAIL_W = 108;
const RAIL_H = 78;
const RAIL_Y = 392;
const RAIL_RIGHT = VIEW_W - 12 - RAIL_W;

function rail(name: string, label: string, x: number, row: 0 | 1, tone: PadSpot["tone"], hold: boolean, pulse: boolean, tall = false): PadSpot {
  return { name, label, x, y: RAIL_Y + row * (RAIL_H + PAD_GAP), w: RAIL_W, h: tall ? RAIL_H * 2 + PAD_GAP : RAIL_H, tone, hold, pulse };
}

export const RASCAL_SPOTS: readonly PadSpot[] = [
  rail("left", "Left", 12, 0, "cream", true, false),
  rail("right", "Right", 12, 1, "cream", true, false),
  rail("jump", "Jump", RAIL_RIGHT, 0, "gold", true, true),
  rail("web", "Web", RAIL_RIGHT, 1, "navy", false, true),
  pauseSpot(),
];

export const CAPY_SPOTS: readonly PadSpot[] = [
  rail("left", "Left", 12, 0, "cream", true, false),
  rail("right", "Right", 12, 1, "cream", true, false),
  rail("jump", "Jump", RAIL_RIGHT, 0, "gold", true, true, true),
  pauseSpot(),
];

export const WADDLE_SPOTS: readonly PadSpot[] = [
  { name: "pause", label: "Pause", x: 188, y: 28, w: 104, h: 36, tone: "cream", hold: false, pulse: true },
];

export const LOOK_SPOTS: readonly PadSpot[] = [chip("hint", "Hint", 16), chip("pause", "Pause", 254)];

export function spotsInside(spots: readonly PadSpot[]): boolean {
  return spots.every((spot) => spot.x >= 0 && spot.y >= 0 && spot.x + spot.w <= VIEW_W && spot.y + spot.h <= VIEW_H);
}
