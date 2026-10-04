import test from "node:test";
import { veteranSave } from "./helpers.mjs";
import assert from "node:assert/strict";
import {
  Game,
  HEROES,
  FORGE,
  pressure,
  freshSave,
  sanitizeSave,
  forgeCost,
  forgeBonus,
  buyForge,
  bankRun,
} from "../src/game/index.ts";
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
} from "../src/game/progression/progression.ts";
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
function tick(g, seconds, input = { x: 1, y: 0 }) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    if (g.state !== "playing") break;
    g.update(1 / 60, input);
  }
}
test("every hero has a distinct signature, skill, and exclusively available talents", () => {
  assert.equal(new Set(HEROES.map((h) => h.weapon)).size, 12);
  for (const h of HEROES) {
    const g = new Game(h.id, veteranSave(), rng(22));
    const offered = new Set();
    for (let i = 0; i < 100; i++) g.choices().forEach((x) => offered.add(x));
    g.talentPoints = 3;
    for (const own of h.talentIds) {
      assert.ok(
        !offered.has(own),
        "Talents are chosen deliberately in their own tree",
      );
      assert.ok(g.spendTalent(own));
    }
    for (const other of HEROES.filter((a) => a !== h))
      for (const talent of other.talentIds) {
        assert.ok(!offered.has(talent));
        assert.equal(g.spendTalent(talent), false);
      }
    assert.equal(g.p.hp, g.p.maxHp);
    assert.ok(g.skill());
    assert.ok(!g.skill());
  }
});
test("hero mechanics deal damage and support their intended distinct loops", () => {
  for (const h of HEROES) {
    const g = new Game(h.id, veteranSave(), rng(44));
    g.enemies = [];
    g.spawnEnemy("brute", 70);
    g.enemies[0].x = 70;
    g.enemies[0].y = 0;
    g.enemies[0].hp = g.enemies[0].maxHp = 1e5;
    g.p.invuln = 100;
    tick(g, 2, { x: 0, y: 0 });
    assert.ok(g.stats.damage > 0, `${h.id} attacks`);
    if (h.id === "cinder") assert.ok(g.p.trait > 0);
    if (h.id === "volta") assert.ok(g.arcCount > 0);
    if (h.id === "briar") {
      const before = g.plants.length;
      for (let i = 0; i < 10; i++) {
        const e = { x: 0, y: 0, r: 10 };
        g.kill(e);
      }
      assert.equal(g.plants.length, before + 1);
    }
  }
  const nyx = new Game("nyx", freshSave(), rng(3));
  tick(nyx, 1);
  assert.ok(nyx.p.trait > 0.5);
  tick(nyx, 1, { x: 0, y: 0 });
  assert.equal(nyx.p.trait, 0);
});
test("queued level choices cannot be skipped or applied twice; signature evolves", () => {
  const g = new Game("cinder", freshSave(), rng(4));
  g.gainXp(500);
  assert.ok(g.pendingLevels > 5);
  assert.equal(g.state, "levelup");
  assert.equal(g.upgrade("signature"), false, "must be offered first");
  let guard = 100;
  while (g.state === "levelup" && guard--) {
    const choices = g.choices();
    g.upgrade(choices.includes("signature") ? "signature" : choices[0]);
  }
  assert.equal(g.pendingLevels, 0);
  assert.equal(g.state, "playing");
  assert.equal(
    g.upgrade("signature"),
    false,
    "a drained queue cannot apply another choice",
  );
  // Awakening follows legal choices, independent of earlier map RNG consumption.
  while (!g.evolved() && g.level < 30) {
    if (!g.pendingLevels) g.gainXp(g.threshold());
    const choices = g.choices();
    assert.ok(
      g.upgrade(choices.includes("signature") ? "signature" : choices[0]),
    );
  }
  assert.ok(g.evolved());
  assert.ok(g.rank("signature") >= 5);
  g.level = 30;
  assert.ok(
    g.choices().includes("signature"),
    "signature remains available beyond evolution",
  );
});
test("combat, damage, cooldowns, and game time freeze while paused or choosing", () => {
  const g = new Game("nyx");
  g.dash();
  g.state = "paused";
  const snapshot = [g.time, g.p.x, g.p.dashCd, g.p.hp];
  g.update(0.05, { x: 1, y: 0 });
  assert.deepEqual([g.time, g.p.x, g.p.dashCd, g.p.hp], snapshot);
  assert.equal(g.skill(), false);
  assert.equal(g.dash(), false);
  g.state = "playing";
  g.p.invuln = 0;
  g.hurt(10);
  const hp = g.p.hp;
  g.hurt(10);
  assert.equal(
    g.p.hp,
    hp,
    "brief damage immunity prevents stacked contact hits",
  );
});
test("progression persists once, purchases consume embers, malformed saves stay finite", () => {
  const save = freshSave(),
    g = new Game("cinder", save);
  g.embers = 100;
  g.time = 55;
  g.kills = 88;
  assert.ok(bankRun(save, g));
  assert.equal(bankRun(save, g), false);
  assert.equal(save.embers, 100);
  assert.equal(save.runs, 1);
  assert.equal(save.mastery.cinder, 94);
  assert.ok(buyForge(save, "might"));
  assert.equal(save.embers, 100 - forgeCost(0, "might"));
  assert.equal(save.forge.might, 1);
  assert.equal(buyForge(save, "nope"), false);
  const sanitized = sanitizeSave({
    embers: -100,
    forge: { might: "broken", vigor: Infinity },
    best: "oops",
  });
  assert.equal(sanitized.embers, 0);
  assert.equal(sanitized.forge.might, 0);
  assert.ok(Number.isFinite(sanitized.forge.vigor));
});
test("forge gains diminish, costs accelerate, and bounded bonuses cannot trivialize scaling", () => {
  for (const f of FORGE) {
    assert.ok(forgeBonus(f.id, 10000) <= f.cap);
    if (!f.linear)
      assert.ok(
        forgeBonus(f.id, 2) - forgeBonus(f.id, 1) < forgeBonus(f.id, 1),
      );
  }
  assert.ok(forgeCost(10) > forgeCost(5) * 2);
  assert.ok(pressure(600).hp > pressure(300).hp * 2);
  assert.ok(pressure(1800).damage > pressure(600).damage);
  assert.ok(pressure(10000).spawn <= 15);
});
test("a long scripted run has bosses, bounded entities, finite health and functional choices", () => {
  const g = new Game("volta", freshSave(), rng(17));
  g.p.invuln = 1e6;
  for (let i = 0; i < 60 * 180; i++) {
    if (g.state === "levelup") {
      const choices = g.choices();
      g.upgrade(
        choices.find((id) =>
          ["signature", "power", "conduction"].includes(id),
        ) || choices[0],
      );
    }
    if (i % 800 === 0) g.skill();
    g.update(1 / 60, { x: Math.cos(i / 170), y: Math.sin(i / 170) });
  }
  assert.ok(g.time > 170);
  assert.ok(g.bossCount >= 2);
  assert.ok(g.kills > 50);
  assert.ok(g.level > 2);
  assert.ok(g.enemies.length <= 274);
  assert.ok(g.pickups.length < 300);
  assert.ok(g.bullets.length <= 221);
  assert.ok(Number.isFinite(g.p.hp));
});
