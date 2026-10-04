import test from "node:test";
import assert from "node:assert/strict";
import { Game, freshSave, sanitizeSave, bankRun } from "../src/game/index.ts";
import {
  ARTIFACTS,
  updateExpedition,
  beginVault,
  contractFor,
} from "../src/game/world/reliquary.ts";
const make = () => new Game("cinder", freshSave(), () => 0.5);
function offer(g, ids) {
  g.state = "reliquary";
  g.artifactChoices = ARTIFACTS.filter((a) => ids.includes(a.id));
}
function readyVault(g) {
  g.vault = { x: g.p.x, y: g.p.y, state: "waiting", life: 65, progress: 0 };
  assert.ok(beginVault(g));
}
test("beacons require proximity, active defense and frozen time while paused", () => {
  const g = make();
  g.time = 90;
  updateExpedition(g, 0.05);
  assert.ok(g.vault);
  assert.equal(beginVault(g), false);
  g.p.x = g.vault.x;
  g.p.y = g.vault.y;
  assert.ok(beginVault(g));
  assert.equal(beginVault(g), false);
  for (let i = 0; i < 40; i++) updateExpedition(g, 0.05);
  assert.ok(g.vault.progress > 1.9);
  assert.ok(g.enemies.some((e) => e.guardian));
  const before = g.vault.progress;
  g.state = "paused";
  g.update(0.05, { x: 1, y: 0 });
  assert.equal(g.vault.progress, before);
  g.state = "playing";
  g.p.x += 200;
  updateExpedition(g, 0.5);
  assert.ok(g.vault.progress < before);
  g.vault.remaining = 0.01;
  updateExpedition(g, 0.05);
  assert.equal(g.vault, null);
  assert.equal(g.vaultsCleared, 0);
});
test("successful defense offers three unique artifacts and claiming is atomic", () => {
  const g = make();
  readyVault(g);
  for (let i = 0; i < 361; i++) updateExpedition(g, 0.05);
  assert.equal(g.vaultsCleared, 1);
  assert.equal(g.state, "reliquary");
  assert.equal(new Set(g.artifactChoices.map((a) => a.id)).size, 3);
  assert.equal(g.claimArtifact("invalid"), false);
  const id = g.artifactChoices[0].id;
  assert.ok(g.claimArtifact(id));
  assert.equal(g.artifact(id), 1);
  assert.equal(g.state, "playing");
  assert.equal(g.claimArtifact(id), false);
});
test("four slots and three ranks are enforced; fully mastered loadouts never softlock", () => {
  const g = make();
  for (const id of ["crown", "heart", "seed", "sun"]) {
    offer(g, [id]);
    assert.ok(g.claimArtifact(id));
  }
  offer(g, ["mirror"]);
  assert.equal(g.claimArtifact("mirror"), false);
  g.state = "playing";
  for (const id of Object.keys(g.artifacts)) g.artifacts[id] = 3;
  readyVault(g);
  g.vault.progress = 17.99;
  updateExpedition(g, 0.05);
  assert.equal(g.state, "playing");
  assert.equal(g.rank("power"), 2);
  assert.equal(g.shards, 1);
  offer(g, ["crown"]);
  assert.equal(g.claimArtifact("crown"), false);
});
test("artifact claims preserve queued level choices and grant their combat tradeoffs", () => {
  const g = make(),
    baseHP = g.p.maxHp,
    baseDamage = g.damage,
    baseCD = g.skillCooldown;
  offer(g, ["crown"]);
  g.pendingLevels = 1;
  assert.ok(g.claimArtifact("crown"));
  assert.equal(g.state, "levelup");
  assert.ok(g.p.maxHp < baseHP);
  assert.ok(g.damage > baseDamage);
  g.pendingLevels = 0;
  offer(g, ["hourglass"]);
  g.claimArtifact("hourglass");
  assert.ok(g.skillCooldown < baseCD);
  const rerolls = g.rerolls;
  offer(g, ["grimoire"]);
  g.claimArtifact("grimoire");
  assert.equal(g.rerolls, rerolls + 1);
  assert.ok(g.xpMultiplier > 1);
  const hp = g.p.hp;
  offer(g, ["heart"]);
  g.claimArtifact("heart");
  assert.ok(g.p.hp > hp);
});
test("garden, shadow, dash lightning and sun artifacts produce real combat effects", () => {
  const g = make();
  for (const id of ["seed", "mirror", "lantern", "sun"]) {
    offer(g, [id]);
    g.claimArtifact(id);
  }
  assert.ok(g.skill());
  assert.ok(g.plants.length > 0);
  assert.ok(g.shadows.length > 0);
  const before = g.bullets.length;
  assert.ok(g.dash());
  assert.ok(g.bullets.length >= before + 8);
  g.enemies = [];
  g.spawnEnemy("brute", 30);
  const e = g.enemies[0];
  e.x = 30;
  e.y = 0;
  e.hp = e.maxHp = 10000;
  g.sunTimer = 0;
  const hp = e.hp;
  updateExpedition(g, 0.05);
  assert.ok(e.hp < hp);
  assert.ok(g.effects.some((e) => e.type === "sun"));
});
test("contracts reward once on banking, keep run selection fixed and advance their tiers", () => {
  const s = freshSave();
  s.contract = "warden";
  const g = new Game("cinder", s);
  g.bossesKilled = 1;
  g.embers = 10;
  s.contract = "hunt";
  assert.equal(g.contract.id, "warden");
  const reward = g.contract.embers;
  assert.ok(bankRun(s, g));
  assert.equal(s.embers, 10 + reward);
  assert.equal(s.shards, 1);
  assert.ok(g.contractBanked);
  assert.equal(s.contracts.warden, 1);
  assert.equal(bankRun(s, g), false);
  assert.equal(s.embers, 10 + reward);
  assert.equal(contractFor(s, "warden").target, 2);
  const empty = new Game("cinder", s);
  assert.ok(bankRun(s, empty));
  assert.equal(s.contracts.hunt, undefined);
});
test("version-three migration preserves research and adds sane presentation and collection defaults", () => {
  const s = sanitizeSave({
    version: 3,
    embers: 100,
    research: { cinder: { weapon: 5 } },
    visuals: { motion: false },
    contract: "unknown",
    contracts: { hunt: -2 },
  });
  assert.equal(s.version, 7);
  assert.equal(s.embers, 100);
  assert.equal(s.research.cinder.weapon, 5);
  assert.equal(s.contract, "hunt");
  assert.equal(s.contracts.hunt, 0);
  assert.equal(s.visuals.motion, false);
  assert.equal(s.visuals.minimap, true);
  const g = new Game("cinder", s);
  offer(g, ["mirror"]);
  g.claimArtifact("mirror");
  bankRun(s, g);
  assert.equal(s.artifactArchive.mirror, 1);
  assert.equal(
    sanitizeSave(JSON.parse(JSON.stringify(s))).artifactArchive.mirror,
    1,
  );
});
test("damage breakdown records dealt damage rather than overkill", () => {
  const g = make();
  g.enemies = [];
  g.spawnEnemy("brute", 30);
  const e = g.enemies[0];
  e.hp = 12;
  g.hit(e, 100000, 0, "ember");
  assert.equal(g.damageSources.signature, 12);
  assert.equal(g.stats.damage, 12);
});
test("salvaging is optional, pays exactly once and cannot also claim an artifact", () => {
  const g = make();
  offer(g, ["crown"]);
  const before = g.embers;
  g.pendingLevels = 1;
  assert.ok(g.salvageArtifact());
  assert.equal(g.embers, before + 25);
  assert.equal(g.state, "levelup");
  assert.equal(g.salvageArtifact(), false);
  assert.equal(g.claimArtifact("crown"), false);
});
test("skill damage and delayed projectiles retain their separate damage channel", () => {
  const g = make();
  g.enemies = [];
  g.spawnEnemy("brute", 30);
  const e = g.enemies[0];
  e.x = 30;
  e.y = 0;
  e.hp = e.maxHp = 10000;
  g.skill();
  assert.ok(g.damageSources.active > 0);
  assert.equal(g.damageContext, null);
  const nyx = new Game("nyx", freshSave(), () => 0.5);
  nyx.skill();
  assert.ok(nyx.bullets.every((b) => b.channel === "active"));
});
test("Windborne accelerates the entire arsenal including Briar's garden without stacking on recalculation", () => {
  const g = new Game("briar", freshSave(), () => 0.5);
  offer(g, ["greaves"]);
  g.claimArtifact("greaves");
  const base = g.attackSpeed;
  g.dash();
  g.update(0.05);
  assert.equal(g.attackSpeed, base * 1.15);
  g.recalculate();
  g.recalculate();
  assert.equal(g.attackSpeed, base * 1.15);
  g.dashHaste = 0.01;
  g.update(0.05);
  assert.equal(g.attackSpeed, base);
});
