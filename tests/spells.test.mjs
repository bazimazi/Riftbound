import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, HEROES, freshSave, sanitizeSave } from "../src/core.js";
import { profile, heroThreshold } from "../src/journey.js";
import {
  CLASS_TREES,
  CLASS_NODES,
  buyClassTalent,
  classTalentLock,
  respecTalents,
  talentAvailable,
  sanitizeClassTalents,
} from "../src/class-talents.js";
import {
  SPELLS,
  SPELL_SLOTS,
  spellsFor,
  spellMasteryText,
} from "../src/spell-data.js";
import {
  spellSlotLock,
  unlockSpellSlot,
  equipSpell,
} from "../src/spell-progression.js";
import {
  releaseSpell,
  updateSpellCombat,
  spellCooldown,
} from "../src/spell-combat.js";
import { recoverSkills } from "../src/skill-recovery.js";
import { veteranSave } from "./helpers.mjs";

function rich(hero = "cinder", learn = true) {
  const save = veteranSave(),
    p = profile(save, hero);
  p.xp = heroThreshold(600);
  p.sparks = 1000;
  p.materials = { core: 100, rune: 100, sigil: 100 };
  save.chronicle[hero] = { bosses: 20 };
  save.embers = 1e6;
  if (learn)
    for (const b of CLASS_TREES[hero])
      for (const n of b.nodes)
        for (let i = 0; i < n.max; i++)
          assert.ok(buyClassTalent(save, hero, n.id), n.id);
  return save;
}
function game(hero = "cinder", ids = null) {
  const save = rich(hero);
  for (let i = 0; i < 3; i++) assert.ok(unlockSpellSlot(save, hero));
  (
    ids ||
    spellsFor(hero)
      .slice(0, 3)
      .map((s) => s.id)
  ).forEach((id, i) => equipSpell(save, hero, i, id));
  const g = new Game(hero, save, () => 0.9);
  g.enemies = [];
  g.events = [];
  g.plants = [];
  g.p.invuln = 1e5;
  g.attackTimer = 1e5;
  g.spawnTimer = 1e5;
  g.nextBoss = 1e5;
  g.nextCache = 1e5;
  g.nextShrine = 1e5;
  g.nextHazard = 1e5;
  return g;
}
function foe(g, x = 140, y = 0, reaper = false, boss = false) {
  g.spawnEnemy("brute", 200);
  const e = g.enemies.at(-1);
  Object.assign(e, {
    x,
    y,
    hp: 1e8,
    maxHp: 1e8,
    speed: 0,
    damage: 0,
    reaper,
    boss,
    grace: 100,
  });
  return e;
}
const advance = (g, seconds) => {
  for (let t = 0; t < seconds - 1e-7; t += 0.05) g.update(0.05);
};

