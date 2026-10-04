import { defineTable } from "../../shared/records.ts";
import type { Vec2 } from "../types.ts";
import type { ActiveUltimate } from "../types.ts";
import type { Enemy } from "../types.ts";
import type { Game } from "../Game.ts";
import { CLASS_NODES } from "../progression/class-talents.ts";
import { selectedUltimate } from "../data/specializations.ts";
import { summonCompanion, placeTotem } from "./archetypes.ts";
import { recoveredCooldown, recoverSkills } from "./skill-recovery.ts";

const TAU = Math.PI * 2;
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const projectile = defineTable({
  cinder: "ember",
  briar: "thorn",
  nyx: "knife",
  volta: "wisp",
  rook: "stone",
  lumen: "arrow",
  vesper: "hex",
  fen: "huntarrow",
  solace: "holy",
  orin: "spirit",
  kestrel: "spirit",
  morrow: "spirit",
});
const nodes = (g: Game, role: string, slot: number) =>
  g.talentState.procs[`${role}:${slot}`] || [];
export function refreshTalentCombat(g: Game) {
  if (!g.talentState) return;
  const procs: Game["talentState"]["procs"] = {};
  for (const [id, rank] of Object.entries(g.journey.talents)) {
    const node = CLASS_NODES[id];
    if (!rank || node?.hero !== g.hero.id || !node.proc) continue;
    const key = `${node.proc.role}:${node.proc.slot}`;
    (procs[key] ||= []).push({ node, rank });
  }
  g.talentState.procs = procs;
}
const nearby = (g: Game, p: Vec2, r: number, limit = 12) =>
  g.enemies
    .filter(
      (e) => e.hp > 0 && !e.killed && distance(e, p) < r * g.areaScale + e.r,
    )
    .sort((a, b) => distance(a, p) - distance(b, p))
    .slice(0, limit);
