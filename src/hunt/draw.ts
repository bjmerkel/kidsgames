import { VIEW_H, VIEW_W } from "../game/constants";
import { metrics } from "./puzzles";
import type { HuntState, FoundWord } from "./sim";

const MARKS = ["#d64545", "#2f6b3a", "#24357a", "#c47b14", "#7a4ea3", "#0e7490", "#b45309", "#be185d"];

export function drawHunt(ctx: CanvasRenderingContext2D, state: HuntState, nowMs: number): void {
  const level = state.levels[state.levelIndex];
  const box = metrics(level.size);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(level.name, 16, 30);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of ${state.levels.length}`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 76);
  ctx.textAlign = "right";
  const left = level.words.length - state.found.length;
  ctx.fillText(left === 1 ? "1 word left" : `${left} words left`, VIEW_W - 16, 54);

  level.words.forEach((word, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 20 + column * 154;
    const y = 108 + row * 26;
    const found = state.found.some((item) => item.word === word);
    ctx.textAlign = "left";
    ctx.font = "700 15px Trebuchet MS, sans-serif";
    ctx.fillStyle = found ? "#8a8175" : "#1c1915";
    ctx.fillText(word, x, y);
    if (found) {
      const width = ctx.measureText(word).width;
      ctx.strokeStyle = MARKS[index % MARKS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + width, y - 4);
      ctx.stroke();
    }
  });

  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(box.originX - 8, box.originY - 8, level.size * box.tile + 16, level.size * box.tile + 16);
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.originX - 8, box.originY - 8, level.size * box.tile + 16, level.size * box.tile + 16);

  ctx.strokeStyle = "#e4d9c8";
  ctx.lineWidth = 1;
  for (let line = 0; line <= level.size; line += 1) {
    ctx.beginPath();
    ctx.moveTo(box.originX + line * box.tile, box.originY);
    ctx.lineTo(box.originX + line * box.tile, box.originY + level.size * box.tile);
    ctx.moveTo(box.originX, box.originY + line * box.tile);
    ctx.lineTo(box.originX + level.size * box.tile, box.originY + line * box.tile);
    ctx.stroke();
  }

  state.found.forEach((found, index) => strokeWord(ctx, found, box, MARKS[index % MARKS.length], 0.38));
  if (state.trail && state.trail.length > 1) {
    const forward = state.trail.map((cell) => level.grid[cell.y][cell.x]).join("");
    const backward = forward.split("").reverse().join("");
    const ready = level.words.some((word) => (word === forward || word === backward) && !state.found.some((found) => found.word === word));
    strokeWord(ctx, { word: "", cells: state.trail }, box, ready ? "#2f6b3a" : "#24357a", 0.55);
  } else if (state.trail && state.trail.length === 1) {
    ring(ctx, state.trail[0].x, state.trail[0].y, box, "#24357a");
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(18, Math.floor(box.tile * 0.52))}px Trebuchet MS, sans-serif`;
  ctx.fillStyle = "#1c1915";
  for (let y = 0; y < level.size; y += 1) {
    for (let x = 0; x < level.size; x += 1) {
      ctx.fillText(level.grid[y][x], box.originX + x * box.tile + box.tile / 2, box.originY + y * box.tile + box.tile / 2 + 1);
    }
  }
  ctx.textBaseline = "alphabetic";

  if (state.selected) ring(ctx, state.selected.x, state.selected.y, box, "#24357a");
  if (state.hint) ring(ctx, state.hint.x, state.hint.y, box, "#f2c14e", 3 + Math.sin(nowMs / 140));

  if (state.toastMs > 0 && state.phase === "playing") {
    const toastY = Math.min(VIEW_H - 46, box.originY + level.size * box.tile + 12);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    roundRect(ctx, 70, toastY, VIEW_W - 140, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, toastY + 22);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap Pause to keep looking.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", "Every word is circled.");
  if (state.phase === "done") banner(ctx, `You finished all ${state.levels.length} levels.`, "Every puzzle is solved.");
}

function strokeWord(ctx: CanvasRenderingContext2D, found: FoundWord, box: { tile: number; originX: number; originY: number }, color: string, alpha: number): void {
  if (found.cells.length === 0) return;
  const center = (cell: { x: number; y: number }) => ({
    x: box.originX + cell.x * box.tile + box.tile / 2,
    y: box.originY + cell.y * box.tile + box.tile / 2,
  });
  const start = center(found.cells[0]);
  const end = center(found.cells[found.cells.length - 1]);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = box.tile * 0.72;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, box: { tile: number; originX: number; originY: number }, color: string, width = 3): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(box.originX + x * box.tile + 3, box.originY + y * box.tile + 3, box.tile - 6, box.tile - 6);
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 36, 250, VIEW_W - 72, 180, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 318);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(body, VIEW_W / 2, 360);
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
