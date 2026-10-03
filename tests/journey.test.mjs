import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  HEROES,
  freshSave,
  sanitizeSave,
  bankRun,
  pressure,
  UPGRADES,
  EVOLUTIONS,
} from "../src/core.js";
import { veteranSave } from "./helpers.mjs";
import {
  SKILLS,
  profile,
  heroLevel,
  heroThreshold,
  trainSkill,
  trainingCost,
  evolveSkill,
  skillEvolutionLock,
  classGoals,
  evolveClass,
  skillBonus,
  spawnCatalyst,
  collectCatalyst,
  updateJourney,
  bankJourney,
  skillName,
  SKILL_FORMS,
  FORMS,
} from "../src/journey.js";
import {
  CLASS_SKILL_DESCRIPTIONS,
  RELIC_SKILL_DESCRIPTIONS,
  skillDescription,
} from "../src/skill-descriptions.js";
import { RECIPES, PASSIVES } from "../src/evolutions.js";
import { upgradeSummary } from "../src/power-preview.js";
import {
  CLASS_TREES,
  CLASS_NODES,
  talentAvailable,
  classTalentLock,
  buyClassTalent,
  respecTalents,
  respecCost,
  classTalentPreview,
} from "../src/class-talents.js";
import { TALENT_EFFECTS, talentPreview } from "../src/talent-effects.js";
import {
  summonCompanion,
  placeTotem,
  archetypeForm,
  archetypeUpdate,
} from "../src/archetypes.js";
import {
  CLASS_FORMS,
  formDescription,
  refreshClassForm,
  updateClassForm,
  empowerForm,
} from "../src/class-forms.js";
const rich = (hero = "cinder", level = 200) => {
  const save = veteranSave(),
    p = profile(save, hero);
  p.xp = heroThreshold(level);
  p.sparks = 100000;
  p.materials = { core: 1000, rune: 1000, sigil: 1000 };
  save.chronicle[hero] = { bosses: 20 };
  return save;
};

test("every skill has authored base, evolved and mythic names and descriptions", () => {
  const text = (value, label) => {
    assert.equal(typeof value, "string", label);
    assert.ok(value.trim().length > 0, label);
    assert.doesNotMatch(value, /undefined|null|NaN|\[object Object\]/, label);
  };
  for (const [id, u] of Object.entries(UPGRADES)) {
    text(u.name, `${id} name`);
    text(u.desc, `${id} description`);
  }
  for (const h of HEROES) {
    for (const field of [
      "weapon",
      "weaponDesc",
      "skill",
      "skillDesc",
      "trait",
      "traitDesc",
    ])
      text(h[field], `${h.id} ${field}`);
    for (const n of FORMS[h.id]) text(n, `${h.id} class form`);
    for (const n of SKILL_FORMS[h.id]) text(n, `${h.id} evolved skill`);
    text(EVOLUTIONS[h.id].name, `${h.id} awakening`);
    text(EVOLUTIONS[h.id].desc, `${h.id} awakening description`);
    const g = new Game(h.id, veteranSave());
    for (const id of [...SKILLS, ...PASSIVES])
      text(upgradeSummary(g, id), `${h.id} ${id} run upgrade`);
    for (const id of SKILLS) {
      const descriptions =
        CLASS_SKILL_DESCRIPTIONS[h.id]?.[id] || RELIC_SKILL_DESCRIPTIONS[id];
      assert.equal(descriptions?.length, 3, `${h.id} ${id}: authored stages`);
      for (const stage of [0, 1, 2]) {
        const fallback =
          id === "signature"
            ? h.weapon
            : id === "active"
              ? h.skill
              : UPGRADES[id].name;
        const name = skillName(h.id, id, stage, fallback);
        text(name, `${h.id} ${id} stage ${stage} name`);
        text(skillDescription(h.id, id, stage), `${name} description`);
        assert.notEqual(
          descriptions[stage],
          descriptions[(stage + 1) % 3],
          `${name}: stage-specific effect`,
        );
      }
    }
  }
  for (const r of RECIPES) {
    text(r.name, `${r.id} recipe name`);
    text(r.summary, `${r.id} recipe description`);
    assert.ok(SKILLS.includes(r.weapon) && UPGRADES[r.passive], r.id);
    assert.ok(r.hero === "all" || HEROES.some((h) => h.id === r.hero), r.id);
  }
  assert.equal(
    skillName("future-class", "signature", 1, "New weapon"),
    "New weapon",
  );
  assert.equal(skillName("vesper", "signature", 3, "Hex bolts"), "Hex bolts");
  assert.equal(
    skillDescription("future-class", "signature", 1, "New weapon behavior."),
    "New weapon behavior.",
  );
  text(
    skillDescription("future-class", "future-skill", 4),
    "missing-data fallback",
  );
});

