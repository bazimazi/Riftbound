import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/core.js";
import { archetypeUpdate, summonCompanion } from "../src/archetypes.js";
import { releaseSpell } from "../src/spell-combat.js";
import { veteranSave } from "./helpers.mjs";

function arena(hero) {
  const g = new Game(hero, veteranSave(), () => 0.99);
  g.enemies = [];
  g.pickups = [];
  g.attackTimer = g.spawnTimer = g.nextBoss = g.nextCache = 1e8;
  g.p.invuln = 1e8;
  for (const c of g.companions) c.attack = 1e8;
  return g;
}
function foe(g, x, y = 0, reaper = false) {
  g.spawnEnemy(reaper ? "reaper" : "crawler", 100);
  const e = g.enemies.at(-1);
  Object.assign(e, {
    x,
    y,
    hp: 1e8,
    maxHp: 1e8,
    speed: 0,
    damage: 0,
    attack: 1e8,
    enemySkill: 1e8,
    grace: 1e8,
  });
  return e;
}
const damage = (e) => e.maxHp - e.hp;
function impBolt(g, x, y, extra = {}) {
  g.projectile(x, y, 0, 50, "hex", {
    source: "demon",
    channel: "companions",
    companionId: g.companions.find((c) => c.kind === "imp").id,
    vx: 0,
    vy: 0,
    ...extra,
  });
  return g.bullets.at(-1);
}

test("every imp bolt splashes independently, but a piercing bolt bursts only once", () => {
  const g = arena("vesper"),
    primary = foe(g, 250),
    splash = foe(g, 250, 60),
    piercingTarget = foe(g, 280);
  const first = impBolt(g, 250, 0, { pierce: 1 }),
    second = impBolt(g, 250, 0);
  // A second real imp may land in the same frame without suppressing either blast.
  second.companionId = summonCompanion(g, "imp", 10).id;
  g.companions.at(-1).attack = 1e8;
  g.update(0.05);
  assert.equal(damage(splash), 40);
  assert.equal(damage(primary), 100);
  assert.equal(g.damageSources.companions, 180);
  assert.ok(splash.hexTime > 0);
  assert.ok(first.petSplashSpent && second.petSplashSpent);
  first.x = piercingTarget.x;
  first.y = piercingTarget.y;
  for (const e of g.enemies) e.hexTick = 1;
  const before = damage(splash);
  g.update(0.05);
  assert.equal(
    damage(splash),
    before,
    "the second piercing contact cannot splash again",
  );
  assert.ok(damage(piercingTarget) >= 90);
});

test("imp splash chooses a bounded nearby group and pact bolts cover a wider crowd", () => {
  for (const pact of [false, true]) {
    const g = arena("vesper");
    if (pact) g.skill();
    const primary = foe(g, 350),
      far = foe(g, 350, 120),
      pack = Array.from({ length: 10 }, (_, i) => foe(g, 350, 25 + i * 4));
    // Array order does not let distant enemies displace the closest crowd.
    impBolt(g, 350, 0);
    g.update(0.05);
    assert.equal(pack.filter((e) => damage(e) > 0).length, pact ? 5 : 3);
    assert.equal(
      damage(far),
      0,
      "nearest targets fill the bounded splash first",
    );
    assert.equal(damage(primary), 50);
  }
  const g = arena("vesper");
  g.skill();
  foe(g, 350);
  const outer = foe(g, 350, 130);
  impBolt(g, 350, 0);
  g.update(0.05);
  assert.equal(
    damage(outer),
    22.5,
    "pact adds meaningful reach and splash power",
  );
});

test("pet cleaves and imp blasts inherit area bonuses in combat and in their visuals", () => {
  for (const kind of ["wolf", "guardian", "imp", "ghoul", "elemental"]) {
    const g = arena(kind === "wolf" ? "fen" : "vesper"),
      pet =
        g.companions.find((c) => c.kind === kind) ||
        summonCompanion(g, kind, 10);
    g.companions = [pet];
    pet.x = 40;
    pet.y = 0;
    foe(g, 65);
    const outer = foe(g, 40, 155);
    if (kind === "imp") impBolt(g, 65, 0);
    else pet.attack = 0;
    g.update(0.05);
    assert.equal(damage(outer), 0, `${kind}: outside unmodified area`);
    g.areaScale = 2;
    if (kind === "imp") impBolt(g, 65, 0);
    else pet.attack = 0;
    g.update(0.05);
    assert.ok(damage(outer) > 0, `${kind}: area upgrades reach the crowd`);
    assert.ok(
      g.effects.some((e) => ["swing", "burst"].includes(e.type) && e.r >= 170),
      `${kind}: visual matches the enlarged area`,
    );
  }
});

