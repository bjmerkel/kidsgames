import { VIEW_H, VIEW_W } from "../game/constants";
import { FISH_LOOK, fishLevel } from "./levels";
import type { PondFish, PondState } from "./sim";

export function drawPond(ctx: CanvasRenderingContext2D, state: PondState, nowMs: number): void {
  const level = fishLevel(state.levelIndex);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, 180);
  sky.addColorStop(0, "#d7ecf3");
  sky.addColorStop(1, "#b7d7c8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 150);
  ctx.fillStyle = "#6ea15a";
  ctx.fillRect(0, 140, VIEW_W, 36);
  ctx.fillStyle = "#4f7d40";
  for (let x = 16; x < VIEW_W; x += 36) {
    ctx.beginPath();
    ctx.ellipse(x, 146, 7, 22, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const water = ctx.createLinearGradient(0, 170, 0, VIEW_H);
  water.addColorStop(0, "#7eb6d4");
  water.addColorStop(1, "#24556f");
  ctx.fillStyle = water;
  ctx.fillRect(0, 170, VIEW_W, VIEW_H - 170);

  ctx.strokeStyle = "rgba(247, 241, 230, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(state.hookX, 176);
  ctx.lineTo(state.hookX, state.hookY);
  ctx.stroke();
  ctx.fillStyle = "#c7c1b6";
  ctx.beginPath();
  ctx.arc(state.hookX, state.hookY, 8, 0.2, Math.PI * 1.4);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f7f1e6";
  ctx.stroke();

  for (const fish of state.fish) drawFish(ctx, fish, nowMs);
  drawGoals(ctx, state);
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(level.name, 16, 36);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of 5`, 16, 58);
  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 20px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 210);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap the picture to fish.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", level.blurb);
  if (state.phase === "done") banner(ctx, "You finished all 5 levels.", "Every fish on the list is in the creel.");
}

function drawGoals(ctx: CanvasRenderingContext2D, state: PondState): void {
  const level = fishLevel(state.levelIndex);
  level.goals.forEach((goal, index) => {
    const x = 16 + (index % 3) * 150;
    const y = 78 + Math.floor(index / 3) * 28;
    const have = state.caught[goal.species] ?? 0;
    const done = have >= goal.need;
    ctx.fillStyle = done ? "#e7f6df" : "rgba(247, 241, 230, 0.92)";
    roundRect(ctx, x, y, 140, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#1c1915";
    ctx.textAlign = "left";
    ctx.font = "700 13px Trebuchet MS, sans-serif";
    ctx.fillText(`${FISH_LOOK[goal.species].name} ${have}/${goal.need}`, x + 8, y + 16);
  });
}

function drawFish(ctx: CanvasRenderingContext2D, fish: PondFish, nowMs: number): void {
  const look = FISH_LOOK[fish.species];
  const face = fish.vx >= 0 ? 1 : -1;
  const wobble = Math.sin(nowMs / 180 + fish.id) * 0.15;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(wobble);
  ctx.scale(face, 1);
  ctx.fillStyle = look.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, fish.r, fish.r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.belly;
  ctx.beginPath();
  ctx.ellipse(2, 3, fish.r * 0.45, fish.r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.mark;
  ctx.beginPath();
  ctx.moveTo(-fish.r * 0.7, 0);
  ctx.lineTo(-fish.r - 8, -7);
  ctx.lineTo(-fish.r - 8, 7);
  ctx.fill();
  if (fish.species === "perch" || fish.species === "bass") {
    ctx.strokeStyle = look.mark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -fish.r * 0.4);
    ctx.lineTo(-4, fish.r * 0.4);
    ctx.moveTo(4, -fish.r * 0.35);
    ctx.lineTo(4, fish.r * 0.35);
    ctx.stroke();
  }
  if (fish.species === "catfish") {
    ctx.strokeStyle = look.mark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fish.r * 0.2, 2);
    ctx.quadraticCurveTo(fish.r, 10, fish.r * 0.4, 14);
    ctx.stroke();
  }
  if (fish.species === "trout") {
    ctx.fillStyle = look.mark;
    ctx.beginPath();
    ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    ctx.arc(6, 3, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(fish.r * 0.35, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(fish.r * 0.42, -2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.28)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 36, 250, VIEW_W - 72, 150, 18);
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
