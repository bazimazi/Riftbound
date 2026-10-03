import test from "node:test";
import { veteranSave } from "./helpers.mjs";
import assert from "node:assert/strict";
import {
  Game,
  HEROES,
  FORGE,
  freshSave,
  sanitizeSave,
  bankRun,
  buyForge,
  forgeBonus,
  forgeCost,
} from "../src/core.js";
import {
  TALENT_TREES,
  TALENT_NODES,
  talentLock,
  CODEX,
  codexUnlocked,
  toggleInscription,
  equippedPages,
  forgeLock,
  activeSynergies,
  masteryLevel,
  SHRINE_BOONS,
} from "../src/progression.js";
import { talentAvailable } from "../src/class-talents.js";
const random = () => 0.5;
function enemy(g, type = "brute", hp = 1000) {
  g.enemies = [];
  g.spawnEnemy(type, 70);
  const e = g.enemies[0];
  e.x = 50;
  e.y = 0;
  e.hp = e.maxHp = hp;
  return e;
}
test("version-one saves migrate without losing currency, records or hero progress", () => {
  const old = {
    version: 1,
    embers: 333,
    runs: 12,
    kills: 800,
    best: 178,
    forge: { might: 4, vigor: 3, wisdom: 1, agility: 2 },
    mastery: { cinder: 450 },
    sound: true,
  };
  const s = sanitizeSave(old);
  assert.equal(s.version, 7);
  assert.equal(s.embers, 333);
  assert.equal(s.runs, 12);
  assert.equal(s.forge.might, 4);
  assert.equal(Object.keys(s.forge).length, 24);
  assert.equal(s.mastery.cinder, 450);
  assert.equal(s.chronicle.cinder.kills, 450);
  assert.deepEqual(equippedPages(s, "cinder"), ["pilgrim"]);
  assert.ok(s.sound);
});
test("all 54 talent nodes obey hero ownership, prerequisites, level gates and point budget", () => {
  assert.equal(Object.keys(TALENT_NODES).length, 108);
  for (const h of HEROES)
    for (const branch of TALENT_TREES[h.id]) {
      const g = new Game(h.id, veteranSave());
      g.talentPoints = 20;
      const [root, advanced, capstone] = branch.nodes;
      assert.equal(g.spendTalent(advanced.id), false);
      assert.ok(g.spendTalent(root.id));
      assert.ok(g.spendTalent(root.id));
      assert.equal(g.spendTalent(advanced.id), false, "level gate");
      g.level = 5;
      assert.ok(g.spendTalent(advanced.id));
      assert.ok(g.spendTalent(advanced.id));
      assert.equal(g.spendTalent(capstone.id), false);
      g.level = 9;
      assert.ok(g.spendTalent(capstone.id));
      assert.equal(g.spendTalent(capstone.id), false);
      assert.equal(g.talentPoints, 13);
      g.talentPoints = 0;
      assert.equal(g.spendTalent(root.id), false);
    }
});
test("run resonance is sparse and Warden rewards cannot be duplicated", () => {
  const g = new Game("cinder");
  g.gainXp(g.threshold());
  assert.equal(g.level, 2);
  assert.equal(g.talentPoints, 0);
  g.gainXp(g.threshold());
  assert.equal(g.talentPoints, 0);
  g.level = 7;
  g.gainXp(g.threshold());
  assert.equal(g.talentPoints, 1);
  g.state = "playing";
  const boss = enemy(g, "boss", 1);
  g.hit(boss, 100);
  assert.equal(g.talentPoints, 2);
  assert.equal(g.shards, 1);
  assert.equal(g.bossesKilled, 1);
  g.kill(boss);
  assert.equal(g.bossesKilled, 1);
  assert.equal(g.talentPoints, 2);
  assert.equal(g.shards, 1);
  assert.ok(
    g.events.some(
      (e) => e.type === "announce" && e.text.includes("+1 run resonance"),
    ),
  );
});

