import { VIEW_H, VIEW_W } from "../game/constants";
import { TIDE_STEP, tideClue, tideExitOpen, tideFloor, tideGoal, type TideState } from "./sim";
import { LAMP_ORDER, MARK_ORDER, ROOMS, type Spot } from "./world";

const TILE = 32;
const INK = "#1c1915";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const TOP = 56;

function origin(state: TideState): { ox: number; oy: number } {
  const room = ROOMS[state.room];
  const width = room.floor[0].length;
  const height = room.floor.length;
  const viewCols = 15;
  const viewRows = 15;
  const camX = width > viewCols ? Math.max(0, Math.min(width - viewCols, state.hero.x - 7)) : 0;
  const camY = height > viewRows ? Math.max(0, Math.min(height - viewRows, state.hero.y - 7)) : 0;
  const ox = width > viewCols ? -camX * TILE : (VIEW_W - width * TILE) / 2;
  const oy = height > viewRows ? TOP - camY * TILE : Math.max(TOP, (520 - height * TILE) / 2);
  return { ox, oy };
}

function heroPixel(state: TideState, ox: number, oy: number): { x: number; y: number } {
  const travel = state.hero.moveMs > 0 ? 1 - state.hero.moveMs / TIDE_STEP : 1;
  const gx = state.hero.prevX + (state.hero.x - state.hero.prevX) * travel;
  const gy = state.hero.prevY + (state.hero.y - state.hero.prevY) * travel;
  return { x: ox + gx * TILE + TILE / 2, y: oy + gy * TILE + TILE / 2 };
}

function paintFloor(ctx: CanvasRenderingContext2D, floor: string, x: number, y: number): void {
  if (floor === "#") {
    ctx.fillStyle = "#6f6248";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#8a7a5c";
    ctx.fillRect(x + 4, y + 4, TILE - 10, TILE - 10);
    return;
  }
  if (floor === "~") {
    ctx.fillStyle = "#2f6f91";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#3d86ab";
    ctx.fillRect(x, y + 18, TILE, 6);
    return;
  }
  if (floor === ",") {
    ctx.fillStyle = "#3f8f45";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#2f6d34";
    ctx.fillRect(x + 6, y + 8, 4, 10);
    ctx.fillRect(x + 18, y + 16, 4, 8);
    return;
  }
  if (floor === "o") {
    ctx.fillStyle = "#d7c39a";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = "#8a5a32";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
    return;
  }
  ctx.fillStyle = "#e6d2a2";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#d8c08a";
  ctx.fillRect(x, y + TILE - 4, TILE, 4);
}

function paintSail(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, open: boolean): void {
  const px = ox + x * TILE;
  const py = oy + y * TILE;
  ctx.fillStyle = open ? "#2f9e44" : "#8d6a43";
  ctx.fillRect(px + 4, py + 16, 24, 10);
  ctx.fillStyle = open ? "#f7f1e6" : "#d7c39a";
  ctx.beginPath();
  ctx.moveTo(px + 16, py + 2);
  ctx.lineTo(px + 26, py + 16);
  ctx.lineTo(px + 16, py + 16);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = "700 10px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sail", px + 16, py + 25);
  if (open) ring(ctx, px + 16, py + 16);
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = "#c81d25";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.stroke();
}

function paintActor(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, label: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "700 11px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 4);
}

