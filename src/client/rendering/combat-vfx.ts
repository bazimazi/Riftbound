import type { CombatEffect } from "../../game/types.ts";
import type { Projectile } from "../../game/types.ts";
import type { Game } from "../../game/Game.ts";
import type { PixelPoint } from "./types.ts";
import { projectileHeight } from "../../game/combat/combat-motion.ts";
import { drawAbilityGround } from "./ability-vfx.ts";
import { selectedUltimate } from "../../game/data/specializations.ts";
const TAU = Math.PI * 2;
const ease = (t: number) => 1 - (1 - t) ** 3;
let fireGlow: HTMLCanvasElement | undefined;
function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
) {
  if (!fireGlow) {
    fireGlow = document.createElement("canvas");
    fireGlow.width = 64;
    fireGlow.height = 64;
    const ctx = fireGlow.getContext("2d"),
      g = ctx!.createRadialGradient(32, 32, 1, 32, 32, 32);
    g.addColorStop(0, "#ffd49b99");
    g.addColorStop(0.3, "#f5914850");
    g.addColorStop(1, "#dc502600");
    ctx!.fillStyle = g;
    ctx!.fillRect(0, 0, 64, 64);
  }
  c.save();
  c.globalAlpha *= alpha;
  c.drawImage(fireGlow, x - r, y - r, r * 2, r * 2);
  c.restore();
}
function stroke(
  c: CanvasRenderingContext2D,
  points: PixelPoint[],
  color: string,
  width = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
function ring(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  width = 1,
  flatten = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, r), Math.max(0.1, r * flatten), 0, 0, TAU);
  c.stroke();
}
function leaf(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-size, 0);
  c.quadraticCurveTo(0, -size, size, 0);
  c.quadraticCurveTo(0, size, -size, 0);
  c.fill();
  c.restore();
}
function spark(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - r, y);
  c.lineTo(x - 1, y - 1);
  c.lineTo(x, y - r);
  c.lineTo(x + 1, y - 1);
  c.lineTo(x + r, y);
  c.lineTo(x + 1, y + 1);
  c.lineTo(x, y + r);
  c.lineTo(x - 1, y + 1);
  c.closePath();
  c.fill();
}
function slash(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  spread: number,
  color: string,
  width: number,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.beginPath();
  c.arc(x, y, r, angle - spread, angle + spread);
  c.stroke();
}
function lightning(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  tx: number,
  ty: number,
  color: string,
  q: number,
  seed = 0,
) {
  const dx = tx - x,
    dy = ty - y,
    length = Math.hypot(dx, dy) || 1,
    nx = -dy / length,
    ny = dx / length,
    points: PixelPoint[] = [[x, y]],
    phase = Math.floor(q * 5);
  for (let i = 1; i < 7; i++) {
    const t = i / 7,
      jag =
        Math.sin(seed + i * 13.7 + phase * 2.1) * Math.min(13, length * 0.1);
    points.push([x + dx * t + nx * jag, y + dy * t + ny * jag]);
  }
  points.push([tx, ty]);
  stroke(c, points, color, 5);
  stroke(c, points, "#e8ffff", 1.4);
  for (const i of [2, 4]) {
    const [bx, by] = points[i],
      side = i === 2 ? 1 : -1;
    stroke(
      c,
      [
        [bx, by],
        [bx + dx * 0.06 + nx * side * 10, by + dy * 0.06 + ny * side * 10],
        [bx + dx * 0.14 + nx * side * 18, by + dy * 0.14 + ny * side * 18],
      ],
      color,
      1,
    );
  }
}

// Windups stay attached to the actor. Released effects stay at their world origin.
export function drawCharge(
  c: CanvasRenderingContext2D,
  g: Game,
  motion: boolean,
) {
  const a = g.p.action;
  if (!a || a.kind !== "skill" || a.released) return;
  const q = Math.min(1, a.age / Math.max(0.001, a.releaseAt)),
    tier = g.pendingSpell
      ? g.pendingSpell.id.match(/spell[135]$/)
        ? 3
        : 2
      : g.pendingForm
        ? g.pendingForm.slot + 2
        : selectedUltimate(g.hero.id, g.journey) && g.talentState.cooldown <= 0
          ? 3
          : 1,
    r = 36 + tier * 9 - 15 * q;
  c.save();
  c.translate(g.p.x, g.p.y);
  c.globalAlpha = 0.25 + 0.5 * q;
  ring(c, 0, 6, r, g.hero.color, 1.5, 0.45);
  if (tier > 1) ring(c, 0, 6, r * 0.78, "#fff3ce", 1, 0.45);
  if (motion)
    for (let i = 0; i < 6 + tier * 2; i++) {
      const angle = (i * TAU) / (6 + tier * 2) + a.age * 3,
        dist = (40 + tier * 10) * (1 - q) + 12;
      spark(
        c,
        Math.cos(angle) * dist,
        -27 + Math.sin(angle) * dist * 0.65,
        2 + q * 2,
        g.hero.color,
      );
    }
  spark(
    c,
    Math.cos(a.angle) * 18,
    -30 + Math.sin(a.angle) * 10,
    2 + q * 5,
    "#fff5d9",
  );
  c.restore();
}

