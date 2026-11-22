export type Dir = "n" | "s" | "e" | "w";

export type Phase =
  | "title"
  | "intro"
  | "playing"
  | "paused"
  | "level-clear"
  | "campaign-clear"
  | "retry";

export type SegmentKind = "curb" | "road" | "pond" | "swings" | "wall" | "tunnel";

export type ChamberKind = "hotwheels" | "stone" | "swing" | "hold" | "combined";

export type HazardHit = "car" | "water" | "swing" | "fall";

export type FailReason = HazardHit | "time";

export interface Car {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  color: string;
}

export interface Stone {
  id: string;
  x: number;
  y: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  sinkAfterMs: number | null;
  occupiedMs: number;
  emptyMs: number;
  submerged: boolean;
}

export interface Swing {
  id: string;
  pivotX: number;
  pivotY: number;
  length: number;
  amplitude: number;
  omega: number;
  phase: number;
  seatR: number;
}

export interface Hold {
  id: string;
  x: number;
  y: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  blinkPeriodMs: number | null;
  blinkPhaseMs: number;
  visible: boolean;
}

export interface Chamber {
  id: string;
  kind: ChamberKind;
  y: number;
  h: number;
  ledgeH: number;
  cars: Car[];
  stones: Stone[];
  swings: Swing[];
  holds: Hold[];
}

export interface Segment {
  id: string;
  kind: SegmentKind;
  y: number;
  h: number;
  ledgeH: number;
  mouthH: number;
  burrowH: number;
  cars: Car[];
  stones: Stone[];
  swings: Swing[];
  holds: Hold[];
  chambers: Chamber[];
}

export interface LevelDef {
  id: number;
  name: string;
  intro: string;
  timeLimitMs: number;
  width: number;
  height: number;
  segments: Segment[];
}

export interface Crab {
  x: number;
  y: number;
  facing: Dir;
  mode: "idle" | "hopping" | "tucked";
  hopFromX: number;
  hopFromY: number;
  hopToX: number;
  hopToY: number;
  hopElapsedMs: number;
  tuckElapsedMs: number;
  tuckCooldownMs: number;
  supportId: string | null;
  supportKind: "stone" | "hold" | null;
  rideOffsetX: number;
  rideOffsetY: number;
  lives: number;
  score: number;
}

export interface InputFrame {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  tuck: boolean;
  start: boolean;
  pause: boolean;
  confirm: boolean;
}

export interface GameState {
  phase: Phase;
  levelIndex: number;
  templates: LevelDef[];
  level: LevelDef;
  crab: Crab;
  elapsedMs: number;
  checkpointX: number;
  checkpointY: number;
  checkpointSegmentId: string;
  bannerTitle: string;
  bannerBody: string;
  toast: string;
  toastMs: number;
  introMs: number;
  hitFlashMs: number;
  lastFail: FailReason | null;
}