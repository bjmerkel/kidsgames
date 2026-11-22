import {
  COLOR,
  CRAB_R,
  HOP,
  HOP_MS,
  START_INSET,
  TUTORIAL_DELAY_SEC,
  WORLD_W,
} from "./constants";
import type { Car, Chamber, Hold, LevelDef, Segment, Stone, Swing } from "./types";
import { zoneAt } from "./zones";

export interface LaneDraft {
  mode: "tutorial" | "authored";
  localY: number;
  speed: number;
  color: string;
  x?: number;
  w?: number;
  h?: number;
}

export interface StoneDraft {
  x: number;
  localY: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  sinkAfterMs: number | null;
}

export interface SwingDraft {
  x: number;
  localY: number;
  length: number;
  amplitude: number;
  omega: number;
  phase: number;
  seatR: number;
}

export interface HoldDraft {
  x: number;
  localY: number;
  r: number;
  vx: number;
  minX: number;
  maxX: number;
  blinkPeriodMs: number | null;
  blinkPhaseMs: number;
}

export interface SpineDraft {
  stoneR: number;
  stoneVx: number;
  stoneMinX: number;
  stoneMaxX: number;
  sinkAfterMs: number | null;
  holdR: number;
  holdVx: number;
  holdMinX: number;
  holdMaxX: number;
  blinkPeriodMs: number | null;
}

export interface ChamberDraft {
  kind: "hotwheels" | "stone" | "swing" | "hold" | "combined";
  h: number;
  ledgeH: number;
  lanes: LaneDraft[];
  stones: StoneDraft[];
  swings: SwingDraft[];
  holds: HoldDraft[];
}

export type BandDraft =
  | { kind: "curb"; h: number }
  | { kind: "road"; h: number; lanes: LaneDraft[] }
  | { kind: "pond"; h: number; stones: StoneDraft[] }
  | { kind: "swings"; h: number; swings: SwingDraft[] }
  | { kind: "wall"; h: number; ledgeH: number; holds: HoldDraft[] }
  | { kind: "tunnel"; mouthH: number; burrowH: number; chambers: ChamberDraft[] };

export interface LevelDraft {
  id: number;
  name: string;
  intro: string;
  timeLimitMs: number;
  width: number;
  spine: SpineDraft | null;
  bands: BandDraft[];
}

export function tutorialCarX(startY: number, laneY: number, speed: number): number {
  const hopSpeed = HOP / (HOP_MS / 1000);
  const tCross = (startY - laneY) / hopSpeed;
  return WORLD_W / 2 - speed * (tCross + TUTORIAL_DELAY_SEC);
}

export function startPoint(level: LevelDef): { x: number; y: number } {
  return { x: level.width / 2, y: level.height - START_INSET };
}

export function latticeYs(fromY: number, minY: number, step: number): number[] {
  const ys: number[] = [];
  for (let y = fromY - step; y >= minY; y -= step) ys.push(y);
  return ys;
}

export function curbSegment(level: LevelDef): Segment {
  const curb = level.segments.find((segment) => segment.kind === "curb");
  if (!curb) throw new Error("level is missing a curb");
  return curb;
}

export function allCars(level: LevelDef): Car[] {
  return level.segments.flatMap((segment) => [...segment.cars, ...segment.chambers.flatMap((chamber) => chamber.cars)]);
}

export function allStones(level: LevelDef): Stone[] {
  return level.segments.flatMap((segment) => [
    ...segment.stones,
    ...segment.chambers.flatMap((chamber) => chamber.stones),
  ]);
}

export function allSwings(level: LevelDef): Swing[] {
  return level.segments.flatMap((segment) => [
    ...segment.swings,
    ...segment.chambers.flatMap((chamber) => chamber.swings),
  ]);
}

export function allHolds(level: LevelDef): Hold[] {
  return level.segments.flatMap((segment) => [
    ...segment.holds,
    ...segment.chambers.flatMap((chamber) => chamber.holds),
  ]);
}

export function pressure(level: LevelDef): number {
  const maxSpeed = Math.max(...allCars(level).map((car) => Math.abs(car.speed)));
  const maxOmega = Math.max(...allSwings(level).map((swing) => swing.omega));
  const drift = Math.max(...allStones(level).map((stone) => Math.abs(stone.vx)));
  const blink = Math.min(...allHolds(level).map((hold) => hold.blinkPeriodMs ?? 10_000));
  return maxSpeed + maxOmega * 20 + drift - blink / 100;
}

