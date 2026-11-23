import { VIEW_H, VIEW_W } from "../game/constants";
import { PANEL_BOTTOM, PANEL_H, PANEL_TOP, PANEL_W, PANEL_X, type SpotLevel } from "./scenes";
import type { SpotState } from "./sim";

export function drawSpot(ctx: CanvasRenderingContext2D, state: SpotState, nowMs: number): void {
  const level = state.levels[state.levelIndex];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#d7ecf3";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const found = new Set(state.diffs.filter((diff) => diff.found).map((diff) => diff.id));
  drawPanel(ctx, level, false, PANEL_X, PANEL_TOP, found, state.hintId, nowMs);
  drawPanel(ctx, level, true, PANEL_X, PANEL_BOTTOM, found, state.hintId, nowMs);

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "left";
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(level.name, 16, 28);
  ctx.font = "700 15px Trebuchet MS, sans-serif";
  ctx.fillText(`Level ${state.levelIndex + 1} of ${state.levels.length}`, 16, 50);
  ctx.fillText(`Score ${state.score}`, 16, 70);
  const left = state.diffs.filter((diff) => !diff.found).length;
  ctx.textAlign = "right";
  ctx.fillText(left === 1 ? "1 change left" : `${left} changes left`, VIEW_W - 16, 50);
  ctx.textAlign = "center";
  ctx.font = "700 13px Trebuchet MS, sans-serif";
  ctx.fillText("First picture", PANEL_X + PANEL_W / 2, PANEL_TOP - 6);
  ctx.fillText("Second picture", PANEL_X + PANEL_W / 2, PANEL_BOTTOM - 6);

  if (state.toastMs > 0 && state.phase === "playing") {
    ctx.fillStyle = "rgba(28, 25, 21, 0.55)";
    roundRect(ctx, 90, PANEL_TOP + 8, VIEW_W - 180, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.fillText(state.toast, VIEW_W / 2, PANEL_TOP + 30);
  }
  if (state.phase === "paused") banner(ctx, "Paused", "Tap the picture to look again.");
  if (state.phase === "clear") banner(ctx, "You finished the level!", "You found every change.");
  if (state.phase === "done") banner(ctx, `You finished all ${state.levels.length} levels.`, "Every picture is solved.");
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  level: SpotLevel,
  changed: boolean,
  ox: number,
  oy: number,
  found: Set<string>,
  hintId: string | null,
  nowMs: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, PANEL_W, PANEL_H);
  ctx.clip();
  sky(ctx, ox, oy, level.sky);
  buildings(ctx, ox, oy, level.sky);
  drawHero(ctx, ox + level.hero.x, oy + level.hero.y, level.hero.face);
  for (const diff of level.diffs) drawChange(ctx, diff.id, changed, ox + diff.x, oy + diff.y);
  ctx.restore();

  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 3;
  ctx.strokeRect(ox + 1.5, oy + 1.5, PANEL_W - 3, PANEL_H - 3);

  for (const diff of level.diffs) {
    if (found.has(diff.id)) ring(ctx, ox + diff.x, oy + diff.y, 22, "#d64545", 3);
    else if (hintId === diff.id) ring(ctx, ox + diff.x, oy + diff.y, 16 + Math.sin(nowMs / 180) * 4, "#f2c14e", 3);
  }
}

function sky(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "day" | "dusk" | "night"): void {
  const grad = ctx.createLinearGradient(x, y, x, y + PANEL_H);
  if (kind === "night") {
    grad.addColorStop(0, "#1b2a4a");
    grad.addColorStop(1, "#3d6f8a");
  } else if (kind === "dusk") {
    grad.addColorStop(0, "#f2a36b");
    grad.addColorStop(1, "#6d8cae");
  } else {
    grad.addColorStop(0, "#8ecae6");
    grad.addColorStop(1, "#d7f3fb");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, PANEL_W, PANEL_H);
}