export function drawTide(ctx: CanvasRenderingContext2D, state: TideState, now: number): void {
  const room = ROOMS[state.room];
  const { ox, oy } = origin(state);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#8ec8ea");
  sky.addColorStop(1, "#d7ecf3");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  room.floor.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      paintFloor(ctx, tideFloor(state, x, y), ox + x * TILE, oy + y * TILE);
    }
  });

  if (room.exit) paintSail(ctx, ox, oy, room.exit.x, room.exit.y, tideExitOpen(state));

  if (state.vines.length > 0) {
    for (const vine of state.vines) {
      if (vine.cut) continue;
      ctx.strokeStyle = "#1d6b32";
      ctx.lineWidth = 4;
      const x = ox + vine.x * TILE;
      const y = oy + vine.y * TILE;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 26);
      ctx.quadraticCurveTo(x + 16, y + 4, x + 26, y + 26);
      ctx.moveTo(x + 10, y + 26);
      ctx.quadraticCurveTo(x + 16, y + 10, x + 22, y + 26);
      ctx.stroke();
    }
  }
  if (state.room === "ruins") {
    for (const boulder of state.boulders) {
      ctx.fillStyle = "#8d867c";
      ctx.beginPath();
      ctx.arc(ox + boulder.x * TILE + 16, oy + boulder.y * TILE + 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const nextLamp = state.lamps < LAMP_ORDER.length ? LAMP_ORDER[state.lamps] : -1;
  for (const lamp of room.lamps) {
    const lit = LAMP_ORDER.indexOf(lamp.n) >= 0 && LAMP_ORDER.indexOf(lamp.n) < state.lamps;
    const x = ox + lamp.x * TILE + 16;
    const y = oy + lamp.y * TILE + 16;
    paintActor(ctx, x, y, lit || lamp.n === nextLamp ? "#f2c14e" : "#f7f1e6", String(lamp.n + 1));
    if (lamp.n === nextLamp) ring(ctx, x, y);
  }
  const nextMark = state.marks < MARK_ORDER.length ? MARK_ORDER[state.marks] : "";
  for (const mark of room.marks) {
    const names: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
    const x = ox + mark.x * TILE + 16;
    const y = oy + mark.y * TILE + 16;
    paintActor(ctx, x, y, mark.id === nextMark ? "#f2c14e" : "#24357a", names[mark.id] ?? mark.id);
    if (mark.id === nextMark) ring(ctx, x, y);
  }
  for (const chest of room.chests) {
    const x = ox + chest.x * TILE + 4;
    const y = oy + chest.y * TILE + 8;
    ctx.fillStyle = "#c4622d";
    ctx.fillRect(x, y, 24, 16);
    ctx.fillStyle = "#f2c14e";
    ctx.fillRect(x, y, 24, 5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 24, 16);
  }
  if (room.wheel) paintActor(ctx, ox + room.wheel.x * TILE + 16, oy + room.wheel.y * TILE + 16, "#d8d2c4", "W");
  if (room.crystal) paintActor(ctx, ox + room.crystal.x * TILE + 16, oy + room.crystal.y * TILE + 16, state.lantern ? "#f2c14e" : "#9ec9e0", "✦");
  if (room.parrot) {
    const x = ox + room.parrot.x * TILE + 16;
    const y = oy + room.parrot.y * TILE + 16;
    paintActor(ctx, x, y, "#2e7d32", "");
    ctx.fillStyle = INK;
    ctx.font = "700 12px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Parrot", x, y - 18);
  }

  const hero = heroPixel(state, ox, oy);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(hero.x - 12, hero.y - 8);
  ctx.lineTo(hero.x, hero.y - 18);
  ctx.lineTo(hero.x + 12, hero.y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c81d25";
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0c9a0";
  ctx.beginPath();
  ctx.arc(hero.x, hero.y - 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hero.x + state.hero.dirX * 8, hero.y + state.hero.dirY * 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, 11, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(247, 241, 230, 0.94)";
  roundRect(ctx, 12, 10, VIEW_W - 24, 36, 12);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "700 16px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(tideClue(state), 24, 33);
  ctx.textAlign = "right";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(String(state.score), VIEW_W - 24, 33);

  if (state.toast && !state.mapOpen && (state.toastMs > 0 || state.phase === "done")) {
    ctx.font = "700 20px Georgia, serif";
    const width = Math.min(420, ctx.measureText(state.toast).width + 36);
    ctx.fillStyle = "#f7f1e6";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, (VIEW_W - width) / 2, 508, width, 44, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText(state.toast, VIEW_W / 2, 536);
  }

  if (state.mapOpen) paintChart(ctx, state, now);
  if (state.phase === "paused") paintBanner(ctx, "Paused");
  if (state.phase === "done") paintBanner(ctx, "The treasure is yours.");
}

function paintBanner(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.35)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 40, 240, 400, 120, 20);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText(text, VIEW_W / 2, 310);
}

const MARKS: Record<string, Spot> = {
  parrot: { x: 90, y: 430 },
  light: { x: 240, y: 120 },
  ruins: { x: 70, y: 250 },
  cave: { x: 360, y: 250 },
  wreck: { x: 390, y: 360 },
  fort: { x: 180, y: 390 },
  gold: { x: 110, y: 410 },
};

function paintChart(ctx: CanvasRenderingContext2D, state: TideState, now: number): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.4)";
  ctx.fillRect(0, 0, VIEW_W, 560);
  ctx.fillStyle = "#e7c98a";
  roundRect(ctx, 36, 70, 408, 460, 18);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#9ec9e0";
  roundRect(ctx, 56, 110, 368, 330, 80);
  ctx.fill();
  ctx.fillStyle = "#3f8f45";
  ctx.beginPath();
  ctx.ellipse(240, 250, 90, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = "700 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Treasure chart", 240, 100);
  const goal = tideGoal(state);
  for (const [name, spot] of Object.entries(MARKS)) {
    const here = name === goal;
    ctx.fillStyle = here ? "#c81d25" : "#f7f1e6";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, here ? 10 + Math.sin(now / 200) * 2 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.font = "700 18px Georgia, serif";
  ctx.fillText(tideClue(state), 240, 490);
}