test("awakening and commands widen wolf cleaves; Beast cleave adds useful reach and damage", () => {
  const results = [];
  for (const mode of ["base", "awakened", "command", "specialized"]) {
    const g = arena("fen"),
      wolf = g.companions[0];
    if (mode === "awakened") g.ranks.signature = 5;
    if (["command", "specialized"].includes(mode)) g.skill();
    if (mode === "specialized") g.ranks.beastcleave = 1;
    wolf.x = 40;
    wolf.y = 0;
    wolf.attack = 0;
    const primary = foe(g, 65),
      side = foe(g, 40, 70),
      awakeReach = foe(g, 40, 125),
      commandReach = foe(g, 40, 165),
      talentReach = foe(g, 40, 195);
    const pack = Array.from({ length: 10 }, (_, i) => foe(g, 50, -30 - i * 3));
    archetypeUpdate(g, 0.05);
    assert.equal(
      damage(awakeReach) > 0,
      false,
      "nearer crowd fills the target cap",
    );
    assert.ok(pack.filter((e) => damage(e) > 0).length <= 7);
    // Check reach separately so the cap does not obscure the boundary behavior.
    g.enemies = [primary, side, awakeReach, commandReach, talentReach];
    for (const e of g.enemies) e.hp = e.maxHp;
    wolf.attack = 0;
    archetypeUpdate(g, 0.05);
    results.push(damage(side) / damage(primary));
    assert.equal(damage(awakeReach) > 0, mode !== "base");
    assert.equal(
      damage(commandReach) > 0,
      ["command", "specialized"].includes(mode),
    );
    assert.equal(damage(talentReach) > 0, mode === "specialized");
  }
  assert.ok(results[1] > results[0]);
  assert.ok(results[2] > results[1]);
  assert.ok(results[3] > results[2]);
});

test("Pack command revives the whole pack, prefers marked prey and never stacks pounce damage", () => {
  const g = arena("fen"),
    wolves = [
      g.companions[0],
      summonCompanion(g, "wolf", Infinity, true),
      summonCompanion(g, "wolf", 10),
    ],
    near = foe(g, 100),
    marked = foe(g, 400),
    crowd = foe(g, 400, 120);
  for (const wolf of wolves)
    Object.assign(wolf, { hp: 0, down: 8, attack: 1e8 });
  g.classState.prey = marked.id;
  marked.markUntil = 5;
  g.p.trait = 1;
  g.skill();
  assert.ok(wolves.every((c) => c.hp > 0 && c.down === 0));
  assert.equal(wolves[0].x, 375, "latest marked prey gets the first pounce");
  assert.ok(damage(near) > 0 && damage(crowd) > 0);
  assert.equal(
    damage(marked),
    damage(crowd),
    "overlapping pounces hit once per cast",
  );
  assert.equal(damage(marked), 106);
  assert.equal(g.p.trait, 0);
  assert.ok(g.classState.command > 0);
  assert.ok(crowd.markUntil > 0);
  assert.ok(g.damageSources.active > 0);
  g.enemies = [];
  for (const wolf of wolves) Object.assign(wolf, { hp: 0, down: 8 });
  g.p.skillCd = 0;
  g.skill();
  assert.ok(
    wolves.every((c) => c.hp > 0),
    "a command can revive pets without a target",
  );
});

test("Demon pact ruptures distant crowds, retains close defense and hits overlapping areas once", () => {
  const far = arena("vesper"),
    prey = foe(far, 450),
    crowd = foe(far, 450, 180),
    outside = foe(far, 450, 250);
  far.skill();
  assert.ok(damage(prey) > 0 && damage(crowd) > 0);
  assert.equal(damage(outside), 0);
  assert.ok(crowd.hexTime > 0);
  assert.ok(far.effects.some((e) => e.motif === "rupture" && e.x === 450));
  const close = arena("vesper"),
    target = foe(close, 100),
    behind = foe(close, -180),
    overlap = foe(close, 100, 70);
  close.skill();
  assert.ok(damage(behind) > 0);
  assert.equal(damage(target), damage(overlap));
  assert.equal(damage(target), damage(prey));
  assert.ok(close.damageSources.active > 0);
});

