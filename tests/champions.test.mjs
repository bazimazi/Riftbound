import test from "node:test";
import assert from "node:assert/strict";
import { Game, freshSave, sanitizeSave, bankRun } from "../src/game/index.ts";
import {
  heroUnlocked,
  heroGoals,
  EXTRA_HEROES,
} from "../src/game/combat/champions.ts";
import { collectFind } from "../src/game/world/realms.ts";
import { buyResearch } from "../src/game/progression/ascension.ts";
import {
  CODEX,
  codexUnlocked,
  equippedPages,
} from "../src/game/progression/progression.ts";
import { veteranSave } from "./helpers.mjs";
const make = (id) => new Game(id, veteranSave(), () => 0.99);
function foe(g, x = 80, hp = 1e7) {
  g.enemies = [];
  g.spawnEnemy("brute", 80);
  const e = g.enemies[0];
  Object.assign(e, { x, y: 0, hp, maxHp: hp });
  return e;
}
test("new heroes require every banked condition and migrated achievements count", () => {
  const s = freshSave();
  for (const h of EXTRA_HEROES) {
    assert.equal(heroUnlocked(s, h.id), false);
    assert.throws(() => new Game(h.id, s), /locked/);
  }
  s.bosses = 2;
  assert.equal(heroUnlocked(s, "rook"), false);
  s.bosses = 3;
  assert.ok(heroUnlocked(s, "rook"));
  s.memories.cinder = {
    "hollow:10": true,
    "hollow:11": true,
    "hollow:12": true,
    "hollow:13": true,
  };
  s.best = 239;
  assert.equal(heroUnlocked(s, "lumen"), false);
  s.best = 240;
  assert.ok(heroUnlocked(s, "lumen"));
  const loaded = sanitizeSave(JSON.parse(JSON.stringify(s)));
  assert.ok(heroUnlocked(loaded, "rook") && heroUnlocked(loaded, "lumen"));
  assert.equal(heroGoals(loaded, "lumen")[0].value, 4);
  assert.equal(heroUnlocked(s, "unknown"), false);
});
test("banking announces newly unlocked heroes once and memory unlocks survive reload", () => {
  const s = freshSave(),
    g = new Game("cinder", s, () => 0.99); // Roll all four memory identities for this unlock.
  g.bossesKilled = 3;
  g.time = 240;
  assert.equal(g.finds.filter((f) => f.kind === "memory").length, 4);
  for (const f of g.finds.filter((f) => f.kind === "memory")) collectFind(g, f);
  assert.equal(heroUnlocked(s, "lumen"), false);
  assert.ok(bankRun(s, g));
  assert.deepEqual(
    g.heroUnlocks.map((h) => h.id),
    ["rook", "lumen", "fen"],
  );
  assert.equal(bankRun(s, g), false);
  assert.equal(s.bosses, 3);
  assert.ok(heroUnlocked(sanitizeSave(JSON.parse(JSON.stringify(s))), "lumen"));
  const next = new Game("rook", s);
  bankRun(s, next);
  assert.equal(next.heroUnlocks.length, 0);
});
test("Rook has a directional hammer, consumes poise, restores shield on kills and scales", () => {
  const g = make("rook"),
    e = foe(g);
  assert.equal(g.p.shield, 12);
  g.attack();
  const low = e.maxHp - e.hp;
  assert.ok(low > 0);
  assert.equal(g.bullets.length, 0);
  e.hp = e.maxHp;
  g.p.trait = 1;
  g.attack();
  assert.ok(e.maxHp - e.hp > low);
  assert.equal(g.p.trait, 0);
  g.p.shield = 0;
  for (let i = 0; i < 5; i++) g.kill({ x: 0, y: 0, r: 10, hp: 0 });
  assert.equal(g.p.shield, 2);
  foe(g);
  g.ranks.signature = 50;
  g.recalculate();
  g.attack();
  assert.ok(g.damageSources.signature > low * 4);
  g.p.skillCd = 0;
  g.skill();
  assert.ok(g.p.shield > 2);
  assert.ok(g.damageSources.active > 0);
});
test("Lumen fires piercing arrows, consumes focus and uses a separately tracked skill", () => {
  const g = make("lumen");
  foe(g, 300);
  g.attack();
  assert.equal(g.bullets.length, 2);
  const plain = g.bullets[0];
  assert.equal(plain.type, "arrow");
  assert.equal(plain.pierce, 2);
  g.bullets = [];
  g.p.trait = 1;
  g.attack();
  assert.ok(
    g.bullets[0].damage > plain.damage && g.bullets[0].pierce > plain.pierce,
  );
  assert.equal(g.p.trait, 0);
  g.bullets = [];
  g.skill();
  assert.equal(g.bullets.length, 11);
  assert.ok(g.bullets.every((b) => b.channel === "active"));
  g.p.invuln = 100;
  for (let i = 0; i < 40; i++) g.update(0.05, { x: 0, y: 0 });
  assert.ok(g.stats.damage > 0);
  assert.ok(Number.isFinite(g.attackTimer));
});
test("new capstones, evolution effects, inscriptions and research change combat", () => {
  const r = make("rook");
  foe(r);
  r.ranks.earthshatter = 1;
  r.p.trait = 1;
  r.attack();
  assert.equal(r.bullets.length, 8);
  r.ranks.unbroken = 1;
  r.p.invuln = 0;
  r.skill();
  assert.ok(r.p.invuln >= 1);
  const l = make("lumen");
  foe(l);
  l.ranks.fullmoon = 1;
  l.ranks.doubleshot = 1;
  l.p.trait = 1;
  l.attack();
  assert.equal(l.bullets.length, 8);
  l.ranks.starfall = 1;
  l.skill();
  assert.ok(l.zones.some((z) => z.kind === "veil"));
  for (const id of ["rook", "lumen"]) {
    const g = make(id);
    foe(g);
    g.level = 12;
    g.time = 180;
    g.ranks.signature = 8;
    g.ranks.active = 5;
    g.ranks[id === "rook" ? "armor" : "precision"] = 3;
    g.ranks[id === "rook" ? "vitality" : "focus"] = 3;
    g.evolutionSeals = 2;
    assert.ok(g.evolve(id + "-soul"));
    assert.ok(g.evolve(id + "-skill"));
    g.p.trait = 1;
    g.attack();
    g.skill();
    assert.ok(g.bullets.length > 0);
    const s = g.save;
    s.embers = 1000;
    const before = g.weaponPower("signature");
    assert.ok(buyResearch(s, id, "weapon"));
    assert.ok(g.weaponPower("signature") > before);
    s.chronicle[id] = { kills: 400, dashes: 100, best: 300, evolutions: 1 };
    const pages = CODEX.filter((p) => p.hero === id);
    assert.equal(pages.length, 3);
    assert.ok(pages.every((p) => codexUnlocked(s, p)));
    s.loadouts[id] = [pages[0].id];
    assert.deepEqual(equippedPages(s, id), [pages[0].id]);
  }
});
test("both new heroes still take damage with deep talents; traits freeze while paused", () => {
  for (const id of ["rook", "lumen"]) {
    const g = make(id);
    g.ranks.bastion = 8;
    g.p.shield = 5;
    g.p.invuln = 0;
    g.hurt(100);
    assert.ok(g.p.hp < g.p.maxHp);
    g.state = "paused";
    const trait = g.p.trait;
    g.update(0.05);
    assert.equal(g.p.trait, trait);
  }
});
test("new legacy milestones and exclusive inscriptions alter their own mechanics", () => {
  for (const id of ["rook", "lumen"]) {
    const s = veteranSave();
    s.memories[id] = {};
    for (const realm of ["hollow", "ashen", "astral"])
      for (const i of [10, 11, 12, 13]) s.memories[id][`${realm}:${i}`] = true;
    const g = new Game(id, s, () => 0.99);
    assert.equal(g.legacy.count, 12);
    g.attackTimer = 100;
    g.enemies = [];
    g.update(0.05);
    assert.ok(g.p.trait > (id === "rook" ? 0.011 : 0.0275));
    g.p.shield = 0;
    g.skill();
    assert.ok(g.p.shield >= (id === "rook" ? 25 : 4));
    foe(g);
    g.p.trait = 1;
    g.p.skillCd = 5;
    const shield = g.p.shield;
    g.attack();
    if (id === "rook") assert.equal(g.p.shield, shield + 2);
    else assert.equal(g.p.skillCd, 4.7);
  }
  const r = make("rook");
  r.pages = ["stonewake", "gildedguard", "oldvow"];
  r.recalculate();
  r.dash();
  assert.equal(r.p.trait, 0.12);
  assert.ok(r.dashCooldown > 3.8);
  foe(r);
  r.p.trait = 1;
  r.p.shield = 0;
  r.attack();
  assert.equal(r.p.shield, 3);
  const l = make("lumen");
  l.pages = ["moonescape", "moonstring", "farshot"];
  l.recalculate();
  const e = foe(l);
  l.dash();
  assert.equal(l.p.trait, 0.08);
  assert.ok(e.slow > 0);
  l.p.trait = 0;
  l.bullets = [];
  l.attack();
  const nearby = l.bullets[0].damage;
  l.bullets = [];
  e.x = 300;
  l.attack();
  assert.ok(l.bullets[0].damage > nearby);
});