function buildings(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "day" | "dusk" | "night"): void {
  const wall = kind === "night" ? "#243044" : kind === "dusk" ? "#5c4a62" : "#7d8b99";
  const roof = kind === "night" ? "#1c2430" : "#6b5344";
  ctx.fillStyle = kind === "night" ? "#1a3328" : "#7f9a55";
  ctx.fillRect(x, y + 230, PANEL_W, PANEL_H - 230);
  ctx.fillStyle = wall;
  ctx.fillRect(x + 24, y + 90, 90, 150);
  ctx.fillRect(x + 150, y + 70, 70, 170);
  ctx.fillRect(x + 280, y + 110, 120, 130);
  ctx.fillStyle = roof;
  ctx.fillRect(x + 18, y + 84, 102, 12);
  ctx.fillRect(x + 144, y + 64, 82, 12);
  ctx.fillRect(x + 274, y + 104, 132, 12);
  ctx.fillStyle = kind === "night" ? "#f2c14e" : "#d7ecf3";
  for (const [wx, wy] of [
    [40, 110],
    [70, 110],
    [40, 146],
    [70, 146],
    [166, 96],
    [190, 96],
    [166, 132],
    [300, 130],
    [340, 130],
    [300, 166],
  ]) {
    ctx.fillRect(x + wx, y + wy, 14, 16);
  }
}

function drawChange(ctx: CanvasRenderingContext2D, id: string, changed: boolean, x: number, y: number): void {
  const kind = id.replace(/\d+$/, "");
  if (kind === "balloon") balloon(ctx, x, y, changed ? "#f2c14e" : "#d64545");
  else if (kind === "kite") kite(ctx, x, y, changed ? "#5aa7e0" : "#d64545");
  else if (kind === "web" || kind === "bird" || kind === "star" || kind === "cat" || kind === "puddle" || kind === "cloud" || kind === "butterfly" || kind === "acorn") {
    if (!changed) {
      if (kind === "web") web(ctx, x, y);
      if (kind === "bird") bird(ctx, x, y);
      if (kind === "star") star(ctx, x, y);
      if (kind === "cat") cat(ctx, x, y);
      if (kind === "puddle") puddle(ctx, x, y);
      if (kind === "cloud") cloud(ctx, x, y);
      if (kind === "butterfly") butterfly(ctx, x, y);
      if (kind === "acorn") acorn(ctx, x, y);
    }
  } else if (kind === "flower") flower(ctx, x, y, !changed);
  else if (kind === "window") windowLit(ctx, x, y, changed);
  else if (kind === "moon") moon(ctx, x, y, changed);
  else if (kind === "snack") snack(ctx, x, y, changed);
  else if (kind === "lantern") lantern(ctx, x, y, !changed);
  else if (kind === "flag") flag(ctx, x, y, changed ? "#24357a" : "#d64545");
  else if (kind === "smoke" && changed) smoke(ctx, x, y);
}

function balloon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y + 28);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function web(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const stroke = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y + 16);
    ctx.stroke();
  };
  stroke("#1c1915", 5);
  stroke("#f7f1e6", 2);
}

function bird(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 2);
  ctx.lineTo(x - 2, y - 10);
  ctx.lineTo(x, y);
  ctx.moveTo(x + 14, y + 2);
  ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x, y);
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(x + 6, y - 1, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, bloom: boolean): void {
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(x - 10, y, 20, 16);
  ctx.fillStyle = "#6b4a32";
  ctx.fillRect(x - 8, y + 2, 16, 4);
  if (!bloom) return;
  ctx.strokeStyle = "#2f6b3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 16);
  ctx.stroke();
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.arc(x, y - 20, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(x, y - 20, 3, 0, Math.PI * 2);
  ctx.fill();
}

function windowLit(ctx: CanvasRenderingContext2D, x: number, y: number, lit: boolean): void {
  ctx.fillStyle = lit ? "#f2c14e" : "#141820";
  ctx.fillRect(x - 12, y - 14, 24, 28);
  ctx.strokeStyle = "#f7f1e6";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 12, y - 14, 24, 28);
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y + 14);
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 12, y);
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const px = x + Math.cos(angle) * 10;
    const py = y + Math.sin(angle) * 10;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    const inner = angle + Math.PI / 5;
    ctx.lineTo(x + Math.cos(inner) * 4, y + Math.sin(inner) * 4);
  }
  ctx.closePath();
  ctx.fill();
}

