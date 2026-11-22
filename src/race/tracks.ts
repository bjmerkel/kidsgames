export type TrackSample = {
  x: number;
  y: number;
  dist: number;
  heading: number;
};

export type TrackSpot = {
  x: number;
  y: number;
  r: number;
  dist: number;
};

export type Track = {
  id: string;
  name: string;
  blurb: string;
  laps: number;
  width: number;
  ai: number;
  length: number;
  spacing: number;
  grass: string;
  road: string;
  edge: string;
  sky: string;
  samples: TrackSample[];
  trees: TrackSpot[];
  puddles: TrackSpot[];
  boosts: TrackSpot[];
  boxes: TrackSpot[];
  pond?: { x: number; y: number; rx: number; ry: number; color: string };
};

const SPACING = 18;

function loopPoints(radii: number[]): { x: number; y: number }[] {
  return radii.map((radius, index) => {
    const angle = -Math.PI / 2 + (index / radii.length) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

function catmull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const dense: { x: number; y: number }[] = [];
  const count = points.length;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    for (let step = 0; step < 20; step += 1) {
      const t = step / 20;
      const t2 = t * t;
      const t3 = t2 * t;
      dense.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return dense;
}

function resample(raw: { x: number; y: number }[], spacing: number): { samples: TrackSample[]; length: number } {
  const pts = raw.length > 2 ? [...raw, raw[0]] : raw;
  const samples: TrackSample[] = [];
  let prev = pts[0];
  let dist = 0;
  let nextMark = 0;
  const push = (x: number, y: number, mark: number) => {
    samples.push({ x, y, dist: mark, heading: 0 });
  };
  push(prev.x, prev.y, 0);
  nextMark = spacing;
  for (let index = 1; index < pts.length; index += 1) {
    let target = pts[index];
    let dx = target.x - prev.x;
    let dy = target.y - prev.y;
    let seg = Math.hypot(dx, dy);
    if (seg < 0.001) continue;
    while (dist + seg >= nextMark) {
      const t = (nextMark - dist) / seg;
      const x = prev.x + dx * t;
      const y = prev.y + dy * t;
      push(x, y, nextMark);
      prev = { x, y };
      dist = nextMark;
      nextMark += spacing;
      dx = target.x - prev.x;
      dy = target.y - prev.y;
      seg = Math.hypot(dx, dy);
      if (seg < 0.001) break;
    }
    dist += seg;
    prev = target;
  }
  for (let index = 0; index < samples.length; index += 1) {
    const ahead = samples[(index + 1) % samples.length];
    samples[index].heading = Math.atan2(ahead.y - samples[index].y, ahead.x - samples[index].x);
  }
  return { samples, length: dist };
}

function spotAt(samples: TrackSample[], length: number, fraction: number, lateral: number, r: number): TrackSpot {
  const dist = fraction * length;
  let best = samples[0];
  let bestDelta = Infinity;
  for (const sample of samples) {
    let delta = Math.abs(sample.dist - dist);
    delta = Math.min(delta, length - delta);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = sample;
    }
  }
  const nx = Math.cos(best.heading + Math.PI / 2);
  const ny = Math.sin(best.heading + Math.PI / 2);
  return { x: best.x + nx * lateral, y: best.y + ny * lateral, r, dist: best.dist };
}

function buildTrack(draft: {
  id: string;
  name: string;
  blurb: string;
  width: number;
  ai: number;
  radii: number[];
  grass: string;
  road: string;
  edge: string;
  sky: string;
  puddleEvery: number;
  pond?: Track["pond"];
}): Track {
  const { samples, length } = resample(catmull(loopPoints(draft.radii)), SPACING);
  const half = draft.width / 2;
  const trees: TrackSpot[] = [];
  samples.forEach((sample, index) => {
    if (index % 4 !== 0) return;
    if (sample.dist < 220 || sample.dist > length - 220) return;
    const side = index % 8 === 0 ? 1 : -1;
    const nx = Math.cos(sample.heading + Math.PI / 2);
    const ny = Math.sin(sample.heading + Math.PI / 2);
    const offset = half + 78 + (index % 3) * 14;
    trees.push({
      x: sample.x + nx * side * offset,
      y: sample.y + ny * side * offset,
      r: 16 + (index % 3) * 4,
      dist: sample.dist,
    });
  });
  const puddles: TrackSpot[] = [];
  for (let fraction = 0.18; fraction < 0.95; fraction += draft.puddleEvery) {
    const side = puddles.length % 2 === 0 ? 1 : -1;
    puddles.push(spotAt(samples, length, fraction, side * half * 0.42, 30));
  }
  const boosts = [0.22, 0.48, 0.73].map((fraction) => spotAt(samples, length, fraction, 0, 34));
  const boxes = [0.12, 0.36, 0.61, 0.86].map((fraction) => spotAt(samples, length, fraction, 0, 22));
  return {
    id: draft.id,
    name: draft.name,
    blurb: draft.blurb,
    laps: 3,
    width: draft.width,
    ai: draft.ai,
    length,
    spacing: SPACING,
    grass: draft.grass,
    road: draft.road,
    edge: draft.edge,
    sky: draft.sky,
    samples,
    trees,
    puddles,
    boosts,
    boxes,
    pond: draft.pond,
  };
}

export const TRACKS: Track[] = [
  buildTrack({
    id: "lily",
    name: "Lily Pond",
    blurb: "A wide pond loop for a first drive.",
    width: 200,
    ai: 0.78,
    radii: [520, 500, 540, 510, 530, 500, 545, 515, 525, 505],
    grass: "#6ea15a",
    road: "#e7d7b0",
    edge: "#8d6b3a",
    sky: "#b7d7c8",
    puddleEvery: 0.7,
    pond: { x: 0, y: 0, rx: 210, ry: 140, color: "#3d7ea6" },
  }),
  buildTrack({
    id: "acorn",
    name: "Acorn Bend",
    blurb: "Long bends and a few puddles.",
    width: 176,
    ai: 0.86,
    radii: [430, 560, 390, 600, 420, 540, 380, 580],
    grass: "#7f9a45",
    road: "#e4c48a",
    edge: "#7a5428",
    sky: "#d7e2b5",
    puddleEvery: 0.28,
  }),
  buildTrack({
    id: "fern",
    name: "Fern Switchbacks",
    blurb: "Tight turns through the ferns.",
    width: 156,
    ai: 0.92,
    radii: [320, 560, 300, 600, 340, 540, 280, 620, 360, 500],
    grass: "#4f8f55",
    road: "#d5e0b8",
    edge: "#2f6a3a",
    sky: "#c5e2c8",
    puddleEvery: 0.22,
  }),
  buildTrack({
    id: "dam",
    name: "Beaver Dam",
    blurb: "A narrow lap around the dam.",
    width: 136,
    ai: 0.97,
    radii: [360, 640, 320, 700, 300, 620, 340, 680],
    grass: "#6d8a52",
    road: "#cbb89a",
    edge: "#6b4f2a",
    sky: "#c9d7c4",
    puddleEvery: 0.18,
    pond: { x: 0, y: 40, rx: 160, ry: 90, color: "#2f6f86" },
  }),
  buildTrack({
    id: "starlit",
    name: "Starlit Hollow",
    blurb: "The longest lap, under a bright evening sky.",
    width: 148,
    ai: 1.03,
    radii: [420, 740, 360, 780, 320, 700, 400, 760, 340, 680, 430, 720],
    grass: "#3f6b58",
    road: "#efe6c9",
    edge: "#d7c27a",
    sky: "#c9d4f2",
    puddleEvery: 0.16,
  }),
];

export function trackByIndex(index: number): Track {
  return TRACKS[Math.max(0, Math.min(TRACKS.length - 1, index))];
}
