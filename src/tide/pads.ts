import type { PadSpot } from "../game/touchpad";

export const TIDE_SPOTS: readonly PadSpot[] = [
  { name: "up", label: "Up", x: 70, y: 576, w: 72, h: 48, tone: "cream", hold: true, pulse: false },
  { name: "left", label: "Left", x: 12, y: 628, w: 64, h: 52, tone: "cream", hold: true, pulse: false },
  { name: "down", label: "Down", x: 80, y: 628, w: 72, h: 52, tone: "cream", hold: true, pulse: false },
  { name: "right", label: "Right", x: 156, y: 628, w: 64, h: 52, tone: "cream", hold: true, pulse: false },
  { name: "look", label: "Look", x: 232, y: 588, w: 108, h: 92, tone: "gold", hold: false, pulse: true },
  { name: "chart", label: "Chart", x: 352, y: 576, w: 116, h: 48, tone: "cream", hold: false, pulse: true },
  { name: "pause", label: "Pause", x: 352, y: 632, w: 116, h: 48, tone: "cream", hold: false, pulse: true },
];
