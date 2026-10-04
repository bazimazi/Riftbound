import test from "node:test";
import { veteranSave } from "./helpers.mjs";
import assert from "node:assert/strict";
import {
  Game,
  freshSave,
  sanitizeSave,
  bankRun,
  pressure,
} from "../src/game/index.ts";
import {
  REALMS,
  collectFind,
  updateRealm,
  legacyBonus,
  FINDS,
} from "../src/game/world/realms.ts";
import {
  RECIPES,
  evolutionLock,
  upgradeFits,
  buildSlots,
  updateEvolutions,
} from "../src/game/progression/evolutions.ts";
import {
  researchBonus,
  researchCost,
} from "../src/game/progression/ascension.ts";
import { updateExpedition } from "../src/game/world/reliquary.ts";
const make = (hero = "cinder", realm = "hollow") => {
  const s = ["cinder", "briar", "nyx", "volta"].includes(hero)
    ? freshSave()
    : veteranSave();
  s.realm = realm;
  return new Game(hero, s, () => 0.5);
};
function foe(g, type = "brute", hp = 1e7) {
  g.enemies = [];
  g.spawnEnemy(type, 180);
  const e = g.enemies[0];
  e.x = 80;
  e.y = 0;
  e.hp = e.maxHp = hp;
  return e;
}
test("all realms keep their rolled landmarks stable within a run and contain movement, dashes and spawns", () => {
  for (const m of REALMS) {
    const g = make("nyx", m.id),
      other = make("nyx", m.id);
    assert.equal(g.biome, m.biome);
    assert.ok(m.width >= 9600 && m.height >= 7600);
    assert.deepEqual(
      g.finds.map((f) => [f.x, f.y, f.kind]),
      other.finds.map((f) => [f.x, f.y, f.kind]),
    );
    assert.equal(g.finds.length, 14);
    assert.ok(
      g.finds
        .filter((f) => f.kind === "memory")
        .every((f) => Math.hypot(f.x, f.y) >= 3199),
    );
    g.p.x = m.width / 2 - 32;
    g.p.y = m.height / 2 - 32;
    g.p.dx = 1;
    g.p.dy = 1;
    g.dash();
    g.update(0.05, { x: 1, y: 1 });
    assert.ok(g.p.x <= m.width / 2 - 32 && g.p.y <= m.height / 2 - 32);
    g.enemies = [];
    g.spawnEnemy("runner", 600);
    const e = g.enemies[0];
    assert.ok(Math.abs(e.x) < m.width / 2 && Math.abs(e.y) < m.height / 2);
    assert.ok(
      Math.hypot(e.x - g.p.x, e.y - g.p.y) > 420,
      "boundary spawns cannot appear on top of the hero",
    );
    g.time = 240;
    g.advanceSystems(0.01);
    assert.equal(g.biome, m.biome);
  }
});
const seeded = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
test("every realm rolls varied treasure types and positions with bounded, separated, reachable items", () => {
  for (const realm of REALMS) {
    const mixes = new Set(),
      layouts = new Set(),
      memoryCounts = new Set(),
      memoryIds = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const save = freshSave();
      save.realm = realm.id;
      const g = new Game("cinder", save, seeded(Math.imul(seed, 0x9e3779b9))),
        counts = Object.fromEntries(
          Object.keys(FINDS).map((kind) => [kind, 0]),
        );
      assert.equal(g.finds.length, 14);
      assert.equal(new Set(g.finds.map((f) => f.id)).size, 14);
      for (const [i, f] of g.finds.entries()) {
        assert.ok(FINDS[f.kind]);
        counts[f.kind]++;
        assert.ok(Math.abs(f.x) <= realm.width / 2 - 160);
        assert.ok(Math.abs(f.y) <= realm.height / 2 - 160);
        assert.ok(Math.hypot(f.x, f.y) >= (f.kind === "memory" ? 3199 : 1099));
        if (f.kind === "memory") memoryIds.add(f.id);
        for (const other of g.finds.slice(i + 1))
          assert.ok(
            Math.hypot(f.x - other.x, f.y - other.y) > 600,
            `${realm.id}, seed ${seed}: separated treasures`,
          );
      }
      assert.ok(counts.memory >= 2 && counts.memory <= 4);
      memoryCounts.add(counts.memory);
      for (const kind of ["fury", "flow", "reach", "ward", "seal"])
        assert.ok(counts[kind] >= 1 && counts[kind] <= 3);
      mixes.add(JSON.stringify(counts));
      layouts.add(JSON.stringify(g.finds.map((f) => [f.kind, f.x, f.y])));
    }
    assert.ok(mixes.size > 20, `${realm.id}: variable item mix`);
    assert.equal(layouts.size, 200);
    assert.deepEqual([...memoryCounts].sort(), [2, 3, 4]);
    assert.deepEqual(
      [...memoryIds].sort(),
      [10, 11, 12, 13].map((i) => `${realm.id}:${i}`),
    );
  }
  for (const value of [0, 0.5, 0.999999])
    assert.equal(new Game("cinder", freshSave(), () => value).finds.length, 14);
});
test("random memory locations retain migrated collection IDs and never create new permanent identities", () => {
  for (const realm of REALMS) {
    const save = freshSave();
    save.realm = realm.id;
    save.memories.cinder = Object.fromEntries(
      [10, 11, 12, 13].map((i) => [`${realm.id}:${i}`, true]),
    );
    const migrated = sanitizeSave(save),
      positions = new Map();
    for (let seed = 1; seed <= 12; seed++) {
      const g = new Game("cinder", migrated, seeded(seed));
      for (const f of g.finds.filter((f) => f.kind === "memory")) {
        assert.ok(f.remembered);
        const previous = positions.get(f.id);
        if (previous) assert.notDeepEqual([f.x, f.y], previous);
        positions.set(f.id, [f.x, f.y]);
        assert.ok(collectFind(g, f));
      }
      assert.equal(g.foundMemories.length, 0);
      assert.ok(bankRun(migrated, g));
      assert.equal(legacyBonus(migrated, "cinder").count, 4);
    }
  }
});
test("map finds affect actual stats once and stay in the world during travel", () => {
  const g = make(),
    damage = g.damage,
    cd = g.skillCooldown,
    speed = g.moveSpeed;
  assert.ok(
    collectFind(
      g,
      g.finds.find((f) => f.kind === "fury"),
    ),
  );
  assert.ok(g.damage > damage);
  assert.equal(
    collectFind(
      g,
      g.finds.find((f) => f.kind === "fury"),
    ),
    false,
  );
  collectFind(
    g,
    g.finds.find((f) => f.kind === "flow"),
  );
  assert.ok(g.skillCooldown < cd);
  collectFind(
    g,
    g.finds.find((f) => f.kind === "reach"),
  );
  assert.ok(g.moveSpeed > speed);
  collectFind(
    g,
    g.finds.find((f) => f.kind === "seal"),
  );
  assert.equal(g.evolutionSeals, 1);
  const remaining = g.finds.filter((f) => !f.taken).length;
  g.p.x = 4500;
  g.p.y = 3600;
  g.update(0.01);
  assert.equal(g.finds.filter((f) => !f.taken).length, remaining);
});
test("memories bank atomically, remain hero-specific and cannot be farmed for power", () => {
  const g = make(),
    f = g.finds.find((f) => f.kind === "memory");
  collectFind(g, f);
  assert.equal(legacyBonus(g.save, "cinder").count, 0);
  assert.ok(bankRun(g.save, g));
  assert.equal(bankRun(g.save, g), false);
  assert.equal(legacyBonus(g.save, "cinder").count, 1);
  assert.equal(legacyBonus(g.save, "nyx").count, 0);
  const again = new Game("cinder", g.save, () => 0.5),
    found = again.finds.find((x) => x.id === f.id);
  assert.ok(found.remembered);
  collectFind(again, found);
  assert.equal(again.foundMemories.length, 0);
  assert.equal(again.embers, 8);
  bankRun(g.save, again);
  assert.equal(legacyBonus(g.save, "cinder").count, 1);
  const raw = {
    ...g.save,
    memories: {
      cinder: { [f.id]: true, "bogus:10": true, "ashen:11": "true" },
    },
    realm: "unknown",
  };
  const migrated = sanitizeSave(raw);
  assert.equal(migrated.version, 7);
  assert.equal(migrated.realm, "hollow");
  assert.deepEqual(Object.keys(migrated.memories.cinder), [f.id]);
  assert.equal(migrated.runs, 2);
});
test("three relic and four passive slots are enforced for drafts and altar gifts", () => {
  const g = make();
  Object.assign(g.ranks, {
    orbit: 1,
    nova: 1,
    frost: 1,
    power: 1,
    haste: 1,
    armor: 1,
    focus: 1,
  });
  assert.equal(buildSlots(g, "relics").length, 3);
  assert.equal(buildSlots(g, "passives").length, 4);
  assert.equal(upgradeFits(g, "familiar"), false);
  assert.equal(upgradeFits(g, "vitality"), false);
  assert.ok(upgradeFits(g, "orbit"));
  g.state = "levelup";
  g.pendingLevels = 1;
  g.offered = ["familiar"];
  assert.equal(g.upgrade("familiar"), false);
  const offered = g.choices();
  assert.ok(offered.every((id) => upgradeFits(g, id)));
  g.state = "playing";
  g.shrines = [{ x: 0, y: 0, used: false }];
  g.interact();
  g.shrineChoices = [{ id: "relic" }];
  g.chooseBoon("relic");
  assert.equal(buildSlots(g, "relics").length, 3);
});
test("mastered artifact rewards respect a full passive inventory", () => {
  const g = make();
  Object.assign(g.ranks, { haste: 1, armor: 1, focus: 1, recovery: 1 });
  g.artifacts = { crown: 3, heart: 3, hourglass: 3, seed: 3 };
  g.vault = {
    x: 0,
    y: 0,
    state: "defending",
    life: 65,
    remaining: 30,
    progress: 17.99,
    wave: 7,
  };
  updateExpedition(g, 0.02);
  assert.equal(buildSlots(g, "passives").length, 4);
  assert.equal(g.rank("power"), 0);
  assert.equal(g.rank("active"), 2);
});
test("evolution recipes require a build, level, time and seal and cannot be claimed twice", () => {
  assert.equal(RECIPES.length, 30);
  for (const r of RECIPES) {
    const g = make(r.hero === "all" ? "cinder" : r.hero);
    g.evolutionSeals = 2;
    assert.ok(evolutionLock(g, r));
    assert.equal(g.evolve(r.id), false);
    g.level = 12;
    g.time = 180;
    g.ranks[r.weapon] = r.rank;
    g.ranks[r.passive] = 3;
    g.recalculate();
    const potency =
      r.weapon === "active" ? g.skillPower : g.weaponPower(r.weapon);
    assert.ok(g.evolve(r.id));
    assert.equal(g.evolutionSeals, 1);
    assert.ok(
      (r.weapon === "active" ? g.skillPower : g.weaponPower(r.weapon)) >
        potency,
    );
    assert.equal(g.evolve(r.id), false);
    assert.equal(g.evolutionSeals, 1);
    if (r.hero !== "all")
      assert.equal(
        make(r.hero === "nyx" ? "cinder" : "nyx").evolve(r.id),
        false,
      );
  }
});
test("evolved weapons create distinct wards, control, shatter and on-kill volleys", () => {
  const c = make();
  c.evolutions.signature = "cinder-soul";
  const burning = foe(c);
  burning.dotTime = 2;
  c.kill(burning);
  assert.ok(c.bullets.length === 5);
  const b = make("briar");
  b.evolutions.signature = "briar-soul";
  b.p.hp = 40;
  b.evolutionTimer = 0;
  updateEvolutions(b, 0.01);
  assert.ok(b.p.hp > 40 && b.p.shield > 0);
  const n = make("nyx");
  n.evolutions.signature = "nyx-soul";
  n.dash();
  assert.ok(n.bullets.length >= 12);
  const v = make("volta");
  v.evolutions.signature = "volta-soul";
  v.evolutionTimer = 0;
  const e = foe(v);
  updateEvolutions(v, 0.01);
  assert.ok(e.stun > 0 && e.hp < e.maxHp);
  const g = make();
  g.evolutions.orbit = "aegis";
  g.evolutionTimer = 0;
  updateEvolutions(g, 0.01);
  assert.ok(g.p.shield > 0);
  g.evolutions.frost = "winter";
  const chilled = foe(g);
  chilled.slow = 1;
  g.kill(chilled);
  assert.ok(g.zones.some((z) => z.kind === "explosion"));
});
test("each evolved soul skill creates a hero-specific additional combat effect", () => {
  for (const id of ["cinder", "briar", "nyx", "volta"]) {
    const g = make(id);
    g.evolutions.active = `${id}-skill`;
    g.recalculate();
    g.skill();
    assert.ok(
      id === "cinder"
        ? g.bullets.length >= 8
        : id === "briar"
          ? g.p.shield >= 35
          : id === "nyx"
            ? g.shadows.length > 0
            : g.zones.some((z) => z.kind === "vortex"),
    );
  }
});
test("exponential time pressure outruns fixed permanent bonuses", () => {
  assert.ok(pressure(600).hp / pressure(540).hp > 2);
  assert.ok(pressure(600).damage / pressure(540).damage > 1.4);
  assert.ok(pressure(900).hp > pressure(600).hp * 50);
  assert.ok(pressure(3600).hp > 1e12);
  for (const field of Object.values(pressure(7200)))
    assert.ok(Number.isFinite(field));
  assert.equal(pressure(7200).spawn, 15);
});
test("Reapers are telegraphed, arrive on schedule and remain a bounded population", () => {
  for (const m of REALMS) {
    const g = make("nyx", m.id);
    g.time = m.doom - 30;
    updateRealm(g);
    assert.ok(g.events.some((e) => e.text?.includes("30 SECONDS")));
    assert.equal(g.enemies.filter((e) => e.reaper).length, 0);
    g.time = m.doom;
    updateRealm(g);
    assert.equal(g.enemies.filter((e) => e.reaper).length, 1);
    for (let i = 0; i < 24; i++) {
      g.time = g.nextReaper;
      updateRealm(g);
    }
    assert.equal(g.enemies.filter((e) => e.reaper).length, 8);
  }
});
test("Reapers resist damage, execute talents, knockback and crowd control, then kill quickly", () => {
  const g = make("nyx"),
    e = foe(g, "reaper", 10000);
  g.ranks.reaper = 1;
  e.hp = 1000;
  const pos = [e.x, e.y];
  g.hit(e, 10, 100, "knife");
  assert.ok(e.hp > 900);
  assert.deepEqual([e.x, e.y], pos);
  e.stun = 100;
  e.slow = 100;
  e.dot = 1000;
  e.dotTime = 100;
  e.grace = 0;
  g.update(0.01);
  assert.equal(e.stun, 0);
  assert.equal(e.slow, 0);
  assert.equal(e.dotTime, 0);
  e.x = g.p.x;
  e.y = g.p.y;
  g.p.invuln = 0;
  g.p.shield = 0;
  g.p.hp = 80;
  g.update(0.01);
  assert.equal(g.state, "dead");
});
test("research remains unbounded with diminishing returns and accelerating prices", () => {
  assert.ok(
    researchBonus(2, "weapon") - researchBonus(1, "weapon") <
      researchBonus(1, "weapon"),
  );
  assert.ok(researchBonus(10000, "weapon") > researchBonus(100, "weapon"));
  assert.ok(researchBonus(100, "weapon") < 0.3);
  assert.ok(
    researchCost(9, "weapon").embers > researchCost(4, "weapon").embers * 2,
  );
});
test("memory milestones unlock distinct permanent hero traits and skill techniques", () => {
  for (const id of ["cinder", "briar", "nyx", "volta"]) {
    const s = freshSave();
    s.memories[id] = {};
    for (const m of REALMS)
      for (const n of [10, 11, 12, 13]) s.memories[id][`${m.id}:${n}`] = true;
    const g = new Game(id, s, () => 0.5),
      base = make(id);
    assert.equal(g.legacy.count, 12);
    if (id === "briar") assert.ok(g.plants[0].life > base.plants[0].life);
    if (id === "nyx") assert.ok(g.dashCooldown < base.dashCooldown);
    if (id === "cinder") {
      g.p.trait = base.p.trait = 1;
      g.attackTimer = base.attackTimer = 10;
      g.update(0.01, { x: 1, y: 0 });
      base.update(0.01, { x: 1, y: 0 });
      assert.ok(g.p.trait > base.p.trait);
      g.dash();
      assert.ok(g.zones.some((z) => z.kind === "fire"));
    }
    g.skill();
    assert.ok(
      id === "cinder"
        ? g.zones.some((z) => z.kind === "fire")
        : id === "nyx"
          ? g.shadows.length > 0
          : g.p.shield >= 8,
    );
    if (id === "volta") {
      g.p.skillCd = 10;
      g.overload();
      assert.ok(g.p.skillCd < 10);
    }
  }
});
test("level growth is slower, talent budgets sparse, and late XP does not accelerate", () => {
  const g = make();
  g.gainXp(500);
  assert.ok(g.level < 12);
  assert.equal(g.talentPoints, Math.floor(g.level / 8));
  g.time = 600;
  const e = foe(g);
  g.kill(e);
  assert.equal(g.pickups.find((d) => d.kind === "xp").value, 1);
});