test("Soul lances describes actual spreading curses and mythic summon effects", () => {
  const save = rich("vesper"),
    p = profile(save, "vesper");
  p.skills.signature = { level: 20, stage: 1 };
  const g = new Game("vesper", save, () => 0.99);
  g.enemies = [];
  for (let i = 0; i < 4; i++) {
    g.spawnEnemy("crawler", 200);
    Object.assign(g.enemies.at(-1), {
      x: 70 + i * 10,
      y: 0,
      hp: 1e6,
      maxHp: 1e6,
    });
  }
  assert.equal(skillName("vesper", "signature", 1, "Hex bolts"), "Soul lances");
  assert.match(skillDescription("vesper", "signature", 1), /curses to two/);
  g.hit(g.enemies[0], 10, 0, "hex");
  assert.equal(g.enemies.slice(1).filter((e) => e.hexTime > 0).length, 2);
  assert.equal(g.companions.filter((c) => !c.permanent).length, 0);
  p.skills.signature = { level: 40, stage: 2 };
  g.time += 2;
  g.hit(g.enemies[0], 10, 0, "hex");
  assert.equal(g.enemies.slice(1).filter((e) => e.hexTime > 0).length, 3);
  assert.ok(g.companions.some((c) => c.kind === "imp" && !c.permanent));
  assert.match(
    skillDescription("vesper", "signature", 2),
    /three.*temporary imp/,
  );
  assert.doesNotMatch(
    skillDescription("vesper", "signature", 0),
    /spread curses/,
  );
});

test("all class talents preview their actual rank, next rank and mastered state", () => {
  assert.equal(Object.keys(CLASS_NODES).length, 396);
  for (const n of Object.values(CLASS_NODES)) {
    if (n.max > 1 && !n.stats && !n.proc && !n.spellMastery)
      assert.equal(typeof TALENT_EFFECTS[n.id], "function", n.id);
    const unlearned = talentPreview(n, 0);
    assert.equal(unlearned.current, "Not learned.");
    assert.equal(unlearned.nextRank, 1);
    for (let rank = 1; rank <= n.max; rank++) {
      const info = talentPreview(n, rank);
      assert.equal(info.currentRank, rank);
      assert.ok(
        info.current && !/undefined|NaN|\/ rank|per rank/.test(info.current),
        n.id,
      );
      assert.equal(info.nextRank, rank === n.max ? null : rank + 1);
      assert.equal(
        info.next,
        rank === n.max ? null : talentPreview(n, rank + 1).current,
      );
    }
  }
});

test("talent details reflect combat values, armor curves, fractional effects and two-rank steps", () => {
  const save = rich("cinder"),
    p = profile(save, "cinder");
  p.talents.afterburn = 2;
  const g = new Game("cinder", save, () => 0.99),
    e = g.enemies[0];
  e.hp = e.maxHp = 1e6;
  g.hit(e, 10, 0, "ember");
  assert.ok(Math.abs(e.dot / (10 * g.weaponPower("signature")) - 0.7) < 1e-8);
  assert.equal(
    classTalentPreview(save, "cinder", "afterburn").current,
    "70% weapon damage / second as burn.",
  );
  assert.equal(
    classTalentPreview(save, "cinder", "afterburn").next,
    "105% weapon damage / second as burn.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.eventhorizon, 1).current,
    "Overloads stun foes for 0.35s.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.grace, 1).current,
    "Each gated mend restores 1.35 HP.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.fletching, 1).current,
    "Arrows pierce 1 additional foes.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.fletching, 1).next,
    "Arrows pierce 2 additional foes.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.lunarstep, 3).current,
    "+5.36% movement speed.",
  );
  assert.equal(
    talentPreview(CLASS_NODES.cinder_path0_0, 2).current,
    "+10% weapon damage",
  );
  assert.equal(
    talentPreview(CLASS_NODES.cinder_path0_0, 2).next,
    "+15% weapon damage",
  );
  const gardenSave = rich("briar");
  profile(gardenSave, "briar").talents.barkskin = 3;
  const gardener = new Game("briar", gardenSave, () => 0.99);
  gardener.plants = [{ x: 0, y: 0 }];
  gardener.p.shield = gardener.p.invuln = 0;
  const hp = gardener.p.hp;
  gardener.hurt(40);
  assert.ok(Math.abs(hp - gardener.p.hp - 40 / 1.375) < 1e-8);
  assert.equal(
    classTalentPreview(gardenSave, "briar", "barkskin").current,
    "Near a seedling: 27.3% less damage taken.",
  );
});

