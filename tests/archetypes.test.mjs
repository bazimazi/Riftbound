import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  HEROES,
  EVOLUTIONS,
  freshSave,
  sanitizeSave,
  bankRun,
} from "../src/game/index.ts";
import { heroUnlocked, heroGoals } from "../src/game/combat/champions.ts";
import {
  ARCHETYPE_IDS,
  companionTarget,
  hurtCompanion,
  summonCompanion,
  archetypeUpdate,
} from "../src/game/combat/archetypes.ts";
import { CLASS_TREES } from "../src/game/progression/class-talents.ts";
import { CODEX } from "../src/game/progression/progression.ts";
import { recipesFor, evolve } from "../src/game/progression/evolutions.ts";
import {
  profile,
  heroThreshold,
  releaseFormSkill,
} from "../src/game/progression/journey.ts";
import { veteranSave } from "./helpers.mjs";
function arena(id) {
  const g = new Game(id, veteranSave(), () => 0.99);
  g.enemies = [];
  g.spawnTimer = g.attackTimer = g.nextBoss = g.nextCache = 1e6;
  return g;
}
function foe(g, x = 70, hp = 1e6, type = "crawler") {
  g.spawnEnemy(type, 100);
  const e = g.enemies.at(-1);
  Object.assign(e, {
    x,
    y: 0,
    hp,
    maxHp: hp,
    speed: 0,
    attack: 1e6,
    enemySkill: 1e6,
  });
  return e;
}
function tick(g, seconds) {
  for (let t = 0; t < seconds - 1e-7; t += 0.05) g.update(0.05);
}
test("six additional outcasts use banked two-part unlocks and preserve v7 progress", () => {
  const fresh = freshSave(),
    veteran = sanitizeSave(veteranSave());
  assert.equal(HEROES.length, 12);
  for (const id of ARCHETYPE_IDS) {
    assert.equal(heroUnlocked(fresh, id), false);
    assert.equal(heroGoals(fresh, id).length, 2);
    assert.ok(heroUnlocked(veteran, id), id);
    assert.throws(() => new Game(id, fresh), /locked/);
    const g = new Game(id, veteran);
    assert.equal(CLASS_TREES[id].flatMap((b) => b.nodes).length, 33);
    assert.equal(CODEX.filter((p) => p.hero === id).length, 3);
    assert.equal(recipesFor(g).filter((r) => r.hero === id).length, 2);
  }
  assert.equal(heroUnlocked({ ...veteran, best: 359 }, "morrow"), false);
  assert.equal(heroUnlocked({ ...veteran, runs: 5 }, "solace"), false);
  assert.equal(heroUnlocked({ ...veteran, kills: 1499 }, "vesper"), false);
  assert.equal(heroUnlocked({ ...veteran, chronicle: {} }, "kestrel"), false);
  assert.equal(heroUnlocked({ ...veteran, realmRecords: {} }, "orin"), false);
});
test("warlock curses harvest souls and summon a finite empowered retinue", () => {
  const g = arena("vesper");
  assert.deepEqual(
    g.companions.map((c) => c.kind),
    ["imp", "guardian"],
  );
  const e = foe(g, 100);
  g.hit(e, 10, 0, "hex");
  assert.ok(e.hexTime > 0);
  const before = e.hp;
  tick(g, 0.5);
  assert.ok(e.hp < before);
  g.kill(e);
  assert.ok(g.p.trait >= 0.2);
  g.p.trait = 1;
  g.skill();
  assert.ok(g.classState.pact >= 10);
  assert.equal(g.p.trait, 0);
  assert.equal(g.companions.filter((c) => c.kind === "imp").length, 5);
  for (let i = 0; i < 30; i++) summonCompanion(g, "imp", 1);
  assert.ok(g.companions.length <= 8);
  tick(g, 12);
  assert.equal(g.companions.filter((c) => !c.permanent).length, 0);
});
test("companions deal separately tracked damage, take damage, recover and freeze in menus", () => {
  const g = arena("fen"),
    wolf = g.companions[0],
    e = foe(g, 40);
  wolf.x = 30;
  wolf.y = 0;
  tick(g, 0.6);
  assert.ok(g.damageSources.companions > 0);
  g.time = 2;
  hurtCompanion(g, wolf, 1e6);
  assert.equal(wolf.hp, 0);
  assert.equal(wolf.down, 8);
  g.state = "paused";
  tick(g, 5);
  assert.equal(wolf.down, 8);
  g.state = "playing";
  g.enemies = [];
  tick(g, 8.1);
  assert.ok(wolf.hp > 0 && wolf.hp < wolf.maxHp);
  const oldMax = wolf.maxHp;
  g.ranks.wildbond = 5;
  g.ranks.signature = 40;
  tick(g, 0.05);
  assert.ok(wolf.maxHp > oldMax * 2);
  g.p.x = g.realm.width / 2 - 40;
  g.p.y = g.realm.height / 2 - 40;
  tick(g, 0.1);
  assert.ok(wolf.x <= g.realm.width / 2 - 40);
});
test("guardian taunts lesser threats but never Wardens or Reapers", () => {
  const g = arena("vesper"),
    guard = g.companions[1],
    e = foe(g, guard.x + 20);
  assert.equal(companionTarget(g, e), guard);
  e.boss = true;
  assert.equal(companionTarget(g, e), null);
  e.boss = false;
  e.reaper = true;
  e.grace = 0;
  assert.equal(companionTarget(g, e), null);
  g.time = 2;
  hurtCompanion(g, guard, 1e6);
  assert.equal(companionTarget(g, { ...e, reaper: false }), null);
});
test("wolf prioritizes marked prey and command spends bond to revive, pounce and lay traps", () => {
  const g = arena("fen"),
    e = foe(g, 220);
  g.hit(e, 5, 0, "huntarrow");
  assert.ok(e.markUntil > g.time);
  assert.ok(g.p.trait > 0);
  const wolf = g.companions[0];
  wolf.hp = 0;
  wolf.down = 8;
  g.p.trait = 1;
  const before = e.hp;
  g.skill();
  assert.ok(wolf.hp > 0);
  assert.ok(e.hp < before);
  assert.equal(g.p.trait, 0);
  assert.ok(g.classState.command >= 11);
  assert.equal(g.zones.length, 1);
  g.ranks.ambush = 1;
  g.p.skillCd = 0;
  g.skill();
  assert.equal(g.zones.length, 4);
});
test("cleric healing is gated by landed hits, faith is spent and shields cannot grow without bound", () => {
  const g = arena("solace"),
    e = foe(g, 80);
  g.p.hp = 30;
  for (let i = 0; i < 30; i++) g.hit(e, 1, 0, "holy");
  assert.ok(g.p.hp <= 31.21);
  assert.equal(g.p.trait, 1);
  const hp = g.p.hp;
  g.skill();
  assert.ok(g.p.hp > hp && g.p.hp <= hp + g.p.maxHp * 0.2 + 1.3);
  assert.ok(g.p.trait < 1);
  for (let i = 0; i < 50; i++) {
    g.p.skillCd = 0;
    g.skill();
  }
  assert.ok(g.p.hp <= g.p.maxHp);
  assert.ok(g.p.shield <= 60);
  g.enemies = [];
  const faith = g.p.trait;
  tick(g, 3);
  assert.equal(g.p.trait, faith);
});
test("totems cycle, heal only inside their circle, expire and remain limited to three", () => {
  const g = arena("orin");
  assert.equal(g.totems[0].kind, "fire");
  g.skill();
  g.p.skillCd = 0;
  g.skill();
  assert.deepEqual(
    g.totems.map((t) => t.kind),
    ["fire", "storm", "tide"],
  );
  g.p.hp = 30;
  archetypeUpdate(g, 0.05);
  assert.ok(g.p.hp > 30);
  g.p.x = 700;
  g.p.hp = 30;
  archetypeUpdate(g, 2);
  assert.equal(g.p.hp, 30);
  for (let i = 0; i < 12; i++) {
    g.p.skillCd = 0;
    g.skill();
  }
  assert.equal(g.totems.length, 3);
  archetypeUpdate(g, 40);
  assert.equal(g.totems.length, 0);
});
test("monk misses generate no qi and third strikes cleave behind the player", () => {
  const g = arena("kestrel"),
    e = foe(g, 400);
  g.attack();
  assert.equal(g.p.trait, 0);
  assert.equal(g.classState.combo, 0);
  e.x = 70;
  g.attack();
  g.attack();
  assert.equal(g.classState.combo, 2);
  const behind = foe(g, -70);
  const hp = behind.hp;
  g.attack();
  assert.ok(behind.hp < hp);
  assert.equal(g.p.trait, 1);
  assert.equal(g.classState.combo, 0);
  g.skill();
  assert.equal(g.p.trait, 0);
  assert.ok(g.p.shield > 0);
});
test("grave knight grips lesser foes, cannot pull bosses or Reapers, and healing requires runes", () => {
  const g = arena("morrow"),
    normal = foe(g, 250),
    boss = foe(g, 250),
    reaper = foe(g, 250);
  boss.boss = true;
  reaper.reaper = true;
  reaper.grace = 0;
  g.p.hp = 30;
  g.skill();
  assert.ok(normal.x < 100);
  assert.equal(boss.x, 250);
  assert.equal(reaper.x, 250);
  assert.equal(g.p.hp, 30);
  g.p.skillCd = 0;
  g.p.trait = 1;
  g.skill();
  assert.ok(g.p.hp > 30);
  assert.equal(g.p.trait, 0);
  assert.ok(normal.hexTime > 0);
});
test("all new classes scale past early ranks and integrate recipes, training and class forms", () => {
  for (const id of ARCHETYPE_IDS) {
    const g = arena(id),
      e = foe(g, 70);
    g.attack();
    const first = g.stats.damage + g.bullets.reduce((n, b) => n + b.damage, 0);
    g.bullets = [];
    g.stats.damage = 0;
    g.ranks.signature = 50;
    g.recalculate();
    g.attack();
    assert.ok(
      g.stats.damage + g.bullets.reduce((n, b) => n + b.damage, 0) > first,
      id,
    );
    const recipe = recipesFor(g).find(
      (r) => r.hero === id && r.weapon === "signature",
    );
    g.level = 30;
    g.time = 180;
    g.evolutionSeals = 1;
    g.ranks[recipe.passive] = 3;
    assert.ok(evolve(g, recipe.id), id);
    assert.equal(evolve(g, recipe.id), false);
    const p = profile(g.save, id);
    p.xp = heroThreshold(200);
    p.stage = 2;
    p.skills.signature = p.skills.active = { level: 40, stage: 2 };
    g.journey = p;
    releaseFormSkill(g, 0);
    releaseFormSkill(g, 1);
    assert.ok(g.companions.length <= 8);
    assert.ok(
      g.stats.damage > 0 || g.bullets.length > 0 || g.totems.length > 0,
    );
    g.time = 100;
    bankRun(g.save, g);
    assert.ok(sanitizeSave(JSON.parse(JSON.stringify(g.save))).journeys[id]);
  }
});
test("advanced active ranks strengthen pet commands and placed totems", () => {
  for (const id of ["vesper", "fen", "orin"]) {
    const damage = [];
    for (const rank of [0, 30]) {
      const g = arena(id),
        e = foe(g, 70);
      g.ranks.active = rank;
      g.recalculate();
      g.p.trait = 1;
      if (id === "orin") {
        g.totems = [];
        g.classState.nextTotem = 0;
      }
      g.skill();
      g.damageSources = {};
      g.bullets = [];
      if (id !== "orin") {
        const c = g.companions.find(
          (c) => c.kind === (id === "fen" ? "wolf" : "guardian"),
        );
        g.companions = [c];
        c.x = e.x - 25;
        c.y = e.y;
        c.attack = 0;
      }
      archetypeUpdate(g, 0.05);
      damage.push(
        id === "orin"
          ? g.bullets.reduce((n, b) => n + b.damage, 0)
          : g.damageSources.companions,
      );
    }
    assert.ok(damage[0] > 0 && damage[1] > damage[0] * 2, id);
  }
});
test("every class can accept its rank-five signature awakening without crashing", () => {
  for (const h of HEROES) {
    assert.ok(EVOLUTIONS[h.id]?.name && EVOLUTIONS[h.id]?.desc, h.id);
    const g = arena(h.id);
    Object.assign(g, {
      level: 9,
      state: "levelup",
      pendingLevels: 1,
      offered: ["signature", "active", "power"],
    });
    g.ranks.signature = 4;
    assert.ok(g.upgrade("signature"), h.id);
    assert.equal(g.rank("signature"), 5);
    assert.equal(g.state, "playing");
    assert.ok(
      g.events.some((e) => e.text === `AWAKENED · ${EVOLUTIONS[h.id].name}`),
    );
  }
});
test("pets make a substantial damage contribution and grow with early signature upgrades", () => {
  for (const id of ["vesper", "fen"]) {
    const dps = [];
    for (const rank of [1, 4, 10]) {
      const g = arena(id);
      g.ranks.signature = rank;
      g.recalculate();
      const e = foe(g, 200, 1e9);
      e.damage = 0;
      tick(g, 2);
      g.damageSources = {};
      tick(g, 8);
      dps.push(g.damageSources.companions / 8);
    }
    assert.ok(
      dps[0] >= 30,
      `${id}: pets contribute at least 30 damage/sec in a stationary target probe`,
    );
    assert.ok(
      dps[1] > dps[0] * 1.2,
      `${id}: first signature ranks strengthen pets`,
    );
    assert.ok(
      dps[2] > dps[1] * 1.5,
      `${id}: growth continues beyond awakening`,
    );
  }
});

