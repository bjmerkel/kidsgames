import * as THREE from "three";
import { VIEW_H, VIEW_W } from "../game/constants";
import { ROAD_HALF, buildCourse, coursePose, courseTreats, type CoursePoint, type CourseTreat } from "./course";
import { SKATE_LEVELS, type SkateLevel } from "./levels";
import { skateChase, skateScreenY } from "./scene";
import { catHeight, type SkateState } from "./sim";

const FLOOR = -36;

type Palette = {
  sky: string;
  hill: string;
  ground: string;
};

const SKIES: Record<NonNullable<SkateLevel["sky"]> | "day", Palette> = {
  day: { sky: "#9fd4ee", hill: "#b7d39a", ground: "#6d727c" },
  dusk: { sky: "#f0a06a", hill: "#c48b62", ground: "#6a5a68" },
  night: { sky: "#1c2a4a", hill: "#243044", ground: "#4a5260" },
};

export type SkateView = {
  render: (state: SkateState, nowMs: number) => void;
};

export function mountSkateView(canvas: HTMLCanvasElement): SkateView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.setSize(VIEW_W, VIEW_H, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, VIEW_W / VIEW_H, 1, 8000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const sun = new THREE.DirectionalLight(0xfff6e8, 1.25);
  sun.position.set(180, 520, 360);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc5d7ff, 0.4);
  fill.position.set(-220, 180, -80);
  scene.add(fill);

  const park = new THREE.Group();
  scene.add(park);
  const cat = makeCat();
  scene.add(cat.group);

  const materials = {
    ground: new THREE.MeshLambertMaterial({ color: SKIES.day.ground, side: THREE.DoubleSide }),
    edge: new THREE.MeshLambertMaterial({ color: "#3e4450", side: THREE.DoubleSide }),
    gold: new THREE.MeshLambertMaterial({ color: "#f2c14e" }),
    red: new THREE.MeshLambertMaterial({ color: "#d64545" }),
    pit: new THREE.MeshLambertMaterial({ color: "#1a2230", side: THREE.DoubleSide }),
    rail: new THREE.MeshLambertMaterial({ color: "#e4e7ec" }),
    post: new THREE.MeshLambertMaterial({ color: "#8d93a0" }),
    tunnel: new THREE.MeshLambertMaterial({ color: "#2c3442" }),
    roof: new THREE.MeshLambertMaterial({ color: "#3a4250", transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    hill: new THREE.MeshLambertMaterial({ color: SKIES.day.hill }),
    checker: new THREE.MeshLambertMaterial({ map: checkerTexture(), color: "#ffffff" }),
  };

  let built = -1;
  let course: CoursePoint[] = [];
  let treats: TreatMesh[] = [];
  const sparks = makeSparks();
  scene.add(sparks);
  const smooth = { x: 0, y: 0, z: 0, lookX: 0, lookY: 0, lookZ: 0, ready: false };

  return {
    render(state, nowMs) {
      const level = SKATE_LEVELS[state.levelIndex];
      if (built !== state.levelIndex) {
        built = state.levelIndex;
        smooth.ready = false;
        course = buildCourse(level, state.levelIndex);
        buildPark(park, course, materials);
        treats = addTreats(park, course, courseTreats(level, state.levelIndex));
        const palette = SKIES[level.sky ?? "day"];
        scene.background = new THREE.Color(palette.sky);
        materials.hill.color.set(palette.hill);
        materials.ground.color.set(palette.ground);
      }
      const road = coursePose(course, state.x, state.lane);
      const heading = road.heading + state.steerAngle;
      placeCat(cat, state, road.x, road.z, heading, nowMs);
      placeTreats(treats, state, nowMs);
      placeSparks(sparks, state, road.x, road.z, heading, nowMs);
      const chase = skateChase(road.x, skateScreenY(state.y), road.z, road.heading + state.steerAngle * 0.2);
      const lift = state.grounded || state.grinding ? 0 : Math.min(70, 24 + state.airMs / 12);
      chase.y += lift;
      if (!smooth.ready) {
        Object.assign(smooth, chase, { ready: true });
      } else {
        smooth.x += (chase.x - smooth.x) * 0.28;
        smooth.y += (chase.y - smooth.y) * 0.28;
        smooth.z += (chase.z - smooth.z) * 0.28;
        smooth.lookX += (chase.lookX - smooth.lookX) * 0.28;
        smooth.lookY += (chase.lookY - smooth.lookY) * 0.28;
        smooth.lookZ += (chase.lookZ - smooth.lookZ) * 0.28;
      }
      camera.position.set(smooth.x, smooth.y, smooth.z);
      camera.lookAt(smooth.lookX, smooth.lookY, smooth.lookZ);
      renderer.render(scene, camera);
    },
  };
}

function buildPark(park: THREE.Group, course: CoursePoint[], materials: Materials): void {
  for (const child of [...park.children]) {
    park.remove(child);
    disposeObject(child);
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of course) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  const size = Math.max(maxX - minX, maxZ - minZ) + 1400;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(size, size), materials.hill);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set((minX + maxX) / 2, FLOOR - 8, (minZ + maxZ) / 2);
  park.add(grass);
  addStrip(park, course, ROAD_HALF + 18, (point) => (point.ground == null ? null : skateScreenY(point.ground) - 8), materials.edge);
  addStrip(park, course, ROAD_HALF - 6, (point) => (point.ground == null ? null : skateScreenY(point.ground)), materials.ground);
  addStrip(park, course, ROAD_HALF, (point) => (point.ground == null ? FLOOR + 8 : null), materials.pit);
  addStrip(park, course, ROAD_HALF + 8, (point) => (point.ceiling == null ? null : skateScreenY(point.ceiling)), materials.roof);
  addWalls(park, course, materials);
  addDetails(park, course, materials);
}