test("talent previews count free affinities and run bonuses without stacking affinity twice", () => {
  const save = rich("cinder"),
    p = profile(save, "cinder");
  save.mastery.cinder = 400;
  const g = new Game("cinder", save);
  let info = classTalentPreview(save, "cinder", "afterburn", g);
  assert.equal(info.currentRank, 1);
  assert.equal(info.current, info.next);
  assert.equal(info.source, "Affinity");
  assert.ok(buyClassTalent(save, "cinder", "afterburn"));
  info = classTalentPreview(save, "cinder", "afterburn", g);
  assert.equal(info.currentRank, 1);
  assert.equal(info.nextRank, 2);
  assert.equal(info.source, "");
  g.ranks.afterburn = 3;
  info = classTalentPreview(save, "cinder", "afterburn", g);
  assert.equal(info.currentRank, 3);
  assert.equal(info.nextRank, 4);
  assert.equal(info.source, "Run rank 3");
  p.talents.cinder_path0_0 = 2;
  g.ranks.cinder_path0_0 = 9;
  info = classTalentPreview(save, "cinder", "cinder_path0_0", g);
  assert.equal(info.current, "+10% weapon damage");
  assert.equal(info.next, "+15% weapon damage");
});
test("class thresholds remain exact at early, evolution and distant levels", () => {
  for (const level of [1, 2, 5, 20, 75, 99, 100, 101, 199, 200, 201, 5000]) {
    assert.equal(heroLevel(heroThreshold(level)), level);
    if (level > 1) assert.equal(heroLevel(heroThreshold(level) - 1), level - 1);
  }
  assert.ok(heroThreshold(200) > heroThreshold(100) * 3);
});
test("old saves preserve all purchases and seed class XP without free transformations", () => {
  const old = freshSave();
  old.version = 6;
  delete old.journeys;
  old.mastery.cinder = 48000;
  old.forge.might = 4;
  old.embers = 500;
  const save = sanitizeSave(old);
  assert.equal(save.version, 7);
  assert.equal(save.journeys.cinder.xp, 48000);
  assert.equal(save.journeys.cinder.sparks, 0);
  assert.equal(save.journeys.cinder.stage, 0);
  assert.equal(save.forge.might, 4);
  assert.equal(save.embers, 500);
});
test("every skill stops at 20 and 40 until its evolution is paid exactly once", () => {
  for (const id of SKILLS) {
    const save = rich(),
      p = profile(save, "cinder");
    p.skills[id] = { level: 19, stage: 0 };
    const cost = trainingCost(p, id),
      before = p.sparks;
    assert.ok(trainSkill(save, "cinder", id));
    assert.equal(p.sparks, before - cost.sparks);
    assert.equal(trainSkill(save, "cinder", id), false);
    assert.ok(evolveSkill(save, "cinder", id));
    assert.equal(evolveSkill(save, "cinder", id), false);
    for (let i = 20; i < 40; i++) assert.ok(trainSkill(save, "cinder", id));
    assert.equal(trainSkill(save, "cinder", id), false);
    assert.ok(evolveSkill(save, "cinder", id));
    assert.ok(trainSkill(save, "cinder", id));
    assert.equal(p.skills[id].level, 41);
    assert.equal(evolveSkill(save, "cinder", id), false);
  }
});
test("advanced training requires specific catalysts and has accelerating costs", () => {
  const save = rich(),
    p = profile(save, "cinder");
  p.skills.signature = { level: 20, stage: 1 };
  p.materials.core = 0;
  const before = JSON.stringify(p);
  assert.equal(trainSkill(save, "cinder", "signature"), false);
  assert.equal(JSON.stringify(p), before);
  p.materials.core = 100;
  assert.ok(trainSkill(save, "cinder", "signature"));
  assert.equal(p.materials.core, 99);
  assert.equal(p.skills.signature.level, 21);
  p.skills.signature = { level: 100, stage: 2 };
  const high = trainingCost(p, "signature");
  assert.ok(high.sparks > 30 && high.core > 1 && high.sigil > 0);
  p.skills.signature.level = 1000;
  assert.ok(trainingCost(p, "signature").sparks > high.sparks * 5);
  assert.ok(skillBonus(p, "signature") < 3);
});
test("skill evolution has class gates, catalyst gates and hero-specific combat changes", () => {
  const save = rich("cinder", 19),
    p = profile(save, "cinder");
  p.skills.signature = { level: 20, stage: 0 };
  assert.equal(skillEvolutionLock(p, "signature"), "Class level 20");
  p.xp = heroThreshold(20);
  p.materials.core = 3;
  assert.equal(evolveSkill(save, "cinder", "signature"), false);
  p.materials.core = 4;
  assert.ok(evolveSkill(save, "cinder", "signature"));
  const g = new Game("cinder", save, () => 0.8),
    e = g.enemies[0];
  Object.assign(e, { hp: 1e6, maxHp: 1e6, x: 100, y: 0 });
  g.hit(e, 10, 0, "ember");
  assert.ok(g.zones.some((z) => z.kind === "fire"));
});
test("all six evolved signature weapons proc without recursive explosions or unbounded effects", () => {
  for (const h of HEROES) {
    const save = rich(h.id),
      p = profile(save, h.id);
    p.skills.signature = { level: 20, stage: 1 };
    const g = new Game(h.id, save, () => 0.8),
      source = {
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
      }[h.id];
    for (let i = 0; i < 10; i++) g.spawnEnemy("crawler", 110);
    g.enemies.forEach((e) =>
      Object.assign(e, { hp: 1e8, maxHp: 1e8, x: 100, y: 10 }),
    );
    for (let i = 0; i < 100; i++) g.hit(g.enemies[0], 10, 0, source);
    assert.ok(g.effects.length <= 250);
    assert.ok(g.zones.length <= 1);
    assert.equal(g.ascensionProcs.signature, 1.6);
  }
});
test("class transformations require level, both evolved skills, Wardens and rare materials", () => {
  const save = rich("cinder", 99),
    p = profile(save, "cinder");
  p.skills.signature = { level: 20, stage: 1 };
  p.skills.active = { level: 20, stage: 1 };
  assert.equal(evolveClass(save, "cinder"), false);
  p.xp = heroThreshold(100);
  p.materials.sigil = 0;
  assert.equal(evolveClass(save, "cinder"), false);
  p.materials.sigil = 1;
  assert.ok(evolveClass(save, "cinder"));
  assert.equal(p.stage, 1);
  assert.equal(evolveClass(save, "cinder"), false);
  p.xp = heroThreshold(200);
  p.skills.signature = { level: 40, stage: 2 };
  p.skills.active = { level: 40, stage: 2 };
  p.materials.sigil = 3;
  assert.ok(evolveClass(save, "cinder"));
  assert.equal(p.stage, 2);
  assert.equal(evolveClass(save, "cinder"), false);
  assert.deepEqual(classGoals(save, "cinder"), []);
});