const shield = (g: Game, n: number) => {
  g.p.shield = Math.max(g.p.shield, Math.min(90, g.p.shield + n));
};
const heal = (g: Game, n: number) => {
  g.p.hp = Math.min(g.p.maxHp, g.p.hp + n);
};
function expose(g: Game, e: Enemy, amount: number, seconds: number) {
  if (e.reaper) return;
  e.talentExpose = Math.max(
    e.talentExposeUntil > g.time ? e.talentExpose || 0 : 0,
    amount,
  );
  e.talentExposeUntil = g.time + seconds;
}
function blast(
  g: Game,
  point: Vec2,
  radius: number,
  damage: number,
  limit = 12,
  ultimate = false,
  cold = false,
) {
  const targets = nearby(g, point, radius, limit);
  for (const e of targets) {
    if (cold && !e.reaper && !e.boss) e.stun = Math.max(e.stun || 0, 0.7);
    g.hit(e, damage, 14, "talent", ultimate ? "talent_ultimate" : "talents");
  }
  g.effect("discharge", point.x, point.y, {
    hero: g.hero.id,
    tier: ultimate ? 2 : 0,
    r: radius * g.areaScale,
    color: g.hero.color,
    duration: ultimate ? 0.85 : 0.45,
  });
  return targets.length;
}
function volley(
  g: Game,
  count: number,
  damage: number,
  type: string,
  channel: string = "talents",
) {
  for (let i = 0; i < Math.min(18, count); i++)
    g.projectile(g.p.x, g.p.y, (i * TAU) / count, damage, type, {
      source: "talent",
      channel,
      pierce: 4,
      life: 2.1,
      charged: true,
    });
}
export function initTalentCombat(g: Game) {
  g.talentState = {
    hits: {},
    gates: {},
    fields: [],
    cooldown: 0,
    ultimate: null,
    procs: {},
  };
  refreshTalentCombat(g);
}
export function talentHit(
  g: Game,
  e: Enemy,
  damage: number,
  crit: boolean,
  channel: string,
) {
  if (
    g.state !== "playing" ||
    !g.talentState ||
    !["signature", "companions", "totems"].includes(channel)
  )
    return;
  const s = g.talentState;
  for (const { node, rank } of nodes(g, "offense", 0)) {
    s.hits[node.id] = (s.hits[node.id] || 0) + 1;
    if (s.hits[node.id] >= 5 && g.time >= (s.gates[node.id] || 0)) {
      s.hits[node.id] = 0;
      s.gates[node.id] = g.time + 0.7;
      for (const other of nearby(g, e, 100, 5)
        .filter((o) => o !== e)
        .slice(0, 4))
        g.hit(other, damage * 0.45 * rank, 6, "talent", "talents");
      g.effect("ring", e.x, e.y, {
        r: 100,
        color: g.hero.color,
        duration: 0.4,
      });
    }
  }
  for (const { node, rank } of nodes(g, "skill", 0))
    if (g.time >= (s.gates[node.id] || 0)) {
      s.gates[node.id] = g.time + 0.6;
      recoverSkills(g, 0.15 * rank);
    }
  if (crit)
    for (const { node, rank } of nodes(g, "crit", 0))
      if (g.time >= (s.gates[node.id] || 0)) {
        s.gates[node.id] = g.time + 0.4;
        const other = nearby(g, e, 210, 2).find((o) => o !== e);
        if (other) {
          g.effect("arc", e.x, e.y, {
            tx: other.x,
            ty: other.y,
            color: g.hero.color,
          });
          g.hit(other, damage * 0.4 * rank, 0, "talent", "talents");
        }
      }
}
export function talentDash(g: Game) {
  if (g.state !== "playing") return;
  for (const { rank } of nodes(g, "guard", 0)) {
    shield(g, 6 * rank);
    blast(g, g.p, 135, 8 * rank, 8, false, true);
  }
  for (const { rank } of nodes(g, "speed", 0))
    volley(
      g,
      6 + 2 * rank,
      (16 + rank * 5) * g.weaponPower("signature"),
      "knife",
    );
}
export function talentHurt(g: Game, reaper = false) {
  if (
    g.state !== "playing" ||
    reaper ||
    !g.talentState ||
    g.p.hp <= 0 ||
    g.p.hp > g.p.maxHp * 0.6
  )
    return;
  for (const { node, rank } of nodes(g, "guard", 1))
    if (g.time >= (g.talentState.gates[node.id] || 0)) {
      g.talentState.gates[node.id] = g.time + recoveredCooldown(g, 10, 5);
      shield(g, 8 * rank);
      blast(g, g.p, 180, (30 + 15 * rank) * g.skillPower, 8);
    }
}
export function talentSkill(g: Game) {
  if (g.state !== "playing") return;
  const s = g.talentState;
  for (const { rank } of nodes(g, "offense", 1))
    volley(
      g,
      8 + 2 * rank,
      (22 + 8 * rank) * g.skillPower * g.weaponPower("signature"),
      projectile[g.hero.id],
    );
  for (const role of ["skill", "speed"])
    for (const { node, rank } of nodes(g, role, 1)) {
      if (role === "speed") g.p.dashCd = Math.max(0, g.p.dashCd - 2 * rank);
      s.fields = s.fields.filter((f) => f.id !== node.id);
      s.fields.push({
        id: node.id,
        x: g.p.x,
        y: g.p.y,
        life: 3 + rank,
        tick: 0,
        rank,
      });
    }
  for (const { rank } of nodes(g, "crit", 1)) {
    const target = nearby(g, g.p, 600, 30)
      .filter((e) => !e.reaper)
      .sort((a, b) => b.maxHp - a.maxHp)[0];
    if (target) {
      expose(g, target, 0.15 * rank, 5);
      g.effect("ring", target.x, target.y, {
        r: target.r + 20,
        color: "#f4de91",
        duration: 0.7,
      });
    }
  }
  const u = selectedUltimate(g.hero.id, g.journey);
  if (!u || s.cooldown > 0) return;
  s.cooldown = recoveredCooldown(g, u.cooldown, 20);
  const active: ActiveUltimate = {
    ...u,
    life: u.seconds,
    tick: u.interval,
    power: (95 + g.rank("signature") * 9) * g.skillPower,
    points: [],
  };
  s.ultimate = active;
  if (u.heal) heal(g, g.p.maxHp * u.heal);
  if (u.shield) shield(g, u.shield);
  if (u.dash) g.p.dashCd = 0;
  if (u.resource) g.p.trait = 1;
  if (g.hero.id === "fen" && u.kind === "hunt")
    g.classState.command = Math.max(g.classState.command, u.seconds);
  if (u.kind === "garden")
    for (let i = 0; i < 6; i++)
      g.plant(
        g.p.x + Math.cos((i * TAU) / 6) * 100,
        g.p.y + Math.sin((i * TAU) / 6) * 100,
      );
  if (u.kind === "garden")
    active.garden = g.plants.map((p, i) => ({
      plant: p,
      angle: i * 2.4,
      radius: 65 + (i % 3) * 40,
    }));
  if (u.kind === "retinue") {
    for (let i = 0; i < u.count!; i++) {
      const pet = summonCompanion(g, u.pet!, u.seconds);
      if (pet) {
        pet.ultimate = true;
        pet.attack = 0;
      }
    }
    if (g.hero.id === "vesper")
      g.classState.pact = Math.max(g.classState.pact, u.seconds);
    if (g.hero.id === "fen")
      g.classState.command = Math.max(g.classState.command, u.seconds);
  }
  if (u.kind === "council") {
    for (const kind of ["fire", "storm", "tide"]) placeTotem(g, kind);
  }
  if (["eruption", "thorns"].includes(u.kind)) {
    const n = u.kind === "thorns" ? 5 : 3;
    const aim = Math.atan2(g.p.dy, g.p.dx);
    for (let i = 0; i < n; i++) {
      const a = u.kind === "thorns" ? (i * TAU) / n : aim;
      const d = u.kind === "thorns" ? 170 : 100 + 150 * i;
      active.points.push({
        x: g.p.x + Math.cos(a) * d,
        y: g.p.y + Math.sin(a) * d,
      });
    }
  }
  pulseUltimate(g, active);
  g.effect("skillburst", g.p.x, g.p.y, {
    hero: g.hero.id,
    tier: 3,
    motif: u.kind,
    r: 360,
    color: g.hero.color,
    duration: 2.1,
  });
  g.event(`ULTIMATE · ${u.name.toUpperCase()}`, 2);
  g.events.push({ type: "ultimate", hero: g.hero.id, tier: 3 });
}
function pulseUltimate(g: Game, u: ActiveUltimate) {
  const power = u.power * u.damage;
  if (u.kind === "barrage")
    volley(
      g,
      14,
      power * g.weaponPower("signature"),
      u.projectile!,
      "talent_ultimate",
    );
  else if (
    u.kind === "hunt" ||
    u.kind === "storm" ||
    (u.kind === "council" && u.element === "arc")
  ) {
    for (const e of nearby(g, g.p, u.radius, u.kind === "hunt" ? 8 : 12)) {
      if (u.mark && !e.reaper) {
        expose(g, e, u.mark, 3);
        if (g.hero.id === "fen") e.markUntil = g.time + 5;
      }
      g.effect("arc", g.p.x, g.p.y, {
        tx: e.x,
        ty: e.y,
        style: u.kind === "hunt" ? "lance" : "lightning",
        color: g.hero.color,
        duration: 0.3,
      });
      g.hit(e, power, 0, "talent", "talent_ultimate");
    }
  } else {
    const points = u.points.length ? u.points : [g.p];
    let landed = 0;
    for (const p of points) {
      if (u.dot)
        for (const e of nearby(g, p, u.radius, 24))
          if (!e.reaper) {
            e.dotTime = Math.max(e.dotTime || 0, 3);
            e.dot = Math.max(e.dot || 0, power * 0.2);
            if (g.hero.id === "vesper" || g.hero.id === "morrow") {
              e.hexTime = Math.max(e.hexTime || 0, 4);
              e.hexDamage = Math.max(e.hexDamage || 0, power * 0.12);
            }
          }
      landed += blast(g, p, u.radius, power, 24, true, u.cold);
    }
    if (u.mend && landed) heal(g, u.mend);
  }
}
export function updateTalentCombat(g: Game, dt: number) {
  if (g.state !== "playing") return;
  const s = g.talentState;
  s.cooldown = Math.max(0, s.cooldown - dt);
  for (const f of s.fields) {
    f.life -= dt;
    f.tick -= dt;
    if (!g.journey.talents[f.id]) f.life = 0;
    if (f.life > 0 && f.tick <= 0) {
      f.tick = 0.75;
      for (const e of nearby(g, f, 155, 12))
        if (!e.reaper && !e.boss) e.slow = Math.max(e.slow || 0, 1);
      blast(g, f, 155, (14 + f.rank * 5) * g.skillPower, 12);
    }
  }
  s.fields = s.fields.filter((f) => f.life > 0);
  const u = s.ultimate;
  if (!u) return;
  u.life -= dt;
  u.tick -= dt;
  if (u.life <= 0 || !g.journey.talents[u.id]) {
    s.ultimate = null;
    return;
  }
  if (u.resource) g.p.trait = 1;
  for (const { plant, angle, radius } of u.garden || []) {
    plant.x = g.p.x + Math.cos(angle + g.time * 0.2) * radius;
    plant.y = g.p.y + Math.sin(angle + g.time * 0.2) * radius;
  }
  if (u.kind === "council")
    for (const [i, totem] of g.totems.entries()) {
      const angle = (i * TAU) / 3;
      totem.x = g.p.x + Math.cos(angle + g.time * 0.3) * 90;
      totem.y = g.p.y + Math.sin(angle + g.time * 0.3) * 90;
      totem.life = Math.max(totem.life, u.life);
    }
  if (u.kind === "vortex")
    for (const e of nearby(g, g.p, u.radius, 36))
      if (!e.boss && !e.reaper) {
        const d = Math.max(1, distance(e, g.p)),
          step = Math.min(d, 150 * dt);
        e.x += ((g.p.x - e.x) / d) * step;
        e.y += ((g.p.y - e.y) / d) * step;
      }
  if (u.tick <= 0) {
    u.tick = u.interval;
    pulseUltimate(g, u);
  }
}
