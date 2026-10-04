import test from "node:test";
import { veteranSave } from "./helpers.mjs";
import assert from "node:assert/strict";
import {
  Game,
  HEROES,
  freshSave,
  sanitizeSave,
  UPGRADES,
  pressure,
} from "../src/game/index.ts";
import {
  RESEARCH,
  buyResearch,
  researchCost,
  researchRank,
  RELICS,
} from "../src/game/progression/ascension.ts";
import { talentLock } from "../src/game/progression/progression.ts";
const make = (hero = "cinder") => new Game(hero, veteranSave(), () => 0.99);
function target(g) {
  g.enemies = [];
  g.spawnEnemy("brute", 40);
  const e = g.enemies[0];
  Object.assign(e, { x: 40, y: 0, hp: 1e9, maxHp: 1e9 });
  return e;
}
test("weapons remain claimable beyond rank 20; ascension rewards cannot be duplicated", () => {
  const g = make();
  g.level = 100;
  for (const id of ["signature", "active", ...RELICS]) {
    assert.equal(UPGRADES[id].max, Infinity);
    g.ranks[id] = 39;
    g.state = "levelup";
    g.pendingLevels = 1;
    g.offered = [id];
    const points = g.talentPoints;
    assert.ok(g.upgrade(id));
    assert.equal(g.rank(id), 40);
    assert.equal(g.talentPoints, points + 1);
    assert.equal(g.upgrade(id), false);
  }
});
test("high-rank damage grows while projectile counts and orbit reach remain bounded", () => {
  for (const hero of HEROES) {
    const g = make(hero.id);
    let low;
    for (const rank of [5, 50, 200]) {
      const e = target(g);
      g.ranks.signature = rank;
      g.ranks.orbit = rank;
      g.recalculate();
      const before = e.hp;
      g.hit(
        e,
        30,
        0,
        {
          cinder: "ember",
          briar: "thorn",
          nyx: "knife",
          volta: "arc",
          rook: "hammer",
          lumen: "arrow",
          vesper: "hex",
          fen: "huntarrow",
          solace: "holy",
          orin: "spirit",
          kestrel: "fist",
          morrow: "runeblade",
        }[hero.id],
      );
      const damage = before - e.hp;
      if (low) assert.ok(damage > low, hero.id);
      low = damage;
      g.bullets = [];
      g.attack();
      assert.ok(g.bullets.length <= 16);
      const orbs = g.orbitPositions();
      assert.ok(orbs.length <= 33);
      assert.ok(orbs.every((o) => Math.hypot(o.x - g.p.x, o.y - g.p.y) <= 221));
    }
  }
  assert.ok(pressure(1800).hp > pressure(600).hp * 3);
});
test("hero research charges exact costs, respects shards, migrates and affects only its hero", () => {
  const save = freshSave();
  save.embers = 1e7;
  save.shards = 5;
  for (const r of RESEARCH)
    for (let i = 0; i < 5; i++) {
      const price = researchCost(i, r.id),
        before = save.embers;
      assert.ok(buyResearch(save, "cinder", r.id));
      assert.equal(save.embers, before - price.embers);
    }
  const copy = sanitizeSave(JSON.parse(JSON.stringify(save)));
  assert.equal(researchRank(copy, "cinder", "weapon"), 5);
  assert.equal(researchRank(copy, "briar", "weapon"), 0);
  const advanced = new Game("cinder", copy),
    plain = make();
  assert.ok(advanced.weaponPower("signature") > plain.weaponPower("signature"));
  assert.ok(advanced.skillPower > plain.skillPower);
  assert.ok(advanced.xpMultiplier > plain.xpMultiplier);
  save.research.cinder.weapon = 9;
  save.shards = 0;
  const before = save.embers;
  assert.equal(buyResearch(save, "cinder", "weapon"), false);
  assert.equal(save.embers, before);
  assert.equal(buyResearch(save, "fake", "weapon"), false);
});
test("active skills gain distinct fields and scale past their early ranks", () => {
  for (const [hero, kind] of Object.entries({
    cinder: "fire",
    briar: "garden",
    nyx: "veil",
    volta: "vortex",
  })) {
    const g = make(hero);
    target(g);
    g.ranks.active = 10;
    g.recalculate();
    assert.ok(g.skillPower > 3);
    assert.ok(g.skillCooldown < g.hero.cooldown);
    assert.ok(g.skill());
    assert.ok(g.zones.some((z) => z.kind === kind));
    g.p.hp = g.p.maxHp / 2;
    g.advanceSystems(0.05);
    if (hero === "briar") assert.ok(g.p.hp > g.p.maxHp / 2);
    const old = g.skillPower;
    g.ranks.active = 30;
    g.recalculate();
    assert.ok(g.skillPower > old);
  }
});
test("deep talents have level gates and endless resonance is an actual damage investment", () => {
  const g = make();
  g.ranks.afterburn = 3;
  g.talentPoints = 100;
  assert.ok(talentLock(g, "afterburn"));
  g.level = 40;
  for (let i = 3; i < 12; i++) assert.ok(g.spendTalent("afterburn"));
  assert.equal(g.spendTalent("afterburn"), false);
  const before = g.damage;
  for (let i = 0; i < 60; i++) assert.ok(g.spendResonance());
  assert.ok(g.damage > before * 2);
  assert.equal(g.rank("ascendance"), 60);
  g.level = 19;
  assert.equal(g.spendResonance(), false);
});
test("late enemy XP stays stable and run points remain sparse after level 20", () => {
  const g = make();
  let e = target(g);
  g.kill(e);
  const early = g.pickups.at(-1).value;
  g.time = 600;
  e = target(g);
  g.kill(e);
  const late = g.pickups.filter((p) => p.kind === "xp").at(-1).value;
  assert.equal(late, early);
  g.level = 22;
  const points = g.talentPoints;
  g.gainXp(g.threshold());
  assert.equal(g.level, 23);
  assert.equal(g.talentPoints, points);
  g.gainXp(g.threshold());
  assert.equal(g.level, 24);
  assert.equal(g.talentPoints, points + 1);
});
test("deep defensive talents never turn hostile damage into healing", () => {
  for (const hero of ["briar", "volta"]) {
    const g = make(hero);
    g.ranks.barkskin = 8;
    g.ranks.insulation = 8;
    g.recalculate();
    g.plant(0, 0);
    g.p.shield = 100;
    g.p.invuln = 0;
    g.hurt(100);
    assert.ok(g.p.shield < 100);
    assert.ok(g.p.hp <= g.p.maxHp);
  }
});
