import type { Game } from "../../game/Game.ts";
import { drawMap } from "./cartography.ts";
import { drawSprite } from "./pixel-art.ts";
const TAU = Math.PI * 2;
export function drawBeacon(c: CanvasRenderingContext2D, g: Game) {
  const v = g.vault;
  if (!v) return;
  const t = g.save.visuals?.motion === false ? 0 : g.time;
  c.save();
  c.translate(v.x, v.y);
  const beam = c.createLinearGradient(0, -220, 0, 15);
  beam.addColorStop(0, "#82eddd00");
  beam.addColorStop(1, "#82eddd30");
  c.fillStyle = beam;
  c.beginPath();
  c.moveTo(-8, -220);
  c.lineTo(8, -220);
  c.lineTo(30, 10);
  c.lineTo(-30, 10);
  c.fill();
  c.strokeStyle = "#8fded48c";
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, 10, 42, 15, 0, 0, TAU);
  c.stroke();
  drawSprite(c, "crystal", 0, 5 + Math.sin(t * 2) * 4, 57);
  if (v.state === "defending") {
    c.fillStyle = "#8ddfd508";
    c.beginPath();
    c.arc(0, 0, 110, 0, TAU);
    c.fill();
    c.setLineDash([7, 7]);
    c.lineDashOffset = -t * 9;
    c.beginPath();
    c.arc(0, 0, 110, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "#d6fff2";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, 110, -Math.PI / 2, -Math.PI / 2 + (TAU * v.progress) / 18);
    c.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const a = t * 0.7 + (i * TAU) / 5;
    c.fillStyle = "#bbf9e8";
    c.save();
    c.translate(Math.cos(a) * 34, Math.sin(a) * 12 - 35);
    c.rotate(Math.PI / 4);
    c.fillRect(-2, -2, 4, 4);
    c.restore();
  }
  c.restore();
}
export function drawMinimap(canvas: HTMLCanvasElement, g: Game) {
  if (g.save.visuals?.minimap !== false) drawMap(canvas, g);
}