test("all 24 class forms strengthen the arsenal and remain stable through recalculation and reload", () => {
  for (const hero of HEROES) {
    const samples = [];
    for (const stage of [0, 1, 2]) {
      const save = rich(hero.id),
        p = profile(save, hero.id);
      p.stage = stage;
      p.skills.signature = p.skills.active = { level: 40, stage: 2 };
      const g = new Game(hero.id, save, () => 0.8),
        sample = [
          g.weaponPower("signature"),
          g.skillPower,
          g.p.maxHp,
          g.attackSpeed,
          g.damageReduction,
        ];
      for (let i = 0; i < 8; i++) g.recalculate();
      assert.deepEqual(
        [
          g.weaponPower("signature"),
          g.skillPower,
          g.p.maxHp,
          g.attackSpeed,
          g.damageReduction,
        ],
        sample,
      );
      samples.push(sample);
      const restored = new Game(
        hero.id,
        sanitizeSave(JSON.parse(JSON.stringify(save))),
        () => 0.8,
      );
      assert.equal(restored.journey.stage, stage);
      assert.equal(restored.weaponPower("signature"), sample[0]);
      if (stage) {
        assert.ok(CLASS_FORMS[hero.id].traits[stage - 1].length > 10);
        assert.doesNotMatch(
          formDescription(hero.id, stage),
          /undefined|NaN|null/,
        );
      }
    }
    for (let i = 1; i <= 2; i++) {
      for (let stat = 0; stat < 4; stat++)
        assert.ok(
          samples[i][stat] > samples[i - 1][stat],
          `${hero.id}: tier ${i}, stat ${stat}`,
        );
      assert.ok(samples[i][4] < samples[i - 1][4]);
    }
    assert.ok(samples[2][0] / samples[0][0] >= 1.54);
    assert.ok(samples[2][1] / samples[0][1] >= 1.74);
  }
});

test("every evolved class has a real recurring combat trait at both tiers", () => {
  for (const hero of HEROES)
    for (const stage of [1, 2]) {
      const save = rich(hero.id);
      profile(save, hero.id).stage = stage;
      const g = new Game(hero.id, save, () => 0.8);
      g.enemies = [];
      for (let i = 0; i < 12; i++) {
        g.spawnEnemy("brute", 100);
        Object.assign(g.enemies.at(-1), {
          x: 80 + i * 8,
          y: i * 2,
          hp: 1e8,
          maxHp: 1e8,
        });
      }
      g.p.hp = g.p.maxHp * 0.5;
      const plants = g.plants.length;
      updateClassForm(g, 2.1);
      assert.equal(g.formState.pulse, CLASS_FORMS[hero.id].interval[stage - 1]);
      assert.ok(
        (g.damageSources.transformation || 0) > 0 ||
          g.bullets.some((b) => b.channel === "transformation"),
        hero.id,
      );
      if (hero.id === "cinder")
        assert.ok(
          g.zones.some(
            (z) => z.kind === "fire" && z.channel === "transformation",
          ),
        );
      if (hero.id === "briar") assert.equal(g.plants.length, plants + stage);
      if (hero.id === "nyx") assert.equal(g.shadows.length, stage);
      if (hero.id === "rook") assert.ok(g.p.shield >= 7);
      if (hero.id === "solace") assert.ok(g.p.hp > g.p.maxHp * 0.5);
      if (hero.id === "fen")
        assert.ok(g.enemies.every((e) => e.markUntil > g.time));
      if (hero.id === "orin") assert.ok(g.totems.length >= 2);
      if (hero.id === "kestrel") assert.ok(g.classState.serenity >= 2);
      if (hero.id === "morrow")
        assert.ok(g.enemies.every((e) => e.hexTime >= 4));
      const before = JSON.stringify([
        g.bullets.length,
        g.zones.length,
        g.stats.damage,
      ]);
      updateClassForm(g, 0.01);
      assert.equal(
        JSON.stringify([g.bullets.length, g.zones.length, g.stats.damage]),
        before,
        "combat pulses are gated",
      );
    }
});

