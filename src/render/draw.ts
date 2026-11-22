import { cameraTop } from "../game/camera";
import { COLOR, VIEW_H, VIEW_W } from "../game/constants";
import { COPY, continueLabel } from "../game/copy";
import { crabRadius } from "../game/crab";
import { seatPosition } from "../game/hazards";
import type { Car, GameState, Hold, Stone, Swing } from "../game/types";

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camY: number,
  nowMs: number,
): void {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (state.hitFlashMs > 0) {
    const kick = (state.hitFlashMs / 180) * 4;
    ctx.translate(Math.sin(nowMs * 0.08) * kick, 0);
  }
  ctx.translate(0, -camY);
  drawWorld(ctx, state, nowMs);
  drawCrab(ctx, state, nowMs);
  ctx.restore();
  drawHud(ctx, state);
  if (state.toastMs > 0 && state.phase === "playing") drawToast(ctx, state.toast);
  if (state.phase !== "playing") drawBanner(ctx, state, nowMs);
}

export function initialCamera(state: GameState): number {
  return cameraTop(state.crab.y, state.level.height, VIEW_H);
}

function drawWorld(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  for (const segment of state.level.segments) {
    drawSegmentGround(ctx, segment.kind, segment.y, segment.h);
    if (segment.kind === "wall") drawBricks(ctx, segment.y, segment.h);
    for (const stone of segment.stones) drawStone(ctx, stone);
    for (const hold of segment.holds) drawHold(ctx, hold);
    for (const swing of segment.swings) drawSwing(ctx, swing, state.elapsedMs / 1000);
    for (const car of segment.cars) drawCar(ctx, car, nowMs);
    if (segment.kind === "tunnel") {
      drawTunnel(ctx, segment.y, segment.h, segment.mouthH, segment.burrowH);
      for (const chamber of segment.chambers) {
        for (const stone of chamber.stones) drawStone(ctx, stone);
        for (const hold of chamber.holds) drawHold(ctx, hold);
        for (const swing of chamber.swings) drawSwing(ctx, swing, state.elapsedMs / 1000);
        for (const car of chamber.cars) drawCar(ctx, car, nowMs);
      }
    }
  }
}

