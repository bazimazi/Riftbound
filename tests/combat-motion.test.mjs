import test from "node:test";
import assert from "node:assert/strict";
import { Game, HEROES } from "../src/game/index.ts";
import {
  MOTION,
  actionFrame,
  projectileHeight,
} from "../src/game/combat/combat-motion.ts";
import { veteranSave } from "./helpers.mjs";
function arena(id) {
  const g = new Game(id, veteranSave(), () => 0.99);
  g.spawnTimer = 1e6;
  g.attackTimer = 1e6;
  g.orbitTimer = 1e6;
  g.plants = [];
  g.p.invuln = 100;
  g.enemies = [];
  g.spawnEnemy("brute", 180);
  Object.assign(g.enemies[0], { x: 180, y: 0, hp: 1e7, maxHp: 1e7, speed: 0 });
  return g;
}
function tick(g, t) {
  for (let elapsed = 0; elapsed < t - 1e-7; elapsed += 0.01)
    g.update(Math.min(0.01, t - elapsed));
}
test("all six skills charge, spend once and release once with their original effect", () => {
  for (const { id } of HEROES) {
    const g = arena(id),
      immediate = arena(id),
      delay = MOTION[id].cast;
    assert.ok(g.castSkill());
    const cooldown = g.p.skillCd;
    assert.equal(g.stats.skills, 1);
    assert.equal(g.castSkill(), false);
    assert.equal(g.skill(), false);
    assert.equal(g.effects.filter((e) => e.type === "skillburst").length, 0);
    tick(g, delay - 0.01);
    assert.equal(
      g.effects.filter((e) => e.type === "skillburst").length,
      0,
      `${id} has no premature release`,
    );
    assert.ok(g.pendingSkill);
    tick(g, 0.01);
    assert.equal(g.pendingSkill, null);
    assert.equal(g.stats.skills, 1);
    assert.equal(g.events.filter((e) => e.type === "skill").length, 1);
    assert.equal(g.effects.filter((e) => e.type === "skillburst").length, 1);
    assert.equal(g.p.action.released, true);
    assert.equal(actionFrame(g.p.action), 2);
    assert.ok(Math.abs(g.p.skillCd - (cooldown - delay)) < 0.001);
    immediate.skill();
    assert.equal(
      g.stats.damage,
      immediate.stats.damage,
      `${id} keeps its skill power`,
    );
    if (id === "briar") assert.equal(g.plants.length, 3);
    if (id === "nyx" || id === "lumen") assert.ok(g.bullets.length > 0);
    tick(g, 1);
    assert.equal(g.stats.skills, 1);
    assert.equal(g.p.action, null);
    assert.equal(g.events.filter((e) => e.type === "skill").length, 1);
  }
});
test("pauses and every choice state freeze queued releases and resume their remaining windup", () => {
  for (const state of ["paused", "levelup", "artifact", "shrine"]) {
    const g = arena("cinder");
    g.castSkill();
    tick(g, 0.04);
    g.state = state;
    const before = JSON.stringify([
      g.p.action,
      g.pendingSkill,
      g.p.skillCd,
      g.stats.damage,
    ]);
    for (let i = 0; i < 100; i++) g.update(0.05);
    assert.equal(
      JSON.stringify([g.p.action, g.pendingSkill, g.p.skillCd, g.stats.damage]),
      before,
    );
    g.state = "playing";
    tick(g, 0.11);
    assert.equal(g.events.filter((e) => e.type === "skill").length, 1);
  }
});
test("a lethal hit cancels charging; the escape skill grants immediate protection", () => {
  const g = arena("rook");
  g.castSkill();
  g.p.invuln = 0;
  g.p.shield = 0;
  g.revives = 0;
  g.hurt(1e6);
  assert.equal(g.state, "dead");
  assert.equal(g.pendingSkill, null);
  tick(g, 1);
  assert.equal(g.events.filter((e) => e.type === "skill").length, 0);
  const nyx = arena("nyx");
  nyx.p.invuln = 0;
  nyx.castSkill();
  const hp = nyx.p.hp;
  nyx.hurt(1e6);
  assert.equal(nyx.p.hp, hp);
  assert.ok(nyx.p.invuln >= 2);
});
test("rebirth still fires immediately if lethal damage interrupts a queued skill", () => {
  const g = arena("cinder");
  g.ranks.rebirth = 1;
  g.castSkill();
  g.p.invuln = 0;
  g.p.shield = 0;
  g.hurt(1e6);
  assert.equal(g.state, "playing");
  assert.ok(g.reborn);
  assert.equal(g.pendingSkill, null);
  assert.equal(g.events.filter((e) => e.type === "skill").length, 1);
  tick(g, 0.3);
  assert.equal(g.events.filter((e) => e.type === "skill").length, 1);
});
test("automatic attacks anticipate their release without accelerating the weapon", () => {
  for (const { id } of HEROES.filter((h) => h.id !== "briar")) {
    const g = arena(id);
    g.attackTimer = 0.25;
    const times = [],
      frames = [],
      fire = g.attack.bind(g);
    g.attack = () => {
      times.push(g.time);
      fire();
    };
    for (let i = 0; i < 160; i++) {
      g.update(0.01);
      if (g.p.action) frames.push(actionFrame(g.p.action));
    }
    assert.ok(Math.abs(times[0] - 0.25) < 0.011, id);
    assert.ok(
      frames.includes(0) &&
        frames.includes(1) &&
        frames.includes(2) &&
        frames.includes(5),
      id,
    );
    const interval =
      {
        cinder: 0.78,
        nyx: 0.64,
        volta: 0.95,
        rook: 0.95,
        lumen: 1.1,
        vesper: 1.05,
        fen: 0.9,
        solace: 0.95,
        orin: 1,
        kestrel: 0.65,
        morrow: 1.05,
      }[id] / g.attackSpeed;
    assert.ok(times.length >= 2, id);
    assert.ok(Math.abs(times[1] - times[0] - interval) < 0.011, id);
  }
});
test("hit reactions recover, walking follows distance and projectile flight stays finite", () => {
  const g = arena("cinder"),
    e = g.enemies[0];
  g.hit(e, 30, 0, "ember");
  assert.ok(e.impact > 0);
  tick(g, 0.2);
  assert.equal(e.impact, 0);
  tick(g, 0.1);
  assert.equal(g.p.walkDistance || 0, 0);
  const before = g.p.x;
  g.update(0.05, { x: 1, y: 0 });
  assert.ok(Math.abs(g.p.walkDistance - (g.p.x - before)) < 0.001);
  const walked = g.p.walkDistance;
  g.update(0.05);
  assert.equal(g.p.walkDistance, walked);
  for (const type of [
    "ember",
    "knife",
    "arrow",
    "thorn",
    "stone",
    "scythe",
    "wisp",
  ])
    for (const age of [0, 0.15, 0.33, 0.65, 1, 2])
      assert.ok(
        Number.isFinite(projectileHeight({ type, age, elevation: 28 })),
      );
  assert.ok(projectileHeight({ type: "ember", age: 0.33, elevation: 28 }) > 38);
  assert.equal(projectileHeight({ type: "ember", age: 1, elevation: 28 }), 28);
  const direction = arena("nyx"),
    target = direction.enemies[0];
  Object.assign(target, { x: 80, y: 0 });
  direction.projectile(80, 20, -Math.PI / 2, 20, "knife");
  direction.update(0.01);
  assert.ok(target.hp < target.maxHp);
  assert.equal(target.hitAngle, -Math.PI / 2);
});
test("crowd effects stay bounded and decorative hits never evict threat warnings", () => {
  const g = arena("volta");
  g.effects = [];
  for (let i = 0; i < 250; i++)
    g.effect("warning", i, 0, { tx: i + 50, ty: 0, duration: 1 });
  g.effect("skillburst", 0, 0, { hero: "volta" });
  for (let i = 0; i < 300; i++) g.effect("impact", i, 0);
  assert.equal(g.effects.length, 250);
  assert.ok(g.effects.every((e) => e.type === "warning"));
  g.effects = [];
  for (let i = 0; i < 180; i++) g.effect("impact", i, 0);
  for (let i = 0; i < 100; i++)
    g.effect("warning", i, 0, { tx: i + 50, ty: 0 });
  assert.ok(g.effects.length <= 250);
  assert.equal(g.effects.filter((e) => e.type === "warning").length, 100);
});