test("pet evolutions add permanent teams once, including an in-run transformation", () => {
  for (const [hero, kind, baseline] of [
    ["vesper", "imp", 1],
    ["fen", "wolf", 1],
    ["orin", "elemental", 0],
    ["morrow", "ghoul", 0],
  ]) {
    const g = new Game(hero, rich(hero), () => 0.8);
    const count = () =>
      g.companions.filter((c) => c.kind === kind && c.permanent).length;
    assert.equal(count(), baseline);
    // An already full retinue must not block the permanently earned team members.
    for (let i = 0; i < 6; i++) summonCompanion(g, kind, 10);
    for (const stage of [1, 2]) {
      g.journey.stage = stage;
      g.recalculate();
      assert.equal(count(), baseline + stage);
      const ids = g.companions.map((c) => c.id);
      for (let i = 0; i < 20; i++) refreshClassForm(g);
      assert.deepEqual(
        g.companions.map((c) => c.id),
        ids,
      );
    }
    assert.ok(g.companions.length <= 8);
  }
});

test("form surges affect all damage, freeze in menus and cannot extend the stronger buff with R", () => {
  const save = rich();
  profile(save, "cinder").stage = 2;
  const g = new Game("cinder", save, () => 0.8),
    e = g.enemies[0],
    base = g.multiplier(e);
  g.p.skillCd = 10;
  empowerForm(g, 1);
  assert.equal(g.p.skillCd, 6);
  assert.equal(g.multiplier(e), base * 1.35);
  g.state = "paused";
  const before = JSON.stringify(g.formState);
  g.update(1);
  assert.equal(JSON.stringify(g.formState), before);
  g.state = "playing";
  g.enemies = [];
  updateClassForm(g, 11);
  empowerForm(g, 0);
  updateClassForm(g, 1.1);
  assert.equal(g.formState.surgePower, 0.2);
  assert.equal(g.multiplier(e), base * 1.2);
  updateClassForm(g, 8);
  assert.equal(g.multiplier(e), base);
});

test("transformation healing requires a landed pulse and Reapers keep their control immunity", () => {
  const save = rich("solace");
  profile(save, "solace").stage = 2;
  const g = new Game("solace", save, () => 0.8);
  g.p.hp = 20;
  g.enemies = [];
  updateClassForm(g, 10);
  assert.equal(g.p.hp, 20);
  g.spawnEnemy("brute", 600);
  Object.assign(g.enemies[0], { x: 600, y: 0, hp: 1e6, maxHp: 1e6 });
  updateClassForm(g, 10);
  assert.equal(g.p.hp, 20);
  g.enemies[0].x = 80;
  updateClassForm(g, 10);
  assert.ok(g.p.hp > 20);
  for (const hero of ["briar", "morrow", "rook"]) {
    const s = rich(hero);
    profile(s, hero).stage = 2;
    const f = new Game(hero, s, () => 0.8);
    f.enemies = [];
    f.spawnEnemy("reaper", 100);
    const reaper = f.enemies[0];
    Object.assign(reaper, { x: 80, y: 0, hp: 1e8, maxHp: 1e8 });
    updateClassForm(f, 3);
    assert.deepEqual(
      [
        reaper.x,
        reaper.y,
        reaper.stun || 0,
        reaper.slow || 0,
        reaper.hexTime || 0,
      ],
      [80, 0, 0, 0, 0],
    );
    f.p.shield = 0;
    f.p.invuln = 0;
    f.hurt(1e6, true);
    assert.equal(f.state, "dead");
  }
});

test("all transformed classes sustain crowded combat with bounded teams, spells and effects", () => {
  for (const h of HEROES)
    for (const stage of [1, 2]) {
      const save = rich(h.id);
      profile(save, h.id).stage = stage;
      const g = new Game(h.id, save, () => 0.8);
      g.ranks.signature = 15;
      g.ranks.active = 15;
      g.recalculate();
      g.p.invuln = 1e6;
      g.enemies = [];
      g.spawnTimer = 1e6;
      for (const key of [
        "nextBoss",
        "nextCache",
        "nextHazard",
        "nextShrine",
        "nextVault",
        "nextCatalyst",
      ])
        g[key] = 1e6;
      for (let i = 0; i < 150; i++) {
        g.spawnEnemy("brute", 180);
        const a = i * 2.4;
        Object.assign(g.enemies.at(-1), {
          x: Math.cos(a) * 180,
          y: Math.sin(a) * 180,
          hp: 1e9,
          maxHp: 1e9,
        });
      }
      for (let t = 0; t < 30; t += 0.05) {
        if (g.formCooldowns[0] <= 0) g.castForm(0);
        if (stage === 2 && g.formCooldowns[1] <= 0) g.castForm(1);
        g.update(0.05);
        assert.equal(g.state, "playing", h.id);
        assert.ok(
          g.companions.length <= 8 &&
            g.totems.length <= 3 &&
            g.plants.length <= 18 &&
            g.shadows.length <= 3,
        );
        assert.ok(
          g.bullets.length <= 221 &&
            g.zones.length <= 35 &&
            g.effects.length <= 250,
        );
      }
      assert.ok(Number.isFinite(g.stats.damage) && g.stats.damage > 0);
      assert.ok(Number.isFinite(g.p.hp) && Number.isFinite(g.p.maxHp));
    }
});

