import { VIEW_H, VIEW_W } from "../game/constants";
import { ESCAPE_KEYS, ESCAPE_ROOMS, NOTE_CLOSE, type EscapeRoom, type Spot } from "./rooms";
import type { EscapeState } from "./sim";

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

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paintSpot(ctx: CanvasRenderingContext2D, spot: Spot, read: boolean): void {
  ctx.fillStyle = read ? "#fff6d8" : "#fffdf8";
  roundRect(ctx, spot.x, spot.y, spot.w, spot.h, 16);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "700 22px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spot.label, spot.x + spot.w / 2, spot.y + spot.h / 2);
}

function paintKey(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, fill: string): void {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "700 20px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
}

export function drawEscape(ctx: CanvasRenderingContext2D, state: EscapeState): void {
  const room: EscapeRoom = ESCAPE_ROOMS[state.levelIndex] ?? ESCAPE_ROOMS[0];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = room.wall;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#c4a574";
  ctx.fillRect(0, 400, VIEW_W, 68);
  ctx.fillStyle = "rgba(255, 253, 248, 0.94)";
  roundRect(ctx, 12, 10, VIEW_W - 24, 52, 14);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = "700 16px Georgia, serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(state.toast, 24, 36);
  ctx.textAlign = "right";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(String(state.score), VIEW_W - 24, 36);

  for (const spot of room.spots) paintSpot(ctx, spot, state.read.includes(spot.id));

  ctx.fillStyle = "#1c1915";
  roundRect(ctx, 90, 412, 300, 48, 12);
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.font = "700 28px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const shown = state.entry.padEnd(room.code.length, "_").split("").join(" ");
  ctx.fillText(shown, 240, 436);

  for (const key of ESCAPE_KEYS) {
    const label = key.name === "clear" ? "Clear" : key.name === "open" ? "Open" : key.name === "pause" ? "Pause" : key.name;
    const fill = key.name === "open" ? "#f2c14e" : key.name === "pause" ? "#f7f1e6" : "#fffdf8";
    paintKey(ctx, key.x, key.y, key.w, key.h, label, fill);
  }

  if (state.noteId) {
    const spot = room.spots.find((item) => item.id === state.noteId);
    ctx.fillStyle = "rgba(28, 25, 21, 0.28)";
    ctx.fillRect(16, 74, VIEW_W - 32, 326);
    ctx.fillStyle = "#fff6df";
    roundRect(ctx, 32, 88, VIEW_W - 64, 292, 18);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "700 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(spot?.label ?? "Note", 240, 124);
    ctx.font = "700 20px Trebuchet MS, sans-serif";
    const lines = wrap(ctx, spot?.clue ?? "", 360);
    lines.forEach((line, index) => ctx.fillText(line, 240, 168 + index * 28));
    paintKey(ctx, NOTE_CLOSE.x, NOTE_CLOSE.y, NOTE_CLOSE.w, NOTE_CLOSE.h, "Close", "#f7f1e6");
  }

  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(247, 241, 230, 0.88)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = INK;
    ctx.font = "700 36px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Paused", VIEW_W / 2, VIEW_H / 2);
  }
}
