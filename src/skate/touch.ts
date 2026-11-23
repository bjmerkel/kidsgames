import { VIEW_H, VIEW_W } from "../game/constants";

export type SkateSpotName = "left" | "right" | "crouch" | "jump" | "pause";
export type SkateOrigin = SkateSpotName | "field" | "dead";

export type SkateSpot = {
  name: SkateSpotName;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const GAP = 8;
const BUTTON_W = 132;
const BUTTON_H = 56;
const DECK_Y = VIEW_H - (BUTTON_H * 2 + GAP + 12);

export const SKATE_HOLD_MS = 180;
export const SKATE_TAP_MS = 280;
export const SKATE_TAP_SLOP = 24;
export const SKATE_CROUCH_DY = 36;
export const SKATE_FLICK_DY = -48;

export const SKATE_SPOTS: readonly SkateSpot[] = [
  { name: "crouch", label: "Crouch", x: 16, y: DECK_Y, w: BUTTON_W, h: BUTTON_H },
  { name: "jump", label: "Jump", x: VIEW_W - 16 - BUTTON_W, y: DECK_Y, w: BUTTON_W, h: BUTTON_H },
  { name: "left", label: "Left", x: 16, y: DECK_Y + BUTTON_H + GAP, w: BUTTON_W, h: BUTTON_H },
  { name: "right", label: "Right", x: VIEW_W - 16 - BUTTON_W, y: DECK_Y + BUTTON_H + GAP, w: BUTTON_W, h: BUTTON_H },
  { name: "pause", label: "Pause", x: VIEW_W - 108, y: 140, w: 92, h: 40 },
];

export function skateDeckTop(): number {
  return DECK_Y;
}

export function skateSpotAt(x: number, y: number): SkateSpotName | null {
  for (const spot of SKATE_SPOTS) {
    if (x >= spot.x && y >= spot.y && x < spot.x + spot.w && y < spot.y + spot.h) return spot.name;
  }
  return null;
}

export function skateOriginAt(x: number, y: number): SkateOrigin {
  const spot = skateSpotAt(x, y);
  if (spot) return spot;
  if (y >= skateDeckTop()) return "dead";
  return "field";
}

export type SkatePointer = {
  id: number;
  x: number;
  y: number;
  x0: number;
  y0: number;
  t0: number;
  origin: SkateOrigin;
  jumpSent: boolean;
  pauseSent: boolean;
};

export type SkateTouchHeld = {
  left: boolean;
  right: boolean;
  crouch: boolean;
  ollie: boolean;
};

export function blankSkateTouch(): SkateTouchHeld {
  return { left: false, right: false, crouch: false, ollie: false };
}

export type SkateTouchReading = {
  held: SkateTouchHeld;
  jump: boolean;
  pause: boolean;
  pointers: SkatePointer[];
};

export function readSkateTouch(pointers: readonly SkatePointer[], now: number): SkateTouchReading {
  const held = blankSkateTouch();
  let jump = false;
  let pause = false;
  const next = pointers.map((pointer) => ({ ...pointer }));
  for (const pointer of next) {
    if (pointer.origin === "left") held.left = true;
    if (pointer.origin === "right") held.right = true;
    if (pointer.origin === "crouch") held.crouch = true;
    if (pointer.origin === "jump") {
      held.ollie = true;
      if (!pointer.jumpSent) {
        pointer.jumpSent = true;
        jump = true;
      }
    }
    if (pointer.origin === "pause" && !pointer.pauseSent) {
      pointer.pauseSent = true;
      pause = true;
    }
    if (pointer.origin === "field") {
      const dy = pointer.y - pointer.y0;
      if (dy >= SKATE_CROUCH_DY) held.crouch = true;
      if (dy <= SKATE_FLICK_DY && !pointer.jumpSent) {
        pointer.jumpSent = true;
        jump = true;
      }
    }
  }
  return { held, jump, pause, pointers: next };
}

export function skateTapJump(pointer: SkatePointer, now: number): boolean {
  if (pointer.origin !== "field" || pointer.jumpSent) return false;
  if (pointer.y - pointer.y0 >= SKATE_CROUCH_DY) return false;
  const dist = Math.hypot(pointer.x - pointer.x0, pointer.y - pointer.y0);
  return now - pointer.t0 < SKATE_TAP_MS && dist < SKATE_TAP_SLOP;
}
