import type { PadSpot } from "../game/touchpad";

export const TIDE_SPOTS: readonly PadSpot[] = [
  { name: "up", label: "Up", x: 78, y: 588, w: 64, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "left", label: "Left", x: 12, y: 640, w: 64, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "down", label: "Down", x: 78, y: 640, w: 64, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "right", label: "Right", x: 144, y: 640, w: 64, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "look", label: "Look", x: 230, y: 612, w: 100, h: 76, tone: "gold", hold: false, pulse: true },
  { name: "chart", label: "Chart", x: 344, y: 588, w: 120, h: 48, tone: "cream", hold: false, pulse: true },
  { name: "pause", label: "Pause", x: 344, y: 648, w: 120, h: 48, tone: "cream", hold: false, pulse: true },
];
