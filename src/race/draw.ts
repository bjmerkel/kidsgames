import { VIEW_H, VIEW_W } from "../game/constants";
import { characterById, type Character } from "./characters";
import { cupOrder, placeLabel, type ItemKind, type RaceState, type Racer } from "./sim";
import { trackByIndex, type Track } from "./tracks";

const ZOOM = 1.05;

export function drawGarage(ctx: CanvasRenderingContext2D, character: Character, nowMs: number): void {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#d7ecf3");
  sky.addColorStop(1, "#6ea15a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText("Woodland Grand Prix", VIEW_W / 2, 78);
  ctx.font = "700 18px Trebuchet MS, sans-serif";
  ctx.fillText(`${character.name} the ${character.species}`, VIEW_W / 2, 114);
  ctx.save();
  ctx.translate(VIEW_W / 2, 290);
  drawCreature(ctx, character, 0, 0, -Math.PI / 2 + Math.sin(nowMs * 0.002) * 0.08, 3.1);
  ctx.restore();
  ctx.fillStyle = "#1c1915";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  const lines = ["10 woodland racers. 5 tracks. 3 laps each.", "Hold Left or Right to steer. The kart rolls on its own.", "Grab a box, then tap Use."];
  lines.forEach((line, index) => ctx.fillText(line, VIEW_W / 2, 470 + index * 28));
}

export function drawRace(ctx: CanvasRenderingContext2D, state: RaceState, nowMs: number): void {
  const track = trackByIndex(state.trackIndex);
  const player = state.racers[state.playerIndex];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = track.sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(VIEW_W / 2, VIEW_H * 0.58);
  ctx.scale(ZOOM, ZOOM);
  ctx.rotate(-player.heading - Math.PI / 2);
  ctx.translate(-player.x, -player.y);
  drawWorld(ctx, track, state, nowMs);
  ctx.restore();
  drawMinimap(ctx, track, state);
  drawHud(ctx, state, track);
  if (state.phase === "countdown") drawBanner(ctx, countdownText(state.countdownMs), track.blurb);
  else if (state.goMs > 0 && state.phase === "racing") drawBanner(ctx, "Go!", "");
  else if (state.phase === "paused") drawBanner(ctx, "Paused", "Tap the picture to roll.");
  else if (state.phase === "results") drawBanner(ctx, "You finished the race!", `${placeLabel(player.place)} place. ${state.points[player.id] ?? 0} cup points.`);
  else if (state.phase === "cup") drawCup(ctx, state);
}

function drawWorld(ctx: CanvasRenderingContext2D, track: Track, state: RaceState, nowMs: number): void {
  ctx.fillStyle = track.grass;
  ctx.fillRect(-4000, -4000, 8000, 8000);
  if (track.pond) {
    ctx.fillStyle = track.pond.color;
    ctx.beginPath();
    ctx.ellipse(track.pond.x, track.pond.y, track.pond.rx, track.pond.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  traceCenter(ctx, track);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = track.width + 18;
  ctx.strokeStyle = track.edge;
  ctx.stroke();
  ctx.lineWidth = track.width - 16;
  ctx.strokeStyle = track.road;
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.stroke();
  for (const puddle of track.puddles) {
    ctx.fillStyle = "rgba(47, 111, 150, 0.78)";
    ctx.beginPath();
    ctx.ellipse(puddle.x, puddle.y, puddle.r, puddle.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const boost of track.boosts) {
    ctx.fillStyle = "#7ed37a";
    ctx.beginPath();
    ctx.ellipse(boost.x, boost.y, boost.r, boost.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const box of state.boxes) {
    if (box.readyMs > 0) continue;
    ctx.fillStyle = "#f2c14e";
    ctx.strokeStyle = "#1c1915";
    ctx.lineWidth = 3;
    roundRect(ctx, box.x - 14, box.y - 14, 28, 28, 6);
    ctx.fill();
    ctx.stroke();
  }
  for (const slick of state.slicks) {
    ctx.fillStyle = "rgba(196, 122, 42, 0.8)";
    ctx.beginPath();
    ctx.arc(slick.x, slick.y, slick.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const tree of track.trees) {
    ctx.fillStyle = "rgba(28, 25, 21, 0.18)";
    ctx.beginPath();
    ctx.ellipse(tree.x + 4, tree.y + 8, tree.r * 0.8, tree.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f6a3a";
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b4f2a";
    ctx.fillRect(tree.x - 3, tree.y, 6, tree.r * 0.8);
  }
  for (const shot of state.projectiles) {
    ctx.fillStyle = "#8a5a2b";
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const order = [...state.racers].sort((a, b) => (a.id === state.characterId ? 1 : 0) - (b.id === state.characterId ? 1 : 0));
  for (const racer of order) drawKart(ctx, racer, nowMs);
}

function traceCenter(ctx: CanvasRenderingContext2D, track: Track): void {
  ctx.beginPath();
  track.samples.forEach((sample, index) => {
    if (index === 0) ctx.moveTo(sample.x, sample.y);
    else ctx.lineTo(sample.x, sample.y);
  });
  ctx.closePath();
}

function drawKart(ctx: CanvasRenderingContext2D, racer: Racer, nowMs: number): void {
  const character = characterById(racer.id);
  ctx.save();
  ctx.translate(racer.x, racer.y);
  if (racer.wobbleMs > 0) ctx.rotate(Math.sin(nowMs * 0.03) * 0.15);
  ctx.rotate(racer.heading + Math.PI / 2);
  ctx.fillStyle = "rgba(28, 25, 21, 0.2)";
  ctx.fillRect(-16, -6, 32, 22);
  ctx.fillStyle = character.accent;
  ctx.fillRect(-13, -10, 26, 30);
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-14, -4, 5, 0, Math.PI * 2);
  ctx.arc(14, -4, 5, 0, Math.PI * 2);
  ctx.arc(-14, 16, 5, 0, Math.PI * 2);
  ctx.arc(14, 16, 5, 0, Math.PI * 2);
  ctx.fill();
  drawCreature(ctx, character, 0, 2, -Math.PI / 2, 0.9);
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, character: Character, x: number, y: number, heading: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.scale(scale, scale);
  if (character.id === "woody") drawWoodDuck(ctx);
  else if (character.id === "clover") drawEars(ctx, character, 18);
  else if (character.id === "luna") drawOwl(ctx, character);
  else if (character.id === "burr") drawSpikes(ctx, character);
  else if (character.id === "cedar") drawTail(ctx, character, 16);
  else if (character.id === "nib" || character.id === "ember") drawTail(ctx, character, 18);
  else drawBody(ctx, character);
  if (character.id === "chip" || character.id === "bandit") drawStripes(ctx);
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, character: Character): void {
  ctx.fillStyle = character.body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.belly;
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.head;
  ctx.beginPath();
  ctx.arc(0, -12, 11, 0, Math.PI * 2);
  ctx.fill();
  drawEyes(ctx, -16);
}

function drawWoodDuck(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#8d97a3";
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b5522a";
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(-8, -10, 16, 4);
  ctx.fillStyle = "#1f7a4d";
  ctx.beginPath();
  ctx.arc(0, -16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#145c38";
  ctx.beginPath();
  ctx.ellipse(0, -26, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a007";
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-4, -12);
  ctx.lineTo(4, -12);
  ctx.fill();
  drawEyes(ctx, -18);
}

function drawEars(ctx: CanvasRenderingContext2D, character: Character, length: number): void {
  ctx.fillStyle = character.accent;
  ctx.beginPath();
  ctx.ellipse(-7, -28, 4, length, -0.2, 0, Math.PI * 2);
  ctx.ellipse(7, -28, 4, length, 0.2, 0, Math.PI * 2);
  ctx.fill();
  drawBody(ctx, character);
}

function drawOwl(ctx: CanvasRenderingContext2D, character: Character): void {
  ctx.fillStyle = character.body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.belly;
  ctx.beginPath();
  ctx.ellipse(0, 8, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.head;
  ctx.beginPath();
  ctx.arc(0, -14, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.accent;
  ctx.beginPath();
  ctx.moveTo(-8, -20);
  ctx.lineTo(-4, -30);
  ctx.lineTo(0, -20);
  ctx.moveTo(8, -20);
  ctx.lineTo(4, -30);
  ctx.lineTo(0, -20);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(-5, -14, 5, 0, Math.PI * 2);
  ctx.arc(5, -14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-5, -14, 2, 0, Math.PI * 2);
  ctx.arc(5, -14, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpikes(ctx: CanvasRenderingContext2D, character: Character): void {
  ctx.fillStyle = character.body;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 12, 6 + Math.sin(angle) * 12);
    ctx.lineTo(Math.cos(angle) * 24, 6 + Math.sin(angle) * 24);
    ctx.lineTo(Math.cos(angle + 0.3) * 12, 6 + Math.sin(angle + 0.3) * 12);
    ctx.fill();
  }
  drawBody(ctx, character);
}

function drawTail(ctx: CanvasRenderingContext2D, character: Character, size: number): void {
  ctx.fillStyle = character.accent;
  ctx.beginPath();
  ctx.ellipse(0, 28, size * 0.45, size, 0, 0, Math.PI * 2);
  ctx.fill();
  if (character.id === "cedar") {
    ctx.fillStyle = character.belly;
    ctx.beginPath();
    ctx.ellipse(0, 30, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBody(ctx, character);
}

function drawStripes(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.35)";
  ctx.fillRect(-10, 0, 4, 16);
  ctx.fillRect(-2, -2, 4, 18);
  ctx.fillRect(6, 0, 4, 16);
}

function drawEyes(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(-4, y, 2.4, 0, Math.PI * 2);
  ctx.arc(4, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-4, y, 1.1, 0, Math.PI * 2);
  ctx.arc(4, y, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMinimap(ctx: CanvasRenderingContext2D, track: Track, state: RaceState): void {
  const size = 92;
  const x = VIEW_W - size - 12;
  const y = 12;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sample of track.samples) {
    minX = Math.min(minX, sample.x);
    minY = Math.min(minY, sample.y);
    maxX = Math.max(maxX, sample.x);
    maxY = Math.max(maxY, sample.y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const map = (px: number, py: number) => ({
    x: x + ((px - minX) / span) * (size - 16) + 8,
    y: y + ((py - minY) / span) * (size - 16) + 8,
  });
  ctx.fillStyle = "rgba(247, 241, 230, 0.9)";
  roundRect(ctx, x, y, size, size, 12);
  ctx.fill();
  ctx.beginPath();
  track.samples.forEach((sample, index) => {
    const point = map(sample.x, sample.y);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.strokeStyle = track.edge;
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const racer of state.racers) {
    const point = map(racer.x, racer.y);
    ctx.fillStyle = racer.id === state.characterId ? "#f2c14e" : characterById(racer.id).body;
    ctx.beginPath();
    ctx.arc(point.x, point.y, racer.id === state.characterId ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, state: RaceState, track: Track): void {
  const player = state.racers[state.playerIndex];
  ctx.fillStyle = "rgba(247, 241, 230, 0.92)";
  roundRect(ctx, 12, 12, 210, 62, 12);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(track.name, 24, 34);
  ctx.font = "700 14px Trebuchet MS, sans-serif";
  ctx.fillText(`Lap ${Math.min(track.laps, player.lap + 1)}/${track.laps}`, 24, 56);
  ctx.textAlign = "right";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText(placeLabel(player.place), 198, 54);
  if (player.item) {
    ctx.textAlign = "left";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#1c1915";
    ctx.fillText(itemLabel(player.item), 24, 96);
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.28)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 36, 250, VIEW_W - 72, body ? 150 : 110, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 312);
  if (body) {
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(body, VIEW_W / 2, 350);
  }
}

function drawCup(ctx: CanvasRenderingContext2D, state: RaceState): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.35)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 28, 70, VIEW_W - 56, 560, 18);
  ctx.fill();
  const order = cupOrder(state.points);
  const won = order[0] === state.characterId;
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(won ? "You won the cup!" : "The woodland cup", VIEW_W / 2, 118);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText("You finished all 5 levels.", VIEW_W / 2, 148);
  order.forEach((id, index) => {
    const character = characterById(id);
    const y = 190 + index * 40;
    ctx.textAlign = "left";
    ctx.fillStyle = id === state.characterId ? "#8a3e16" : "#1c1915";
    ctx.font = "700 18px Trebuchet MS, sans-serif";
    ctx.fillText(`${index + 1}. ${character.name} the ${character.species}`, 52, y);
    ctx.textAlign = "right";
    ctx.fillText(String(state.points[id] ?? 0), VIEW_W - 52, y);
  });
}

function countdownText(ms: number): string {
  if (ms > 2000) return "3";
  if (ms > 1000) return "2";
  return "1";
}

function itemLabel(item: ItemKind): string {
  if (item === "acorn") return "Acorn ready";
  if (item === "leaf") return "Leaf ready";
  return "Honey ready";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
