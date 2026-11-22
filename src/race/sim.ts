import { clamp } from "../game/geometry";
import { CHARACTERS, characterById } from "./characters";
import { TRACKS, trackByIndex, type Track, type TrackSample } from "./tracks";

export type ItemKind = "acorn" | "leaf" | "honey";

export type RacePhase = "countdown" | "racing" | "paused" | "results" | "cup";

export type RaceInput = {
  steer: number;
  brake: boolean;
  use: boolean;
  pause: boolean;
  confirm: boolean;
};

export type Racer = {
  id: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  along: number;
  hint: number;
  lap: number;
  lapTravel: number;
  finished: boolean;
  finishMs: number;
  boostMs: number;
  wobbleMs: number;
  slowMs: number;
  item: ItemKind | null;
  place: number;
};

export type Projectile = {
  x: number;
  y: number;
  heading: number;
  life: number;
  owner: string;
};

export type Slick = {
  x: number;
  y: number;
  r: number;
  life: number;
  owner: string;
  arm: number;
};

export type ItemBox = {
  x: number;
  y: number;
  r: number;
  dist: number;
  readyMs: number;
};

export type RaceState = {
  phase: RacePhase;
  resumePhase: "countdown" | "racing";
  trackIndex: number;
  characterId: string;
  countdownMs: number;
  goMs: number;
  elapsedMs: number;
  playerIndex: number;
  scored: boolean;
  points: Record<string, number>;
  racers: Racer[];
  projectiles: Projectile[];
  slicks: Slick[];
  boxes: ItemBox[];
};

export const POINTS = [10, 8, 7, 6, 5, 4, 3, 2, 1, 0];

const KART_R = 16;

export function blankRaceInput(): RaceInput {
  return { steer: 0, brake: false, use: false, pause: false, confirm: false };
}

export function placeLabel(place: number): string {
  const n = place + 1;
  const teen = n % 100;
  const suffix = teen >= 11 && teen <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

export function cupOrder(points: Record<string, number>): string[] {
  return CHARACTERS.map((character) => character.id).sort(
    (a, b) => (points[b] ?? 0) - (points[a] ?? 0) || a.localeCompare(b),
  );
}

function freshPoints(): Record<string, number> {
  return Object.fromEntries(CHARACTERS.map((character) => [character.id, 0]));
}

function wrap(value: number, length: number): number {
  const mod = value % length;
  return mod < 0 ? mod + length : mod;
}

function wrapAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function sampleNear(track: Track, dist: number): { sample: TrackSample; index: number } {
  const d = wrap(dist, track.length);
  let bestI = 0;
  let bestDelta = Infinity;
  for (let index = 0; index < track.samples.length; index += 1) {
    let delta = Math.abs(track.samples[index].dist - d);
    delta = Math.min(delta, track.length - delta);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestI = index;
    }
  }
  return { sample: track.samples[bestI], index: bestI };
}

function project(track: Track, x: number, y: number, hint: number): { along: number; lateral: number; index: number; sample: TrackSample } {
  const count = track.samples.length;
  let bestI = hint;
  let best = Infinity;
  for (let step = -36; step <= 36; step += 1) {
    const index = (hint + step + count) % count;
    const sample = track.samples[index];
    const dx = sample.x - x;
    const dy = sample.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < best) {
      best = dist;
      bestI = index;
    }
  }
  const sample = track.samples[bestI];
  const nx = Math.cos(sample.heading + Math.PI / 2);
  const ny = Math.sin(sample.heading + Math.PI / 2);
  const lateral = (x - sample.x) * nx + (y - sample.y) * ny;
  return { along: sample.dist, lateral, index: bestI, sample };
}

export function suggestSteer(track: Track, racer: Racer): number {
  const here = project(track, racer.x, racer.y, racer.hint);
  const look = clamp(80 + racer.speed * 0.1, 80, 160);
  const ahead = sampleNear(track, racer.along + look).sample;
  const desired = Math.atan2(ahead.y - racer.y, ahead.x - racer.x);
  let diff = wrapAngle(desired - racer.heading);
  const half = track.width / 2;
  if (Math.abs(here.lateral) > half * 0.45) {
    const toCenter = Math.atan2(here.sample.y - racer.y, here.sample.x - racer.x);
    const urgency = clamp((Math.abs(here.lateral) - half * 0.45) / half, 0, 1);
    diff = diff * (1 - urgency) + wrapAngle(toCenter - racer.heading) * urgency;
  }
  return clamp(diff / 0.35, -1, 1);
}