export function drawProjectile(
  c: CanvasRenderingContext2D,
  b: Projectile,
  motion: boolean,
) {
  const angle = Math.atan2(b.vy, b.vx),
    height = projectileHeight(b),
    speed = Math.hypot(b.vx, b.vy),
    trail = Math.min(speed * (b.age || 0), b.type === "ember" ? 48 : 34);
  c.save();
  // The soft shadow locates airborne shots without becoming a second projectile.
  c.globalAlpha = 0.15;
  c.fillStyle = "#07121a";
  c.beginPath();
  c.ellipse(b.x, b.y + 4, b.type === "ember" ? 5 : 3, 2, 0, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
  c.translate(b.x, b.y - height);
  const launch =
    ({ ember: 26, arrow: 23, knife: 16, thorn: 10, stone: 8 }[b.type] || 0) *
    Math.max(0, 1 - (b.age || 0) / 0.16);
  c.translate(Math.cos(angle) * launch, Math.sin(angle) * launch);
  c.rotate(angle);
  c.lineCap = "round";
  if (b.visualTier) {
    const tint =
      {
        ember: "#ffb45e",
        thorn: "#b0e883",
        knife: "#c8a5f8",
        hex: "#a6f778",
        holy: "#ffe6a6",
        spirit: "#8ee9d5",
      }[b.type] || "#acdfff";
    c.scale(1 + b.visualTier * 0.12, 1 + b.visualTier * 0.12);
    c.globalAlpha = 0.28;
    stroke(
      c,
      [
        [-trail - 8, 0],
        [3, 0],
      ],
      tint,
      8 + b.visualTier * 2,
    );
    c.globalAlpha = 1;
    if (motion)
      for (let i = 0; i < b.visualTier + 1; i++) {
        c.fillStyle = tint;
        c.fillRect(-12 - i * 11, Math.sin((b.age || 0) * 9 + i * 3) * 7, 3, 3);
      }
  }
  if (motion && trail > 1) {
    const color =
      b.type === "ember"
        ? "#f2a15b"
        : b.type === "thorn"
          ? "#a9d589"
          : b.type === "knife"
            ? "#b39ad9"
            : "#a2e6f5";
    c.globalAlpha = 0.3;
    stroke(
      c,
      [
        [-trail, 0],
        [-5, 0],
      ],
      color,
      b.charged ? 5 : 2,
    );
    c.globalAlpha = 1;
  }
  if (["hex", "holy", "spirit"].includes(b.type)) {
    const tint = { hex: "#a3ee89", holy: "#ffe3a1", spirit: "#81dfd2" }[
      b.type as "hex" | "holy" | "spirit"
    ];
    c.globalAlpha = 0.25;
    stroke(
      c,
      [
        [-trail, 0],
        [0, 0],
      ],
      tint,
      7,
    );
    c.globalAlpha = 1;
    if (b.type === "holy") {
      spark(c, 1, 0, 10, tint);
      spark(c, 1, 0, 4, "#fffbea");
    } else {
      c.fillStyle = tint;
      c.beginPath();
      c.ellipse(0, 0, b.type === "hex" ? 8 : 10, 5, 0, 0, TAU);
      c.fill();
      ring(c, 0, 0, 11, b.type === "hex" ? "#b49be6" : tint, 1.5);
      spark(c, 2, 0, 3, "#f3fff1");
    }
  } else if (b.type === "ember") {
    const phase = motion ? (b.age || 0) * 29 + b.vx : 0,
      flicker = Math.sin(phase) * 1.5;
    glow(c, -3, 0, 21, 0.55);
    c.fillStyle = "#de6030";
    c.beginPath();
    c.moveTo(-25 - flicker, 0);
    c.quadraticCurveTo(-14, -3, -12, -7 - flicker);
    c.quadraticCurveTo(-7, -3, 5, -4);
    c.quadraticCurveTo(12, 0, 5, 5);
    c.quadraticCurveTo(-9, 9, -25 - flicker, 0);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const side = i % 2 ? 1 : -1,
        px = -7 - i * 7,
        py = side * (3 + Math.sin(phase + i * 2) * 1.5);
      c.fillStyle = i % 2 ? "#f69b47" : "#f8c366";
      c.beginPath();
      c.moveTo(px + 8, py);
      c.quadraticCurveTo(
        px - 2,
        py + side * 4,
        px - 12 - Math.sin(phase + i) * 4,
        py + side * 2,
      );
      c.quadraticCurveTo(px - 4, py, px + 8, py);
      c.fill();
    }
    c.fillStyle = "#ffb758";
    c.beginPath();
    c.ellipse(0, 0, 8, 5, 0, 0, TAU);
    c.fill();
    spark(c, 3, 0, 4, "#fff2c6");
    if (motion)
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = 0.6 - i * 0.15;
        c.fillStyle = "#f7b769";
        c.fillRect(-14 - i * 9, Math.sin((b.age || 0) * 24 + i * 2) * 4, 2, 2);
      }
  } else if (b.type === "arrow") {
    stroke(
      c,
      [
        [-23, 0],
        [5, 0],
      ],
      b.charged ? "#f1ffff" : "#c3deec",
      b.charged ? 3 : 2,
    );
    c.fillStyle = "#f2ffff";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(1, -4);
    c.lineTo(2, 4);
    c.fill();
    stroke(
      c,
      [
        [-24, -4],
        [-19, 0],
        [-24, 4],
      ],
      "#698cba",
      2,
    );
    if (b.charged) {
      c.globalAlpha = 0.6;
      spark(c, 3, 0, 9, "#b6ebff");
    }
  } else if (b.type === "knife") {
    c.save();
    if (motion) c.rotate((b.age || 0) * 13);
    c.fillStyle = "#d9d4ed";
    c.beginPath();
    c.moveTo(12, 0);
    c.lineTo(-3, -4);
    c.lineTo(-1, 1);
    c.lineTo(-4, 4);
    c.fill();
    stroke(
      c,
      [
        [-4, 0],
        [-10, 0],
      ],
      "#6b577d",
      3,
    );
    stroke(
      c,
      [
        [-3, -4],
        [-3, 4],
      ],
      "#ab8bc9",
      2,
    );
    c.restore();
  } else if (b.type === "thorn") {
    c.fillStyle = "#d3e7a2";
    c.beginPath();
    c.moveTo(11, 0);
    c.lineTo(-7, -3);
    c.lineTo(-3, 0);
    c.lineTo(-7, 3);
    c.fill();
    leaf(c, -7, -2, 4, -0.5, "#6e985e");
    leaf(c, -8, 3, 3, 0.5, "#92b872");
  } else if (b.type === "stone") {
    if (motion) c.rotate((b.age || 0) * 5);
    c.fillStyle = "#c1a577";
    c.beginPath();
    c.moveTo(7, -2);
    c.lineTo(1, -6);
    c.lineTo(-7, -3);
    c.lineTo(-4, 6);
    c.lineTo(5, 4);
    c.fill();
    stroke(
      c,
      [
        [-4, -3],
        [1, -2],
        [5, 2],
      ],
      "#f5d89c",
      2,
    );
  } else if (b.type === "scythe") {
    if (motion) c.rotate((b.age || 0) * 8);
    slash(c, 0, 0, 10, 0, 1.6, "#d6c9e8", 3);
    stroke(
      c,
      [
        [0, -9],
        [0, 12],
      ],
      "#89749e",
      2,
    );
  } else {
    c.fillStyle = "#d9e8b6";
    c.beginPath();
    c.ellipse(0, 0, 6, 4, 0, 0, TAU);
    c.fill();
    spark(c, 2, 0, 3, "#ffffe0");
  }
  c.restore();
}

