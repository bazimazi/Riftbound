import test from "node:test";
import assert from "node:assert/strict";
import { Game, HEROES, freshSave, sanitizeSave } from "../src/game/index.ts";
import { profile, heroThreshold } from "../src/game/progression/journey.ts";
import {
  CLASS_TREES,
  CLASS_NODES,
  buyClassTalent,
  equipUltimate,
  respecTalents,
  selectedUltimate,
} from "../src/game/progression/class-talents.ts";
import { ULTIMATES } from "../src/game/data/specializations.ts";
import {
  talentHit,
  talentDash,
  talentHurt,
  talentSkill,
  updateTalentCombat,
} from "../src/game/combat/talent-combat.ts";
import { archetypeUpdate } from "../src/game/combat/archetypes.ts";
import { veteranSave } from "./helpers.mjs";

function arena(hero, talents = {}) {
  const save = ["cinder", "briar", "nyx", "volta"].includes(hero)
      ? freshSave()
      : veteranSave(),
    p = profile(save, hero);
  p.talents = { ...talents };
  const g = new Game(hero, save, () => 0.99);
  g.enemies = [];
  g.pickups = [];
  g.attackTimer =
    g.spawnTimer =
    g.nextBoss =
    g.nextCache =
    g.nextShrine =
    g.nextHazard =
    g.nextCatalyst =
      1e8;
  g.p.invuln = 1e8;
  g.events = [];
  return g;
}
function foe(g, x = 100, y = 0) {
  g.spawnEnemy("crawler", 200);
  const e = g.enemies.at(-1);
  Object.assign(e, { x, y, hp: 1e8, maxHp: 1e8, speed: 0, damage: 0 });
  return e;
}
function tick(g, seconds) {
  for (let i = 0; i < seconds * 20; i++) g.update(0.05);
}

test("all 36 final talents release damaging ultimates through the normal skill", () => {
  assert.equal(Object.keys(ULTIMATES).length, 36);
  assert.equal(Object.values(CLASS_NODES).filter((n) => n.proc).length, 72);
  for (const u of Object.values(ULTIMATES)) {
    const g = arena(u.hero, { [u.id]: 1 });
    for (let i = 0; i < 12; i++) foe(g, 90 + i * 6, (i % 3) * 15);
    assert.equal(selectedUltimate(u.hero, g.journey).id, u.id);
    assert.ok(g.skill());
    assert.equal(g.talentState.ultimate.id, u.id);
    assert.equal(g.talentState.cooldown, 40);
    tick(g, 2);
    assert.ok(
      g.damageSources.talent_ultimate > 100,
      `${u.id}: actual ultimate damage`,
    );
    assert.ok(
      g.events.some((e) => e.text === `ULTIMATE · ${u.name.toUpperCase()}`),
    );
    assert.ok(g.companions.length <= 8);
    assert.ok(g.totems.length <= 3);
    assert.ok(Number.isFinite(g.p.hp));
  }
});

test("ultimate purchases, equipped specialization and old learned capstones survive saves", () => {
  for (const h of HEROES) {
    const save = freshSave(),
      p = profile(save, h.id);
    p.xp = heroThreshold(500);
    for (const b of CLASS_TREES[h.id])
      for (const n of b.nodes)
        for (let rank = 0; rank < n.max; rank++)
          assert.ok(buyClassTalent(save, h.id, n.id), n.id);
    const first = CLASS_TREES[h.id][0].nodes.find((n) => n.ultimate).id,
      second = CLASS_TREES[h.id][1].nodes.find((n) => n.ultimate).id;
    assert.equal(selectedUltimate(h.id, p).id, first);
    assert.ok(equipUltimate(save, h.id, second));
    assert.equal(
      selectedUltimate(h.id, sanitizeSave(save).journeys[h.id]).id,
      second,
    );
    p.ultimate = "";
    assert.equal(
      selectedUltimate(h.id, sanitizeSave(save).journeys[h.id]).id,
      first,
    );
    assert.equal(equipUltimate(save, h.id, "other_class_path0_3"), false);
    save.embers = 1e6;
    p.materials.rune = 20;
    assert.ok(respecTalents(save, h.id));
    assert.equal(selectedUltimate(h.id, p), null);
  }
});

