import test from "node:test";
import assert from "node:assert/strict";
import { Game, HEROES } from "../src/game/index.ts";
import { profile, formCooldown } from "../src/game/progression/journey.ts";
import {
  CLASS_FORMS,
  updateClassForm,
} from "../src/game/combat/class-forms.ts";
import { ULTIMATES } from "../src/game/data/specializations.ts";
import {
  talentHit,
  talentHurt,
  updateTalentCombat,
} from "../src/game/combat/talent-combat.ts";
import { recoveredCooldown } from "../src/game/combat/skill-recovery.ts";
import { veteranSave } from "./helpers.mjs";

function arena(hero = "cinder") {
  const save = veteranSave(),
    p = profile(save, hero);
  p.stage = 2;
  p.talents[`${hero}_path0_3`] = 1;
  const g = new Game(hero, save, () => 0.9);
  g.enemies = [];
  g.spawnEnemy("brute", 100);
  Object.assign(g.enemies[0], { x: 100, y: 0, hp: 1e9, maxHp: 1e9, speed: 0 });
  g.p.invuln = g.spawnTimer = g.attackTimer = g.nextBoss = g.nextCatalyst = 1e8;
  return g;
}

test("every class shares Focus, training rank, map flow and Hourglass recovery with R, F and talent ultimates", () => {
  const sources = {
    forge: (g) => {
      g.save.forge.focus = 10;
    },
    focus: (g) => {
      g.ranks.focus = 4;
    },
    active: (g) => {
      g.ranks.active = 8;
    },
    flow: (g) => {
      g.exploration.flow = 2;
    },
    hourglass: (g) => {
      g.artifacts.hourglass = 2;
    },
  };
  for (const hero of HEROES)
    for (const [source, apply] of Object.entries(sources)) {
      const g = arena(hero.id),
        base = g.skillCooldown,
        forms = [formCooldown(g, 0), formCooldown(g, 1)];
      apply(g);
      g.recalculate();
      assert.ok(g.skillCooldown < base, `${hero.id}/${source}: Q`);
      assert.ok(formCooldown(g, 0) < forms[0], `${hero.id}/${source}: R`);
      assert.ok(formCooldown(g, 1) < forms[1], `${hero.id}/${source}: F`);
      assert.ok(g.skill());
      assert.ok(
        g.talentState.cooldown < 40,
        `${hero.id}/${source}: talent ultimate`,
      );
      assert.equal(g.talentState.cooldown, recoveredCooldown(g, 40, 20));
      assert.ok(g.castForm(0));
      assert.equal(g.formCooldowns[0], formCooldown(g, 0));
      g.pendingForm = null;
      assert.ok(g.castForm(1));
      assert.equal(g.formCooldowns[1], formCooldown(g, 1));
      updateClassForm(g, 2.1);
      assert.ok(g.formState.pulse < CLASS_FORMS[hero.id].interval[1]);
    }
});

test("deep recovery retains cooldown floors and stable recalculation without refunding spent cooldowns", () => {
  for (const h of HEROES) {
    const g = arena(h.id);
    g.ranks.focus = g.ranks.active = 10000;
    g.save.forge.focus = 20;
    g.artifacts.hourglass = 3;
    g.exploration.flow = 3;
    g.recalculate();
    assert.equal(g.skillCooldown, 2.5);
    assert.equal(formCooldown(g, 0), 10);
    assert.equal(formCooldown(g, 1), 30);
    assert.equal(recoveredCooldown(g, 40, 20), 20);
    assert.ok(g.skill());
    const cds = [g.p.skillCd, g.talentState.cooldown],
      scale = g.skillRecoveryScale;
    for (let i = 0; i < 10; i++) g.recalculate();
    assert.equal(g.skillRecoveryScale, scale);
    assert.deepEqual([g.p.skillCd, g.talentState.cooldown], cds);
  }
});

