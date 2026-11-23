import { VIEW_H, VIEW_W } from "../game/constants";
import { courseWidth, SKATE_LEVELS, type Piece } from "./levels";
import { catHeight, type SkateState } from "./sim";
import { SKATE_SPOTS, type SkateSpot, type SkateTouchHeld } from "./touch";

function cameraX(state: SkateState, width: number): number {
  return Math.max(0, Math.min(Math.max(0, width - VIEW_W), state.x - 160));
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  round(ctx, 48, 250, VIEW_W - 96, 150, 18);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 314);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(body, VIEW_W / 2, 352);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSkate(ctx: CanvasRenderingContext2D, state: SkateState, nowMs: number, touch?: SkateTouchHeld): void {
  const level = SKATE_LEVELS[state.levelIndex];
  const width = courseWidth(level);
  const cam = cameraX(state, width);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const skyName = level.sky ?? "day";
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, skyName === "night" ? "#1c2a4a" : skyName === "dusk" ? "#f0a06a" : "#9fd4ee");
  sky.addColorStop(1, skyName === "night" ? "#3d4d73" : skyName === "dusk" ? "#f6d7a8" : "#e7f6d8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = skyName === "night" ? "#243044" : skyName === "dusk" ? "#c48b62" : "#b7d39a";
  ctx.beginPath();
  ctx.moveTo(0, 470);
  for (let x = 0; x <= VIEW_W; x += 40) ctx.lineTo(x, 450 + Math.sin((x + cam) / 80) * 16);
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.lineTo(0, VIEW_H);
  ctx.fill();

  let start = 0;
  for (const piece of level.pieces) {
    drawPiece(ctx, piece, start - cam);
    start += piece.w;
  }

  drawCat(ctx, state, state.x - cam, nowMs);

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(level.name, 16, 32);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of ${SKATE_LEVELS.length}`, 16, 54);
  ctx.fillText(`Score ${state.score}`, 16, 74);
  ctx.textAlign = "right";
  ctx.fillText(state.combo > 1 ? `Combo x${state.combo}` : `${state.bails} wipeouts`, VIEW_W - 16, 54);
  ctx.fillStyle = "#1c1915";
  round(ctx, VIEW_W - 132, 64, 116, 12, 6);
  ctx.fill();
  ctx.fillStyle = state.vx > 480 ? "#d64545" : "#f2c14e";
  round(ctx, VIEW_W - 130, 66, Math.max(4, Math.min(112, (state.vx / 640) * 112)), 8, 4);
  ctx.fill();

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    round(ctx, 90, 96, VIEW_W - 180, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, 118);
  }
  if (state.phase === "playing") drawTouch(ctx, touch);
  if (state.phase === "paused") banner(ctx, "Paused", "Tap the picture to roll.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", "Every ramp is behind you.");
  if (state.phase === "retry") banner(ctx, "Three wipeouts.", "Try the park again.");
  if (state.phase === "done") banner(ctx, `You finished all ${SKATE_LEVELS.length} levels.`, "The white cat owns the park.");
}

function spotHeld(spot: SkateSpot, touch?: SkateTouchHeld): boolean {
  if (!touch) return false;
  if (spot.name === "left") return touch.left;
  if (spot.name === "right") return touch.right;
  if (spot.name === "crouch") return touch.crouch;
  if (spot.name === "jump") return touch.ollie;
  return false;
}

function drawTouch(ctx: CanvasRenderingContext2D, touch?: SkateTouchHeld): void {
  for (const spot of SKATE_SPOTS) {
    const on = spotHeld(spot, touch);
    const crouch = spot.name === "crouch";
    ctx.fillStyle = crouch ? (on ? "#18264f" : "#24357a") : on ? "#e0b03a" : spot.name === "left" || spot.name === "pause" ? "#f7f1e6" : "#f2c14e";
    round(ctx, spot.x, spot.y, spot.w, spot.h, 14);
    ctx.fill();
    ctx.strokeStyle = "#1c1915";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = crouch ? "#f7f1e6" : "#1c1915";
    ctx.textAlign = "center";
    ctx.font = spot.name === "pause" ? "700 15px Trebuchet MS, sans-serif" : "700 18px Trebuchet MS, sans-serif";
    ctx.fillText(spot.label, spot.x + spot.w / 2, spot.y + spot.h / 2 + 6);
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, x: number): void {
  if (x > VIEW_W || x + piece.w < -20) return;
  if (piece.kind === "gap") {
    ctx.fillStyle = "#243044";
    ctx.fillRect(x, 620, piece.w, VIEW_H - 620);
    return;
  }
  if (piece.kind === "rail") {
    ctx.strokeStyle = "#d5d8dc";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, piece.y);
    ctx.lineTo(x + piece.w, piece.y);
    ctx.stroke();
    ctx.strokeStyle = "#8d93a0";
    ctx.lineWidth = 3;
    for (let post = 16; post < piece.w; post += 48) {
      ctx.beginPath();
      ctx.moveTo(x + post, piece.y);
      ctx.lineTo(x + post, piece.y + 46);
      ctx.stroke();
    }
    return;
  }
  const y0 = piece.kind === "ramp" ? piece.y0 : piece.y;
  const y1 = piece.kind === "ramp" ? piece.y1 : piece.y;
  ctx.fillStyle = "#6d727c";
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x + piece.w, y1);
  ctx.lineTo(x + piece.w, VIEW_H);
  ctx.lineTo(x, VIEW_H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3e4450";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x + piece.w, y1);
  ctx.stroke();
  if (piece.kind === "ramp") {
    const speed = piece.y1 > piece.y0;
    ctx.strokeStyle = speed ? "#f2c14e" : "#d64545";
    ctx.lineWidth = 4;
    for (let mark = 18; mark < piece.w - 8; mark += 28) {
      const t = mark / piece.w;
      const y = y0 + (y1 - y0) * t;
      ctx.beginPath();
      ctx.moveTo(x + mark, y - 10);
      ctx.lineTo(x + mark + (speed ? 10 : -10), y - 22);
      ctx.stroke();
    }
  }
  if (piece.kind === "tunnel") {
    const ceiling = piece.y - piece.gap;
    ctx.fillStyle = "rgba(28, 36, 48, 0.28)";
    ctx.fillRect(x, ceiling, piece.w, piece.y - ceiling);
    ctx.fillStyle = "#3a4250";
    ctx.fillRect(x, ceiling - 28, piece.w, 28);
    ctx.fillStyle = "#2a3140";
    ctx.fillRect(x, ceiling - 28, 14, piece.y - ceiling + 28);
    ctx.fillRect(x + piece.w - 14, ceiling - 28, 14, piece.y - ceiling + 28);
    ctx.fillStyle = "#f2c14e";
    ctx.font = "700 14px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TUNNEL", x + piece.w / 2, ceiling - 8);
  }
  if (piece.kind === "finish") {
    for (let col = 0; col < piece.w; col += 16) {
      for (let row = 0; row < 32; row += 16) {
        ctx.fillStyle = (col + row) % 32 === 0 ? "#f7f1e6" : "#1c1915";
        ctx.fillRect(x + col, y0 - 64 + row, 16, 16);
      }
    }
  }
}

function drawCat(ctx: CanvasRenderingContext2D, state: SkateState, x: number, nowMs: number): void {
  const y = state.y;
  const height = catHeight(state.crouched);
  const slope = state.grounded ? Math.atan(state.slope) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(slope);
  ctx.fillStyle = "#20242b";
  ctx.fillRect(-24, -8, 48, 7);
  ctx.fillStyle = "#c5cad3";
  ctx.fillRect(-16, -4, 6, 8);
  ctx.fillRect(10, -4, 6, 8);
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.arc(-13, 6, 5, 0, Math.PI * 2);
  ctx.arc(13, 6, 5, 0, Math.PI * 2);
  ctx.fill();
  if (state.airTrick === "kickflip") {
    ctx.save();
    ctx.translate(0, -6);
    ctx.rotate(state.airMs / 70);
    ctx.fillStyle = "#20242b";
    ctx.fillRect(-24, -3, 48, 6);
    ctx.restore();
  }
  ctx.translate(0, -height + 8);
  ctx.fillStyle = "#f7f4ef";
  ctx.beginPath();
  ctx.ellipse(0, height * 0.35, 16, state.crouched ? 12 : 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2b6c6";
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-6, -24);
  ctx.lineTo(-1, -8);
  ctx.moveTo(12, -10);
  ctx.lineTo(6, -24);
  ctx.lineTo(1, -8);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-5, -2, 2, 0, Math.PI * 2);
  ctx.arc(5, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0899a";
  ctx.beginPath();
  ctx.arc(0, 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f7f4ef";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, height * 0.2);
  ctx.quadraticCurveTo(-28, height * 0.1 + Math.sin(nowMs / 120) * 4, -22, -8);
  ctx.stroke();
  if (state.airTrick === "grab") {
    ctx.strokeStyle = "#f7f4ef";
    ctx.beginPath();
    ctx.moveTo(10, 8);
    ctx.lineTo(18, -16);
    ctx.stroke();
  }
  ctx.restore();
}