test("Implosion reaches imp prey, expires once and credits bounded companion damage", () => {
  const g = arena("vesper");
  g.ranks.implosion = 1;
  const imp = summonCompanion(g, "imp", 0.01),
    prey = foe(g, 350),
    crowd = Array.from({ length: 12 }, (_, i) => foe(g, 350, 30 + i * 3));
  imp.x = imp.y = 0;
  g.update(0.05);
  assert.ok(damage(prey) > 0);
  assert.equal(crowd.filter((e) => damage(e) > 0).length, 7);
  assert.ok(!g.companions.includes(imp));
  assert.equal(g.damageSources.companions, 480);
  g.update(0.05);
  assert.equal(g.damageSources.companions, 480);
});

test("pet AoE preserves Reaper resistance and immunity without suppressing nearby splash", () => {
  const g = arena("vesper"),
    reaper = foe(g, 350, 0, true),
    nearby = foe(g, 350, 60);
  impBolt(g, 350, 0);
  g.update(0.05);
  assert.equal(damage(reaper), 4);
  assert.equal(reaper.hexTime || 0, 0);
  assert.equal(reaper.stun, 0);
  assert.ok(nearby.hexTime > 0 && damage(nearby) === 20);
  const fen = arena("fen"),
    death = foe(fen, 400, 0, true);
  fen.skill();
  assert.equal(death.markUntil || 0, 0);
  assert.equal(death.stun, 0);
  assert.equal(death.x, 400);
  assert.ok(Math.abs(damage(death) - 53 * 0.08) < 1e-7);
});

test("summoning spells grant the same sustained pet AoE without extra permanent unlocks", () => {
  const warlock = arena("vesper");
  warlock.journey.talents.vesper_spell2 = 1;
  releaseSpell(warlock, "vesper_spell2");
  assert.ok(warlock.classState.pact > 0);
  assert.equal(warlock.companions.filter((c) => c.spellId).length, 2);
  for (const c of warlock.companions) c.attack = 1e8;
  foe(warlock, 350);
  const outer = foe(warlock, 350, 125);
  impBolt(warlock, 350, 0);
  warlock.update(0.05);
  assert.equal(damage(outer), 22.5);
  const hunter = arena("fen");
  hunter.journey.talents.fen_spell1 = 1;
  releaseSpell(hunter, "fen_spell1");
  assert.ok(hunter.classState.command > 0);
  const wolf = hunter.companions.find((c) => c.spellId);
  hunter.companions = [wolf];
  wolf.x = 40;
  wolf.y = 0;
  wolf.attack = 0;
  foe(hunter, 65);
  const pack = Array.from({ length: 10 }, (_, i) =>
    foe(hunter, 40, 30 + i * 6),
  );
  archetypeUpdate(hunter, 0.05);
  assert.equal(pack.filter((e) => damage(e) > 0).length, 7);
});

test("queued pet commands and projectiles freeze in menus and cannot release after death", () => {
  for (const hero of ["vesper", "fen"]) {
    const g = arena(hero),
      e = foe(g, 400);
    assert.ok(g.castSkill());
    g.state = "paused";
    const pending = g.pendingSkill.remaining;
    g.update(0.05);
    assert.equal(g.pendingSkill.remaining, pending);
    assert.equal(damage(e), 0);
    g.state = "playing";
    g.p.invuln = 0;
    g.p.shield = 0;
    g.hurt(1e9);
    g.update(0.05);
    assert.equal(damage(e), 0);
    assert.equal(g.pendingSkill, null);
  }
  const g = arena("vesper"),
    e = foe(g, 350);
  impBolt(g, 350, 0);
  g.state = "paused";
  g.update(0.05);
  assert.equal(damage(e), 0);
  g.state = "playing";
  g.update(0.05);
  assert.equal(damage(e), 50);
});
