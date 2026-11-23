import { VIEW_H, VIEW_W } from "../game/constants";
import { SKATE_LEVELS } from "./levels";
import { boostCharge, type SkateState } from "./sim";
import { SKATE_SPOTS, type SkateSpot, type SkateTouchHeld } from "./touch";

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

export function drawSkate(ctx: CanvasRenderingContext2D, state: SkateState, _nowMs: number, touch?: SkateTouchHeld): void {
  const level = SKATE_LEVELS[state.levelIndex];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 22px Georgia, serif";
  ctx.fillText(level.name, 16, 32);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of ${SKATE_LEVELS.length}`, 16, 54);
  ctx.fillText(`Score ${state.score}   Stars ${state.treats.length}`, 16, 74);
  ctx.font = "700 12px Trebuchet MS, sans-serif";
  ctx.fillText("Boost", 16, 96);
  const charge = boostCharge(state);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = charge >= (i + 1) / 3 ? (state.boostMs > 0 ? "#d64545" : "#f2c14e") : "rgba(28, 25, 21, 0.22)";
    ctx.beginPath();
    ctx.arc(56 + i * 14, 92, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "right";
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(state.combo > 1 ? `Combo x${state.combo}` : `${state.bails} wipeouts`, VIEW_W - 16, 54);
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

function buttonFill(name: SkateSpot["name"], on: boolean): string {
  if (name === "pause") return on ? "#e7eef8" : "#f7fbff";
  if (name === "jump") return on ? "#2eaf58" : "#3dcc6a";
  if (name === "crouch") return on ? "#e06a22" : "#ff8a3d";
  return on ? "#1d7ed4" : "#2f9bff";
}

function drawTouch(ctx: CanvasRenderingContext2D, touch?: SkateTouchHeld): void {
  for (const spot of SKATE_SPOTS) {
    const on = spotHeld(spot, touch);
    ctx.fillStyle = buttonFill(spot.name, on);
    round(ctx, spot.x, spot.y, spot.w, spot.h, spot.name === "pause" ? 12 : 18);
    ctx.fill();
    ctx.strokeStyle = "#1c2430";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = spot.name === "pause" ? "#1c2430" : "#ffffff";
    ctx.textAlign = "center";
    ctx.font = spot.name === "pause" ? "700 15px Trebuchet MS, sans-serif" : "700 22px Trebuchet MS, sans-serif";
    const label = spot.name === "left" ? "◀ Left" : spot.name === "right" ? "Right ▶" : spot.label;
    ctx.fillText(label, spot.x + spot.w / 2, spot.y + spot.h / 2 + 7);
  }
}
