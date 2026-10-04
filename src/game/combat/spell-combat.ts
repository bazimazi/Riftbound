import { defineTable } from "../../shared/records.ts";
import type { Spell } from "../types.ts";
import type { Vec2 } from "../types.ts";
import type { Enemy } from "../types.ts";
import type { Game } from "../Game.ts";
import { SPELLS } from "../data/spell-data.ts";
import { sanitizeSpellLoadout } from "../progression/spell-progression.ts";
import { recoveredCooldown, recoverSkills } from "./skill-recovery.ts";
import { aimAt, startAction } from "./combat-motion.ts";
import { summonCompanion, placeTotem } from "./archetypes.ts";
import { constrain } from "../world/realms.ts";

const TAU = Math.PI * 2;
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const projectiles = defineTable({
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
  kestrel: "fist",
  morrow: "spirit",
});
const targets = (g: Game, p: Vec2, radius: number, limit = 36) =>
  g.enemies
    .filter((e) => e.hp > 0 && !e.killed && distance(e, p) < radius + e.r)
    .sort((a, b) => distance(a, p) - distance(b, p))
    .slice(0, limit);
const ward = (g: Game, amount: number) => {
  g.p.shield = Math.max(g.p.shield, Math.min(90, g.p.shield + amount));
};
export const spellRank = (g: Game, s: Spell) =>
  Math.min(3, g.journey.talents[s.masteryId] || 0);
export const spellCooldown = (g: Game, s: Spell) =>
  recoveredCooldown(g, s.cooldown, s.cooldown * 0.5);
