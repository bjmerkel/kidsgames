import { VIEW_H, VIEW_W } from "../game/constants";
import { roofLevel } from "./levels";
import { rascalCameraX, type RascalBug, type RascalState } from "./sim";

export function drawRascal(ctx: CanvasRenderingContext2D, state: RascalState, nowMs: number): void {
  const level = roofLevel(state.levelIndex);
  const camX = rascalCameraX(state);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (level.night) {
    sky.addColorStop(0, "#1b2344");
    sky.addColorStop(1, "#6d4c7d");
  } else {
    sky.addColorStop(0, "#8fd0f2");
    sky.addColorStop(1, "#d7ecf3");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = level.night ? "rgba(247,241,230,0.85)" : "rgba(255,255,255,0.9)";
  if (level.night) {
    for (let i = 0; i < 12; i += 1) {
      ctx.fillRect((i * 73 + 20) % VIEW_W, 40 + (i % 5) * 28, 2, 2);
    }
  }
  ctx.beginPath();
  ctx.arc(level.night ? 80 : 400, 70, level.night ? 22 : 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(-camX, 0);
  ctx.fillStyle = level.night ? "#3a4666" : "#8aa4b8";
  for (let i = 0; i < 10; i += 1) {
    const x = i * 280 - 40;
    const h = 80 + (i % 3) * 36;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x + camX * 0.35, 640 - h, 120, h);
    ctx.globalAlpha = 1;
  }

  for (const plat of level.platforms) drawPlat(ctx, plat.x, plat.y, plat.w, plat.h, "#c47b4a");
  level.movers.forEach((mover) => {
    const x = mover.origin + Math.sin(state.elapsedMs / 900 + mover.phase) * mover.span;
    drawPlat(ctx, x, mover.y, mover.w, mover.h, "#e0b15a");
  });

  for (const hook of level.webs) drawHook(ctx, hook.x, hook.y, nowMs);
  level.coins.forEach((coin, index) => {
    if (state.coinsGot[index]) return;
    drawAcorn(ctx, coin.x, coin.y + Math.sin(nowMs / 200 + index) * 3);
  });
  for (const bug of state.bugs) {
    if (!bug.gone) drawBug(ctx, bug, nowMs);
  }
  drawNest(ctx, level.goal.x + level.goal.w / 2, level.goal.y + 20, nowMs);

  const webX = state.zip?.hookX ?? (state.perchMs > 0 ? state.perchX : null);
  const webY = state.zip?.hookY ?? (state.perchMs > 0 ? state.perchY : null);
  if (webX != null && webY != null) {
    const fromX = state.player.x + state.player.w / 2;
    const fromY = state.player.y + 8;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1c1915";
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(webX, webY);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f7f1e6";
    ctx.stroke();
  }

  const blink = state.invulnMs > 0 && Math.floor(nowMs / 80) % 2 === 0;
  drawHero(ctx, state.player.x, state.player.y, state.face, blink ? 0.35 : 1);
  ctx.restore();

  ctx.fillStyle = level.night ? "#f7f1e6" : "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(level.name, 16, 32);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of 5`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 76);
  for (let i = 0; i < state.lives; i += 1) drawHero(ctx, VIEW_W - 46 - i * 32, 8, 1, 1, 0.45);

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    roundRect(ctx, 70, 100, VIEW_W - 140, 36, 12);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 124);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap Pause to play again.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", level.blurb);
  if (state.phase === "retry") banner(ctx, "Try again.", "Back to the last safe roof.");
  if (state.phase === "done") banner(ctx, "You finished all 5 levels.", "The night nest is yours.");
}

function drawPlat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(28, 25, 21, 0.25)";
  ctx.fillRect(x, y, w, 6);
  ctx.strokeStyle = "rgba(28, 25, 21, 0.2)";
  ctx.lineWidth = 1;
  for (let brick = x + 18; brick < x + w; brick += 22) {
    ctx.beginPath();
    ctx.moveTo(brick, y + 6);
    ctx.lineTo(brick, y + Math.min(h, 22));
    ctx.stroke();
  }
}

function drawHook(ctx: CanvasRenderingContext2D, x: number, y: number, nowMs: number): void {
  ctx.save();
  ctx.translate(x, y);
  const pulse = Math.sin(nowMs / 180) * 1;
  ctx.fillStyle = "#f7f1e6";
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 12 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.restore();
}

function drawAcorn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c47b4a";
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBug(ctx: CanvasRenderingContext2D, bug: RascalBug, nowMs: number): void {
  const step = Math.sin(nowMs / 80 + bug.x) * 2;
  ctx.fillStyle = "#6b4a32";
  ctx.beginPath();
  ctx.ellipse(bug.x + bug.w / 2, bug.y + 12, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(bug.x + bug.w / 2 + bug.dir * 6, bug.y + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(bug.x + bug.w / 2 + bug.dir * 8, bug.y + 8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bug.x + 6, bug.y + 14);
  ctx.lineTo(bug.x + 2, bug.y + 18 + step);
  ctx.moveTo(bug.x + bug.w - 6, bug.y + 14);
  ctx.lineTo(bug.x + bug.w - 2, bug.y + 18 - step);
  ctx.stroke();
}

function drawNest(ctx: CanvasRenderingContext2D, x: number, y: number, nowMs: number): void {
  ctx.strokeStyle = "#8a5a32";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + 80);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.strokeStyle = "#f7f1e6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 16 + Math.sin(nowMs / 240) * 1.5, 0, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, alpha: number, scale = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + 14 * scale, y + 20 * scale);
  ctx.scale(face * scale, scale);
  ctx.fillStyle = "#8a8f98";
  ctx.beginPath();
  ctx.ellipse(-18, 8, 7, 14, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c2c2c";
  for (const stripe of [2, 8, 14]) {
    ctx.beginPath();
    ctx.ellipse(-20 + stripe * 0.2, stripe, 6, 2.2, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#24357a";
  ctx.fillRect(-9, 8, 6, 12);
  ctx.fillRect(3, 8, 6, 12);
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(5, 3);
  ctx.lineTo(0, 9);
  ctx.lineTo(-5, 3);
  ctx.fill();
  ctx.fillStyle = "#9aa0a8";
  ctx.beginPath();
  ctx.ellipse(0, -16, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(-6, -32);
  ctx.lineTo(-2, -20);
  ctx.moveTo(10, -22);
  ctx.lineTo(6, -32);
  ctx.lineTo(2, -20);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(-11, -19, 22, 6);
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(-4, -16, 2.1, 0, Math.PI * 2);
  ctx.arc(4, -16, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-4, -16, 1, 0, Math.PI * 2);
  ctx.arc(4, -16, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.ellipse(2, -10, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(4, -10, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 40, 250, VIEW_W - 80, 180, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  wrapText(ctx, title, VIEW_W / 2, 320, 360, 32);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  wrapText(ctx, body, VIEW_W / 2, 368, 340, 22);
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
