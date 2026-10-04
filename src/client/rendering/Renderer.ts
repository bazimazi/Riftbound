import { defineTable } from "../../shared/records.ts";
import type { CombatEffect } from "../../game/types.ts";
import type { Enemy } from "../../game/types.ts";
import type { Game } from "../../game/Game.ts";
import type { Companion } from "../../game/types.ts";
import { drawBeacon } from "./atmosphere.ts";
import { TAU, clamp } from "../../game/index.ts";
import { BIOMES } from "../../game/progression/progression.ts";
import { art, drawSprite, drawActionSprite } from "./pixel-art.ts";
import { actionFrame } from "../../game/combat/combat-motion.ts";
import { drawCharge, drawProjectile, drawCombatEffect } from "./combat-vfx.ts";
import { FINDS } from "../../game/world/realms.ts";
import { CATALYSTS } from "../../game/progression/journey.ts";
import { CLASS_FORMS } from "../../game/combat/class-forms.ts";
import {
  drawAbilityCrown,
  drawAbilityFields,
  drawSpellFields,
} from "./ability-vfx.ts";
export { drawPortrait } from "./pixel-art.ts";
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function circle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  fill = false,
  width = 1,
) {
  c.beginPath();
  c.arc(Math.round(x), Math.round(y), Math.max(1, r), 0, TAU);
  c.lineWidth = width;
  c.strokeStyle = color;
  c.fillStyle = color;
  fill ? c.fill() : c.stroke();
}
function line(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  tx: number,
  ty: number,
  color: string,
  width = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(tx, ty);
  c.stroke();
}
export class Renderer {
  declare canvas: HTMLCanvasElement;
  declare c: CanvasRenderingContext2D;
  declare w: number;
  declare h: number;
  declare pixel: number;
  declare motion: boolean;
  declare numbers: boolean;
  companion(c: CanvasRenderingContext2D, pet: Companion, g: Game) {
    if (pet.hp <= 0) {
      circle(c, pet.x, pet.y, 13, "#86b79c55", false, 1);
      return;
    }
    circle(
      c,
      pet.x,
      pet.y + 7,
      pet.kind === "guardian" ? 17 : 11,
      "#050d1280",
      true,
    );
    const heights = defineTable({
      imp: 35,
      guardian: 62,
      wolf: 44,
      elemental: 56,
      crane: 49,
      ghoul: 42,
    });
    const frame =
      pet.pose > 0
        ? 2
        : this.motion && pet.moving
          ? Math.floor(g.time * 9) % 2
          : 0;
    const height = heights[pet.kind] * (pet.ultimate ? 1.2 : 1),
      dy = pet.y - g.p.y;
    // Fade foreground companions where their bodies cover the hero. Keep depth
    // ordering and health bars intact, even with a full evolved demon retinue.
    const overlap =
      dy > 0
        ? Math.min(
            clamp((height * 0.65 + 25 - Math.abs(pet.x - g.p.x)) / 35, 0, 1),
            clamp((height / 0.85 + 5 - dy) / 30, 0, 1),
          )
        : 0;
    if (pet.ultimate)
      circle(c, pet.x, pet.y + 8, 23, g.hero.color + "99", false, 2);
    drawSprite(c, "pet-" + pet.kind, pet.x, pet.y + 12, height, {
      frame,
      alpha: 1 - overlap * 0.78,
      flip: pet.facing,
      bob: this.motion && pet.moving ? Math.sin(g.time * 12) : 0,
    });
    const y = pet.y + 15;
    c.fillStyle = "#0b191e";
    c.fillRect(pet.x - 13, y, 26, 4);
    c.fillStyle = "#a7d79c";
    c.fillRect(pet.x - 12, y + 1, (24 * pet.hp) / pet.maxHp, 2);
  }
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.c = canvas.getContext("2d", { alpha: false })!;
    this.resize();
  }
  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.pixel = 1 / Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.ceil(this.w / this.pixel);
    this.canvas.height = Math.ceil(this.h / this.pixel);
    this.c.imageSmoothingEnabled = true;
  }
  draw(g: Game) {
    const c = this.c,
      w = this.canvas.width,
      h = this.canvas.height,
      p = g.p,
      biome = BIOMES[g.biome || 0];
    this.motion = g.save.visuals?.motion !== false;
    this.numbers = g.save.visuals?.numbers !== false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    c.fillStyle = biome.ground;
    c.fillRect(0, 0, w, h);
    const scale =
        clamp(Math.min(this.w / 1050, this.h / 720), 0.72, 1.2) / this.pixel,
      cx = w / 2,
      cy = h / 2;
    c.save();
    c.translate(
      Math.round(
        cx + (this.motion ? Math.sin(g.time * 68) * g.shake * 0.36 : 0),
      ),
      Math.round(
        cy + (this.motion ? Math.cos(g.time * 54) * g.shake * 0.3 : 0),
      ),
    );
    c.scale(scale, scale);
    c.translate(-Math.round(p.x), -Math.round(p.y));
    const vw = w / scale,
      vh = h / scale,
      l = p.x - vw / 2,
      t = p.y - vh / 2;
    // The stone perimeter is visible and tangible, including during dashes.
    const m = g.realm,
      edges = [
        [-m.width / 2, -m.height / 2, 40, m.height],
        [m.width / 2 - 40, -m.height / 2, 40, m.height],
        [-m.width / 2, -m.height / 2, m.width, 40],
        [-m.width / 2, m.height / 2 - 40, m.width, 40],
      ];
    if (art.ground) {
      c.globalAlpha = 0.22;
      for (let x = Math.floor(l / 512); x <= (l + vw) / 512; x++)
        for (let y = Math.floor(t / 512); y <= (t + vh) / 512; y++)
          c.drawImage(art.ground, x * 512, y * 512, 512, 512);
      c.globalAlpha = 1;
    }
    // A quiet ancient road gives the landscape direction without obscuring combat.
    c.fillStyle = "#080e0b";
    if (l < -m.width / 2) c.fillRect(l, t, -m.width / 2 - l, vh);
    if (l + vw > m.width / 2)
      c.fillRect(m.width / 2, t, l + vw - m.width / 2, vh);
    if (t < -m.height / 2) c.fillRect(l, t, vw, -m.height / 2 - t);
    if (t + vh > m.height / 2)
      c.fillRect(l, m.height / 2, vw, t + vh - m.height / 2);
    c.fillStyle = g.realm.color + "08";
    c.fillRect(-g.realm.width / 2, -42, g.realm.width, 84);
    c.fillRect(-42, -g.realm.height / 2, 84, g.realm.height);
    for (const [x, y, ew, eh] of edges) {
      c.fillStyle = "#0b1212";
      c.fillRect(x, y, ew, eh);
      c.strokeStyle = "#8a7c57";
      c.lineWidth = 3;
      c.strokeRect(x + 4, y + 4, ew - 8, eh - 8);
      c.fillStyle = "#4b5044";
      if (ew === 40)
        for (
          let y2 = Math.max(y, Math.floor(t / 50) * 50);
          y2 < Math.min(y + eh, t + vh + 60);
          y2 += 50
        )
          c.fillRect(x + 8, y2 + 6, 24, 35);
      else
        for (
          let x2 = Math.max(x, Math.floor(l / 50) * 50);
          x2 < Math.min(x + ew, l + vw + 60);
          x2 += 50
        )
          c.fillRect(x2 + 6, y + 8, 35, 24);
    }
    for (let x = Math.floor(l / 240) - 1; x <= (l + vw) / 240 + 1; x++)
      for (let y = Math.floor(t / 240) - 1; y <= (t + vh) / 240 + 1; y++) {
        const seed = x * 31 + y * 791,
          ox = x * 240 + hash(seed) * 130,
          oy = y * 240 + hash(seed + 8) * 130,
          ids =
            g.biome === 1
              ? ["deadTree", "rocks", "grave", "brazier", "ruin"]
              : g.biome === 2
                ? ["crystal", "ruin", "obelisk", "mushrooms", "deadTree"]
                : ["tree", "rocks", "mushrooms", "grave", "ruin", "arch"];
        if (
          Math.abs(ox) > m.width / 2 - 100 ||
          Math.abs(oy) > m.height / 2 - 100
        )
          continue;
        const id = ids[Math.floor(hash(seed + 4) * ids.length)],
          height = {
            tree: 150,
            arch: 100,
            deadTree: 145,
            obelisk: 115,
            rocks: 50,
            mushrooms: 45,
            grave: 75,
            ruin: 85,
            crystal: 85,
            brazier: 62,
          }[id]!;
        drawSprite(c, id, ox, oy, height, {
          alpha: Math.hypot(ox - p.x, oy - p.y) < 150 ? 0.12 : 0.38,
        });
      }
    circle(c, 0, 0, 124, "#7eaca526");
    circle(c, 0, 0, 134, "#7eaca526");
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      line(
        c,
        Math.cos(a) * 117,
        Math.sin(a) * 117,
        Math.cos(a) * 140,
        Math.sin(a) * 140,
        "#9dc4ac35",
        2,
      );
    }
    for (const item of g.catalysts || []) {
      if (
        Math.abs(item.x - p.x) > vw / 2 + 80 ||
        Math.abs(item.y - p.y) > vh / 2 + 90
      )
        continue;
      const color = CATALYSTS[item.kind].color,
        bob = this.motion ? Math.sin(g.time * 3 + item.x) * 4 : 0;
      circle(c, item.x, item.y, 32, color + "25", true);
      circle(c, item.x, item.y, 32, color + "aa", false, 2);
      c.fillStyle = "#28312a";
      c.fillRect(item.x - 17, item.y - 8, 34, 18);
      c.fillStyle = "#5e6753";
      c.fillRect(item.x - 13, item.y - 11, 26, 5);
      c.save();
      c.translate(item.x, item.y - 29 + bob);
      c.shadowColor = color;
      c.shadowBlur = this.motion ? 14 : 0;
      c.fillStyle = color;
      if (item.kind === "core") {
        c.beginPath();
        c.moveTo(0, -15);
        c.lineTo(12, -3);
        c.lineTo(0, 12);
        c.lineTo(-12, -3);
        c.fill();
      } else if (item.kind === "rune") {
        c.fillRect(-9, -14, 18, 26);
        c.fillStyle = "#292642";
        c.fillRect(-2, -10, 4, 18);
        c.fillRect(-6, -4, 12, 4);
      } else {
        for (let i = 0; i < 6; i++) {
          c.rotate(TAU / 6);
          c.fillRect(-3, -16, 6, 18);
        }
      }
      c.shadowBlur = 0;
      c.restore();
      circle(c, item.x, item.y + 13, 27, color + "88", false, 1);
      c.fillStyle = color;
      c.font = "10px monospace";
      c.textAlign = "center";
      c.fillText(`${Math.ceil(item.expires - g.time)}s`, item.x, item.y + 37);
    }
    for (const f of g.finds) {
      if (
        f.taken ||
        Math.abs(f.x - p.x) > vw / 2 + 110 ||
        Math.abs(f.y - p.y) > vh / 2 + 130
      )
        continue;
      const info = FINDS[f.kind],
        bob = this.motion ? Math.sin(g.time * 2) * 3 : 0;
      circle(c, f.x, f.y, 46, info.color + "16", true);
      circle(c, f.x, f.y, 40, info.color + "90", false, 2);
      drawSprite(c, info.art, f.x, f.y + 12, 85, {
        alpha: f.remembered ? 0.55 : 1,
      });
      c.save();
      c.translate(f.x, f.y - 80 + bob);
      c.fillStyle = "#10151c";
      c.fillRect(-12, -12, 24, 24);
      c.fillStyle = info.color;
      if (f.kind === "memory") {
        c.fillRect(-7, -7, 6, 14);
        c.fillRect(1, -7, 6, 14);
      } else if (f.kind === "seal") {
        c.beginPath();
        c.moveTo(0, -9);
        c.lineTo(8, 0);
        c.lineTo(0, 9);
        c.lineTo(-8, 0);
        c.fill();
      } else {
        c.fillRect(-2, -8, 4, 16);
        c.fillRect(-8, -2, 16, 4);
      }
      c.restore();
      if (Math.hypot(f.x - p.x, f.y - p.y) < 170)
        this.worldLabel(c, f.x, f.y - 109, info.name.toUpperCase(), info.color);
    }
    drawBeacon(c, g);
    for (const s of g.shrines) {
      drawSprite(c, "altar", s.x, s.y + 15, 92, { alpha: s.used ? 0.32 : 1 });
      if (!s.used) {
        circle(c, s.x, s.y, 43 + Math.sin(g.time * 2) * 3, "#b99add55");
        this.worldLabel(c, s.x, s.y - 87, "ALTAR", "#bcabdb");
      }
    }
    for (const z of g.hazards) {
      const warning = z.warn > 0;
      circle(c, z.x, z.y, z.r, warning ? "#ecad7644" : "#d4746050", true);
      circle(c, z.x, z.y, z.r, warning ? "#ecad76" : "#cc7968", false, 2);
      if (warning) {
        circle(c, z.x, z.y, z.r * (1 - z.warn / 1.45), "#f2c28f");
        this.worldLabel(c, z.x, z.y + 4, "!", "#ffdeaf");
      } else
        for (let i = 0; i < 9; i++) {
          const a = (i * TAU) / 9 + g.time * 2;
          c.fillStyle = "#e4a174";
          c.fillRect(
            z.x + Math.cos(a) * z.r * 0.6,
            z.y + Math.sin(a) * z.r * 0.6,
            3,
            3,
          );
        }
    }
    c.save();
    c.globalAlpha = 0.5;
    for (const z of g.zones.slice(-12)) {
      circle(
        c,
        z.x,
        z.y,
        z.r,
        z.kind === "fire"
          ? "#e8895310"
          : z.kind === "garden"
            ? "#98c98418"
            : "#a08ad918",
        true,
      );
      circle(c, z.x, z.y, z.r * 0.7, "#c0a5d866");
    }
    c.restore();
    for (const drop of g.pickups) {
      if (
        Math.abs(drop.x - p.x) > vw / 2 + 40 ||
        Math.abs(drop.y - p.y) > vh / 2 + 40
      )
        continue;
      const y = drop.y + Math.sin(g.time * 3 + (drop.phase || 0)) * 2;
      if (drop.kind === "xp") {
        const r = drop.value >= 5 ? 5 : 3;
        c.fillStyle = drop.value >= 5 ? "#eed092" : "#8dc7b5";
        c.beginPath();
        c.moveTo(drop.x, y - r);
        c.lineTo(drop.x + r, y);
        c.lineTo(drop.x, y + r);
        c.lineTo(drop.x - r, y);
        c.closePath();
        c.fill();
        c.fillStyle = "#e4f1d0";
        c.fillRect(drop.x - 1, y - r, 2, 2);
      } else if (drop.kind === "seal") {
        circle(c, drop.x, y, 17, "#f8db7c50", true);
        c.fillStyle = "#ffdf8b";
        c.beginPath();
        c.moveTo(drop.x, y - 9);
        c.lineTo(drop.x + 7, y);
        c.lineTo(drop.x, y + 9);
        c.lineTo(drop.x - 7, y);
        c.fill();
      } else if (drop.kind === "cache") {
        drawSprite(c, "cache", drop.x, drop.y + 8, 33);
        circle(c, drop.x, drop.y, 24 + Math.sin(g.time * 3) * 3, "#d5b36d70");
      } else {
        circle(c, drop.x, y, 10, "#a3c88620", true);
        c.fillStyle = "#c6dca1";
        c.fillRect(drop.x - 2, y - 6, 4, 12);
        c.fillRect(drop.x - 6, y - 2, 12, 4);
      }
    }
    for (const plant of g.plants) {
      c.globalAlpha = Math.min(1, plant.life / 2);
      const recoil = this.motion ? (plant.recoil || 0) / 0.16 : 0;
      drawSprite(
        c,
        "mushrooms",
        plant.x - Math.cos(plant.aim || 0) * recoil * 3,
        plant.y + 5,
        27,
        {
          tilt: recoil * 0.08,
          stretch: 1 - recoil * 0.06,
        },
      );
      circle(c, plant.x, plant.y - 13, 4 + recoil * 2, "#dae9a6", true);
      c.globalAlpha = 1;
    }
    for (const s of g.shadows)
      drawSprite(c, "nyx", s.x, s.y + 13, 57, {
        alpha: 0.42,
        bob: Math.sin(g.time * 5) * 2,
      });
    for (const t of g.totems || []) {
      const tint =
        t.kind === "fire"
          ? "#efb27c"
          : t.kind === "tide"
            ? "#89d8af"
            : "#82cef3";
      circle(c, t.x, t.y, t.r, tint + "08", true);
      circle(c, t.x, t.y, t.r, tint + "35", false, 1);
      drawSprite(c, "obelisk", t.x, t.y + 8, 43, {
        alpha: Math.min(1, t.life / 2),
      });
      circle(c, t.x, t.y - 22, 5, tint, true);
      c.fillStyle = "#16251e";
      c.fillRect(t.x - 15, t.y + 12, 30, 3);
      c.fillStyle = tint;
      c.fillRect(t.x - 15, t.y + 12, Math.min(30, (t.life / 20) * 30), 3);
    }
    drawAbilityFields(c, g, this.motion);
    drawSpellFields(c, g, this.motion);
    for (const e of g.effects)
      if (
        [
          "ring",
          "flame",
          "sanctuary",
          "trail",
          "warning",
          "afterimage",
          "fallen",
          "sun",
          "skillburst",
          "discharge",
          "swing",
        ].includes(e.type)
      )
        this.effect(c, e);
    const visible = [
      ...g.enemies,
      ...(g.companions || []).map((pet) => ({ ...pet, companion: true })),
    ]
      .filter(
        (e) =>
          Math.abs(e.x - p.x) < vw / 2 + 90 &&
          Math.abs(e.y - p.y) < vh / 2 + 110,
      )
      .sort((a, b) => a.y - b.y);
    let player = false;
    for (const e of visible) {
      if (!player && e.y > p.y) {
        this.player(c, g);
        player = true;
      }
      if ("companion" in e) this.companion(c, e, g);
      else this.enemy(c, e, this.motion ? g.time : 0);
    }
    if (!player) this.player(c, g);
    for (const orb of g.orbitPositions()) {
      c.save();
      c.translate(orb.x, orb.y);
      c.rotate(orb.a + Math.PI / 2);
      c.fillStyle = orb.type === "thorn" ? "#bad79b" : "#e0d3bb";
      c.beginPath();
      c.moveTo(0, -13);
      c.lineTo(5, 6);
      c.lineTo(0, 2);
      c.lineTo(-4, 6);
      c.fill();
      c.restore();
    }
    if (g.rank("familiar")) {
      const x = p.x + Math.cos(g.time * 2) * 48,
        y = p.y - 30 + Math.sin(g.time * 2) * 20;
      circle(c, x, y, 12, "#eee1ad16", true);
      circle(c, x, y, 5, "#ead7a2", true);
    }
    for (const b of g.bullets) drawProjectile(c, b, this.motion);
    for (const e of g.effects) drawAbilityCrown(c, e, this.motion);
    for (const b of g.hostile) {
      circle(c, b.x, b.y, 9, "#1b111c", true);
      circle(c, b.x, b.y, 7, "#ff6e70", false, 2);
      circle(c, b.x, b.y, 4, "#ff9994", true);
      c.fillStyle = "#fff0bc";
      c.fillRect(b.x - 1, b.y - 2, 2, 2);
    }
    for (const e of g.effects)
      if (
        ![
          "ring",
          "flame",
          "sanctuary",
          "trail",
          "warning",
          "afterimage",
          "fallen",
          "sun",
          "skillburst",
          "discharge",
          "swing",
        ].includes(e.type)
      )
        this.effect(c, e);
    for (let i = 0; i < 30; i++) {
      const x = l + ((i * 193.7 + g.time * 6) % vw),
        y = t + ((i * 131.3 + Math.sin(g.time + i) * 12) % vh);
      c.fillStyle = i % 5 ? "#8eb7a333" : biome.accent + "99";
      c.fillRect(x, y, 2, 2);
    }
    c.restore();
    const vignette = c.createRadialGradient(
      cx,
      cy,
      Math.min(w, h) * 0.22,
      cx,
      cy,
      Math.max(w, h) * 0.66,
    );
    vignette.addColorStop(0, "#06101900");
    vignette.addColorStop(1, "#06101965");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
    if (p.hp / p.maxHp < 0.3) {
      c.strokeStyle = `rgba(184,71,62,${0.2 + Math.sin(g.time * 4) * 0.07})`;
      c.lineWidth = 8;
      c.strokeRect(0, 0, w, h);
    }
    for (const d of [
      ...g.pickups.filter((d) => d.kind === "cache"),
      ...g.shrines.filter((s) => !s.used),
      ...(g.vault ? [{ ...g.vault, kind: "vault" }] : []),
      ...(g.waypoint ? [{ ...g.waypoint, kind: "waypoint" }] : []),
    ]) {
      const dx = (d.x - p.x) * scale,
        dy = (d.y - p.y) * scale;
      if (Math.abs(dx) > w * 0.4 || Math.abs(dy) > h * 0.34) {
        const a = Math.atan2(dy, dx),
          r = Math.min(
            (w * 0.4) / Math.max(0.01, Math.abs(Math.cos(a))),
            (h * 0.34) / Math.max(0.01, Math.abs(Math.sin(a))),
          );
        c.save();
        c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        c.rotate(a);
        c.fillStyle =
          d.kind === "waypoint"
            ? "#ffdf8e"
            : d.kind === "cache"
              ? "#e4c281"
              : d.kind === "vault"
                ? "#9ce7dd"
                : "#bba6df";
        c.beginPath();
        c.moveTo(d.kind === "waypoint" ? 10 : 5, 0);
        c.lineTo(-3, -3);
        c.lineTo(-1, 0);
        c.lineTo(-3, 3);
        c.fill();
        c.restore();
      }
    }
  }
  player(c: CanvasRenderingContext2D, g: Game) {
    const p = g.p;
    if (g.journey.stage) {
      const stage = g.journey.stage,
        color = CLASS_FORMS[g.hero.id].palette[stage - 1];
      circle(c, p.x, p.y + 6, 29 + stage * 3, color + "60", false, 1.5);
      for (let i = 0; i < 4 + stage * 2; i++) {
        const a =
          (i * TAU) / (4 + stage * 2) + (this.motion ? g.time * 0.4 : 0);
        const x = p.x + Math.cos(a) * (30 + stage * 3),
          y = p.y + 6 + Math.sin(a) * (17 + stage * 2);
        c.fillStyle = color + "aa";
        c.fillRect(x - 2, y - 2, 4, 4);
      }
      if (g.formState.surge > 0)
        circle(c, p.x, p.y + 6, 39, color + "aa", false, 2);
    }
    if (p.shield > 0) circle(c, p.x, p.y - 8, 29, "#a1d6dc80", false, 2);
    c.fillStyle = "#060e1688";
    c.beginPath();
    c.ellipse(p.x, p.y + 12, 19, 6, 0, 0, TAU);
    c.fill();
    circle(c, p.x, p.y + 5, 19, "#06121bdd", true);
    circle(c, p.x, p.y + 5, 19, "#c9f7e8", false, 2);
    circle(c, p.x, p.y + 5, 24, g.hero.color + "60", false, 1);
    const blink =
      p.invuln > 0.05 && p.invuln < 4 && Math.floor(g.time * 16) % 2;
    const action = this.motion ? p.action : null,
      flip = action ? Math.cos(action.angle) < 0 : (p.facing ?? p.dx) < -0.1;
    drawCharge(c, g, this.motion);
    const drawn =
      action &&
      drawActionSprite(
        c,
        g.hero.id,
        p.x,
        p.y + 17,
        82,
        action.kind,
        actionFrame(action),
        {
          flip,
          alpha: blink ? 0.55 : 1,
          stage: g.journey.stage,
        },
      );
    if (!drawn)
      drawSprite(c, g.hero.id, p.x, p.y + 17, 82, {
        stage: g.journey.stage,
        frame:
          this.motion && g.moving
            ? Math.floor((p.walkDistance || 0) / 16) % 6
            : 0,
        tilt: this.motion ? (g.p.dashTime > 0 ? -0.14 : 0) : 0,
        alpha: blink ? 0.55 : 1,
        flip,
        bob: !this.motion
          ? 0
          : g.moving
            ? Math.sin((((p.walkDistance || 0) / 16) * Math.PI) / 3) * 0.8
            : Math.sin(g.time * 2) * 0.6,
      });
    if (g.evolved()) circle(c, p.x, p.y + 10, 24, g.hero.color + "60");
  }
  enemy(c: CanvasRenderingContext2D, e: Enemy, time: number) {
    const size = e.reaper
      ? 112
      : e.boss
        ? 130
        : e.type === "brute"
          ? 76
          : e.type === "moth"
            ? 53
            : e.type === "runner"
              ? 44
              : 51;
    c.fillStyle = "#07121a88";
    c.beginPath();
    c.ellipse(e.x, e.y + e.r * 0.6, e.r, 5, 0, 0, TAU);
    c.fill();
    circle(
      c,
      e.x,
      e.y + 5,
      e.r + 2,
      e.reaper
        ? "#ff3f76dd"
        : e.boss
          ? "#ff626daa"
          : e.elite
            ? "#f4b86faa"
            : "#ef7f7350",
      false,
      e.boss ? 3 : 1.5,
    );
    const kick = this.motion
      ? ((e.impact || 0) / 0.16) * (e.impactStrength || 0) * (e.boss ? 0.3 : 1)
      : 0;
    drawSprite(
      c,
      e.reaper
        ? "revenant"
        : e.type === "boss_revenant"
          ? "revenant"
          : e.type === "boss_oracle"
            ? "shaman"
            : e.boss
              ? "boss"
              : e.type,
      e.x + Math.cos(e.hitAngle || 0) * kick,
      e.y + e.r * 0.7 + Math.sin(e.hitAngle || 0) * kick,
      size * (e.elite ? 1.12 : 1),
      {
        flash: Math.min(0.65, (e.flash || 0) * 5),
        flip: !!e.facing,
        tilt: !this.motion
          ? 0
          : e.windup! > 0
            ? -0.1
            : Math.sin(time * 5 + e.phase) * 0.02 + kick * 0.008,
        stretch: !this.motion
          ? 1
          : e.windup! > 0
            ? 0.92
            : 1 +
              Math.sin(time * (e.type === "moth" ? 14 : 6) + e.phase) * 0.025,
        bob: Math.round(
          Math.sin(time * (e.type === "moth" ? 10 : 6) + e.phase) * 2,
        ),
      },
    );
    if (e.reaper) {
      const sway = this.motion ? Math.sin(time * 3 + e.phase) * 4 : 0;
      // A huge silver scythe and crimson seal make Death distinct from ordinary revenants.
      line(c, e.x + 28, e.y + 15, e.x + 36, e.y - 92 + sway, "#1b1428", 7);
      line(c, e.x + 28, e.y + 15, e.x + 36, e.y - 92 + sway, "#d4c3d6", 3);
      c.strokeStyle = "#ffe0e7";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(e.x + 10, e.y - 90 + sway, 35, -1.6, 0.7);
      c.stroke();
      circle(c, e.x, e.y + 7, 42, "#c7376855", false, 3);
      c.fillStyle = "#ff6886";
      c.fillRect(e.x - 7, e.y - 65 + sway, 5, 3);
      c.fillRect(e.x + 3, e.y - 65 + sway, 5, 3);
      if (e.grace > 0) this.worldLabel(c, e.x, e.y - 135, "DEATH", "#ffa1b4");
    }
    if (e.elite) circle(c, e.x, e.y + 6, e.r + 7, "#d1ae6c99");
    if (e.stun > 0) circle(c, e.x, e.y - size * 0.75, 9, "#c7dba7");
    if (e.hp < e.maxHp && !e.boss) {
      c.fillStyle = "#121e24";
      c.fillRect(e.x - 14, e.y - size * 0.72, 28, 3);
      c.fillStyle = e.elite ? "#d7b270" : "#c39889";
      c.fillRect(
        e.x - 14,
        e.y - size * 0.72,
        28 * clamp(e.hp / e.maxHp, 0, 1),
        2,
      );
    }
  }
  worldLabel(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string,
  ) {
    c.font = "10px monospace";
    c.textAlign = "center";
    c.fillStyle = color;
    c.fillText(text, x, y);
  }
  effect(c: CanvasRenderingContext2D, e: CombatEffect) {
    if (drawCombatEffect(c, e, this.motion)) return;
    const q = 1 - e.life / e.maxLife,
      color = e.color || "#c2cda6";
    c.save();
    c.globalAlpha = clamp(1 - q, 0, 1);
    if (e.type === "afterimage") {
      if (this.motion)
        drawSprite(c, e.actor!, e.x, e.y + 17, e.r!, {
          frame: 0,
          flip: e.flip,
          alpha: 0.3 * (1 - q),
          tilt: -0.14,
        });
    } else if (e.type === "fallen") {
      drawSprite(c, e.actor!, e.x, e.y + 10, Math.min(80, (e.r || 15) * 3), {
        alpha: 0.24 * (1 - q),
        tilt: 0.5 + q * 0.25,
        stretch: 0.7,
      });
    } else if (e.type === "sun") {
      circle(c, e.x, e.y, e.r! * q, color, false, 3 * (1 - q));
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        line(
          c,
          e.x + Math.cos(a) * e.r! * q * 0.8,
          e.y + Math.sin(a) * e.r! * q * 0.8,
          e.x + Math.cos(a) * e.r! * q,
          e.y + Math.sin(a) * e.r! * q,
          color,
          2,
        );
      }
    } else if (e.type === "number") {
      if (!this.numbers) {
        c.restore();
        return;
      }
      c.font = "600 13px Outfit, sans-serif";
      c.strokeStyle = "#0a1425";
      c.lineWidth = 3;
      c.textAlign = "center";
      c.strokeText(e.text!, e.x, e.y - q * 28);
      c.textAlign = "center";
      c.fillStyle = color;
      c.fillText(e.text!, e.x, e.y - q * 28);
    } else if (e.type === "warning") {
      c.globalAlpha *= 0.22;
      line(c, e.x, e.y, e.tx!, e.ty!, color, e.r!);
    } else if (e.type === "trail") {
      circle(c, e.x, e.y, 12 * (1 - q), color, true);
    } else if (e.type === "meteor") {
      line(c, e.x - 70 * (1 - q), e.y - 180 * (1 - q), e.x, e.y, color, 7);
      circle(c, e.x, e.y, e.r! * q, color, false, 3);
      circle(c, e.x, e.y, 15 * (1 - q), "#fff2cc", true);
    } else if (
      ["ring", "flame", "sanctuary", "burst", "hurt", "heal"].includes(e.type)
    ) {
      circle(
        c,
        e.x,
        e.y,
        e.r! * (0.1 + q * 0.9),
        color,
        false,
        e.type === "flame" ? 6 : 2,
      );
      if (e.type === "flame" || e.type === "burst")
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12,
            r = e.r! * q;
          c.fillStyle = color;
          c.fillRect(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 4, 4);
        }
    } else
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7 + e.x,
          r = (e.r || 18) * q;
        c.fillStyle = color;
        c.fillRect(
          e.x + Math.cos(a) * r,
          e.y + Math.sin(a) * r,
          3 * (1 - q) + 1,
          3 * (1 - q) + 1,
        );
      }
    c.restore();
  }
}