function addStrip(
  park: THREE.Group,
  course: CoursePoint[],
  half: number,
  height: (point: CoursePoint) => number | null,
  material: THREE.Material,
): void {
  const runs: { point: CoursePoint; y: number }[][] = [];
  let run: { point: CoursePoint; y: number }[] = [];
  const flush = () => {
    if (run.length >= 2) runs.push(run);
    run = [];
  };
  for (const point of course) {
    const y = height(point);
    if (y == null) flush();
    else run.push({ point, y });
  }
  flush();
  const positions: number[] = [];
  const indices: number[] = [];
  for (const strip of runs) {
    const base = positions.length / 3;
    strip.forEach((row, index) => {
      positions.push(...edgePoint(row.point, half, row.y), ...edgePoint(row.point, -half, row.y));
      if (index === 0) return;
      const start = base + (index - 1) * 2;
      indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
    });
  }
  if (positions.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  park.add(new THREE.Mesh(geometry, material));
}

function addWalls(park: THREE.Group, course: CoursePoint[], materials: Materials): void {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < course.length - 1; index += 1) {
    const a = course[index];
    const b = course[index + 1];
    if (a.ceiling == null || b.ceiling == null || a.ground == null || b.ground == null) continue;
    for (const side of [ROAD_HALF, -ROAD_HALF]) {
      const start = positions.length / 3;
      positions.push(
        ...edgePoint(a, side, skateScreenY(a.ground)),
        ...edgePoint(a, side, skateScreenY(a.ceiling)),
        ...edgePoint(b, side, skateScreenY(b.ceiling)),
        ...edgePoint(b, side, skateScreenY(b.ground)),
      );
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  if (positions.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  park.add(new THREE.Mesh(geometry, materials.tunnel));
}

function addDetails(park: THREE.Group, course: CoursePoint[], materials: Materials): void {
  for (let index = 0; index < course.length - 1; index += 1) {
    const a = course[index];
    const b = course[index + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.4) continue;
    const heading = Math.atan2(b.z - a.z, b.x - a.x);
    if (a.rail != null && b.rail != null) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 6, 8), materials.rail);
      rail.position.set((a.x + b.x) / 2, skateScreenY(a.rail) + 8, (a.z + b.z) / 2);
      rail.rotation.y = -heading;
      park.add(rail);
      continue;
    }
    if (a.ground == null || b.ground == null) continue;
    const y = skateScreenY(a.ground) + 2;
    if (index % 2 === 0) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(Math.min(14, length * 0.45), 2, 5), materials.rail);
      dash.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      dash.rotation.y = -heading;
      park.add(dash);
    }
    if (a.kind === "ramp" && index % 2 === 0) {
      const rising = b.ground < a.ground;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 18), rising ? materials.red : materials.gold);
      mark.position.set(a.x, y + 3, a.z);
      mark.rotation.y = -heading;
      park.add(mark);
    }
    if (index % 8 === 0) {
      for (const side of [-1, 1]) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 30, 6), materials.post);
        trunk.position.y = FLOOR + 18;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(24, 8, 6), materials.hill);
        crown.position.y = FLOOR + 46;
        tree.add(trunk, crown);
        const nx = -Math.sin(a.heading) * side;
        const nz = Math.cos(a.heading) * side;
        tree.position.set(a.x + nx * (ROAD_HALF + 80), 0, a.z + nz * (ROAD_HALF + 80));
        park.add(tree);
      }
    }
    if (a.kind === "finish") {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 1.4, 42), materials.checker);
      banner.position.set(a.x, skateScreenY(a.ground) + 48, a.z);
      banner.rotation.y = -a.heading + Math.PI / 2;
      park.add(banner);
    }
  }
}