export function botInput(state: RaceState): RaceInput {
  const track = trackByIndex(state.trackIndex);
  const racer = state.racers[state.playerIndex];
  const stats = characterById(racer.id);
  const steer = suggestSteer(track, racer);
  const ahead = sampleNear(track, racer.along + 110).sample;
  const turn = Math.abs(wrapAngle(ahead.heading - racer.heading));
  return {
    steer,
    brake: turn > 0.75 && racer.speed > stats.speed * 0.72,
    use: false,
    pause: false,
    confirm: false,
  };
}

function progressOf(racer: Racer, length: number): number {
  return racer.lap * length + racer.along;
}

function assignPlaces(racers: Racer[], length: number): Racer[] {
  const ordered = [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishMs - b.finishMs;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return progressOf(b, length) - progressOf(a, length);
  });
  ordered.forEach((racer, place) => {
    racer.place = place;
  });
  return ordered;
}

function grantItem(place: number, boxIndex: number): ItemKind {
  const roll = (boxIndex * 3 + place) % 5;
  if (place >= 6) return roll < 3 ? "leaf" : "acorn";
  if (place <= 1) return roll < 2 ? "honey" : "acorn";
  return (["acorn", "leaf", "honey", "acorn", "leaf"] as ItemKind[])[roll];
}

export function createRace(characterId: string, trackIndex = 0, points?: Record<string, number>, countdownMs = 3000): RaceState {
  const character = characterById(characterId);
  const track = trackByIndex(trackIndex);
  const roster = [character.id, ...CHARACTERS.filter((entry) => entry.id !== character.id).map((entry) => entry.id)];
  const racers = roster.map((id, grid) => {
    const row = Math.floor(grid / 2);
    const col = grid % 2 === 0 ? -1 : 1;
    const back = 48 + row * 58;
    const spawned = sampleNear(track, track.length - back);
    const nx = Math.cos(spawned.sample.heading + Math.PI / 2);
    const ny = Math.sin(spawned.sample.heading + Math.PI / 2);
    return {
      id,
      x: spawned.sample.x + nx * col * 34,
      y: spawned.sample.y + ny * col * 34,
      heading: spawned.sample.heading,
      speed: 0,
      along: spawned.sample.dist,
      hint: spawned.index,
      lap: 0,
      lapTravel: 0,
      finished: false,
      finishMs: 0,
      boostMs: 0,
      wobbleMs: 0,
      slowMs: 0,
      item: null,
      place: grid,
    } satisfies Racer;
  });
  return {
    phase: "countdown",
    resumePhase: "countdown",
    trackIndex,
    characterId: character.id,
    countdownMs,
    goMs: 0,
    elapsedMs: 0,
    playerIndex: 0,
    scored: false,
    points: { ...freshPoints(), ...points },
    racers,
    projectiles: [],
    slicks: [],
    boxes: track.boxes.map((box) => ({ ...box, readyMs: 0 })),
  };
}

function useItem(state: RaceState, racer: Racer): void {
  if (!racer.item) return;
  const heading = racer.heading;
  if (racer.item === "leaf") racer.boostMs = Math.max(racer.boostMs, 1100);
  if (racer.item === "acorn") {
    state.projectiles.push({
      x: racer.x + Math.cos(heading) * 30,
      y: racer.y + Math.sin(heading) * 30,
      heading,
      life: 1100,
      owner: racer.id,
    });
  }
  if (racer.item === "honey") {
    state.slicks.push({
      x: racer.x - Math.cos(heading) * 24,
      y: racer.y - Math.sin(heading) * 24,
      r: 28,
      life: 4500,
      owner: racer.id,
      arm: 350,
    });
  }
  racer.item = null;
}

