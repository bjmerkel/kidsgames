import { VIEW_H, VIEW_W } from "../game/constants";
import { iceLevel } from "./mazes";
import { PLAYER_STEP, TILE, type Dir, type Seal, type WaddleState } from "./sim";

const MAZE_TOP = 88;

export function drawWaddle(ctx: CanvasRenderingContext2D, state: WaddleState, nowMs: number): void {
  const level = iceLevel(state.levelIndex);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (level.night) {
    sky.addColorStop(0, "#1b2a4a");
    sky.addColorStop(1, "#3d6f8a");
  } else {
    sky.addColorStop(0, "#d7f3fb");
    sky.addColorStop(1, "#9fd4ea");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const mazeLeft = (VIEW_W - state.maze[0].length * TILE) / 2;
  for (let y = 0; y < state.maze.length; y += 1) {
    for (let x = 0; x < state.maze[y].length; x += 1) {
      const ch = state.maze[y][x];
      const px = mazeLeft + x * TILE;
      const py = MAZE_TOP + y * TILE;
      if (ch === "#") drawIce(ctx, px, py, level.night);
      else {
        ctx.fillStyle = level.night ? "#23485c" : "#e7f7fb";
        ctx.fillRect(px, py, TILE, TILE);
      }
      if (ch === ".") drawFish(ctx, px + TILE / 2, py + TILE / 2, 4);
      if (ch === "o") drawFish(ctx, px + TILE / 2, py + TILE / 2, 8 + Math.sin(nowMs / 160) * 1);
    }
  }

  const sealPace = (seal: Seal) => (seal.scaredMs > 0 ? 280 : level.sealStep);
  for (const seal of state.seals) {
    if (seal.homeMs > 0) continue;
    const spot = slide(seal.prevX, seal.prevY, seal.tx, seal.ty, seal.moveMs / sealPace(seal));
    drawSeal(ctx, mazeLeft + spot.x, MAZE_TOP + spot.y, seal.scaredMs > 0, seal.dir);
  }
  const puff = slide(state.penguin.prevX, state.penguin.prevY, state.penguin.tx, state.penguin.ty, state.penguin.moveMs / PLAYER_STEP);
  drawPenguin(ctx, mazeLeft + puff.x, MAZE_TOP + puff.y, state.penguin.dir, nowMs);

  const ink = level.night ? "#f7f1e6" : "#1c1915";
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(level.name, 16, 30);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of 5`, 16, 52);
  ctx.fillText(`Score ${state.score}`, 16, 74);
  ctx.textAlign = "right";
  ctx.fillText(state.pelletsLeft === 1 ? "1 fish left" : `${state.pelletsLeft} fish left`, VIEW_W - 16, 52);
  for (let i = 0; i < state.lives; i += 1) drawPenguin(ctx, VIEW_W - 36 - i * 28, 8, { x: 1, y: 0 }, nowMs, 0.45);

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    roundRect(ctx, 60, 96, VIEW_W - 120, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 118);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap the picture to waddle.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", level.blurb);
  if (state.phase === "retry") banner(ctx, "Try again.", "The seals got there first.");
  if (state.phase === "done") banner(ctx, "You finished all 5 levels.", "Every fish is eaten.");
}

function slide(fromX: number, fromY: number, toX: number, toY: number, u: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, u));
  return { x: (fromX + (toX - fromX) * t) * TILE, y: (fromY + (toY - fromY) * t) * TILE };
}

function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, night: boolean): void {
  ctx.fillStyle = night ? "#7eb6d4" : "#f7fbff";
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = night ? "#d7eef8" : "#b9e4f5";
  ctx.fillRect(x + 4, y + 4, TILE - 12, 6);
}

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = "#f28c28";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r - r * 0.5, y - r * 0.45);
  ctx.lineTo(x - r - r * 0.5, y + r * 0.45);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.1, Math.max(1, r * 0.15), 0, Math.PI * 2);
  ctx.fill();
}

function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, nowMs: number, scale = 1): void {
  const face = dir.x === -1 ? -1 : 1;
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.scale(face * scale, scale);
  ctx.rotate(dir.y === -1 ? -0.4 : dir.y === 1 ? 0.4 : 0);
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.ellipse(2, 5, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a13a";
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(14, 4);
  ctx.lineTo(8, 6);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(4, -1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(5, -1, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a13a";
  const waddle = Math.sin(nowMs / 80) * 2;
  ctx.fillRect(-6, 12, 4, 3 + waddle);
  ctx.fillRect(2, 12, 4, 3 - waddle);
  ctx.restore();
}

function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, sleepy: boolean, dir: Dir): void {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.scale(dir.x === -1 ? -1 : 1, 1);
  ctx.fillStyle = sleepy ? "#9fd4ea" : "#6d7278";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(4, -1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(5, -1, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.lineTo(14, 0);
  ctx.moveTo(10, 4);
  ctx.lineTo(14, 6);
  ctx.stroke();
  if (sleepy) {
    ctx.fillStyle = "#1c1915";
    ctx.font = "700 10px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("z", 0, -8);
  }
  ctx.restore();
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 40, 250, VIEW_W - 80, 170, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  wrapText(ctx, title, VIEW_W / 2, 310, 360, 32);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  wrapText(ctx, body, VIEW_W / 2, 360, 340, 22);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, cursor);
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