type TreatMesh = { id: number; mesh: THREE.Group; baseY: number };

function addTreats(park: THREE.Group, course: CoursePoint[], treats: CourseTreat[]): TreatMesh[] {
  return treats.flatMap((treat) => {
    let index = 0;
    while (index < course.length - 1 && course[index + 1].s < treat.s) index += 1;
    const ground = course[index].ground;
    if (ground == null) return [];
    const pose = coursePose(course, treat.s, treat.lane);
    const mesh = makeFish();
    const baseY = skateScreenY(ground) + 20;
    mesh.position.set(pose.x, baseY, pose.z);
    park.add(mesh);
    return [{ id: treat.id, mesh, baseY }];
  });
}

function makeFish(): THREE.Group {
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8), new THREE.MeshLambertMaterial({ color: "#f29a3a" }));
  body.scale.set(1.8, 0.9, 0.85);
  fish.scale.setScalar(1.35);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(6, 11, 6), new THREE.MeshLambertMaterial({ color: "#e07a28" }));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -13;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), new THREE.MeshLambertMaterial({ color: "#1c1915" }));
  eye.position.set(8, 2, 4);
  fish.add(body, tail, eye);
  return fish;
}

function placeTreats(treats: TreatMesh[], state: SkateState, nowMs: number): void {
  for (const treat of treats) {
    treat.mesh.visible = state.phase === "playing" && !state.treats.includes(treat.id);
    treat.mesh.rotation.y = nowMs / 240 + treat.id;
    treat.mesh.position.y = treat.baseY + Math.sin(nowMs / 170 + treat.id) * 5;
  }
}

function makeSparks(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: "#f2c14e" });
  for (let i = 0; i < 14; i += 1) {
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(i % 3 === 0 ? 4.2 : 2.4), material));
  }
  group.visible = false;
  return group;
}

function placeSparks(sparks: THREE.Group, state: SkateState, x: number, z: number, heading: number, nowMs: number): void {
  const on = state.phase === "playing" && (state.boostMs > 0 || state.grinding);
  sparks.visible = on;
  if (!on) return;
  const material = sparks.children[0] instanceof THREE.Mesh ? sparks.children[0].material : null;
  if (material instanceof THREE.MeshLambertMaterial) material.color.set(state.boostMs > 0 ? "#f2c14e" : "#f7f4ef");
  const backX = -Math.cos(heading);
  const backZ = -Math.sin(heading);
  sparks.children.forEach((spark, i) => {
    const dist = 22 + ((nowMs / 10 + i * 19) % 48);
    const side = Math.sin(i * 1.7 + nowMs / 70) * 10;
    spark.position.set(x + backX * dist - Math.sin(heading) * side, skateScreenY(state.y) + 8 + (i % 4) * 4, z + backZ * dist + Math.cos(heading) * side);
    spark.rotation.y = nowMs / 80 + i;
  });
}