test("rank-five awakenings add distinct class mechanics beyond damage growth", () => {
  const warlock = arena("vesper");
  warlock.ranks.signature = 5;
  warlock.recalculate();
  foe(warlock, 180);
  warlock.companions.find((c) => c.kind === "imp").attack = 0;
  archetypeUpdate(warlock, 0.05);
  assert.equal(warlock.bullets.find((b) => b.source === "demon").pierce, 1);

  const hunter = arena("fen"),
    wolf = hunter.companions[0];
  wolf.x = 40;
  wolf.y = 0;
  const pack = Array.from({ length: 6 }, (_, i) => foe(hunter, 60 + i * 3));
  hunter.ranks.signature = 4;
  wolf.attack = 0;
  archetypeUpdate(hunter, 0.05);
  assert.equal(pack.filter((e) => e.hp < e.maxHp).length, 3);
  for (const e of pack) e.hp = e.maxHp;
  hunter.ranks.signature = 5;
  wolf.attack = 0;
  archetypeUpdate(hunter, 0.05);
  assert.equal(pack.filter((e) => e.hp < e.maxHp).length, 5);

  const cleric = arena("solace"),
    target = foe(cleric, 180);
  cleric.ranks.signature = 4;
  cleric.attack();
  assert.equal(cleric.bullets.at(-1).pierce, 1);
  cleric.hit(target, 1, 0, "holy");
  const faith = cleric.p.trait;
  cleric.p.trait = 0;
  cleric.ranks.signature = 5;
  cleric.attack();
  assert.equal(cleric.bullets.at(-1).pierce, 2);
  cleric.hit(target, 1, 0, "holy");
  assert.ok(Math.abs(cleric.p.trait - faith * 1.15) < 1e-8);

  const shaman = arena("orin"),
    radius = shaman.totems[0].r;
  shaman.ranks.signature = 5;
  shaman.recalculate();
  shaman.skill();
  assert.ok(Math.abs(shaman.totems.at(-1).r - radius * 1.15) < 1e-8);
  foe(shaman, 180);
  shaman.attack();
  assert.equal(shaman.bullets.at(-1).pierce, 2);

  for (const [id, distance] of [
    ["kestrel", 160],
    ["morrow", 175],
  ]) {
    const g = arena(id),
      e = foe(g, distance);
    g.ranks.signature = 4;
    if (id === "kestrel") g.classState.combo = 2;
    g.attack();
    assert.equal(e.hp, e.maxHp, `${id}: target outside base reach`);
    g.ranks.signature = 5;
    g.attack();
    assert.ok(e.hp < e.maxHp, `${id}: awakened reach strikes the target`);
    if (id === "morrow") assert.equal(e.hexTime, 4);
  }
});
test("guardian cleaves a bounded group and protects the owner with gated wards", () => {
  const g = arena("vesper"),
    c = g.companions.find((c) => c.kind === "guardian");
  g.companions = [c];
  c.x = 40;
  c.y = 0;
  c.attack = 0;
  g.p.shield = 0;
  const foes = Array.from({ length: 6 }, (_, i) => foe(g, 60 + i * 3));
  archetypeUpdate(g, 0.05);
  assert.equal(foes.filter((e) => e.hp < e.maxHp).length, 5);
  assert.equal(g.p.shield, 4);
  c.attack = 0;
  archetypeUpdate(g, 0.05);
  assert.equal(g.p.shield, 4);
  g.time = 6;
  g.ranks.signature = 5;
  c.attack = 0;
  archetypeUpdate(g, 0.05);
  assert.equal(g.p.shield, 10);
  for (const e of foes) e.reaper = true;
  g.time = 12;
  c.attack = 0;
  archetypeUpdate(g, 0.05);
  assert.equal(g.p.shield, 10);
});
test("wolf rushes marked prey and keeps pace with an upgraded owner", () => {
  const g = arena("fen"),
    c = g.companions[0],
    near = foe(g, 60),
    prey = foe(g, 400);
  g.hit(prey, 1, 0, "huntarrow");
  c.x = 0;
  c.y = 0;
  c.attack = 0;
  archetypeUpdate(g, 0.05);
  assert.ok(c.x > 30);
  assert.ok(c.lunge > 0);
  assert.equal(near.hp, near.maxHp);
  g.enemies = [];
  c.x = 0;
  c.y = 0;
  g.p.x = 500;
  g.ranks.speed = 30;
  g.recalculate();
  const x = c.x;
  archetypeUpdate(g, 0.05);
  assert.ok(c.x - x > g.moveSpeed * 0.05);
});
test("pets mend after escaping damage, pacts restore demons, and Reapers bypass pet defenses", () => {
  const g = arena("vesper"),
    c = g.companions.find((c) => c.kind === "guardian");
  g.time = 1;
  hurtCompanion(g, c, 40);
  const hp = c.hp;
  archetypeUpdate(g, 0.05);
  assert.equal(c.hp, hp);
  g.time = 4.1;
  archetypeUpdate(g, 0.05);
  assert.ok(c.hp > hp);
  g.time = 5;
  hurtCompanion(g, c, 1e6);
  assert.equal(c.hp, 0);
  g.p.trait = 1;
  g.skill();
  assert.ok(c.hp >= c.maxHp * 0.65);
  assert.equal(c.down, 0);
  c.hurtAt = 0;
  c.hp = c.maxHp;
  g.time = 6;
  hurtCompanion(g, c, 50, true);
  assert.equal(c.hp, c.maxHp - 50);
  const e = foe(g, 180);
  g.hit(e, 10, 0, "demon");
  assert.ok(e.hexTime > 0);
  g.kill(e);
  assert.ok(g.p.trait >= 0.2);
});