test("a queued ultimate freezes in menus, releases once, and changing specialization never resets cooldown", () => {
  const g = arena("vesper", { vesper_path0_3: 1, vesper_path1_3: 1 });
  foe(g);
  assert.ok(g.castSkill());
  assert.equal(g.talentState.cooldown, 0);
  g.state = "paused";
  tick(g, 1);
  assert.equal(g.talentState.cooldown, 0);
  assert.ok(g.pendingSkill);
  g.state = "playing";
  tick(g, 0.8);
  const life = g.talentState.ultimate.life,
    cd = g.talentState.cooldown;
  assert.equal(
    g.events.filter((e) => e.text?.startsWith("ULTIMATE ·")).length,
    1,
  );
  assert.ok(equipUltimate(g.save, "vesper", "vesper_path1_3"));
  g.p.skillCd = 0;
  assert.ok(g.skill());
  assert.equal(g.talentState.cooldown, cd);
  assert.equal(g.talentState.ultimate.id, "vesper_path0_3");
  g.state = "levelup";
  tick(g, 1);
  updateTalentCombat(g, 1);
  assert.equal(g.talentState.cooldown, cd);
  assert.equal(g.talentState.ultimate.life, life);
  g.state = "playing";
  tick(g, 11);
  assert.equal(g.talentState.ultimate, null);
  assert.ok(g.talentState.cooldown > 20);
});

test("side talents cause bounded bursts, cooldown recovery, critical echoes and dash wards", () => {
  const offense = arena("cinder", { cinder_path0_1: 2 }),
    primary = foe(offense),
    others = Array.from({ length: 7 }, (_, i) => foe(offense, 110 + i * 4));
  for (let i = 0; i < 4; i++)
    talentHit(offense, primary, 100, false, "signature");
  assert.equal(others.filter((e) => e.hp < e.maxHp).length, 0);
  talentHit(offense, primary, 100, false, "signature");
  assert.equal(others.filter((e) => e.hp < e.maxHp).length, 4);
  assert.equal(offense.damageSources.talents, 360);
  for (let i = 0; i < 20; i++)
    talentHit(offense, primary, 100, true, "talents");
  assert.equal(
    offense.damageSources.talents,
    360,
    "procs cannot trigger themselves",
  );
  const caster = arena("volta", { volta_path2_1: 3 }),
    target = foe(caster);
  caster.p.skillCd = 10;
  talentHit(caster, target, 10, false, "companions");
  talentHit(caster, target, 10, false, "companions");
  assert.equal(caster.p.skillCd, 9.55);
  const hunter = arena("fen", { fen_path1_1: 3 }),
    marked = foe(hunter),
    echo = foe(hunter, 130);
  talentHit(hunter, marked, 100, true, "signature");
  assert.ok(echo.hp < echo.maxHp);
  assert.equal(hunter.damageSources.talents, 120);
  const guardian = arena("rook", { rook_path1_1: 3 });
  guardian.p.shield = 0;
  const pack = Array.from({ length: 10 }, (_, i) => foe(guardian, 70 + i));
  talentDash(guardian);
  assert.equal(guardian.p.shield, 18);
  assert.equal(pack.filter((e) => e.stun > 0).length, 8);
});