test("cooldown penalties affect every class cast without double application", () => {
  for (const [hero, page, factor] of [
    ["briar", "evergreen", 1.15],
    ["vesper", "vesper_pact", 1.08],
  ]) {
    const g = arena(hero),
      base = g.skillCooldown,
      form = formCooldown(g, 0);
    g.pages.push(page);
    g.recalculate();
    assert.ok(Math.abs(g.skillCooldown / base - factor) < 1e-10);
    assert.ok(Math.abs(formCooldown(g, 0) / form - factor) < 1e-10);
    assert.ok(g.skill());
    assert.ok(Math.abs(g.talentState.cooldown - 40 * factor) < 1e-10);
  }
});

test("hit recovery affects every running skill timer once, cannot recurse, and freezes with menus", () => {
  const g = arena("volta");
  g.journey.talents.volta_path2_1 = 3;
  g.recalculate();
  g.p.skillCd = 10;
  g.formCooldowns = [20, 40];
  g.talentState.cooldown = 30;
  talentHit(g, g.enemies[0], 10, false, "companions");
  assert.deepEqual(
    [g.p.skillCd, ...g.formCooldowns, g.talentState.cooldown],
    [9.55, 19.55, 39.55, 29.55],
  );
  for (const channel of [
    "signature",
    "talents",
    "talent_ultimate",
    "transformation",
  ])
    talentHit(g, g.enemies[0], 10, false, channel);
  assert.equal(g.talentState.cooldown, 29.55);
  g.state = "paused";
  g.time += 1;
  talentHit(g, g.enemies[0], 10, false, "signature");
  updateTalentCombat(g, 1);
  assert.equal(g.talentState.cooldown, 29.55);
});

test("global flat and percentage recovery effects also benefit form and ultimate timers", () => {
  const storm = arena("volta");
  storm.ranks.perpetual = 1;
  storm.p.skillCd = 10;
  storm.formCooldowns = [20, 40];
  storm.talentState.cooldown = 30;
  storm.overload();
  assert.deepEqual(
    [storm.p.skillCd, ...storm.formCooldowns, storm.talentState.cooldown],
    [8, 18, 38, 28],
  );
  const assassin = arena("nyx");
  assassin.pages.push("silence");
  assassin.p.skillCd = 10;
  assassin.formCooldowns = [20, 40];
  assassin.talentState.cooldown = 30;
  assert.ok(assassin.dash(1, 0));
  assert.deepEqual(
    [
      assassin.p.skillCd,
      ...assassin.formCooldowns,
      assassin.talentState.cooldown,
    ],
    [9, 18, 36, 27],
  );
});

test("reactive talent recovery scales but cannot become an every-hit counterblast", () => {
  const g = arena("rook");
  g.journey.talents.rook_path1_2 = 2;
  g.ranks.focus = 100;
  g.recalculate();
  g.p.hp = g.p.maxHp * 0.4;
  talentHurt(g);
  assert.equal(g.talentState.gates.rook_path1_2 - g.time, 5);
  const damage = g.stats.damage;
  talentHurt(g);
  assert.equal(g.stats.damage, damage);
});

test("all 36 talent ultimates and 24 class actives publish their stronger visual tier without extra damage procs", () => {
  for (const u of Object.values(ULTIMATES)) {
    const g = arena(u.hero);
    g.journey.talents = { [u.id]: 1 };
    g.journey.ultimate = u.id;
    g.recalculate();
    g.skill();
    assert.ok(
      g.effects.some(
        (e) => e.type === "skillburst" && e.tier === 3 && e.motif === u.kind,
      ),
    );
    assert.ok(
      g.bullets
        .filter((b) => b.channel === "talent_ultimate")
        .every((b) => b.visualTier === 3),
    );
  }
  for (const h of HEROES)
    for (const slot of [0, 1]) {
      const g = arena(h.id);
      assert.ok(g.castForm(slot));
      for (let i = 0; i < (slot ? 7 : 5); i++) g.update(0.05);
      assert.ok(
        g.effects.some((e) => e.type === "skillburst" && e.tier === slot + 2),
        `${h.id}/${slot}`,
      );
    }
});
