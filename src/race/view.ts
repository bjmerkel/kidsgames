import * as THREE from "three";
import { VIEW_H, VIEW_W } from "../game/constants";
import { characterById } from "./characters";
import { raceCamera, roadEdge } from "./scene";
import type { RaceState } from "./sim";
import { trackByIndex, type Track } from "./tracks";

export type RaceView = {
  render: (state: RaceState, nowMs: number) => void;
};

export function mountRaceView(canvas: HTMLCanvasElement): RaceView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.setSize(VIEW_W, VIEW_H, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, VIEW_W / VIEW_H, 1, 8000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const sun = new THREE.DirectionalLight(0xfff4e4, 1.2);
  sun.position.set(120, 320, 80);
  scene.add(sun);

  const world = new THREE.Group();
  const moving = new THREE.Group();
  scene.add(world, moving);

  const karts = new Map<string, THREE.Group>();
  let built = "";
  const smooth = { x: 0, y: 0, z: 0, lookX: 0, lookY: 0, lookZ: 0, ready: false };

  return {
    render(state, nowMs) {
      const track = trackByIndex(state.trackIndex);
      const key = `${state.trackIndex}:${state.characterId}`;
      if (built !== key) {
        built = key;
        smooth.ready = false;
        rebuild(world, karts, track, state);
        scene.background = new THREE.Color(track.sky);
      }
      const player = state.racers[state.playerIndex];
      for (const racer of state.racers) {
        const kart = karts.get(racer.id);
        if (!kart) continue;
        kart.position.set(racer.x, 0, racer.y);
        kart.rotation.y = -racer.heading;
        kart.rotation.z = racer.wobbleMs > 0 ? Math.sin(nowMs * 0.03) * 0.12 : 0;
      }
      fillMoving(moving, state);
      const goal = raceCamera(player.x, player.y, player.heading);
      if (!smooth.ready) {
        Object.assign(smooth, goal, { ready: true });
      } else {
        smooth.x += (goal.x - smooth.x) * 0.16;
        smooth.y += (goal.y - smooth.y) * 0.16;
        smooth.z += (goal.z - smooth.z) * 0.16;
        smooth.lookX += (goal.lookX - smooth.lookX) * 0.16;
        smooth.lookY += (goal.lookY - smooth.lookY) * 0.16;
        smooth.lookZ += (goal.lookZ - smooth.lookZ) * 0.16;
      }
      camera.position.set(smooth.x, smooth.y, smooth.z);
      camera.lookAt(smooth.lookX, smooth.lookY, smooth.lookZ);
      renderer.render(scene, camera);
    },
  };
}

function rebuild(world: THREE.Group, karts: Map<string, THREE.Group>, track: Track, state: RaceState): void {
  for (const child of [...world.children]) {
    world.remove(child);
    disposeObject(child);
  }
  karts.clear();
  const bounds = trackBounds(track);
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.size, bounds.size),
    new THREE.MeshLambertMaterial({ color: track.grass }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(bounds.cx, 0, bounds.cz);
  world.add(grass);
  if (track.pond) {
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshLambertMaterial({ color: track.pond.color }),
    );
    pond.rotation.x = -Math.PI / 2;
    pond.scale.set(track.pond.rx, track.pond.ry, 1);
    pond.position.set(track.pond.x, 0.4, track.pond.y);
    world.add(pond);
  }
  world.add(ribbon(track, track.width / 2 + 14, 0.6, track.edge));
  world.add(ribbon(track, track.width / 2 - 6, 1.2, track.road));
  world.add(ribbon(track, 5, 1.6, "#f7f4ee"));
  for (const puddle of track.puddles) world.add(disc(puddle.x, puddle.y, puddle.r, 1.8, "#2f6f96", 0.85));
  for (const boost of track.boosts) world.add(disc(boost.x, boost.y, boost.r * 0.7, 1.9, "#7ed37a", 1));
  for (const tree of track.trees) world.add(makeTree(tree.x, tree.y, tree.r));
  for (const racer of state.racers) {
    const kart = makeKart(racer.id, racer.id === state.characterId);
    karts.set(racer.id, kart);
    world.add(kart);
  }
}

function ribbon(track: Track, half: number, y: number, color: string): THREE.Mesh {
  const count = track.samples.length;
  const positions = new Float32Array(count * 6);
  const indices: number[] = [];
  track.samples.forEach((sample, index) => {
    const left = roadEdge(sample, half, 1);
    const right = roadEdge(sample, half, -1);
    positions.set([left.x, y, left.z, right.x, y, right.z], index * 6);
    const next = (index + 1) % count;
    const a = index * 2;
    const b = a + 1;
    const c = next * 2;
    const d = c + 1;
    indices.push(a, c, b, b, c, d);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
}

function makeTree(x: number, z: number, radius: number): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4, radius * 0.9, 6),
    new THREE.MeshLambertMaterial({ color: "#6b4f2a" }),
  );
  trunk.position.y = radius * 0.45;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 8),
    new THREE.MeshLambertMaterial({ color: "#2f6a3a" }),
  );
  crown.position.y = radius * 1.05;
  group.add(trunk, crown);
  group.position.set(x, 0, z);
  return group;
}

function makeKart(id: string, player: boolean): THREE.Group {
  const character = characterById(id);
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(36, 12, 26),
    new THREE.MeshLambertMaterial({ color: character.accent }),
  );
  body.position.set(2, 10, 0);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(9, 12, 10),
    new THREE.MeshLambertMaterial({ color: character.head }),
  );
  head.position.set(4, 22, 0);
  const wheelGeo = new THREE.CylinderGeometry(4, 4, 5, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: "#1c1915" });
  for (const [x, z] of [[-10, -12], [-10, 12], [12, -12], [12, 12]] as const) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 4, z);
    group.add(wheel);
  }
  group.add(body, head);
  if (player) {
    const mark = new THREE.Mesh(
      new THREE.TorusGeometry(16, 2, 6, 16),
      new THREE.MeshLambertMaterial({ color: "#f2c14e" }),
    );
    mark.rotation.x = Math.PI / 2;
    mark.position.y = 2;
    group.add(mark);
  }
  return group;
}

function fillMoving(group: THREE.Group, state: RaceState): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
  for (const box of state.boxes) {
    if (box.readyMs > 0) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 22), new THREE.MeshLambertMaterial({ color: "#f2c14e" }));
    mesh.position.set(box.x, 14, box.y);
    group.add(mesh);
  }
  for (const slick of state.slicks) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(slick.r, 14),
      new THREE.MeshLambertMaterial({ color: "#c47a2a", transparent: true, opacity: 0.8 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(slick.x, 1.7, slick.y);
    group.add(mesh);
  }
  for (const shot of state.projectiles) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(7, 8, 8), new THREE.MeshLambertMaterial({ color: "#8a5a2b" }));
    mesh.position.set(shot.x, 10, shot.y);
    group.add(mesh);
  }
}

function disc(x: number, z: number, radius: number, y: number, color: string, opacity: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 16),
    new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

function trackBounds(track: Track): { cx: number; cz: number; size: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const sample of track.samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minZ = Math.min(minZ, sample.y);
    maxZ = Math.max(maxZ, sample.y);
  }
  const span = Math.max(maxX - minX, maxZ - minZ);
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, size: span + 900 };
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    }
  });
}
