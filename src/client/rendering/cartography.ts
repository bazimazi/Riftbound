import type { Vec2 } from "../../game/types.ts";
import type { Game } from "../../game/Game.ts";
import { FINDS } from "../../game/world/realms.ts";
import { CATALYSTS } from "../../game/progression/journey.ts";
export function drawMap(canvas: HTMLCanvasElement, g: Game, full = false) {
  if (!canvas) return;
  const c = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    m = g.realm;
  const pad = full ? 38 : 8;
  const scale = full
    ? Math.min((w - pad * 2) / m.width, (h - pad * 2) / m.height)
    : (w - pad * 2) / 2100;
  const cx = full ? 0 : g.p.x,
    cy = full ? 0 : g.p.y;
  c!.clearRect(0, 0, w, h);
  c!.fillStyle = "#111817";
  c!.fillRect(0, 0, w, h);
  c!.save();
  c!.translate(w / 2, h / 2);
  c!.scale(scale, scale);
  c!.translate(-cx, -cy);
  const left = -m.width / 2,
    top = -m.height / 2;
  c!.fillStyle = ["#273329", "#372b28", "#2c2c3e"][m.biome];
  c!.fillRect(left, top, m.width, m.height);
  c!.strokeStyle = m.color + "32";
  c!.lineWidth = 1 / scale;
  for (let x = left; x <= -left; x += 600) {
    c!.beginPath();
    c!.moveTo(x, top);
    c!.lineTo(x, -top);
    c!.stroke();
  }
  for (let y = top; y <= -top; y += 600) {
    c!.beginPath();
    c!.moveTo(left, y);
    c!.lineTo(-left, y);
    c!.stroke();
  }
  c!.fillStyle = m.color + "15";
  for (const cell of g.explored) {
    const [x, y] = cell.split(",").map(Number);
    c!.fillRect(left + x * 240, top + y * 240, 240, 240);
  }
  c!.strokeStyle = "#a48c65";
  c!.lineWidth = 4 / scale;
  c!.strokeRect(left, top, m.width, m.height);
  const mark = (
    o: Vec2,
    color: string,
    shape: string,
    size = 7,
    clamp = true,
  ) => {
    let x = o.x,
      y = o.y;
    if (!full && clamp) {
      const rx = (w / 2 - 15) / scale,
        ry = (h / 2 - 15) / scale;
      const ratio = Math.max(Math.abs(x - cx) / rx, Math.abs(y - cy) / ry, 1);
      x = cx + (x - cx) / ratio;
      y = cy + (y - cy) / ratio;
    }
    c!.save();
    c!.translate(x, y);
    c!.scale(1 / scale, 1 / scale);
    if (full && shape !== "enemy" && shape !== "player") c!.scale(1.8, 1.8);
    c!.fillStyle = "#101512";
    c!.fillRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
    c!.fillStyle = color;
    if (shape === "memory") {
      c!.fillRect(-4, -5, 3, 10);
      c!.fillRect(1, -5, 3, 10);
    } else if (shape === "seal") {
      c!.beginPath();
      c!.moveTo(0, -size);
      c!.lineTo(size, 0);
      c!.lineTo(0, size);
      c!.lineTo(-size, 0);
      c!.closePath();
      c!.fill();
    } else if (shape === "ward") {
      c!.fillRect(-5, -6, 10, 8);
      c!.fillRect(-3, 2, 6, 3);
    } else if (shape === "flow") {
      c!.fillRect(-2, -6, 5, 6);
      c!.fillRect(-5, -1, 6, 3);
      c!.fillRect(-2, 2, 3, 5);
    } else if (shape === "reach") {
      c!.fillRect(-6, -4, 3, 8);
      c!.fillRect(-2, -2, 3, 8);
      c!.fillRect(2, 0, 3, 8);
    } else if (shape === "fury") {
      c!.fillRect(-2, -6, 4, 10);
      c!.fillRect(-5, 2, 10, 3);
    } else c!.fillRect(-size / 2, -size / 2, size, size);
    c!.restore();
  };
  for (const f of g.finds)
    if (!f.taken)
      mark(
        f,
        f.remembered ? "#877f90" : FINDS[f.kind].color,
        f.kind,
        full ? 7 : 5,
      );
  for (const d of g.pickups)
    if (["cache", "seal"].includes(d.kind)) mark(d, "#ecd094", d.kind, 5);
  for (const item of g.catalysts || [])
    mark(item, CATALYSTS[item.kind].color, "seal", full ? 8 : 6);
  for (const s of g.shrines) if (!s.used) mark(s, "#c7a9df", "memory", 5);
  if (g.vault) mark(g.vault, "#a4f0e3", "seal", 6);
  for (const e of g.enemies)
    if (full ? e.boss || e.reaper : Math.hypot(e.x - g.p.x, e.y - g.p.y) < 1050)
      mark(
        e,
        e.reaper ? "#ff6278" : e.boss ? "#ffab88" : "#d77970",
        "enemy",
        e.boss || e.reaper ? 6 : 2,
        false,
      );
  if (g.waypoint) {
    c!.strokeStyle = "#fff2ae";
    c!.lineWidth = 1 / scale;
    c!.setLineDash([5 / scale, 6 / scale]);
    c!.beginPath();
    c!.moveTo(g.p.x, g.p.y);
    c!.lineTo(g.waypoint.x, g.waypoint.y);
    c!.stroke();
    c!.setLineDash([]);
    mark(g.waypoint, "#fff2ae", "seal", 6);
  }
  mark(g.p, "#e8ffe1", "player", 7);
  c!.restore();
  if (!full) {
    c!.fillStyle = "#151c18";
    c!.fillRect(6, h - 23, w - 12, 17);
    c!.fillStyle = "#dccda6";
    c!.font = "14px monospace";
    c!.textAlign = "center";
    c!.fillText("[ M ]", w / 2, h - 9);
  }
  return {
    scale,
    left: w / 2 - (m.width * scale) / 2,
    top: h / 2 - (m.height * scale) / 2,
  };
}