export function initSpellCombat(g: Game) {
  sanitizeSpellLoadout(g.save, g.hero.id);
  // Snapshot at departure: swapping a book during combat cannot bypass recovery.
  g.spellSlotCount = g.journey.spellSlots;
  g.spellLoadout = [...g.journey.loadout];
  g.spellCooldowns = {};
  g.pendingSpell = null;
  g.spellState = {
    fields: [],
    guard: 0,
    guardLife: 0,
    rewardAt: {},
    move: null,
  };
}
export function castEquippedSpell(g: Game, slot: number) {
  const id = g.spellLoadout?.[slot],
    s = SPELLS[id];
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= g.spellSlotCount ||
    !s ||
    s.hero !== g.hero.id ||
    !g.journey.talents[id] ||
    g.state !== "playing" ||
    g.pendingSkill ||
    g.pendingForm ||
    g.pendingSpell ||
    g.spellState.move ||
    (g.spellCooldowns[id] || 0) > 0
  )
    return false;
  const windup = s.advanced ? 0.3 : 0.2;
  g.spellCooldowns[id] = spellCooldown(g, s);
  g.pendingSpell = { id, slot, remaining: windup };
  startAction(g, "skill", aimAt(g), false, windup);
  g.p.cast = 0.8;
  g.stats.skills++;
  g.events.push({ type: "charge" });
  return true;
}
function burst(g: Game, p: Vec2, radius: number, s: Spell, crown = false) {
  g.effect(crown ? "skillburst" : "discharge", p.x, p.y, {
    hero: g.hero.id,
    tier: s.advanced ? 3 : 2,
    motif: s.kind === "summon" ? "retinue" : s.kind,
    r: radius,
    color: g.hero.color,
    angle: g.p.action?.angle || 0,
    duration: crown ? 1.1 : 0.65,
  });
}
function reward(g: Game, s: Spell) {
  if (g.time < (g.spellState.rewardAt[s.id] || 0)) return;
  g.spellState.rewardAt[s.id] = g.time + 0.6;
  if (s.mend) g.p.hp = Math.min(g.p.maxHp, g.p.hp + g.p.maxHp * s.mend);
  if (s.shieldPulse) ward(g, s.shieldPulse);
  if (s.resource) g.p.trait = Math.min(1, g.p.trait + s.resource);
}
export function spellContact(g: Game, e: Enemy, id: string, damage: number) {
  const s = SPELLS[id];
  if (!s || s.hero !== g.hero.id || !g.journey.talents[id] || e.reaper) return;
  const rank = spellRank(g, s),
    markTime = (4 + rank * 0.5) * g.durationScale;
  const rootTime = (s.root || 0) + (s.kind === "trap" ? rank * 0.4 : 0);
  if (rootTime && !e.boss)
    e.stun = Math.max(e.stun || 0, rootTime * g.durationScale);
  const exposure =
    (s.expose || 0) +
    (["beam", "mark"].includes(s.kind)
      ? rank * 0.05
      : s.kind === "hunt"
        ? rank * 0.04
        : 0);
  if (exposure) {
    const amount = Math.min(0.4, exposure);
    e.talentExpose = Math.max(
      e.talentExposeUntil > g.time ? e.talentExpose || 0 : 0,
      amount,
    );
    e.talentExposeUntil = g.time + markTime;
  }
  if (g.hero.id === "fen") e.markUntil = g.time + markTime;
  if (s.dot) {
    e.spellDot = {
      life: 3 * g.durationScale,
      tick: 0.5,
      damage: Math.max(e.spellDot?.damage || 0, damage * 0.15),
      id,
    };
  }
  reward(g, s);
}
function strike(
  g: Game,
  e: Enemy,
  s: Spell,
  damage: number,
  knock: number = 8,
) {
  spellContact(g, e, s.id, damage);
  g.hit(
    e,
    damage *
      (s.execute && !e.boss && !e.reaper && e.hp / e.maxHp < 0.4 ? 2 : 1),
    knock,
    "spell",
    "spells",
  );
}
function blast(g: Game, p: Vec2, radius: number, damage: number, s: Spell) {
  const prey = targets(g, p, radius);
  for (const e of prey) strike(g, e, s, damage);
  if (s.chain)
    for (const e of prey.slice(0, 3)) {
      const next = targets(g, e, 180, 4).find((t) => !prey.includes(t));
      if (next) {
        g.effect("arc", e.x, e.y, {
          tx: next.x,
          ty: next.y,
          color: g.hero.color,
        });
        strike(g, next, s, damage * 0.5, 0);
      }
    }
  burst(g, p, radius, s);
  return prey;
}
function volley(
  g: Game,
  p: Vec2,
  s: Spell,
  count: number,
  power: number,
  angle: number,
  fan = false,
) {
  const rank = spellRank(g, s),
    total = Math.min(24, count);
  for (let i = 0; i < total; i++) {
    const a = fan
      ? angle + (i / Math.max(1, total - 1) - 0.5) * 1.3
      : angle + (i * TAU) / total;
    g.projectile(p.x, p.y, a, power, s.projectile || projectiles[g.hero.id], {
      source: "spell",
      channel: "spells",
      spellId: s.id,
      visualTier: s.advanced ? 3 : 2,
      charged: true,
      pierce: 2 + (fan ? rank : 0),
      life: 2,
      blast: s.hero === "vesper" && s.kind === "fan" ? 70 : 0,
    });
  }
}
function addField(
  g: Game,
  s: Spell,
  points: Vec2[],
  power: number,
  radius: number,
  extras = {},
) {
  const rank = spellRank(g, s),
    seconds =
      (s.seconds + (["field", "pull", "barrage"].includes(s.kind) ? rank : 0)) *
      g.durationScale;
  g.spellState.fields.push({
    id: s.id,
    kind: s.kind,
    element: s.element,
    points,
    radius,
    power,
    seconds,
    life: seconds,
    tick: 0.15,
    interval: seconds / (4 + rank),
    ...extras,
  });
  g.spellState.fields = g.spellState.fields.slice(-8);
}
function allies(g: Game, s: Spell, power: number) {
  const rank = spellRank(g, s),
    state = g.classState;
  if (s.pact) {
    state.pact = Math.max(state.pact, 8 * g.durationScale);
    state.pactPower = Math.sqrt(g.skillPower);
  }
  if (s.command) {
    state.command = Math.max(state.command, 8 * g.durationScale);
    state.commandPower = Math.sqrt(g.skillPower);
  }
  if (s.serenity)
    state.serenity = Math.max(state.serenity, 6 * g.durationScale);
  if (s.petHeal)
    for (const c of g.companions)
      if (c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * s.petHeal);
  if (s.pet)
    for (let i = 0; i < (s.kind === "summon" ? s.count : 1); i++) {
      const c = summonCompanion(
        g,
        s.pet,
        (s.seconds + rank * 2) * g.durationScale,
      );
      if (c) {
        c.spellId = s.id;
        c.spellPower = (1 + rank * 0.1) * Math.sqrt(g.skillPower);
        c.ultimate = s.advanced;
      }
    }
  if (s.totem || s.council)
    for (const kind of s.council ? ["fire", "storm", "tide"] : [s.totem]) {
      placeTotem(g, kind);
      const t = g.totems.at(-1);
      t!.life += rank * 2;
      t!.spellPower = 1 + rank * 0.1;
    }
  if (s.plants)
    for (let i = 0; i < s.plants; i++) {
      const point = constrain(
        g,
        {
          x: g.p.x + Math.cos((i * TAU) / s.plants) * 110,
          y: g.p.y + Math.sin((i * TAU) / s.plants) * 110,
        },
        30,
      );
      g.plant(point.x, point.y);
    }
  if (s.shadows) {
    for (let i = 0; i < s.shadows; i++)
      g.shadows.push({
        x: g.p.x + Math.cos((i * TAU) / s.shadows) * 80,
        y: g.p.y + Math.sin((i * TAU) / s.shadows) * 80,
        life: (s.seconds + rank * 2) * g.durationScale,
        attack: 0.1,
        spellPower: power * 0.3,
        spellId: s.id,
        spellRate: 1 + rank * 0.12,
      });
    g.shadows = g.shadows.slice(-3);
  }
}
export function releaseSpell(g: Game, id: string) {
  const s = SPELLS[id];
  if (
    !s ||
    !g.journey.talents[id] ||
    s.hero !== g.hero.id ||
    g.state !== "playing"
  )
    return false;
  const rank = spellRank(g, s),
    power = s.damage * g.skillPower * (1 + rank * 0.12),
    radius = s.radius * g.areaScale * (s.kind === "trap" ? 1 + rank * 0.1 : 1),
    angle = g.p.action?.angle ?? aimAt(g),
    origin = { x: g.p.x, y: g.p.y },
    enemy = g.nearest(origin.x, origin.y, 700),
    target = enemy
      ? { x: enemy.x, y: enemy.y }
      : {
          x: origin.x + Math.cos(angle) * 180,
          y: origin.y + Math.sin(angle) * 180,
        };
  constrain(g, target, 30);
  burst(g, origin, Math.min(radius, 280), s, true);
  g.events.push({ type: "skill", hero: g.hero.id, tier: s.advanced ? 3 : 2 });
  g.shake = Math.max(g.shake, s.advanced ? 7 : 4);
  if (s.shield) ward(g, s.shield + (s.kind === "ward" ? rank * 4 : 0));
  if (s.guard || s.kind === "ward") {
    g.spellState.guard = Math.max(g.spellState.guard, s.guard || 0.08);
    g.spellState.guardLife = (4 + rank) * g.durationScale;
  }
  allies(g, s, power);
  if (s.kind === "fan")
    volley(g, origin, s, s.count + rank, power * 0.65, angle, true);
  else if (["hunt", "mark"].includes(s.kind)) {
    let prey = targets(g, origin, 650 * g.areaScale, 60);
    if (s.kind === "mark") prey = prey.sort((a, b) => b.maxHp - a.maxHp);
    prey = prey.slice(0, s.count + rank * 2);
    for (const e of prey) {
      g.effect("arc", origin.x, origin.y, {
        tx: e.x,
        ty: e.y,
        style: g.hero.id === "volta" ? "arc" : "lance",
        emitter: true,
        color: g.hero.color,
        duration: 0.35,
      });
      strike(g, e, s, power, 0);
    }
  } else if (s.kind === "beam") {
    const reach = 700 * (1 + rank * 0.12) * g.areaScale,
      dx = Math.cos(angle),
      dy = Math.sin(angle);
    for (const e of targets(g, origin, reach, 60)) {
      const x = e.x - origin.x,
        y = e.y - origin.y,
        along = x * dx + y * dy;
      if (
        along >= 0 &&
        along < reach &&
        Math.abs(x * dy - y * dx) < radius * 0.45 + e.r
      )
        strike(g, e, s, power * 1.7);
    }
    g.effect("arc", origin.x, origin.y, {
      tx: origin.x + dx * reach,
      ty: origin.y + dy * reach,
      style: "lance",
      emitter: true,
      color: g.hero.color,
      duration: 0.6,
    });
    addField(g, s, [target], power * 0.3, radius, {
      kind: "field",
      life: 3,
      seconds: 3,
      interval: 1,
    });
  } else if (s.kind === "meteor") {
    const count = s.count + rank;
    for (let i = 0; i < count; i++) {
      const point = {
        x: target.x + Math.cos(angle) * (i - 1) * radius * 0.65,
        y: target.y + Math.sin(angle) * (i - 1) * radius * 0.65,
      };
      constrain(g, point, 30);
      addField(g, s, [point], power, radius, {
        kind: "meteor",
        delay: 0.45 + i * 0.2,
        life: 2,
        seconds: 2,
      });
    }
  } else if (["charge", "blink"].includes(s.kind)) {
    const travel = (s.distance! + rank * 20) * Math.min(1.3, g.areaScale),
      destination = {
        x: origin.x + Math.cos(angle) * travel,
        y: origin.y + Math.sin(angle) * travel,
      };
    constrain(g, destination, 18);
    g.spellState.move = {
      from: origin,
      to: destination,
      age: 0,
      seconds: s.kind === "blink" ? 0.12 : 0.24,
      id,
      power,
      radius,
    };
    g.p.invuln = Math.max(g.p.invuln, 0.4);
    if (s.kind === "charge")
      for (let i = 0; i < 3; i++)
        addField(
          g,
          s,
          [
            {
              x: origin.x + ((destination.x - origin.x) * i) / 3,
              y: origin.y + ((destination.y - origin.y) * i) / 3,
            },
          ],
          power * 0.25,
          radius * 0.55,
          {
            kind: "field",
            seconds: (3 + rank) * g.durationScale,
            life: (3 + rank) * g.durationScale,
            interval: 1,
          },
        );
  } else if (["field", "pull", "barrage", "trap"].includes(s.kind)) {
    const count = s.kind === "field" && s.count === 3 ? 3 : 1;
    const points =
      s.follow || s.kind === "barrage"
        ? []
        : Array.from({ length: count }, (_, i) => ({
            x: target.x + (count > 1 ? Math.cos((i * TAU) / count) * 120 : 0),
            y: target.y + (count > 1 ? Math.sin((i * TAU) / count) * 120 : 0),
          }));
    for (const point of points) constrain(g, point, 30);
    addField(g, s, points, power, radius);
  } else blast(g, origin, radius, power, s);
  if (s.recover) recoverSkills(g, s.recover);
  return true;
}
export function updateSpellCombat(g: Game, dt: number) {
  if (g.state !== "playing" || !g.spellState) return;
  for (const id of Object.keys(g.spellCooldowns))
    g.spellCooldowns[id] = Math.max(0, g.spellCooldowns[id] - dt);
  const state = g.spellState;
  g.shadows = g.shadows.filter(
    (c) => !c.spellId || g.journey.talents[c.spellId],
  );
  for (const c of g.companions)
    if (c.spellId && !g.journey.talents[c.spellId]) c.life = 0;
  state.guardLife = Math.max(0, state.guardLife - dt);
  if (!state.guardLife) state.guard = 0;
  if (g.pendingSpell) {
    g.pendingSpell.remaining -= dt;
    if (g.pendingSpell.remaining <= 0.000001) {
      const id = g.pendingSpell.id;
      g.pendingSpell = null;
      if (g.p.action?.kind === "skill") g.p.action.released = true;
      releaseSpell(g, id);
    }
  }
  if (state.move) {
    const m = state.move,
      s = SPELLS[m.id];
    if (!g.journey.talents[m.id]) state.move = null;
    else {
      m.age += dt;
      const q = Math.min(1, m.age / m.seconds);
      g.p.x = m.from.x + (m.to.x - m.from.x) * q;
      g.p.y = m.from.y + (m.to.y - m.from.y) * q;
      constrain(g, g.p, 18);
      g.effect("afterimage", g.p.x, g.p.y, {
        actor: g.hero.id,
        r: 82,
        color: g.hero.color,
        flip: g.p.dx < 0,
        duration: 0.25,
      });
      if (q >= 1) {
        blast(g, g.p, m.radius, m.power, s);
        state.move = null;
      }
    }
  }
  for (const f of state.fields) {
    const s = SPELLS[f.id];
    if (!g.journey.talents[f.id]) {
      f.life = 0;
      continue;
    }
    f.life -= dt;
    f.tick -= dt;
    const points = f.points.length ? f.points : [g.p];
    if (f.kind === "meteor") {
      f.delay! -= dt;
      if (f.delay! <= 0) {
        blast(g, points[0], f.radius, f.power, s);
        f.life = 0;
      }
    } else if (f.kind === "trap") {
      if (
        f.seconds - f.life > 0.4 &&
        targets(g, points[0], f.radius * 0.7, 1).length
      ) {
        blast(g, points[0], f.radius, f.power * 1.8, s);
        f.life = 0;
      }
    } else {
      if (s.pull)
        for (const p of points)
          for (const e of targets(g, p, f.radius * 1.3))
            if (!e.boss && !e.reaper) {
              const d = Math.max(1, distance(e, p)),
                force = Math.min(d, (65 + spellRank(g, s) * 20) * dt);
              e.x += ((p.x - e.x) / d) * force;
              e.y += ((p.y - e.y) / d) * force;
            }
      if (f.tick <= 0 && f.life > 0) {
        f.tick = f.interval;
        for (const point of points) {
          if (f.kind === "barrage" || s.projectile)
            volley(
              g,
              point,
              s,
              s.count + spellRank(g, s) * 2,
              f.power * 0.32,
              g.time,
            );
          else
            blast(
              g,
              point,
              f.radius,
              f.power * (points.length > 1 ? 0.27 : 0.45),
              s,
            );
        }
      }
    }
  }
  state.fields = state.fields.filter((f) => f.life > 0);
  for (const e of g.enemies)
    if (e.spellDot && e.hp > 0 && !e.reaper) {
      const dot = e.spellDot;
      dot.life -= dt;
      dot.tick -= dt;
      if (!g.journey.talents[dot.id || ""] || dot.life <= 0) {
        e.spellDot = null;
        continue;
      }
      if (dot.tick <= 0) {
        dot.tick = 0.5;
        g.hit(e, dot.damage, 0, "spell", "spells");
      }
    }
}
