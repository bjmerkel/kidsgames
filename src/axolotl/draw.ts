import { VIEW_H, VIEW_W } from "../game/constants";
import { AXO_LEVELS, BUG_LOOK } from "./levels";
import type { AxoBug, AxoState } from "./sim";

export function drawAxo(ctx: CanvasRenderingContext2D, state: AxoState, nowMs: number): void {
  const level = AXO_LEVELS[state.levelIndex];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const water = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  water.addColorStop(0, "#d5eef5");
  water.addColorStop(0.22, "#8ec4d8");
  water.addColorStop(1, "#1e4d66");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(247, 241, 230, 0.28)";
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 97 + nowMs * 0.02) % (VIEW_W + 40)) - 20;
    const y = 160 + ((i * 80 + nowMs * 0.03) % 460);
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#6ea15a";
  for (const side of [28, VIEW_W - 28]) {
    ctx.beginPath();
    ctx.ellipse(side, 150, 16, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(side + (side < 40 ? 18 : -18), 190, 12, 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#e6d3a3";
  ctx.fillRect(0, 668, VIEW_W, VIEW_H - 668);
  ctx.fillStyle = "#d2bc88";
  for (let x = 10; x < VIEW_W; x += 28) {
    ctx.beginPath();
    ctx.ellipse(x, 674, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bug of state.bugs) {
    if (bug.hp <= 0 || bug.y < -20) continue;
    drawBug(ctx, bug, nowMs);
  }
  for (const pellet of state.pellets) {
    ctx.fillStyle = "#1d4e89";
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const bubble of state.bubbles) {
    ctx.fillStyle = "rgba(247, 241, 230, 0.85)";
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bubble.x - 2, bubble.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const blink = state.invulnMs > 0 && Math.floor(state.invulnMs / 80) % 2 === 0;
  drawAxolotl(ctx, state.playerX, state.playerY, blink ? 0.35 : 1);

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(level.name, 16, 32);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of 5`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 76);
  const left = state.bugs.filter((bug) => bug.hp > 0).length;
  ctx.textAlign = "right";
  ctx.fillText(left === 1 ? "1 bug left" : `${left} bugs left`, VIEW_W - 16, 54);
  for (let i = 0; i < state.lives; i += 1) {
    drawAxolotl(ctx, VIEW_W - 28 - i * 28, 28, 1, 0.42);
  }

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 20px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 128);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap Pause to play again.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", level.blurb);
  if (state.phase === "retry") banner(ctx, "Try again.", "The bugs got through. Play this level again.");
  if (state.phase === "done") banner(ctx, "You finished all 5 levels.", "Every bug is popped.");
}

function drawAxolotl(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, scale = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f2a3b5";
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(0, 36, 12, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8d5dc";
  ctx.beginPath();
  ctx.ellipse(0, 6, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a3b5";
  ctx.beginPath();
  ctx.ellipse(0, -16, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e15b86";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(side * 10, -20 + i * 5);
      ctx.quadraticCurveTo(side * 26, -26 + i * 7, side * 18, -12 + i * 6);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-5, -18, 2.1, 0, Math.PI * 2);
  ctx.arc(5, -18, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -13, 4, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.fillStyle = "#f2a3b5";
  ctx.fillRect(-18, -2, 7, 4);
  ctx.fillRect(11, -2, 7, 4);
  ctx.fillRect(-16, 10, 7, 4);
  ctx.fillRect(9, 10, 7, 4);
  ctx.restore();
}

function drawBug(ctx: CanvasRenderingContext2D, bug: AxoBug, nowMs: number): void {
  const look = BUG_LOOK[bug.kind];
  const flap = Math.sin(nowMs / 80 + bug.id) * (bug.mode === "dive" ? 0.5 : 0.2);
  ctx.save();
  ctx.translate(bug.x, bug.y);
  if (bug.kind === "dragonfly") {
    ctx.fillStyle = "rgba(231, 246, 223, 0.8)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 14, -4, 12, 5, flap * side, 0, Math.PI * 2);
      ctx.ellipse(side * 12, 6, 10, 4, -flap * side, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = look.body;
  if (bug.kind === "king") {
    ctx.beginPath();
    ctx.ellipse(0, 0, bug.radius, bug.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-6, -30);
    ctx.lineTo(-2, -18);
    ctx.lineTo(2, -32);
    ctx.lineTo(6, -18);
    ctx.lineTo(10, -30);
    ctx.lineTo(14, -16);
    ctx.fill();
  } else if (bug.kind === "skimmer") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 6, 2);
      ctx.lineTo(side * 16, 10);
      ctx.moveTo(side * 4, 4);
      ctx.lineTo(side * 12, 14);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, bug.kind === "dragonfly" ? 6 : bug.radius * 0.85, bug.kind === "dragonfly" ? 14 : bug.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (bug.kind === "beetle" || bug.kind === "king") {
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = bug.kind === "king" ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, -bug.radius * 0.6);
    ctx.lineTo(0, bug.radius * 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-3, -2, 1.6, 0, Math.PI * 2);
  ctx.arc(3, -2, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (bug.kind === "king") {
    const pips = Math.max(0, bug.hp);
    ctx.fillStyle = "#f7f1e6";
    for (let i = 0; i < pips; i += 1) {
      ctx.fillRect(-12 + i * 5, 16, 3, 3);
    }
  }
  ctx.restore();
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 48, 250, VIEW_W - 96, 180, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  wrapText(ctx, title, VIEW_W / 2, 320, 340, 32);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  wrapText(ctx, body, VIEW_W / 2, 368, 320, 22);
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
