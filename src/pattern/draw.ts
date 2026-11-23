import { VIEW_H, VIEW_W } from "../game/constants";
import { CHOICE_BOXES, PAUSE_BOX, type Bead, type BeadColor } from "./levels";
import { patternLevel, type PatternState } from "./sim";

const INK = "#1c1915";
const CREAM = "#f7f1e6";
const COLORS: Record<BeadColor, string> = {
  coral: "#e15b86",
  gold: "#f2c14e",
  teal: "#2a9d8f",
  grape: "#7b3fa1",
};

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

function paintBead(ctx: CanvasRenderingContext2D, item: Bead, x: number, y: number): void {
  const radius = item.big ? 30 : 18;
  ctx.fillStyle = COLORS[item.color];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  if (item.shape === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (item.shape === "square") {
    roundRect(ctx, x - radius, y - radius, radius * 2, radius * 2, 8);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (item.shape === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y + radius * 0.82);
    ctx.lineTo(x - radius, y + radius * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  for (let point = 0; point < 5; point += 1) {
    const outer = -Math.PI / 2 + point * ((Math.PI * 2) / 5);
    const inner = outer + Math.PI / 5;
    const ox = x + Math.cos(outer) * radius;
    const oy = y + Math.sin(outer) * radius;
    const ix = x + Math.cos(inner) * radius * 0.45;
    const iy = y + Math.sin(inner) * radius * 0.45;
    if (point === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function paintEmpty(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const pulse = 30 + Math.sin(now / 280) * 2;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(x, y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPattern(ctx: CanvasRenderingContext2D, state: PatternState, now: number): void {
  const level = patternLevel(state);
  const round = level.rounds[state.roundIndex];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#d7ecf7");
  sky.addColorStop(1, "#f7f1e6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = INK;
  ctx.font = "700 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("What comes next?", VIEW_W / 2, 118);
  ctx.font = "600 18px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score ${state.score}`, 20, 40);
  ctx.textAlign = "center";
  ctx.fillText(`${state.roundIndex + 1} of ${level.rounds.length}`, 180, 40);

  if (round) {
    const slots = round.beads.length + 1;
    const gap = Math.min(76, (VIEW_W - 32) / slots);
    const start = (VIEW_W - gap * (slots - 1)) / 2;
    round.beads.forEach((item, index) => paintBead(ctx, item, start + index * gap, 250));
    paintEmpty(ctx, start + round.beads.length * gap, 250, now);
    CHOICE_BOXES.forEach((box, index) => {
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      roundRect(ctx, box.x, box.y, box.w, box.h, 22);
      ctx.fill();
      ctx.stroke();
      paintBead(ctx, round.choices[index], box.x + box.w / 2, box.y + box.h / 2);
    });
  }

  if (state.phase === "playing") {
    ctx.fillStyle = CREAM;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, PAUSE_BOX.x, PAUSE_BOX.y, PAUSE_BOX.w, PAUSE_BOX.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Pause", PAUSE_BOX.x + PAUSE_BOX.w / 2, PAUSE_BOX.y + 28);
  }

  if (state.toast && (state.toastMs > 0 || state.phase === "clear" || state.phase === "done" || state.phase === "paused")) {
    const text = state.phase === "paused" ? "Paused" : state.toast;
    ctx.font = "700 22px Georgia, serif";
    const width = Math.min(420, ctx.measureText(text).width + 36);
    ctx.fillStyle = CREAM;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, (VIEW_W - width) / 2, 360, width, 48, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText(text, VIEW_W / 2, 392);
  }

  if (state.phase === "clear" || state.phase === "done") {
    ctx.fillStyle = "rgba(28, 25, 21, 0.28)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = CREAM;
    roundRect(ctx, 40, 250, 400, 160, 24);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.font = "700 28px Georgia, serif";
    ctx.fillText(state.phase === "done" ? "All 5 rows!" : "Nice row!", VIEW_W / 2, 320);
    ctx.font = "600 18px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 360);
  }
}