test("reactive guards, field lifetimes and target exposure require their actual combat conditions", () => {
  const g = arena("rook", { rook_path1_2: 2 });
  foe(g);
  g.p.shield = 0;
  talentHurt(g);
  assert.equal(g.p.shield, 0);
  g.p.hp = g.p.maxHp * 0.5;
  talentHurt(g, true);
  assert.equal(g.p.shield, 0);
  talentHurt(g);
  assert.equal(g.p.shield, 16);
  talentHurt(g);
  assert.equal(g.p.shield, 16);
  const caster = arena("volta", { volta_path2_2: 3 });
  foe(caster);
  talentSkill(caster);
  talentSkill(caster);
  assert.equal(caster.talentState.fields.length, 1);
  tick(caster, 1);
  assert.ok(caster.damageSources.talents > 0);
  caster.state = "paused";
  const life = caster.talentState.fields[0].life;
  updateTalentCombat(caster, 1);
  assert.equal(caster.talentState.fields[0].life, life);
  caster.state = "playing";
  tick(caster, 6);
  assert.equal(caster.talentState.fields.length, 0);
  const hunter = arena("fen", { fen_path1_2: 3 }),
    boss = foe(hunter);
  boss.boss = true;
  boss.maxHp *= 2;
  talentSkill(hunter);
  assert.ok(Math.abs(boss.talentExpose - 0.45) < 1e-8);
  assert.ok(Math.abs(hunter.multiplier(boss) / hunter.damage - 1.45) < 1e-8);
  hunter.time += 6;
  hunter.journey.talents.fen_path1_2 = 1;
  hunter.recalculate();
  const reaper = foe(hunter, 80);
  reaper.reaper = true;
  reaper.maxHp *= 10;
  talentSkill(hunter);
  assert.ok(
    Math.abs(boss.talentExpose - 0.15) < 1e-8,
    "expired exposure cannot retain a higher respec rank",
  );
  assert.equal(reaper.talentExpose, undefined);
  hunter.journey.talents = {};
  hunter.recalculate();
  hunter.time += 6;
  talentSkill(hunter);
  assert.ok(Math.abs(hunter.multiplier(boss) / hunter.damage - 1) < 1e-8);
});

test("mobile gardens and councils change positioning; vortex control never pulls bosses or Reapers", () => {
  for (const [hero, id, collection] of [
    ["briar", "briar_path0_3", "plants"],
    ["orin", "orin_path0_3", "totems"],
  ]) {
    const g = arena(hero, { [id]: 1 });
    g.skill();
    const first = g[collection][0],
      x = first.x;
    g.p.x = 300;
    updateTalentCombat(g, 0.05);
    assert.ok(first.x > x + 150);
  }
  const g = arena("volta", { volta_path2_3: 1 }),
    mob = foe(g, 200),
    boss = foe(g, 220),
    reaper = foe(g, 240);
  boss.boss = true;
  reaper.reaper = true;
  talentSkill(g);
  const x = mob.x;
  updateTalentCombat(g, 0.05);
  assert.ok(mob.x < x);
  assert.equal(boss.x, 220);
  assert.equal(reaper.x, 240);
  assert.equal(reaper.stun, 0);
});

test("ultimate guards preserve Reaper pressure and retinues stay finite", () => {
  const g = arena("rook", { rook_path1_3: 1 });
  g.skill();
  g.p.shield = 0;
  g.p.hp = g.p.maxHp;
  g.p.invuln = 0;
  const before = g.p.hp;
  g.hurt(20);
  const guarded = before - g.p.hp;
  g.p.invuln = 0;
  const hp = g.p.hp;
  g.hurt(20, true);
  assert.ok(hp - g.p.hp > guarded * 1.5);
  for (const [hero, id] of [
    ["vesper", "vesper_path1_3"],
    ["fen", "fen_path0_3"],
    ["morrow", "morrow_path2_3"],
  ]) {
    const petGame = arena(hero, { [id]: 1 });
    for (let i = 0; i < 5; i++) {
      petGame.talentState.cooldown = 0;
      talentSkill(petGame);
    }
    assert.ok(petGame.companions.length <= 8);
    assert.ok(petGame.companions.some((c) => c.ultimate));
    tick(petGame, 13);
    assert.ok(petGame.companions.every((c) => c.permanent));
  }
});

test("early wolves damage clustered foes, with stronger commanded area attacks", () => {
  const wolf = arena("fen"),
    pet = wolf.companions[0];
  pet.x = 45;
  pet.y = 0;
  pet.attack = 0;
  const pack = Array.from({ length: 7 }, (_, i) => foe(wolf, 70 + i * 3));
  archetypeUpdate(wolf, 0.05);
  assert.equal(pack.filter((e) => e.hp < e.maxHp).length, 3);
  wolf.p.trait = 1;
  wolf.skill();
  assert.equal(
    pack.filter((e) => e.hp < e.maxHp).length,
    7,
    "pounce strikes the pack",
  );
});
