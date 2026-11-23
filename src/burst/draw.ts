import { VIEW_H, VIEW_W } from "../game/constants";
import { BURST_LEVELS, COLS, GRID_X, GRID_Y, ROWS, TILE, burstLevel } from "./levels";
import { goalLine, type BurstState, type Tile } from "./sim";

const FALL_MS = 160;
const COLORS = ["#d64545", "#f2c14e", "#7a4ea3", "#3d8b4a", "#f28c28"];

export function drawBurst(ctx: CanvasRenderingContext2D, state: BurstState, nowMs: number): void {
  const level = burstLevel(state.levelIndex);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const skyName = level.sky ?? "day";
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, skyName === "night" ? "#1d3b4a" : skyName === "dusk" ? "#f3c98b" : "#d7f3c8");
  sky.addColorStop(1, skyName === "night" ? "#3d6b4f" : skyName === "dusk" ? "#f08a5d" : "#8ecae6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  roundRect(ctx, GRID_X - 8, GRID_Y - 8, COLS * TILE + 16, ROWS * TILE + 16, 16);
  ctx.fill();

  const clearing = new Set(state.clearing.map((cell) => `${cell.x},${cell.y}`));
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = state.board[y][x];
      const spot = { x: GRID_X + x * TILE, y: GRID_Y + y * TILE };
      if (cell.jelly) {
        ctx.fillStyle = "#f3a6c8";
        roundRect(ctx, spot.x + 4, spot.y + 4, TILE - 8, TILE - 8, 10);
        ctx.fill();
      }
      if (!cell.tile) continue;
      const pos = place(cell.tile, x, y, state);
      ctx.save();
      if (clearing.has(`${x},${y}`)) ctx.globalAlpha = 0.35 + Math.sin(nowMs / 60) * 0.15;
      drawBerry(ctx, pos.x, pos.y, cell.tile);
      ctx.restore();
    }
  }

  if (state.selected) outline(ctx, state.selected.x, state.selected.y, "#f7f1e6", 4);
  if (state.hint) {
    const pulse = 3 + Math.sin(nowMs / 140) * 1.5;
    for (const spot of state.hint) outline(ctx, spot.x, spot.y, "#f2c14e", pulse);
  }

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(level.name, 16, 30);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of ${BURST_LEVELS.length}`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 76);
  ctx.textAlign = "right";
  ctx.fillText(`${state.movesLeft} moves`, VIEW_W - 16, 54);
  ctx.textAlign = "left";
  ctx.font = "700 14px Trebuchet MS, sans-serif";
  ctx.fillText(goalLine(state), 16, 98);

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    roundRect(ctx, 70, GRID_Y + 8, VIEW_W - 140, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, GRID_Y + 30);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap the picture to match.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", "The garden is happy.");
  if (state.phase === "retry") banner(ctx, "Try again.", "The moves ran out.");
  if (state.phase === "done") banner(ctx, `You finished all ${BURST_LEVELS.length} levels.`, "Every garden is picked.");
}

function place(tile: Tile, x: number, y: number, state: BurstState): { x: number; y: number } {
  const t = state.status === "falling" ? 1 - state.waitMs / FALL_MS : 1;
  const row = tile.fromY + (y - tile.fromY) * Math.max(0, Math.min(1, t));
  return { x: GRID_X + x * TILE, y: GRID_Y + row * TILE };
}

function drawBerry(ctx: CanvasRenderingContext2D, x: number, y: number, tile: Tile): void {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  ctx.fillStyle = COLORS[tile.kind] ?? COLORS[0];
  if (tile.kind === 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 14, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.kind === 2) {
    ctx.beginPath();
    ctx.arc(cx - 6, cy + 2, 8, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy + 2, 8, 0, Math.PI * 2);
    ctx.arc(cx, cy - 6, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.kind === 3) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1c1915";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 8);
    ctx.lineTo(cx + 2, cy - 8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 5, 4, 0, Math.PI * 2);
  ctx.fill();
  if (tile.special === "row" || tile.special === "col") {
    ctx.strokeStyle = "#f7f1e6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (tile.special === "row") {
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
    } else {
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 12);
    }
    ctx.stroke();
  } else if (tile.special === "wrap") {
    ctx.strokeStyle = "#f7f1e6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tile.special === "burst") {
    ctx.fillStyle = "#f7f1e6";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(GRID_X + x * TILE + 3, GRID_Y + y * TILE + 3, TILE - 6, TILE - 6);
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 36, 250, VIEW_W - 72, 170, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 320);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(body, VIEW_W / 2, 358);
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
