import * as THREE from "three";
import { VIEW_H, VIEW_W } from "../game/constants";
import { courseWidth, SKATE_LEVELS, type SkateLevel } from "./levels";
import { skateCameraX, skateProps, skateScreenY, type SkateProp } from "./scene";
import { catHeight, type SkateState } from "./sim";

const STREET = 78;
const HALF = STREET / 2;
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
  const camera = new THREE.PerspectiveCamera(40, VIEW_W / VIEW_H, 1, 4000);
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
    ground: new THREE.MeshLambertMaterial({ color: SKIES.day.ground }),
    edge: new THREE.MeshLambertMaterial({ color: "#3e4450" }),
    gold: new THREE.MeshLambertMaterial({ color: "#f2c14e" }),
    red: new THREE.MeshLambertMaterial({ color: "#d64545" }),
    pit: new THREE.MeshLambertMaterial({ color: "#1a2230" }),
    rail: new THREE.MeshLambertMaterial({ color: "#e4e7ec" }),
    post: new THREE.MeshLambertMaterial({ color: "#8d93a0" }),
    tunnel: new THREE.MeshLambertMaterial({ color: "#2c3442" }),
    roof: new THREE.MeshLambertMaterial({ color: "#3a4250" }),
    hill: new THREE.MeshLambertMaterial({ color: SKIES.day.hill }),
    checker: new THREE.MeshLambertMaterial({ map: checkerTexture(), color: "#ffffff" }),
  };

  let built = -1;

  return {
    render(state, nowMs) {
      const level = SKATE_LEVELS[state.levelIndex];
      if (built !== state.levelIndex) {
        built = state.levelIndex;
        buildPark(park, level, materials);
        const palette = SKIES[level.sky ?? "day"];
        scene.background = new THREE.Color(palette.sky);
        materials.hill.color.set(palette.hill);
        materials.ground.color.set(palette.ground);
      }
      placeCat(cat, state, nowMs);
      const width = courseWidth(level);
      const origin = skateCameraX(state.x, width);
      const lookX = origin + VIEW_W / 2;
      const lookY = VIEW_H * 0.46;
      camera.position.set(lookX - 48, lookY + 86, 860);
      camera.lookAt(lookX + 18, lookY - 24, 0);
      renderer.render(scene, camera);
    },
  };
}

function buildPark(park: THREE.Group, level: SkateLevel, materials: Materials): void {
  for (const child of [...park.children]) {
    park.remove(child);
    disposeObject(child);
  }
  const hills = new THREE.Mesh(new THREE.BoxGeometry(courseWidth(level) + 800, 220, 40), materials.hill);
  hills.position.set(courseWidth(level) / 2, 250, -160);
  park.add(hills);

  for (const prop of skateProps(level)) addProp(park, prop, materials);
}

function addProp(park: THREE.Group, prop: SkateProp, materials: Materials): void {
  if (prop.kind === "gap") {
    const pit = new THREE.Mesh(new THREE.BoxGeometry(prop.w, 90, STREET + 8), materials.pit);
    pit.position.set(prop.x + prop.w / 2, 20, 0);
    park.add(pit);
    return;
  }
  if (prop.kind === "rail") {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, prop.w, 10), materials.rail);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(prop.x + prop.w / 2, skateScreenY(prop.y0), 0);
    park.add(bar);
    for (let post = 16; post < prop.w; post += 48) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 46, 6), materials.post);
      leg.position.set(prop.x + post, skateScreenY(prop.y0) - 23, 0);
      park.add(leg);
    }
    return;
  }

  const top0 = skateScreenY(prop.y0);
  const top1 = skateScreenY(prop.y1);
  const body = new THREE.Mesh(wedgeGeometry(prop.w, top0, top1, FLOOR, STREET), materials.ground);
  body.position.set(prop.x, 0, 0);
  park.add(body);
  const lip = new THREE.Mesh(wedgeGeometry(prop.w, top0 + 3, top1 + 3, top0, 10), materials.edge);
  lip.position.set(prop.x, 0, HALF - 5);
  park.add(lip);

  if (prop.kind === "ramp") {
    const uphill = prop.y1 < prop.y0;
    const mark = uphill ? materials.red : materials.gold;
    for (let step = 22; step < prop.w - 8; step += 28) {
      const t = step / prop.w;
      const y = top0 + (top1 - top0) * t;
      const chevron = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 18), mark);
      chevron.position.set(prop.x + step, y + 4, 8);
      chevron.rotation.z = Math.atan2(top1 - top0, prop.w);
      park.add(chevron);
    }
  }

  if (prop.kind === "tunnel") {
    const floorY = skateScreenY(prop.y0);
    const opening = prop.gap;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(prop.w, 28, STREET + 6), materials.roof);
    roof.position.set(prop.x + prop.w / 2, floorY + opening + 14, 0);
    park.add(roof);
    const back = new THREE.Mesh(new THREE.BoxGeometry(prop.w, opening, 10), materials.tunnel);
    back.position.set(prop.x + prop.w / 2, floorY + opening / 2, -HALF + 6);
    park.add(back);
    for (const end of [8, prop.w - 8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(12, opening + 28, 16), materials.tunnel);
      post.position.set(prop.x + end, floorY + (opening + 28) / 2, 0);
      park.add(post);
    }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(prop.w - 20, 6, 8), materials.gold);
    trim.position.set(prop.x + prop.w / 2, floorY + opening + 26, HALF - 2);
    park.add(trim);
  }

  if (prop.kind === "finish") {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(prop.w, 96), 48), materials.checker);
    banner.position.set(prop.x + prop.w / 2, skateScreenY(prop.y0) + 56, HALF - 1);
    park.add(banner);
  }
}