test("boss and altar resonance is temporary; permanent Warden points bank at ten kills", () => {
  const save = freshSave();
  save.chronicle.cinder = { bosses: 9 };
  const g = new Game("cinder", save, random);
  assert.equal(talentAvailable(save, "cinder"), 0);
  g.kill(enemy(g, "boss", 1));
  assert.equal(g.talentPoints, 1);
  assert.equal(talentAvailable(save, "cinder"), 0);
  const tribute = SHRINE_BOONS.find((b) => b.id === "tribute");
  assert.match(tribute.desc, /run resonance.*this run.*LV20/);
  g.shrines = [{ x: g.p.x, y: g.p.y, used: false }];
  g.vaults = [];
  assert.ok(g.interact());
  g.shrineChoices = [tribute];
  const embers = g.embers;
  assert.ok(g.chooseBoon("tribute"));
  assert.equal(g.embers, embers + 20);
  assert.equal(g.talentPoints, 2);
  assert.equal(talentAvailable(save, "cinder"), 0);
  assert.ok(
    g.events.some(
      (e) =>
        e.type === "announce" &&
        e.text.includes("PACT SEALED") &&
        e.text.includes("+20 embers · +1 run resonance"),
    ),
  );
  assert.equal(g.enemies.filter((e) => e.elite && !e.boss).length, 8);
  assert.equal(g.chooseBoon("tribute"), false);
  assert.equal(g.talentPoints, 2);
  assert.equal(g.spendResonance(), false, "spending waits for run level 20");
  g.level = 20;
  const damage = g.damage;
  assert.ok(g.spendResonance());
  assert.ok(g.damage > damage);
  assert.equal(g.talentPoints, 1);
  assert.equal(talentAvailable(save, "cinder"), 0);
  assert.ok(bankRun(save, g));
  assert.equal(save.chronicle.cinder.bosses, 10);
  assert.equal(talentAvailable(save, "cinder"), 1);
  assert.equal(talentAvailable(save, "briar"), 0);
  assert.equal(bankRun(save, g), false);
  const reloaded = sanitizeSave(save);
  assert.equal(talentAvailable(reloaded, "cinder"), 1);
  assert.equal(new Game("cinder", reloaded).talentPoints, 0);
});
test("rare forge crafts require rank gates, shards, and boss milestones; prices are charged atomically", () => {
  const s = freshSave();
  s.embers = 10000;
  s.shards = 20;
  assert.equal(buyForge(s, "reprieve"), false);
  s.forge.might = 20;
  assert.equal(buyForge(s, "reprieve"), false);
  s.bosses = 3;
  const before = s.embers;
  assert.ok(buyForge(s, "reprieve"));
  assert.equal(s.embers, before - forgeCost(0, "reprieve"));
  assert.equal(s.shards, 17);
  assert.equal(buyForge(s, "reprieve"), false);
  s.shards = 0;
  assert.equal(buyForge(s, "bindings"), false);
});
test("forge disciplines alter their actual combat systems with bounded bonuses", () => {
  const base = new Game("volta"),
    s = freshSave();
  for (const f of FORGE) s.forge[f.id] = f.max;
  const g = new Game("volta", s);
  assert.ok(g.damage > base.damage);
  assert.ok(g.p.maxHp > base.p.maxHp);
  assert.ok(g.attackSpeed > base.attackSpeed);
  assert.ok(g.critChance > base.critChance);
  assert.ok(g.critDamage > base.critDamage);
  assert.ok(g.moveSpeed > base.moveSpeed);
  assert.ok(g.pickupRange > base.pickupRange);
  assert.ok(g.xpMultiplier > base.xpMultiplier);
  assert.ok(g.damageReduction < base.damageReduction);
  assert.ok(g.skillCooldown < base.skillCooldown);
  assert.ok(g.dashCooldown < base.dashCooldown);
  assert.ok(g.durationScale > base.durationScale);
  assert.equal(g.revives, 1);
  assert.equal(g.rerolls, 5);
  assert.equal(g.talentPoints, 2);
  assert.equal(g.banishes, 3);
});
test("codex unlocks from completed expeditions and enforces hero and binding limits", () => {
  const s = freshSave(),
    g = new Game("cinder", s);
  g.kills = 300;
  g.stats.dashes = 20;
  g.embers = 120;
  bankRun(s, g);
  assert.ok(
    codexUnlocked(
      s,
      CODEX.find((p) => p.id === "scorchstep"),
    ),
  );
  assert.ok(
    codexUnlocked(
      s,
      CODEX.find((p) => p.id === "coldflame"),
    ),
  );
  assert.ok(g.discoveries.length >= 3);
  assert.equal(
    toggleInscription(s, "cinder", "scorchstep"),
    false,
    "default binding full",
  );
  assert.ok(toggleInscription(s, "cinder", "pilgrim"));
  assert.ok(toggleInscription(s, "cinder", "scorchstep"));
  assert.equal(toggleInscription(s, "nyx", "scorchstep"), false);
  const next = new Game("cinder", s);
  next.dash();
  assert.equal(next.zones.length, 1);
  assert.equal(next.zones[0].kind, "fire");
});
test("hero mastery retains affinity, reroll and precision without granting extra run points", () => {
  const s = freshSave();
  s.mastery.nyx = 12100;
  s.affinities.nyx = "executioner";
  const g = new Game("nyx", s);
  assert.equal(masteryLevel(12100), 12);
  assert.equal(g.rank("executioner"), 1);
  assert.equal(g.rerolls, 3);
  assert.equal(g.talentPoints, 0);
  assert.ok(g.critChance > 0.06);
});
test("capstones produce fire chains, living gardens, shadow allies and gravity wells", () => {
  const c = new Game("cinder", freshSave(), random);
  c.ranks.combustion = 1;
  const e = enemy(c, "crawler", 10);
  e.dotTime = 1;
  c.hit(e, 100);
  assert.equal(c.zones[0].kind, "explosion");
  c.ranks.rebirth = 1;
  c.p.invuln = 0;
  c.hurt(1e6);
  assert.equal(c.state, "playing");
  assert.ok(c.reborn);
  c.p.invuln = 0;
  c.hurt(1e6);
  assert.equal(c.state, "dead");
  const b = new Game("briar", freshSave(), random);
  b.ranks.grove = 1;
  b.ranks.heartwood = 1;
  enemy(b);
  b.plants[0].attack = 0;
  b.update(0.05);
  assert.ok(b.bullets.length >= 3);
  b.skill();
  assert.equal(b.p.shield, 35);
  const n = new Game("nyx");
  n.ranks.phantom = 1;
  n.skill();
  assert.equal(n.shadows[0].life, 6);
  const v = new Game("volta");
  v.ranks.blackstar = 1;
  v.ranks.tempest = 1;
  v.skill();
  assert.equal(v.zones[0].kind, "vortex");
  assert.ok(v.bullets.length >= 8);
});
test("inscriptions change every hero’s combat loop rather than just displaying unlocked text", () => {
  for (const [hero, page] of [
    ["cinder", "coldflame"],
    ["briar", "wanderseed"],
    ["nyx", "mirror"],
    ["volta", "livewire"],
  ]) {
    const s = freshSave();
    s.chronicle[hero] = { kills: 1000, dashes: 40, skills: 40 };
    s.loadouts[hero] = [page];
    const g = new Game(hero, s, random);
    if (hero === "cinder") {
      const e = enemy(g);
      g.hit(e, 10, 0, "ember");
      assert.ok(e.slow > 0);
    }
    if (hero === "briar") {
      const before = g.plants.length;
      g.dash();
      g.p.dashCd = 0;
      g.dash();
      assert.equal(g.plants.length, before + 1);
    }
    if (hero === "nyx") {
      g.skill();
      assert.equal(g.shadows[0].life, 4);
    }
    if (hero === "volta") {
      const e = enemy(g);
      g.dash();
      assert.ok(e.hp < e.maxHp);
    }
  }
});
test("altar choices apply costs and consequences and cannot be claimed twice", () => {
  const g = new Game("cinder");
  g.shrines = [{ x: 0, y: 0, used: false }];
  assert.ok(g.interact());
  g.shrineChoices = [{ id: "blood" }, { id: "mercy" }];
  assert.equal(g.chooseBoon("mercy"), false);
  const hp = g.p.maxHp;
  assert.ok(g.chooseBoon("blood"));
  assert.ok(g.damage > 1);
  assert.ok(g.p.maxHp < hp);
  assert.equal(g.chooseBoon("blood"), false);
  assert.equal(g.interact(), false);
});
test("banish removes an upgrade for the run and synergies activate from actual ranks", () => {
  const g = new Game("nyx");
  g.gainXp(20);
  g.banishes = 1;
  g.offered = ["orbit", "nova", "power"];
  assert.ok(g.banish("orbit"));
  for (let i = 0; i < 30; i++) assert.ok(!g.choices().includes("orbit"));
  assert.equal(g.banishes, 0);
  g.ranks.orbit = 3;
  g.ranks.nova = 3;
  assert.ok(activeSynergies(g).some((s) => s.id === "choir"));
});
test("oaths increase enemy pressure and rewards and unlock progressively", () => {
  const s = freshSave();
  s.maxOath = 3;
  s.oath = 3;
  const g = new Game("cinder", s, random),
    base = new Game("cinder", freshSave(), random);
  assert.ok(g.enemies[0].hp > base.enemies[0].hp * 1.8);
  assert.ok(g.enemies[0].damage > base.enemies[0].damage);
  g.embers = 100;
  g.bossesKilled = 1;
  g.time = 180;
  bankRun(s, g);
  assert.equal(s.embers, 175);
  assert.equal(s.maxOath, 4);
});
test("new enemy patterns and hazard telegraphs remain finite and damage only after warning", () => {
  const g = new Game("volta", freshSave(), random);
  for (const type of ["moth", "revenant", "shaman"]) g.spawnEnemy(type, 120);
  g.time = 49;
  g.p.invuln = 0;
  const hp = g.p.hp;
  g.advanceSystems(0.01);
  assert.equal(g.p.hp, hp);
  assert.ok(g.hazards.length > 0);
  for (const z of g.hazards) z.warn = -1;
  g.advanceSystems(0.01);
  assert.ok(g.p.hp < hp);
  assert.ok(g.enemies.every((e) => Number.isFinite(e.hp)));
});
test("all seven normal enemy types remain in the late-game population", () => {
  const g = new Game("cinder");
  g.enemies = [];
  g.time = 200;
  const types = new Set();
  for (let i = 0; i < 100; i++) {
    g.random = () => i / 100;
    g.spawnEnemy();
    types.add(g.enemies.at(-1).type);
  }
  for (const id of [
    "crawler",
    "runner",
    "spitter",
    "brute",
    "moth",
    "revenant",
    "shaman",
  ])
    assert.ok(types.has(id), id);
});
test("boss variants have distinct patterns and boss populations stay bounded", () => {
  const g = new Game("volta");
  g.enemies = [];
  g.p.invuln = 10;
  g.spawnEnemy("boss_oracle", 200);
  g.enemies[0].attack = 0;
  g.update(0.02);
  assert.ok(g.enemies.some((e) => e.type === "moth"));
  assert.ok(g.hazards.length);
  for (let i = 0; i < 8; i++) g.spawnEnemy("boss_revenant", 300);
  assert.equal(g.enemies.filter((e) => e.boss).length, 5);
});
test("stuns stop active charges and overloads do not erase an existing larger shield", () => {
  const g = new Game("volta");
  const e = enemy(g, "boss");
  e.charge = 0.8;
  e.cx = 1;
  e.cy = 0;
  e.stun = 2;
  const x = e.x;
  g.update(0.02);
  assert.equal(e.x, x);
  g.p.shield = 48;
  g.overload();
  assert.equal(g.p.shield, 48);
});