export function buildLevel(draft: LevelDraft): LevelDef {
  const height = draft.bands.reduce((sum, band) => sum + bandHeight(band), 0);
  const startY = height - START_INSET;
  let top = height;
  const segments = draft.bands.map((band, index) => {
    const h = bandHeight(band);
    top -= h;
    return realizeBand(draft, band, index, top, h, startY);
  });
  const level: LevelDef = {
    id: draft.id,
    name: draft.name,
    intro: draft.intro,
    timeLimitMs: draft.timeLimitMs,
    width: draft.width,
    height,
    segments,
  };
  if (draft.spine) placeSpine(level, draft.spine);
  return level;
}

export function buildCampaign(): LevelDef[] {
  return campaignDrafts().map(buildLevel);
}

export const LEVELS: LevelDef[] = buildCampaign();

function bandHeight(band: BandDraft): number {
  if (band.kind === "tunnel") {
    return band.mouthH + band.burrowH + band.chambers.reduce((sum, chamber) => sum + chamber.h, 0);
  }
  return band.h;
}

function realizeBand(
  draft: LevelDraft,
  band: BandDraft,
  index: number,
  y: number,
  h: number,
  startY: number,
): Segment {
  const id = `${draft.id}-${index}-${band.kind}`;
  const segment: Segment = {
    id,
    kind: band.kind,
    y,
    h,
    ledgeH: band.kind === "wall" ? band.ledgeH : 0,
    mouthH: band.kind === "tunnel" ? band.mouthH : 0,
    burrowH: band.kind === "tunnel" ? band.burrowH : 0,
    cars: [],
    stones: [],
    swings: [],
    holds: [],
    chambers: [],
  };
  if (band.kind === "road") segment.cars = realizeLanes(band.lanes, y, startY, id);
  if (band.kind === "pond") segment.stones = band.stones.map((stone, i) => realizeStone(stone, y, `${id}-stone-${i}`));
  if (band.kind === "swings") segment.swings = band.swings.map((swing, i) => realizeSwing(swing, y, `${id}-swing-${i}`));
  if (band.kind === "wall") segment.holds = band.holds.map((hold, i) => realizeHold(hold, y, `${id}-hold-${i}`));
  if (band.kind === "tunnel") segment.chambers = realizeChambers(band, y, h, startY, id);
  return segment;
}

function realizeChambers(band: Extract<BandDraft, { kind: "tunnel" }>, y: number, h: number, startY: number, id: string): Chamber[] {
  let cursor = y + h - band.mouthH;
  return band.chambers.map((draft, index) => {
    cursor -= draft.h;
    const chamberId = `${id}-${index}-${draft.kind}`;
    return {
      id: chamberId,
      kind: draft.kind,
      y: cursor,
      h: draft.h,
      ledgeH: draft.ledgeH,
      cars: realizeLanes(draft.lanes, cursor, startY, chamberId),
      stones: draft.stones.map((stone, i) => realizeStone(stone, cursor, `${chamberId}-stone-${i}`)),
      swings: draft.swings.map((swing, i) => realizeSwing(swing, cursor, `${chamberId}-swing-${i}`)),
      holds: draft.holds.map((hold, i) => realizeHold(hold, cursor, `${chamberId}-hold-${i}`)),
    };
  });
}

function realizeLanes(lanes: LaneDraft[], regionY: number, startY: number, idPrefix: string): Car[] {
  return lanes.map((lane, index) => {
    const y = regionY + lane.localY;
    const x = lane.mode === "tutorial" ? tutorialCarX(startY, y, lane.speed) : (lane.x ?? WORLD_W / 2);
    return {
      id: `${idPrefix}-car-${index}`,
      x,
      y,
      w: lane.w ?? 56,
      h: lane.h ?? 24,
      speed: lane.speed,
      color: lane.color,
    };
  });
}

function realizeStone(draft: StoneDraft, regionY: number, id: string): Stone {
  return {
    id,
    x: draft.x,
    y: regionY + draft.localY,
    r: draft.r,
    vx: draft.vx,
    minX: draft.minX,
    maxX: draft.maxX,
    sinkAfterMs: draft.sinkAfterMs,
    occupiedMs: 0,
    emptyMs: 0,
    submerged: false,
  };
}

function realizeSwing(draft: SwingDraft, regionY: number, id: string): Swing {
  return {
    id,
    pivotX: draft.x,
    pivotY: regionY + draft.localY,
    length: draft.length,
    amplitude: draft.amplitude,
    omega: draft.omega,
    phase: draft.phase,
    seatR: draft.seatR,
  };
}

function realizeHold(draft: HoldDraft, regionY: number, id: string): Hold {
  return {
    id,
    x: draft.x,
    y: regionY + draft.localY,
    r: draft.r,
    vx: draft.vx,
    minX: draft.minX,
    maxX: draft.maxX,
    blinkPeriodMs: draft.blinkPeriodMs,
    blinkPhaseMs: draft.blinkPhaseMs,
    visible: true,
  };
}