function wedgeGeometry(w: number, top0: number, top1: number, bottom: number, depth: number): THREE.BufferGeometry {
  const z0 = -depth / 2;
  const z1 = depth / 2;
  const positions = new Float32Array([
    0, bottom, z0, w, bottom, z0, w, top1, z0, 0, top0, z0,
    0, bottom, z1, w, bottom, z1, w, top1, z1, 0, top0, z1,
  ]);
  const indices = [0, 1, 5, 0, 5, 4, 3, 6, 2, 3, 7, 6, 0, 7, 3, 0, 4, 7, 1, 2, 6, 1, 6, 5, 4, 5, 6, 4, 6, 7, 0, 3, 2, 0, 2, 1];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
  const board = new THREE.Mesh(new THREE.BoxGeometry(50, 6, 16), new THREE.MeshLambertMaterial({ color: "#20242b" }));
  board.position.y = 7;
  const wheelGeo = new THREE.CylinderGeometry(5, 5, 6, 12);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: "#d64545" });
  const wheels = [-16, 16].map((x) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 5, 0);
    return wheel;
  });
  const fur = new THREE.MeshLambertMaterial({ color: "#f7f4ef" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), fur);
  body.scale.set(1, 1.15, 0.8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), fur);
  const earGeo = new THREE.ConeGeometry(5, 12, 6);
  const earMat = new THREE.MeshLambertMaterial({ color: "#f2b6c6" });
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, earMat);
    ear.position.set(side * 7, 10, 0);
    head.add(ear);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), new THREE.MeshLambertMaterial({ color: "#1c1915" }));
  const leftEye = eye.clone();
  leftEye.position.set(-4, 1, 11);
  const rightEye = eye.clone();
  rightEye.position.set(4, 1, 11);
  head.add(leftEye, rightEye);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshLambertMaterial({ color: "#e0899a" }));
  nose.position.set(0, -3, 12);
  head.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 22, 8), fur);
  tail.position.set(-20, 18, -4);
  tail.rotation.z = 0.8;
  group.add(board, ...wheels, body, head, tail);
  return { group, board, wheels, body, head, tail };
}

function placeCat(cat: CatParts, state: SkateState, nowMs: number): void {
  const height = catHeight(state.crouched);
  cat.group.position.set(state.x, skateScreenY(state.y), 6);
  cat.group.rotation.z = state.grounded ? -Math.atan(state.slope) : 0;
  const spin = state.x / 8;
  for (const wheel of cat.wheels) wheel.rotation.z = spin;
  cat.board.rotation.x = state.airTrick === "kickflip" ? state.airMs / 70 : 0;
  const crouched = state.crouched ? 0.62 : 1;
  cat.body.position.set(0, 18 + height * 0.28, 0);
  cat.body.scale.y = 1.15 * crouched;
  cat.head.position.set(0, 18 + height * 0.72, 8);
  cat.head.rotation.z = state.airTrick === "grab" ? -0.5 : 0;
  cat.tail.rotation.z = 0.8 + Math.sin(nowMs / 120) * 0.25;
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