export function drawCombatEffect(
  c: CanvasRenderingContext2D,
  e: CombatEffect,
  motion = true,
) {
  if (drawAbilityGround(c, e, motion)) return true;
  if (!["muzzle", "impact", "swing", "arc"].includes(e.type)) return false;
  const q = Math.max(0, Math.min(1, 1 - e.life / e.maxLife)),
    t = ease(q),
    color = e.color || "#d6dbc0";
  c.save();
  c.globalAlpha = (1 - q) ** 1.3;
  c.lineCap = "round";
  if (e.type === "arc") {
    const a = Math.atan2(e.ty! - e.y, e.tx! - e.x);
    if (e.style === "lance") {
      stroke(
        c,
        [
          [e.x, e.y - 28],
          [e.tx!, e.ty! - 22],
        ],
        color,
        6 * (1 - q) + 1,
      );
      stroke(
        c,
        [
          [e.x, e.y - 28],
          [e.tx!, e.ty! - 22],
        ],
        "#f4f5ff",
        1.5,
      );
      slash(c, e.tx!, e.ty! - 22, 18 + q * 15, a, 0.7, color, 3);
      spark(c, e.tx!, e.ty! - 22, 10 * (1 - q), "#fff4da");
      c.restore();
      return true;
    }
    lightning(
      c,
      e.x + (e.emitter ? Math.cos(a) * 23 : 0),
      e.y - 28 + (e.emitter ? Math.sin(a) * 12 : 0),
      e.tx!,
      e.ty! - 22,
      color,
      motion ? q : 0,
      e.x + e.y,
    );
  } else if (e.type === "muzzle") {
    c.translate(e.x, e.y - 28);
    c.rotate(e.angle || 0);
    const r = 7 + q * 13;
    if (e.hero === "nyx") slash(c, 0, 0, 24 + q * 10, 0, 0.7, color, 2);
    else if (e.hero === "briar")
      for (let i = 0; i < 3; i++)
        leaf(c, 13 + q * 15, (i - 1) * 9 * (q + 0.3), 3, 0.3 + i, color);
    else if (e.hero === "volta")
      lightning(c, 10, -3, 30 + r, 0, color, motion ? q : 0);
    else if (e.hero !== "rook") {
      spark(c, 19, 0, r, color);
      spark(c, 19, 0, r * 0.5, "#fff5d5");
      if (e.hero === "lumen")
        slash(c, 4, 0, 18 + q * 10, 0, 0.65, "#cff3ff", 1);
    }
  } else if (e.type === "impact") {
    c.translate(e.x, e.y - 22);
    c.rotate(e.angle || 0);
    const r = (e.r || 14) * t;
    if (
      ["knife", "arrow", "hammer", "thorn", "scythe"].includes(e.style || "")
    ) {
      stroke(
        c,
        [
          [-7 * (1 - q), -r * 0.6],
          [9 * (1 - q), r * 0.6],
        ],
        "#fff4df",
        2.2,
      );
      if (e.style === "hammer") ring(c, 0, 14, r * 1.5, color, 1.5, 0.4);
    } else spark(c, 0, 0, 8 * (1 - q), "#fff0d7");
    if (motion)
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.6 + Math.sin((e.seed || 0) + i) * 0.2;
        stroke(
          c,
          [
            [Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65],
            [Math.cos(a) * r, Math.sin(a) * r + q * q * 7],
          ],
          i % 2 ? color : "#ffefd6",
          i % 2 ? 1 : 2,
        );
      }
  } else if (e.type === "swing") {
    // The bright edge is the weapon sweep; the thin edge marks its true reach.
    const a = e.angle || 0,
      r = e.r || 145;
    slash(
      c,
      e.x,
      e.y - 16,
      r * (0.42 + t * 0.28),
      a - 1.2 + 2.4 * t,
      0.4,
      color,
      6 * (1 - q) + 1,
    );
    if (e.circular) ring(c, e.x, e.y, r, color, 1);
    else slash(c, e.x, e.y, r, a, 1.45, color, 1);
    if (e.empowered)
      for (let i = 0; i < 7; i++) {
        const angle = (i * TAU) / 7;
        stroke(
          c,
          [
            [e.x + Math.cos(angle) * 15, e.y + Math.sin(angle) * 15],
            [
              e.x + Math.cos(angle) * r * t * 0.7,
              e.y + Math.sin(angle) * r * t * 0.7,
            ],
            [
              e.x + Math.cos(angle + 0.06) * r * t,
              e.y + Math.sin(angle + 0.06) * r * t,
            ],
          ],
          "#d7bc8b",
          1,
        );
      }
  }
  c.restore();
  return true;
}