export function tickRace(state: RaceState, input: RaceInput, dtMs: number): RaceState {
  const stepMs = Math.max(0, Math.min(50, dtMs));
  const dt = stepMs / 1000;
  const next = structuredClone(state);
  if (input.pause && (next.phase === "racing" || next.phase === "countdown" || next.phase === "paused")) {
    if (next.phase === "paused") next.phase = next.resumePhase;
    else {
      next.resumePhase = next.phase;
      next.phase = "paused";
    }
    return next;
  }
  if (next.phase === "paused" || next.phase === "results" || next.phase === "cup") return next;

  const track = trackByIndex(next.trackIndex);
  if (next.phase === "countdown") {
    if (input.confirm) next.countdownMs = 0;
    next.countdownMs -= stepMs;
    if (next.countdownMs > 0) return next;
    next.phase = "racing";
    next.goMs = 700;
  }

  next.elapsedMs += stepMs;
  next.goMs = Math.max(0, next.goMs - stepMs);
  for (const box of next.boxes) box.readyMs = Math.max(0, box.readyMs - stepMs);

  next.racers.forEach((racer, index) => {
    if (racer.finished) return;
    const stats = characterById(racer.id);
    const player = index === next.playerIndex;
    const skill = player ? 1 : track.ai;
    const here = project(track, racer.x, racer.y, racer.hint);
    const steer = player ? clamp(input.steer, -1, 1) : suggestSteer(track, racer);
    const ahead = sampleNear(track, racer.along + 110).sample;
    const turnAmount = Math.abs(wrapAngle(ahead.heading - racer.heading));
    const brake = player ? input.brake : turnAmount > 0.75 && racer.speed > stats.speed * skill * 0.72;
    if (!player && racer.item === "leaf") useItem(next, racer);
    if (player && input.use) useItem(next, racer);

    const off = Math.abs(here.lateral) > track.width / 2;
    const top = stats.speed * skill * (racer.boostMs > 0 ? 1.22 : 1) * (off ? 0.74 : 1) * (racer.slowMs > 0 ? 0.8 : 1);
    if (brake) racer.speed = Math.max(0, racer.speed - 460 * dt);
    else racer.speed += stats.accel * skill * dt * (1 - racer.speed / Math.max(50, top));
    if (racer.speed > top) racer.speed -= (racer.speed - top) * Math.min(1, dt * 3.2);
    racer.speed = Math.max(0, racer.speed);
    const turn = stats.turn * (0.42 + 0.58 * Math.min(1, racer.speed / 110));
    racer.heading += steer * turn * dt;
    if (racer.wobbleMs > 0) {
      racer.heading += Math.sin(racer.wobbleMs * 0.05) * dt * 2;
      racer.wobbleMs = Math.max(0, racer.wobbleMs - stepMs);
    }
    racer.boostMs = Math.max(0, racer.boostMs - stepMs);
    racer.slowMs = Math.max(0, racer.slowMs - stepMs);
    racer.x += Math.cos(racer.heading) * racer.speed * dt;
    racer.y += Math.sin(racer.heading) * racer.speed * dt;

    const landed = project(track, racer.x, racer.y, here.index);
    racer.hint = landed.index;
    const prevAlong = racer.along;
    let delta = landed.along - prevAlong;
    if (delta < -track.length / 2) delta += track.length;
    if (delta > track.length / 2) delta -= track.length;
    if (Math.abs(delta) > 320) delta = 0;
    racer.along = wrap(prevAlong + delta, track.length);
    if (delta > 0) racer.lapTravel += delta;
    const crossed = delta > 0 && prevAlong > track.length - 140 && racer.along < 140;
    if (crossed && racer.lapTravel > track.length * 0.62) {
      racer.lap += 1;
      racer.lapTravel = racer.along;
      if (racer.lap >= track.laps) {
        racer.finished = true;
        racer.finishMs = next.elapsedMs;
      }
    }
    const half = track.width / 2;
    if (Math.abs(landed.lateral) > half) {
      const nx = Math.cos(landed.sample.heading + Math.PI / 2);
      const ny = Math.sin(landed.sample.heading + Math.PI / 2);
      const pull = Math.min(100, Math.abs(landed.lateral) - half);
      racer.x -= nx * Math.sign(landed.lateral) * pull * dt * 2.2;
      racer.y -= ny * Math.sign(landed.lateral) * pull * dt * 2.2;
    }
    if (Math.abs(landed.lateral) > half + 30) {
      racer.heading += clamp(wrapAngle(landed.sample.heading - racer.heading), -1.2, 1.2) * dt * 1.7;
    }

    let bumped = false;
    for (const tree of track.trees) {
      const dx = racer.x - tree.x;
      const dy = racer.y - tree.y;
      const reach = KART_R + tree.r;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist < reach) {
        const extra = reach - dist + 6;
        racer.x += (dx / dist) * extra;
        racer.y += (dy / dist) * extra;
        bumped = true;
      }
    }
    if (bumped) racer.speed *= 0.86;

    for (const puddle of track.puddles) {
      if ((racer.x - puddle.x) ** 2 + (racer.y - puddle.y) ** 2 <= (puddle.r + 8) ** 2) racer.slowMs = Math.max(racer.slowMs, 280);
    }
    for (const boost of track.boosts) {
      if (racer.boostMs > 200) continue;
      if ((racer.x - boost.x) ** 2 + (racer.y - boost.y) ** 2 <= (boost.r + 8) ** 2) racer.boostMs = 1000;
    }
  });

  for (let i = 0; i < next.racers.length; i += 1) {
    for (let j = i + 1; j < next.racers.length; j += 1) {
      const a = next.racers[i];
      const b = next.racers[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const reach = KART_R * 2;
      if (dist >= reach) continue;
      const push = (reach - dist) / 2;
      a.x -= (dx / dist) * push;
      a.y -= (dy / dist) * push;
      b.x += (dx / dist) * push;
      b.y += (dy / dist) * push;
      if (dist < reach * 0.75) {
        a.speed *= 0.97;
        b.speed *= 0.97;
      }
    }
  }

  next.boxes.forEach((box, boxIndex) => {
    if (box.readyMs > 0) return;
    for (const racer of next.racers) {
      if (racer.item || racer.finished) continue;
      if ((racer.x - box.x) ** 2 + (racer.y - box.y) ** 2 > (box.r + KART_R) ** 2) continue;
      racer.item = grantItem(racer.place, boxIndex);
      box.readyMs = 5200;
      break;
    }
  });

  next.projectiles = next.projectiles.flatMap((shot) => {
    shot.life -= stepMs;
    shot.x += Math.cos(shot.heading) * 460 * dt;
    shot.y += Math.sin(shot.heading) * 460 * dt;
    if (shot.life <= 0) return [];
    for (const racer of next.racers) {
      if (racer.id === shot.owner) continue;
      if ((racer.x - shot.x) ** 2 + (racer.y - shot.y) ** 2 > (KART_R + 8) ** 2) continue;
      racer.speed *= 0.42;
      racer.wobbleMs = Math.max(racer.wobbleMs, 560);
      return [];
    }
    return [shot];
  });

  next.slicks = next.slicks.flatMap((slick) => {
    slick.life -= stepMs;
    slick.arm = Math.max(0, slick.arm - stepMs);
    if (slick.life <= 0) return [];
    if (slick.arm > 0) return [slick];
    for (const racer of next.racers) {
      if (racer.id === slick.owner) continue;
      if ((racer.x - slick.x) ** 2 + (racer.y - slick.y) ** 2 <= (slick.r + KART_R) ** 2) racer.slowMs = Math.max(racer.slowMs, 700);
    }
    return [slick];
  });

  const ordered = assignPlaces(next.racers, track.length);
  const player = next.racers[next.playerIndex];
  if (player.finished && !next.scored) {
    ordered.forEach((racer, place) => {
      next.points[racer.id] = (next.points[racer.id] ?? 0) + (POINTS[place] ?? 0);
    });
    next.scored = true;
    next.phase = "results";
  }
  return next;
}

export function advanceCup(state: RaceState): RaceState {
  if (state.phase === "cup") return createRace(state.characterId, 0);
  if (state.phase !== "results") return state;
  if (state.trackIndex >= TRACKS.length - 1) return { ...structuredClone(state), phase: "cup" };
  return createRace(state.characterId, state.trackIndex + 1, state.points);
}