function edgePoint(point: CoursePoint, side: number, y: number): [number, number, number] {
  const nx = -Math.sin(point.heading);
  const nz = Math.cos(point.heading);
  return [point.x + nx * side, y, point.z + nz * side];
}

type CatParts = {
  group: THREE.Group;
  board: THREE.Mesh;
  wheels: THREE.Mesh[];
  body: THREE.Mesh;
  head: THREE.Mesh;
  tail: THREE.Mesh;
};

function makeCat(): CatParts {
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(52, 6, 24), new THREE.MeshLambertMaterial({ color: "#20242b" }));
  board.position.y = 7;
  const wheelGeo = new THREE.CylinderGeometry(5, 5, 6, 12);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: "#d64545" });
  const wheels = ([-16, 16] as const).flatMap((x) =>
    ([-11, 11] as const).map((z) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, 5, z);
      return wheel;
    }),
  );
  const fur = new THREE.MeshLambertMaterial({ color: "#f7f4ef" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), fur);
  body.scale.set(1.05, 1.15, 0.85);
  const head = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), fur);
  const earGeo = new THREE.ConeGeometry(5, 12, 6);
  const earMat = new THREE.MeshLambertMaterial({ color: "#f2b6c6" });
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, earMat);
    ear.position.set(2, 10, side * 7);
    head.add(ear);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), new THREE.MeshLambertMaterial({ color: "#1c1915" }));
  const leftEye = eye.clone();
  leftEye.position.set(11, 1, -4);
  const rightEye = eye.clone();
  rightEye.position.set(11, 1, 4);
  head.add(leftEye, rightEye);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshLambertMaterial({ color: "#e0899a" }));
  nose.position.set(12, -3, 0);
  head.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 22, 8), fur);
  tail.position.set(-18, 16, 0);
  tail.rotation.z = 0.9;
  group.add(board, ...wheels, body, head, tail);
  return { group, board, wheels, body, head, tail };
}

function placeCat(cat: CatParts, state: SkateState, x: number, z: number, heading: number, nowMs: number): void {
  const height = catHeight(state.crouched);
  cat.group.position.set(x, skateScreenY(state.y), z);
  cat.group.rotation.order = "YZX";
  cat.group.rotation.y = -heading;
  cat.group.rotation.z = state.grounded || state.grinding ? -Math.atan(state.slope) : 0;
  cat.group.rotation.x = -state.steerAngle * 0.9;
  const spin = state.x / 8;
  for (const wheel of cat.wheels) wheel.rotation.z = spin;
  cat.board.rotation.x = state.airTrick === "kickflip" ? state.airMs / 70 : 0;
  const crouched = state.crouched ? 0.62 : 1;
  cat.body.position.set(2, 18 + height * 0.28, 0);
  cat.body.scale.y = 1.15 * crouched;
  cat.head.position.set(12, 18 + height * 0.72, 0);
  cat.head.rotation.z = state.airTrick === "grab" ? -0.5 : 0;
  const wag = state.boostMs > 0 ? 60 : 120;
  cat.tail.rotation.z = 0.8 + Math.sin(nowMs / wag) * (state.boostMs > 0 ? 0.5 : 0.25);
}

function checkerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 4; y += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#f7f1e6" : "#1c1915";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Materials = {
  ground: THREE.MeshLambertMaterial;
  edge: THREE.MeshLambertMaterial;
  gold: THREE.MeshLambertMaterial;
  red: THREE.MeshLambertMaterial;
  pit: THREE.MeshLambertMaterial;
  rail: THREE.MeshLambertMaterial;
  post: THREE.MeshLambertMaterial;
  tunnel: THREE.MeshLambertMaterial;
  roof: THREE.MeshLambertMaterial;
  hill: THREE.MeshLambertMaterial;
  checker: THREE.MeshLambertMaterial;
};

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
}