test("all twelve classes have six authored spells with three-rank mechanical masteries", () => {
  assert.equal(Object.keys(SPELLS).length, 72);
  assert.equal(
    Object.values(CLASS_NODES).filter((n) => n.spell || n.spellMastery).length,
    144,
  );
  for (const h of HEROES) {
    assert.equal(spellsFor(h.id).length, 6);
    for (const s of spellsFor(h.id)) {
      assert.ok(s.name && s.desc && s.icon && s.cooldown >= 16);
      assert.ok(CLASS_NODES[s.id].requires);
      assert.equal(CLASS_NODES[s.masteryId].max, 3);
      for (let r = 1; r <= 3; r++)
        assert.doesNotMatch(spellMasteryText(s, r), /undefined|NaN|0\.150000/);
    }
  }
});
test("slot milestones require class levels, banked Wardens and exact catalysts, in order", () => {
  const save = rich("cinder", false),
    p = profile(save, "cinder");
  p.xp = heroThreshold(29);
  assert.equal(spellSlotLock(save, "cinder"), "Class LV 30");
  const before = structuredClone(p);
  assert.equal(unlockSpellSlot(save, "cinder"), false);
  assert.deepEqual(p, before);
  p.xp = heroThreshold(600);
  save.chronicle.cinder.bosses = 1;
  assert.equal(spellSlotLock(save, "cinder"), "2 banked Wardens");
  save.chronicle.cinder.bosses = 20;
  p.materials.rune = 1;
  assert.equal(unlockSpellSlot(save, "cinder"), false);
  p.materials.rune = 100;
  for (const [i, goal] of SPELL_SLOTS.entries()) {
    const sparks = p.sparks,
      mats = { ...p.materials };
    assert.ok(unlockSpellSlot(save, "cinder"));
    assert.equal(p.spellSlots, i + 1);
    assert.equal(p.sparks, sparks - goal.sparks);
    for (const id of Object.keys(mats))
      assert.equal(p.materials[id], mats[id] - goal[id]);
  }
  assert.equal(unlockSpellSlot(save, "cinder"), false);
});
test("spell purchases enforce specialty investments and scarce permanent point budgets", () => {
  const save = rich("cinder", false),
    p = profile(save, "cinder"),
    root = CLASS_TREES.cinder[0].nodes[0];
  p.xp = heroThreshold(25);
  assert.match(classTalentLock(save, "cinder", "cinder_spell0"), /Afterburn/);
  for (let i = 0; i < 4; i++)
    assert.ok(buyClassTalent(save, "cinder", root.id));
  assert.equal(buyClassTalent(save, "cinder", "cinder_spell0_mastery"), false);
  // Class LV25 earns five points; the spell costs two. Warden contribution is removed here.
  save.chronicle.cinder.bosses = 0;
  save.memories.cinder = {};
  assert.equal(talentAvailable(save, "cinder"), 1);
  assert.equal(buyClassTalent(save, "cinder", "cinder_spell0"), false);
  p.xp = heroThreshold(30);
  assert.ok(buyClassTalent(save, "cinder", "cinder_spell0"));
  assert.equal(buyClassTalent(save, "cinder", "cinder_spell1"), false);
});
test("loadouts reject unlearned and foreign spells, move duplicates and survive save migration", () => {
  const save = rich(),
    p = profile(save, "cinder");
  assert.equal(equipSpell(save, "cinder", 0, "cinder_spell0"), false);
  unlockSpellSlot(save, "cinder");
  unlockSpellSlot(save, "cinder");
  assert.equal(equipSpell(save, "cinder", 0, "vesper_spell0"), false);
  assert.equal(equipSpell(save, "cinder", -1, "cinder_spell0"), false);
  assert.ok(equipSpell(save, "cinder", 0, "cinder_spell0"));
  assert.ok(equipSpell(save, "cinder", 1, "cinder_spell0"));
  assert.deepEqual(p.loadout, ["", "cinder_spell0", ""]);
  assert.deepEqual(sanitizeSave(save).journeys.cinder.loadout, p.loadout);
  p.loadout = ["cinder_spell0", "cinder_spell0", "vesper_spell0"];
  assert.deepEqual(sanitizeSave(save).journeys.cinder.loadout, [
    "cinder_spell0",
    "",
    "",
  ]);
  p.xp = heroThreshold(10);
  assert.equal(sanitizeSave(save).journeys.cinder.spellSlots, 0);
  assert.deepEqual(sanitizeSave(freshSave()).journeys.cinder.loadout, [
    "",
    "",
    "",
  ]);
});
test("save rebuilding preserves capstones unlocked through a spell investment and removes orphan masteries", () => {
  const save = rich("cinder", false),
    p = profile(save, "cinder");
  // Twelve branch points: spell ranks provide the final three, after the old capstone in data order.
  const b = CLASS_TREES.cinder[0];
  p.talents = {
    [b.nodes[0].id]: 4,
    [b.nodes[2].id]: 2,
    [b.nodes[5].id]: 1,
    cinder_spell0: 1,
    cinder_spell0_mastery: 2,
    cinder_path0_3: 1,
  };
  sanitizeClassTalents(save, "cinder");
  assert.equal(p.talents.cinder_path0_3, 1);
  assert.equal(p.talents.cinder_spell0_mastery, 2);
  p.talents = { cinder_spell0_mastery: 3, vesper_spell0: 1 };
  sanitizeClassTalents(save, "cinder");
  assert.deepEqual(p.talents, {});
});
test("respec refunds talents and clears spell equipment while preserving paid slots", () => {
  const g = game();
  assert.ok(respecTalents(g.save, g.hero.id));
  assert.equal(g.journey.spellSlots, 3);
  assert.deepEqual(g.journey.loadout, ["", "", ""]);
  assert.equal(g.castSpell(0), false);
});
test("equipped spells snapshot at departure, reserve once, freeze in menus and release after windup", () => {
  const g = game("volta"),
    e = foe(g),
    s = SPELLS.volta_spell0;
  assert.ok(g.castSpell(0));
  const hp = e.hp,
    cd = g.spellCooldowns[s.id];
  assert.equal(e.hp, hp);
  assert.equal(g.castSpell(0), false);
  assert.equal(g.castSkill(), false);
  for (const state of ["paused", "levelup", "artifact", "shrine"]) {
    g.state = state;
    g.update(0.05);
    assert.equal(g.spellCooldowns[s.id], cd);
    assert.equal(e.hp, hp);
  }
  g.state = "playing";
  advance(g, 0.15);
  assert.ok(g.pendingSpell);
  advance(g, 0.05);
  assert.equal(g.pendingSpell, null);
  assert.ok(e.hp < hp);
  equipSpell(g.save, "volta", 0, "volta_spell4");
  assert.equal(g.spellLoadout[0], s.id);
  assert.equal(g.castSpell(0), false);
  const next = new Game("volta", g.save);
  assert.equal(next.spellLoadout[0], "volta_spell4");
});
test("every authored spell deals separately tracked damage and emits its stronger class visual", () => {
  for (const s of Object.values(SPELLS)) {
    const g = game(s.hero, [s.id]);
    for (let i = 0; i < 12; i++) foe(g, 110 + i * 12, ((i % 3) - 1) * 20);
    assert.ok(g.castSpell(0), s.id);
    advance(g, s.advanced ? 0.3 : 0.2);
    assert.ok(
      g.effects.some(
        (e) => e.type === "skillburst" && e.tier === (s.advanced ? 3 : 2),
      ),
      s.id,
    );
    advance(g, 2);
    assert.ok(g.damageSources.spells > 0, `${s.id} actual damage`);
    assert.ok(
      g.spellState.fields.length <= 8 &&
        g.companions.length <= 8 &&
        g.shadows.length <= 3,
    );
    assert.ok(Number.isFinite(g.p.hp) && g.p.hp > 0);
  }
});
test("mastery adds projectiles, piercing, meteor impacts, field pulses and real companion strength", () => {
  for (const [id, field, expected] of [
    ["nyx_spell0", "bullets", [5, 8]],
    ["cinder_spell1", "fields", [3, 6]],
  ]) {
    const s = SPELLS[id],
      sizes = [];
    for (const rank of [0, 3]) {
      const g = game(s.hero, [id]);
      g.journey.talents[s.masteryId] = rank;
      releaseSpell(g, id);
      sizes.push(
        field === "fields" ? g.spellState.fields.length : g.bullets.length,
      );
      if (field === "bullets") assert.equal(g.bullets[0].pierce, 2 + rank);
    }
    assert.deepEqual(sizes, expected);
  }
  const g = game("vesper", ["vesper_spell2"]);
  releaseSpell(g, "vesper_spell2");
  const imps = g.companions.filter((c) => c.spellId);
  assert.equal(imps.length, 2);
  assert.ok(imps.every((c) => c.life >= 11 && c.spellPower > 1.29));
  const field = game("briar", ["briar_spell1"]);
  releaseSpell(field, "briar_spell1");
  assert.equal(field.spellState.fields[0].seconds, 11 * field.durationScale);
  assert.equal(
    field.spellState.fields[0].interval,
    field.spellState.fields[0].seconds / 7,
  );
});
test("recovery buffs and refunds affect the full spell arsenal without resetting running timers", () => {
  for (const h of HEROES) {
    const g = game(h.id),
      s = spellsFor(h.id)[0],
      before = spellCooldown(g, s);
    g.ranks.focus = 15;
    g.recalculate();
    assert.ok(spellCooldown(g, s) < before);
    g.spellCooldowns = { [s.id]: 20, [spellsFor(h.id)[1].id]: 30 };
    g.recalculate();
    assert.equal(g.spellCooldowns[s.id], 20);
    recoverSkills(g, 2, 0.2);
    assert.equal(g.spellCooldowns[s.id], 14);
    assert.equal(g.spellCooldowns[spellsFor(h.id)[1].id], 22);
    g.skillRecoveryScale = 0.01;
    assert.equal(spellCooldown(g, s), s.cooldown / 2);
  }
});
test("healing and resource spells require landed non-Reaper hits, with a per-spell reward gate", () => {
  const g = game("solace", ["solace_spell1"]);
  g.p.hp = g.p.maxHp * 0.2;
  g.p.trait = 0;
  const hp = g.p.hp;
  releaseSpell(g, "solace_spell1");
  assert.equal(g.p.hp, hp);
  assert.equal(g.p.trait, 0);
  foe(g, 140, 0, true);
  releaseSpell(g, "solace_spell1");
  assert.equal(g.p.hp, hp);
  g.enemies = [];
  for (let i = 0; i < 20; i++) foe(g, 140 + i);
  releaseSpell(g, "solace_spell1");
  assert.equal(g.p.hp, hp + g.p.maxHp * 0.08);
  assert.equal(g.p.trait, 0.2);
});
test("Reapers resist spell damage and remain immune to roots, exposure, execution and pull", () => {
  const g = game("volta", ["volta_spell4"]),
    reaper = foe(g, 240, 20, true),
    boss = foe(g, 245, 25, false, true),
    lesser = foe(g, 150);
  releaseSpell(g, "volta_spell4");
  const original = { x: reaper.x, y: reaper.y, hp: reaper.hp, bossX: boss.x };
  updateSpellCombat(g, 0.2);
  assert.equal(reaper.x, original.x);
  assert.equal(boss.x, original.bossX);
  assert.ok(lesser.x !== 150);
  assert.equal(reaper.stun || 0, 0);
  const normalLost = 1e8 - boss.hp,
    reaperLost = original.hp - reaper.hp;
  assert.ok(reaperLost < normalLost * 0.1);
  const n = game("nyx", ["nyx_spell5"]),
    prey = foe(n, 150, 0, true);
  prey.hp = 1e6;
  releaseSpell(n, "nyx_spell5");
  assert.ok(prey.hp > 999900);
});
test("lethal hits cancel a queued spell, and charge movement remains within world bounds", () => {
  const g = game("cinder", ["cinder_spell1"]);
  foe(g);
  g.castSpell(0);
  g.p.invuln = 0;
  g.p.shield = 0;
  g.reborn = true;
  g.revives = 0;
  g.hurt(1e12, true);
  assert.equal(g.state, "dead");
  assert.equal(g.pendingSpell, null);
  const dash = game("cinder", ["cinder_spell2"]);
  dash.p.x = dash.realm.width / 2 - 35;
  dash.p.dx = 1;
  releaseSpell(dash, "cinder_spell2");
  advance(dash, 0.3);
  assert.ok(dash.p.x <= dash.realm.width / 2 - 18);
  assert.equal(dash.spellState.move, null);
});
test("recurring fields, temporary teams and spell dots expire, freeze and cannot recursively proc talents", () => {
  const g = game("vesper", ["vesper_spell0"]);
  foe(g);
  releaseSpell(g, "vesper_spell0");
  updateSpellCombat(g, 0.2);
  const f = g.spellState.fields[0],
    life = f.life;
  g.state = "paused";
  updateSpellCombat(g, 1);
  assert.equal(f.life, life);
  g.state = "playing";
  assert.equal(g.damageSources.talents || 0, 0);
  for (let i = 0; i < 30; i++) releaseSpell(g, "vesper_spell0");
  assert.equal(g.spellState.fields.length, 8);
  g.journey.talents = {};
  updateSpellCombat(g, 0.1);
  assert.equal(g.spellState.fields.length, 0);
  assert.equal(g.enemies[0].spellDot, null);
});