function cat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#f2a13a";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 8);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x + 14, y - 8);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(x + 14, y - 2, 1, 0, Math.PI * 2);
  ctx.fill();
}

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, crescent: boolean): void {
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  if (!crescent) return;
  ctx.fillStyle = "#1b2a4a";
  ctx.beginPath();
  ctx.arc(x + 7, y - 2, 13, 0, Math.PI * 2);
  ctx.fill();
}

function snack(ctx: CanvasRenderingContext2D, x: number, y: number, apple: boolean): void {
  if (apple) {
    ctx.strokeStyle = "#2f6b3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 6, y - 16);
    ctx.stroke();
    ctx.fillStyle = "#d64545";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 8);
  ctx.lineTo(x + 14, y + 8);
  ctx.lineTo(x, y - 14);
  ctx.fill();
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.arc(x - 4, y, 3, 0, Math.PI * 2);
  ctx.arc(x + 3, y + 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean): void {
  ctx.fillStyle = "#5c4a3a";
  ctx.fillRect(x - 2, y - 18, 4, 10);
  ctx.fillStyle = on ? "#f2c14e" : "#6d7278";
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 8, 20, 22, 4);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.stroke();
}

function puddle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#6eb5d0";
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function kite(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x, y + 16);
  ctx.lineTo(x - 12, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + 16);
  ctx.quadraticCurveTo(x + 10, y + 24, x + 4, y + 30);
  ctx.stroke();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(x - 10, y + 2, 8, 0, Math.PI * 2);
  ctx.arc(x, y - 4, 10, 0, Math.PI * 2);
  ctx.arc(x + 12, y + 2, 8, 0, Math.PI * 2);
  ctx.fill();
}

function butterfly(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#e07ad4";
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 4, 8, 6, -0.4, 0, Math.PI * 2);
  ctx.ellipse(x + 8, y - 4, 8, 6, 0.4, 0, Math.PI * 2);
  ctx.ellipse(x - 7, y + 6, 6, 5, 0.4, 0, Math.PI * 2);
  ctx.ellipse(x + 7, y + 6, 6, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1915";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
}

function acorn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c47b4a";
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 9, 5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
}

function smoke(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "rgba(247, 241, 230, 0.85)";
  ctx.beginPath();
  ctx.arc(x, y + 8, 6, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 2, 8, 0, Math.PI * 2);
  ctx.arc(x - 2, y - 12, 7, 0, Math.PI * 2);
  ctx.fill();
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = "#5c4a3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 18);
  ctx.lineTo(x - 12, y + 18);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 16);
  ctx.lineTo(x + 16, y - 8);
  ctx.lineTo(x - 12, y);
  ctx.fill();
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, face: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = "#8a8f98";
  ctx.beginPath();
  ctx.ellipse(-16, 10, 6, 12, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c2c2c";
  ctx.beginPath();
  ctx.ellipse(-16, 6, 5, 2, -0.7, 0, Math.PI * 2);
  ctx.ellipse(-15, 12, 5, 2, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#24357a";
  ctx.fillRect(-8, 8, 6, 12);
  ctx.fillRect(2, 8, 6, 12);
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(4, 3);
  ctx.lineTo(0, 8);
  ctx.lineTo(-4, 3);
  ctx.fill();
  ctx.fillStyle = "#9aa0a8";
  ctx.beginPath();
  ctx.ellipse(0, -14, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.lineTo(-5, -28);
  ctx.lineTo(-1, -16);
  ctx.moveTo(8, -18);
  ctx.lineTo(5, -28);
  ctx.lineTo(1, -16);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(-10, -18, 20, 6);
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(-4, -15, 2, 0, Math.PI * 2);
  ctx.arc(4, -15, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.beginPath();
  ctx.arc(-4, -15, 1, 0, Math.PI * 2);
  ctx.arc(4, -15, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function banner(ctx: CanvasRenderingContext2D, title: string, body: string): void {
  ctx.fillStyle = "rgba(28, 25, 21, 0.45)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f7f1e6";
  roundRect(ctx, 36, 250, VIEW_W - 72, 170, 18);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 320);
  ctx.font = "700 16px Trebuchet MS, sans-serif";
  ctx.fillText(body, VIEW_W / 2, 358);
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