function placeSpine(level: LevelDef, spine: SpineDraft): void {
  const x = level.width / 2;
  let n = 0;
  for (const y of latticeYs(startPoint(level).y, CRAB_R, HOP)) {
    const zone = zoneAt(level, y);
    if ((zone.tag === "water" || zone.tag === "combined") && !(zone.tag === "combined" && zone.ledge)) {
      if (!hasSupportAt(zone.stones, x, y)) {
        zone.stones.push(spineStone(level.id, n, x, y, spine));
        n += 1;
      }
    }
    if ((zone.tag === "climb" || zone.tag === "combined") && !zone.ledge) {
      if (!hasSupportAt(zone.holds, x, y)) {
        zone.holds.push(spineHold(level.id, n, x, y, spine));
        n += 1;
      }
    }
  }
}

function hasSupportAt(supports: { x: number; y: number }[], x: number, y: number): boolean {
  return supports.some((support) => Math.abs(support.x - x) < 1 && Math.abs(support.y - y) < 1);
}

function spineStone(levelId: number, n: number, x: number, y: number, spine: SpineDraft): Stone {
  const moving = spine.stoneVx !== 0;
  return {
    id: `${levelId}-spine-stone-${n}`,
    x,
    y,
    r: spine.stoneR,
    vx: spine.stoneVx,
    minX: moving ? spine.stoneMinX : x,
    maxX: moving ? spine.stoneMaxX : x,
    sinkAfterMs: spine.sinkAfterMs,
    occupiedMs: 0,
    emptyMs: 0,
    submerged: false,
  };
}

function spineHold(levelId: number, n: number, x: number, y: number, spine: SpineDraft): Hold {
  const moving = spine.holdVx !== 0;
  return {
    id: `${levelId}-spine-hold-${n}`,
    x,
    y,
    r: spine.holdR,
    vx: spine.holdVx,
    minX: moving ? spine.holdMinX : x,
    maxX: moving ? spine.holdMaxX : x,
    blinkPeriodMs: spine.blinkPeriodMs,
    blinkPhaseMs: 0,
    visible: true,
  };
}

function sideSwing(x: number, omega: number): SwingDraft {
  return { x, localY: 28, length: 48, amplitude: 0.5, omega, phase: 0.4, seatR: 12 };
}

function crossSwing(omega: number, phase = 0): SwingDraft {
  return { x: WORLD_W / 2, localY: 24, length: 70, amplitude: 1.05, omega, phase, seatR: 12 };
}

function tutorialLane(localY: number, speed: number, color: string): LaneDraft {
  return { mode: "tutorial", localY, speed, color, w: 56, h: 24 };
}

function authoredLane(localY: number, x: number, speed: number, color: string, w = 56): LaneDraft {
  return { mode: "authored", localY, x, speed, color, w, h: 24 };
}

function staticSpine(): SpineDraft {
  return {
    stoneR: 36,
    stoneVx: 0,
    stoneMinX: 40,
    stoneMaxX: 440,
    sinkAfterMs: null,
    holdR: 36,
    holdVx: 0,
    holdMinX: 40,
    holdMaxX: 440,
    blinkPeriodMs: null,
  };
}

function driftSpine(stoneVx: number, sinkAfterMs: number, blinkPeriodMs: number): SpineDraft {
  return {
    stoneR: 36,
    stoneVx,
    stoneMinX: 70,
    stoneMaxX: 410,
    sinkAfterMs,
    holdR: 36,
    holdVx: 0,
    holdMinX: 40,
    holdMaxX: 440,
    blinkPeriodMs,
  };
}

function tunnelBand(
  hotwheels: LaneDraft[],
  swing: SwingDraft,
  combinedLanes: LaneDraft[],
  combinedSwing: SwingDraft,
  chamberH: number,
): Extract<BandDraft, { kind: "tunnel" }> {
  return {
    kind: "tunnel",
    mouthH: 48,
    burrowH: 36,
    chambers: [
      { kind: "hotwheels", h: chamberH, ledgeH: 0, lanes: hotwheels, stones: [], swings: [], holds: [] },
      { kind: "stone", h: chamberH, ledgeH: 0, lanes: [], stones: [], swings: [], holds: [] },
      { kind: "swing", h: chamberH, ledgeH: 0, lanes: [], stones: [], swings: [swing], holds: [] },
      { kind: "hold", h: chamberH, ledgeH: 48, lanes: [], stones: [], swings: [], holds: [] },
      {
        kind: "combined",
        h: chamberH,
        ledgeH: 48,
        lanes: combinedLanes,
        stones: [],
        swings: [combinedSwing],
        holds: [],
      },
    ],
  };
}

