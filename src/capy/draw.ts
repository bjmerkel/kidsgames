import { VIEW_H, VIEW_W } from "../game/constants";
import { GROUND_Y, jungleLevel } from "./levels";
import type { CapyLog, CapyState } from "./sim";

export function drawCapy(ctx: CanvasRenderingContext2D, state: CapyState, nowMs: number): void {
  const level = jungleLevel(state.levelIndex);
  const camX = Math.max(0, Math.min(level.width - VIEW_W, state.player.x - 160));
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (level.deep) {
    sky.addColorStop(0, "#1d3b32");
    sky.addColorStop(1, "#6d8f62");
  } else {
    sky.addColorStop(0, "#8ec8ea");
    sky.addColorStop(1, "#c6e3b5");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = level.deep ? "#163028" : "#3f8f4a";
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    ctx.ellipse(28 + (i * 70) % VIEW_W, 28 + (i % 3) * 16, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-camX, 0);
  ctx.fillStyle = "#3d8eb8";
  ctx.fillRect(0, GROUND_Y + 8, level.width, 90);
  for (let x = 0; x < level.width; x += 36) {
    ctx.fillStyle = "rgba(247,241,230,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 28 + Math.sin(nowMs / 400 + x) * 2, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const plat of level.platforms) drawGround(ctx, plat.x, plat.y, plat.w, plat.h);
  level.drifts.forEach((drift) => {
    const x = drift.origin + Math.sin(state.elapsedMs / 800 + drift.phase) * drift.span;
    drawLog(ctx, x, drift.y - 8, drift.w, 20, nowMs, false);
  });
  for (const vine of level.vines) drawVine(ctx, vine.x, vine.top, vine.length, nowMs);
  level.mangoes.forEach((mango, index) => {
    if (!state.mangoesGot[index]) drawMango(ctx, mango.x, mango.y + Math.sin(nowMs / 220 + index) * 2);
  });
  for (const log of state.logs) drawLog(ctx, log.x, log.y, log.w, log.h, nowMs, true);
  drawPool(ctx, level.pool.x, level.pool.y, level.pool.w, nowMs);

  if (state.swing) {
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.swing.vineX, state.swing.vineTop);
    ctx.lineTo(state.player.x + state.player.w / 2, state.player.y + 8);
    ctx.stroke();
  }

  const blink = state.invulnMs > 0 && Math.floor(nowMs / 80) % 2 === 0;
  drawCapybara(ctx, state.player.x, state.player.y, state.face, blink ? 0.35 : 1, nowMs);
  ctx.restore();

  const ink = level.deep ? "#f7f1e6" : "#1c1915";
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(level.name, 16, 32);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of 5`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 76);
  for (let i = 0; i < state.lives; i += 1) drawCapybara(ctx, VIEW_W - 52 - i * 36, 6, 1, 1, nowMs, 0.42);

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
  if (state.phase === "retry") banner(ctx, "Try again.", "Back to the last safe bank.");
  if (state.phase === "done") banner(ctx, "You finished all 5 levels.", "The jungle pool is yours.");
}

function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#4f9a45";
  ctx.fillRect(x, y - 8, w, 14);
  ctx.fillStyle = "#3d7a36";
  for (let blade = x + 8; blade < x + w; blade += 14) {
    ctx.fillRect(blade, y - 14, 3, 8);
  }
}

function drawVine(ctx: CanvasRenderingContext2D, x: number, top: number, length: number, nowMs: number): void {
  const sway = Math.sin(nowMs / 280 + x) * 6;
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, top - 40);
  ctx.quadraticCurveTo(x + sway, top + length * 0.5, x, top + length);
  ctx.stroke();
  ctx.fillStyle = "#3d8f46";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + sway * (i / 4), top + i * (length / 4), 8, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, nowMs: number, rolling: boolean): void {
  ctx.fillStyle = "#a56b3c";
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "#6b4124";
  ctx.lineWidth = 2;
  const spin = rolling ? (nowMs / 40) % w : 8;
  ctx.beginPath();
  ctx.arc(x + (spin % (w - 8)), y + h / 2, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#d7a15a";
  ctx.beginPath();
  ctx.ellipse(x + 8, y + h / 2, 5, h / 2 - 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMango(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#f2a13a";
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3d8f46";
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 10, 5, 3, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPool(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, nowMs: number): void {
  ctx.fillStyle = "#2f86b5";
  roundRect(ctx, x, y + 20, w, 70, 16);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 70);
  ctx.lineTo(x + w / 2, y);
  ctx.stroke();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2 + 22, y + 8);
  ctx.lineTo(x + w / 2, y + 16);
  ctx.fill();
  ctx.fillStyle = "rgba(247,241,230,0.45)";
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 48 + Math.sin(nowMs / 300) * 2, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCapybara(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, alpha: number, nowMs: number, scale = 1): void {
  const bob = Math.sin(nowMs / 140) * (scale > 0.8 ? 1 : 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + 21 * scale, y + 20 * scale + bob);
  ctx.scale(face * scale, scale);
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(0, 2, 20, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c48a58";
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(14, -2, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e6c2a0";
  ctx.beginPath();
  ctx.ellipse(20, 0, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(22, 0, 1.5, 0, Math.PI * 2);
  ctx.arc(10, -4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4124";
  ctx.beginPath();
  ctx.ellipse(-4, -12, 4, 3, -0.4, 0, Math.PI * 2);
  ctx.ellipse(6, -12, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4124";
  ctx.fillRect(-12, 10, 6, 6);
  ctx.fillRect(-2, 10, 6, 6);
  ctx.fillRect(8, 10, 6, 6);
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