test("recurring form traits preserve stronger active summons without extending their power indefinitely", () => {
  const make = (hero) => {
    const save = rich(hero);
    profile(save, hero).stage = 2;
    const g = new Game(hero, save, () => 0.8);
    g.enemies = [];
    return g;
  };
  const nyx = make("nyx");
  nyx.shadows = [0, 1, 2].map((i) => ({
    x: i * 30,
    y: 0,
    life: 12,
    attack: 0,
  }));
  nyx.spawnEnemy("brute", 100);
  const shadows = JSON.stringify(nyx.shadows);
  updateClassForm(nyx, 3);
  assert.equal(JSON.stringify(nyx.shadows), shadows);
  const orin = make("orin");
  archetypeForm(orin, 1, 3, 300);
  for (let i = 0; i < 9; i++) placeTotem(orin);
  for (const totem of orin.totems) {
    assert.equal(totem.formEmpoweredUntil, 16);
    assert.equal(totem.power, Math.sqrt(orin.skillPower) * 1.6);
  }
  orin.time = 17;
  archetypeUpdate(orin, 0.01);
  for (const totem of orin.totems) {
    assert.equal(totem.formEmpoweredUntil, 0);
    assert.ok(Math.abs(totem.power - Math.sqrt(orin.skillPower)) < 1e-8);
  }
  for (const [hero, buff] of [
    ["vesper", "pact"],
    ["fen", "command"],
  ]) {
    const g = make(hero);
    g.classState[buff] = 0;
    g.spawnEnemy("brute", 100);
    updateClassForm(g, 3);
    assert.equal(g.classState[buff], 0);
  }
});
test("both additional actives are unique per class, charge once, freeze and reject repeated casts", () => {
  for (const h of HEROES) {
    const save = rich(h.id),
      p = profile(save, h.id);
    p.stage = 2;
    p.skills.signature = p.skills.active = { level: 40, stage: 2 };
    const g = new Game(h.id, save, () => 0.8);
    g.enemies.forEach((e) => (e.hp = e.maxHp = 1e8));
    for (const slot of [0, 1]) {
      assert.ok(g.castForm(slot));
      assert.equal(g.castForm(slot), false);
      assert.equal(g.castSkill(), false);
      const remaining = g.pendingForm.remaining,
        cd = g.formCooldowns[slot];
      g.state = "paused";
      g.update(1);
      assert.equal(g.pendingForm.remaining, remaining);
      assert.equal(g.formCooldowns[slot], cd);
      g.state = "playing";
      for (let i = 0; i < 8; i++) g.update(0.05);
      assert.equal(g.pendingForm, null);
      assert.equal(g.p.action.kind, "skill");
      assert.equal(g.p.action.released, true);
      assert.ok(g.formCooldowns[slot] > 0);
      assert.ok(
        g.bullets.length <= 221 &&
          g.zones.length <= 35 &&
          g.plants.length <= 18 &&
          g.shadows.length <= 3,
      );
    }
    assert.ok(g.stats.skills >= 2);
    assert.ok(
      g.stats.damage > 0 ||
        g.bullets.length > 0 ||
        g.zones.length > 0 ||
        g.plants.length > 0 ||
        g.companions.length > 0 ||
        g.totems.length > 0,
      h.id,
    );
  }
});
test("untransformed heroes cannot cast new actives and lethal damage cancels a pending form skill", () => {
  const g = new Game("cinder");
  assert.equal(g.castForm(0), false);
  assert.equal(g.castForm(2), false);
  g.journey.stage = 1;
  g.p.invuln = 0;
  assert.ok(g.castForm(0));
  g.hurt(1e6);
  assert.equal(g.pendingForm, null);
  assert.equal(g.state, "dead");
});
test("new form skills provide aimed attacks, a bounded blink and lightning beyond the original pulse range", () => {
  for (const hero of ["cinder", "lumen", "rook", "nyx"]) {
    const save = rich(hero);
    profile(save, hero).stage = 1;
    const g = new Game(hero, save, () => 0.8);
    g.enemies = g.enemies.slice(0, 2);
    Object.assign(g.enemies[0], { x: 240, y: 0, hp: 1e6, maxHp: 1e6 });
    Object.assign(g.enemies[1], { x: -300, y: 0, hp: 1e6, maxHp: 1e6 });
    const rear = g.enemies[1].hp;
    assert.ok(g.castForm(0));
    updateJourney(g, 0.23);
    if (["cinder", "lumen"].includes(hero))
      assert.ok(g.bullets.every((b) => b.vx > 0));
    if (hero === "rook") {
      assert.ok(g.enemies[0].hp < 1e6);
      assert.equal(g.enemies[1].hp, rear);
    }
    if (hero === "nyx") {
      assert.ok(g.p.x > 0 && g.p.x < 240);
      assert.equal(g.shadows[0].x, 0);
      assert.ok(Math.abs(g.p.x) < g.realm.width / 2);
    }
  }
  const save = rich("volta");
  profile(save, "volta").stage = 1;
  const g = new Game("volta", save, () => 0.8);
  g.enemies = g.enemies.slice(0, 3);
  g.enemies.forEach((e, i) =>
    Object.assign(e, { x: [650, 1000, 1400][i], y: 0, hp: 1e6, maxHp: 1e6 }),
  );
  assert.ok(g.castForm(0));
  updateJourney(g, 0.23);
  assert.ok(g.enemies.every((e) => e.hp < 1e6));
  assert.equal(g.zones.length, 0);
});
test("mythic signature skills add class-specific combat mechanics", () => {
  const source = {
    cinder: "ember",
    briar: "thorn",
    nyx: "knife",
    volta: "arc",
    rook: "hammer",
    lumen: "arrow",
  };
  for (const h of HEROES) {
    const save = rich(h.id),
      p = profile(save, h.id);
    p.skills.signature = { level: 40, stage: 2 };
    const g = new Game(h.id, save, () => 0.8);
    g.spawnEnemy("crawler", 120);
    g.enemies.forEach((e) =>
      Object.assign(e, { hp: 1e8, maxHp: 1e8, x: 100, y: 10 }),
    );
    const shield = g.p.shield,
      plants = g.plants.length;
    g.hit(g.enemies[0], 10, 0, source[h.id]);
    if (["cinder", "lumen"].includes(h.id)) assert.ok(g.bullets.length > 0);
    if (h.id === "briar") assert.equal(g.plants.length, plants + 1);
    if (h.id === "nyx") assert.equal(g.shadows.length, 1);
    if (h.id === "rook") assert.equal(g.p.shield, shield + 3);
    if (h.id === "volta")
      assert.ok(g.effects.filter((e) => e.type === "arc").length >= 3);
  }
});
test("all classes have three connected trees and 33 purchasable permanent nodes", () => {
  assert.equal(Object.keys(CLASS_NODES).length, 396);
  for (const hero of HEROES) {
    const save = rich(hero.id, 500),
      p = profile(save, hero.id);
    assert.equal(CLASS_TREES[hero.id].length, 3);
    for (const branch of CLASS_TREES[hero.id]) {
      assert.equal(branch.nodes.length, 11);
      for (const n of branch.nodes) {
        for (let i = 0; i < n.max; i++)
          assert.ok(
            buyClassTalent(save, hero.id, n.id),
            `${hero.id} ${n.id}: ${classTalentLock(save, hero.id, n.id)}`,
          );
        assert.equal(buyClassTalent(save, hero.id, n.id), false);
      }
    }
    const g = new Game(hero.id, save);
    assert.ok(
      g.classBonuses.health || g.classBonuses.weapon || g.classBonuses.crit,
    );
    assert.equal(g.rank(CLASS_TREES[hero.id][0].nodes[0].id), 5);
    assert.equal(
      sanitizeSave(save).journeys[hero.id].talents[
        CLASS_TREES[hero.id][0].nodes[0].id
      ],
      5,
    );
    assert.equal(talentAvailable(save, hero.id), hero.id === "cinder" ? 7 : 6);
  }
});
test("talent points are scarce, per-class, permanent and enforce prerequisites", () => {
  const save = rich("nyx", 4),
    p = profile(save, "nyx");
  save.chronicle.nyx.bosses = 0;
  assert.equal(talentAvailable(save, "nyx"), 0);
  p.xp = heroThreshold(5);
  assert.equal(talentAvailable(save, "nyx"), 1);
  const root = CLASS_TREES.nyx[0].nodes[0],
    deep = CLASS_TREES.nyx[0].nodes[2];
  assert.equal(buyClassTalent(save, "nyx", deep.id), false);
  assert.equal(buyClassTalent(save, "cinder", root.id), false);
  assert.ok(buyClassTalent(save, "nyx", root.id));
  assert.equal(talentAvailable(save, "nyx"), 0);
  assert.equal(buyClassTalent(save, "nyx", root.id), false);
  assert.equal(sanitizeSave(save).journeys.nyx.talents[root.id], 1);
});
test("malformed profiles lose invalid forms, foreign talent ranks and broken branches", () => {
  const save = freshSave();
  save.journeys.cinder = {
    xp: 0,
    sparks: -5,
    stage: 2,
    materials: { core: Infinity },
    skills: { signature: { level: 100, stage: 2 } },
    talents: { bloodletter: 5, rebirth: 1, cinder_path0_3: 1 },
  };
  const clean = sanitizeSave(save),
    p = clean.journeys.cinder;
  assert.equal(p.stage, 0);
  assert.equal(p.skills.signature.stage, 0);
  assert.equal(p.skills.signature.level, 20);
  assert.equal(p.sparks, 0);
  assert.equal(p.materials.core, 1e6);
  assert.deepEqual(p.talents, {});
});
test("respecs refund exactly the spent points, charge once and preserve trained skills", () => {
  const save = rich(),
    p = profile(save, "cinder");
  p.skills.active = { level: 20, stage: 1 };
  assert.ok(buyClassTalent(save, "cinder", "afterburn"));
  const budget = talentAvailable(save, "cinder"),
    cost = respecCost(save, "cinder");
  save.embers = cost.embers - 1;
  assert.equal(respecTalents(save, "cinder"), false);
  save.embers++;
  assert.ok(respecTalents(save, "cinder"));
  assert.equal(save.embers, 0);
  assert.equal(talentAvailable(save, "cinder"), budget + 1);
  assert.equal(p.skills.active.stage, 1);
  assert.equal(respecTalents(save, "cinder"), false);
  assert.ok(respecCost(save, "cinder").embers > 150);
});
test("rare finds spawn inside bounds, require travel, expire and cannot be collected twice", () => {
  const g = new Game("cinder", freshSave(), () => 0.8);
  g.p.x = g.realm.width / 2 - 80;
  const item = spawnCatalyst(g, "rune");
  assert.ok(item.x < g.realm.width / 2 && item.y < g.realm.height / 2);
  assert.equal(collectCatalyst(g, item), false);
  g.p.x = item.x;
  g.p.y = item.y;
  assert.ok(collectCatalyst(g, item));
  assert.equal(collectCatalyst(g, item), false);
  assert.equal(g.foundCatalysts.rune, 1);
  assert.equal(g.journey.materials.rune, 0);
  const expired = spawnCatalyst(g, "core");
  g.waypoint = { ...expired };
  g.time = expired.expires + 1;
  g.nextCatalyst = 1e8;
  updateJourney(g, 0.05);
  assert.equal(g.waypoint, null);
  assert.equal(g.catalysts.length, 0);
  for (let i = 0; i < 10; i++) spawnCatalyst(g, "rune");
  assert.equal(g.catalysts.length, 4);
});
test("XP, sparks and catalysts bank once; earned progress survives reload and stays hero-specific", () => {
  const save = freshSave(),
    g = new Game("cinder", save);
  Object.assign(g, {
    time: 360,
    kills: 300,
    level: 17,
    bossesKilled: 2,
    elitesKilled: 5,
  });
  g.foundCatalysts = { core: 3, rune: 2, sigil: 1 };
  assert.ok(bankRun(save, g));
  const p = profile(save, "cinder");
  assert.equal(p.xp, 630);
  assert.equal(p.sparks, 10);
  assert.equal(p.materials.sigil, 1);
  assert.equal(bankRun(save, g), false);
  assert.equal(bankJourney(save, g), false);
  assert.equal(p.xp, 630);
  const clean = sanitizeSave(save);
  assert.equal(clean.journeys.cinder.materials.rune, 2);
  assert.equal(clean.journeys.nyx.xp, 0);
});
test("late permanent power grows slowly while expedition difficulty still grows exponentially", () => {
  const save = rich(),
    p = profile(save, "cinder");
  p.skills.signature = { level: 200, stage: 2 };
  const low = skillBonus(p, "signature");
  p.skills.signature.level = 10000;
  assert.ok(skillBonus(p, "signature") / low < 1.2);
  assert.ok(pressure(720).hp / pressure(600).hp > 5);
  const g = new Game("cinder", save);
  g.ranks.fervor =
    g.ranks.breadth =
    g.ranks.endurance =
    g.ranks.barrier =
      10000;
  g.recalculate();
  assert.ok(g.areaScale <= 1.7);
  assert.ok(g.durationScale <= 2);
  g.p.shield = 0;
  g.advanceSystems(0.05);
  assert.ok(g.p.shield <= 0.1);
});
test("sigil drought protection requires four long expeditions and still requires collecting the item", () => {
  const save = freshSave();
  for (let i = 0; i < 4; i++) {
    const g = new Game("cinder", save, () => 0.8);
    g.time = 240;
    bankRun(save, g);
  }
  assert.equal(profile(save, "cinder").sigilPity, 4);
  const g = new Game("cinder", save, () => 0.8);
  g.time = 239;
  g.nextCatalyst = 239;
  updateJourney(g, 0.05);
  assert.equal(
    g.catalysts.some((i) => i.kind === "sigil"),
    false,
  );
  g.time = g.nextCatalyst;
  updateJourney(g, 0.05);
  const item = g.catalysts.find((i) => i.kind === "sigil");
  assert.ok(item);
  assert.equal(g.journey.materials.sigil, 0);
  g.p.x = item.x;
  g.p.y = item.y;
  assert.ok(collectCatalyst(g, item));
  bankRun(save, g);
  assert.equal(g.journey.materials.sigil, 1);
  assert.equal(g.journey.sigilPity, 0);
});