function campaignDrafts(): LevelDraft[] {
  return [
    {
      id: 1,
      name: "Emery's Driveway",
      intro: "Hot Wheels, stones, swings, and a wall. Then the tunnel. Emery is awesome.",
      timeLimitMs: 90_000,
      width: WORLD_W,
      spine: staticSpine(),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 112,
          lanes: [
            tutorialLane(84, 70, COLOR.carRed),
            tutorialLane(28, -70, COLOR.carYellow),
          ],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 160, swings: [sideSwing(78, 1.1)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [tutorialLane(126, 64, COLOR.carBlue), tutorialLane(84, -60, COLOR.carGreen), tutorialLane(42, 70, COLOR.carPurple)],
          sideSwing(72, 1.1),
          [tutorialLane(84, -70, COLOR.carRed)],
          sideSwing(70, 1.1),
          168,
        ),
      ],
    },
    {
      id: 2,
      name: "Emery's Backyard",
      intro: "The toys drive faster and the stones drift. Emery is awesome.",
      timeLimitMs: 80_000,
      width: WORLD_W,
      spine: driftSpine(32, 4600, 1600),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 36, COLOR.carRed, 64),
            authoredLane(84, 80, -110, COLOR.carYellow),
            authoredLane(42, 400, 90, COLOR.carBlue),
          ],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 160, swings: [crossSwing(1.8)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(84, 240, 80, COLOR.carGreen)],
          crossSwing(1.8, 0.2),
          [authoredLane(84, 360, 100, COLOR.carPurple)],
          crossSwing(1.8, 1.1),
          168,
        ),
      ],
    },
    {
      id: 3,
      name: "Emery's Playground",
      intro: "Swings cross your path and holds blink. Emery is awesome.",
      timeLimitMs: 70_000,
      width: WORLD_W,
      spine: driftSpine(46, 4300, 1400),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 48, COLOR.carYellow, 64),
            authoredLane(84, 420, -150, COLOR.carRed),
            authoredLane(42, 60, 120, COLOR.carBlue),
          ],
        },
        { kind: "pond", h: 160, stones: [] },
        { kind: "swings", h: 180, swings: [crossSwing(2.3), crossSwing(2.0, 1.4)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(100, 240, 130, COLOR.carPurple), authoredLane(52, 80, -140, COLOR.carGreen)],
          crossSwing(2.3, 0.2),
          [authoredLane(84, 240, 110, COLOR.carRed, 60)],
          crossSwing(2.3, 1.1),
          180,
        ),
      ],
    },
    {
      id: 4,
      name: "Emery's Obstacle Course",
      intro: "Everything moves. The tunnel is the real course. Emery is awesome.",
      timeLimitMs: 60_000,
      width: WORLD_W,
      spine: driftSpine(58, 4100, 1200),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 168,
          lanes: [
            authoredLane(126, 240, 54, COLOR.carBlue, 68),
            authoredLane(84, 450, -190, COLOR.carYellow),
            authoredLane(42, 40, 160, COLOR.carRed),
          ],
        },
        { kind: "pond", h: 160, stones: [] },
        { kind: "swings", h: 180, swings: [crossSwing(2.8), crossSwing(2.4, 2)] },
        { kind: "wall", h: 240, ledgeH: 48, holds: [] },
        tunnelBand(
          [authoredLane(110, 240, 160, COLOR.carGreen), authoredLane(60, 400, -170, COLOR.carPurple)],
          crossSwing(2.8, 0.2),
          [authoredLane(90, 200, 190, COLOR.carYellow), authoredLane(50, 420, -150, COLOR.carRed)],
          crossSwing(2.8, 1.1),
          190,
        ),
      ],
    },
    {
      id: 5,
      name: "Emery's Tunnel",
      intro: "The whole backyard is in the tunnel. Emery is awesome.",
      timeLimitMs: 85_000,
      width: WORLD_W,
      spine: driftSpine(70, 3900, 1000),
      bands: [
        { kind: "curb", h: 96 },
        {
          kind: "road",
          h: 112,
          lanes: [authoredLane(64, 240, 60, COLOR.carRed, 70), authoredLane(28, 460, -230, COLOR.carYellow)],
        },
        { kind: "pond", h: 112, stones: [] },
        { kind: "swings", h: 150, swings: [crossSwing(3.4)] },
        { kind: "wall", h: 192, ledgeH: 48, holds: [] },
        tunnelBand(
          [
            authoredLane(150, 240, 180, COLOR.carBlue, 64),
            authoredLane(100, 80, -230, COLOR.carGreen),
            authoredLane(52, 420, 200, COLOR.carPurple),
          ],
          crossSwing(3.4, 0.2),
          [authoredLane(120, 240, 210, COLOR.carRed, 64), authoredLane(70, 400, -220, COLOR.carYellow)],
          crossSwing(3.4, 1.1),
          210,
        ),
      ],
    },
  ];
}