test("combined mastered spell loadouts sustain crowded combat with bounded effects and teams", () => {
  for (const h of HEROES) {
    const ids = spellsFor(h.id)
        .filter((s) => s.advanced)
        .map((s) => s.id),
      g = game(h.id, ids);
    g.journey.stage = 2;
    g.recalculate();
    g.ranks.focus = 30;
    g.ranks.endurance = 15;
    g.ranks.breadth = 15;
    g.recalculate();
    for (let i = 0; i < 100; i++)
      foe(g, 120 + (i % 10) * 20, (Math.floor(i / 10) - 5) * 24);
    for (let i = 0; i < 400; i++) {
      for (let slot = 0; slot < 3; slot++) g.castSpell(slot);
      g.update(0.05);
      assert.ok(
        g.spellState.fields.length <= 8 &&
          g.companions.length <= 8 &&
          g.shadows.length <= 3 &&
          g.plants.length <= 18 &&
          g.bullets.length <= 221 &&
          g.effects.length <= 250,
        h.id,
      );
      assert.ok(
        Number.isFinite(g.stats.damage) &&
          Number.isFinite(g.p.x) &&
          Number.isFinite(g.p.hp),
        h.id,
      );
    }
    assert.ok(g.damageSources.spells > 0, h.id);
    assert.ok(g.p.shield <= 90, h.id);
  }
});

test("spell curses feed soul harvest and preserve the warlock and grave-knight plague paths", () => {
  for (const [hero, id] of [
    ["vesper", "vesper_spell0"],
    ["morrow", "morrow_spell4"],
  ]) {
    const g = game(hero, [id]),
      dead = foe(g, 150),
      nearby = foe(g, 180);
    g.evolutions.signature = true;
    dead.spellDot = { id, life: 3, tick: 0.5, damage: 20 };
    const souls = g.p.trait;
    g.kill(dead);
    assert.equal(nearby.spellDot.id, id);
    assert.equal(nearby.spellDot.damage, hero === "vesper" ? 10 : 20);
    if (hero === "vesper") assert.ok(g.p.trait > souls);
  }
});