function drawSegmentGround(ctx: CanvasRenderingContext2D, kind: string, y: number, h: number): void {
  ctx.fillStyle =
    kind === "road" ? COLOR.road : kind === "pond" ? COLOR.water : kind === "wall" ? COLOR.wall : kind === "tunnel" ? COLOR.tunnel : COLOR.grass;
  ctx.fillRect(0, y, VIEW_W, h);
  if (kind === "road") {
    ctx.strokeStyle = COLOR.roadLine;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(0, y + h / 2);
    ctx.lineTo(VIEW_W, y + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (kind === "pond") {
    ctx.fillStyle = COLOR.waterDeep;
    for (let i = 0; i < 4; i += 1) ctx.fillRect(20 + i * 120, y + 18 + (i % 2) * 36, 70, 6);
  }
  if (kind === "grass" || kind === "curb" || kind === "swings") {
    ctx.fillStyle = COLOR.grassDark;
    for (let x = 8; x < VIEW_W; x += 28) ctx.fillRect(x, y + 8, 3, h - 16);
  }
}

function drawBricks(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.strokeStyle = COLOR.wallMortar;
  ctx.lineWidth = 2;
  for (let row = 0; row < h; row += 24) {
    const offset = (row / 24) % 2 === 0 ? 0 : 20;
    for (let x = -20 + offset; x < VIEW_W; x += 40) {
      ctx.strokeRect(x, y + row, 40, 24);
    }
  }
}

function drawTunnel(ctx: CanvasRenderingContext2D, y: number, h: number, mouthH: number, burrowH: number): void {
  ctx.fillStyle = "rgba(20, 22, 26, 0.45)";
  ctx.fillRect(18, y, VIEW_W - 36, h);
  ctx.fillStyle = COLOR.burrow;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, y + burrowH * 0.45, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.sign;
  ctx.fillRect(110, y + h - mouthH - 36, 260, 28);
  ctx.fillStyle = COLOR.ink;
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(COPY.tunnel, VIEW_W / 2, y + h - mouthH - 17);
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, nowMs: number): void {
  const left = car.x - car.w / 2;
  const top = car.y - car.h / 2;
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(car.x, car.y + car.h * 0.45, car.w * 0.46, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, left, top, car.w, car.h, 6);
  ctx.fill();
  ctx.fillStyle = COLOR.carGlass;
  roundRect(ctx, left + car.w * 0.28, top + 3, car.w * 0.32, car.h - 6, 3);
  ctx.fill();
  const spin = (car.x + nowMs * 0.02) / 6;
  for (const wheel of [
    [left + 8, top - 2],
    [left + car.w - 14, top - 2],
    [left + 8, top + car.h - 4],
    [left + car.w - 14, top + car.h - 4],
  ]) {
    ctx.save();
    ctx.translate(wheel[0] + 3, wheel[1] + 3);
    ctx.rotate(spin);
    ctx.fillStyle = COLOR.tire;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = COLOR.hub;
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, stone: Stone): void {
  if (stone.submerged) {
    ctx.strokeStyle = COLOR.stoneRim;
    ctx.beginPath();
    ctx.ellipse(stone.x, stone.y, stone.r * 0.7, stone.r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y + stone.r * 0.35, stone.r * 0.8, stone.r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const shade = ctx.createLinearGradient(stone.x, stone.y - stone.r, stone.x, stone.y + stone.r);
  shade.addColorStop(0, COLOR.stoneRim);
  shade.addColorStop(0.45, COLOR.stone);
  shade.addColorStop(1, COLOR.stoneDark);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y, stone.r, stone.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwing(ctx: CanvasRenderingContext2D, swing: Swing, timeSec: number): void {
  const seat = seatPosition(swing, timeSec);
  ctx.strokeStyle = COLOR.rope;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(swing.pivotX - 8, swing.pivotY);
  ctx.lineTo(seat.x - 10, seat.y);
  ctx.moveTo(swing.pivotX + 8, swing.pivotY);
  ctx.lineTo(seat.x + 10, seat.y);
  ctx.stroke();
  ctx.fillStyle = COLOR.seat;
  roundRect(ctx, seat.x - 16, seat.y - 4, 32, 8, 2);
  ctx.fill();
}

function drawHold(ctx: CanvasRenderingContext2D, hold: Hold): void {
  if (!hold.visible) return;
  ctx.fillStyle = COLOR.hold;
  ctx.beginPath();
  ctx.arc(hold.x, hold.y, hold.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.holdHole;
  ctx.beginPath();
  ctx.arc(hold.x, hold.y, hold.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrab(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  const crab = state.crab;
  const radius = crabRadius(crab);
  const scuttle = crab.mode === "hopping" ? Math.sin(nowMs * 0.04) * 2 : 0;
  ctx.fillStyle = COLOR.shadow;
  ctx.beginPath();
  ctx.ellipse(crab.x, crab.y + radius * 0.8, radius * 1.1, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(crab.x, crab.y);
  if (crab.facing === "s") ctx.rotate(Math.PI);
  if (crab.facing === "e") ctx.rotate(Math.PI / 2);
  if (crab.facing === "w") ctx.rotate(-Math.PI / 2);
  if (crab.mode !== "tucked") {
    ctx.strokeStyle = COLOR.crabClaw;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const y = -6 + i * 6;
      ctx.beginPath();
      ctx.moveTo(-8, y);
      ctx.lineTo(-18 - scuttle, y - 4);
      ctx.moveTo(8, y);
      ctx.lineTo(18 + scuttle, y - 4);
      ctx.stroke();
    }
    ctx.fillStyle = COLOR.crabClaw;
    ctx.beginPath();
    ctx.ellipse(-16, -radius, 7, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(16, -radius, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOR.crabBody;
    ctx.beginPath();
    ctx.moveTo(-4, -radius);
    ctx.lineTo(-7, -radius - 10);
    ctx.moveTo(4, -radius);
    ctx.lineTo(7, -radius - 10);
    ctx.stroke();
    ctx.fillStyle = COLOR.eye;
    ctx.beginPath();
    ctx.arc(-7, -radius - 12, 2.2, 0, Math.PI * 2);
    ctx.arc(7, -radius - 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const shell = ctx.createRadialGradient(-4, -6, 2, 0, 0, radius + 4);
  shell.addColorStop(0, COLOR.crabBody);
  shell.addColorStop(0.55, COLOR.crabShell);
  shell.addColorStop(1, COLOR.crabShellDark);
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(0, 2, radius, radius * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.crabShellDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 2, radius * 0.45, 0.4, 3.4);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "rgba(247, 241, 230, 0.92)";
  ctx.fillRect(0, 0, VIEW_W, 58);
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "left";
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(COPY.emery, 12, 22);
  ctx.font = "14px Trebuchet MS, sans-serif";
  ctx.fillText(`${state.level.name}   ${COPY.score} ${state.crab.score}`, 12, 44);
  ctx.textAlign = "right";
  const seconds = Math.max(0, Math.ceil((state.level.timeLimitMs - state.elapsedMs) / 1000));
  ctx.fillText(`${COPY.time} ${seconds}`, VIEW_W - 12, 44);
  for (let i = 0; i < state.crab.lives; i += 1) {
    ctx.fillStyle = COLOR.crabShell;
    ctx.beginPath();
    ctx.ellipse(VIEW_W - 28 - i * 18, 18, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawToast(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = COLOR.cream;
  ctx.fillRect(36, VIEW_H - 72, VIEW_W - 72, 40);
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.fillText(text, VIEW_W / 2, VIEW_H - 47);
}

function drawBanner(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (state.phase === "level-clear" || state.phase === "campaign-clear") drawConfetti(ctx, nowMs);
  ctx.fillStyle = COLOR.cream;
  roundRect(ctx, 36, 220, VIEW_W - 72, 230, 12);
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  const title =
    state.phase === "title"
      ? COPY.title
      : state.bannerTitle || state.level.name;
  const body =
    state.phase === "title"
      ? COPY.emery
      : state.bannerBody || state.level.intro;
  ctx.font = "700 28px Georgia, serif";
  wrapText(ctx, title, VIEW_W / 2, 280, VIEW_W - 120, 34);
  ctx.font = "18px Trebuchet MS, sans-serif";
  wrapText(ctx, body, VIEW_W / 2, 360, VIEW_W - 120, 26);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(continueLabel(state.phase), VIEW_W / 2, 420);
}

function drawConfetti(ctx: CanvasRenderingContext2D, nowMs: number): void {
  const colors = [COLOR.carRed, COLOR.carYellow, COLOR.carBlue, COLOR.carGreen, COLOR.crabShell];
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 97 + nowMs * 0.04) % VIEW_W;
    const y = (i * 53 + nowMs * 0.08) % 220;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y + 80, 6, 10);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (textWidth(ctx, trial) > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x, cursor);
}

function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const measured = ctx.measureText(text);
  return measured && typeof measured.width === "number" ? measured.width : text.length * 8;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}