import type { PadSpot } from "../game/touchpad";

export const TIDE_SPOTS: readonly PadSpot[] = [
  { name: "look", label: "Look", x: 12, y: 640, w: 200, h: 64, tone: "gold", hold: false, pulse: true },
  { name: "chart", label: "Chart", x: 224, y: 640, w: 120, h: 64, tone: "cream", hold: false, pulse: true },
  { name: "pause", label: "Pause", x: 356, y: 640, w: 112, h: 64, tone: "cream", hold: false, pulse: true },
];
