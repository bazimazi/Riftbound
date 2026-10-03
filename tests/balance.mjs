// Repeatable balance probes, not a substitute for human playtesting.
import { Game, HEROES, freshSave } from "../src/core.js";
import { veteranSave } from "./helpers.mjs";
import { TALENT_TREES, talentLock } from "../src/progression.js";
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
// Isolate kit coverage from XP rolls, survival, permanent progression and overkill.
if (process.argv.includes("--pet-aoe")) {
  for (const rank of [1, 5, 10])
    for (const hero of HEROES) {
      const results = {};
      for (const count of [1, 16]) {
        const g = new Game(hero.id, veteranSave(), () => 0.99);
        g.save.memories = {};
        g.legacy = { count: 0, weapon: 0, skill: 0, health: 0 };
        g.ranks = { signature: rank, active: 1 };
        g.recalculate();
        g.enemies = [];
        g.pickups = [];
        g.spawnTimer = g.nextBoss = g.nextCache = g.nextBeacon = 1e8;
        g.p.invuln = 1e8;
        for (let i = 0; i < count; i++) {
          g.spawnEnemy("crawler", 100);
          Object.assign(g.enemies.at(-1), {
            x: count === 1 ? 200 : 160 + (i % 4) * 45,
            y: count === 1 ? 0 : -67.5 + Math.floor(i / 4) * 45,
            hp: 1e8,
            maxHp: 1e8,
            speed: 0,
            damage: 0,
            attack: 1e8,
            enemySkill: 1e8,
          });
        }
        g.attackTimer = 0;
        g.p.trait = 1;
        g.skill();
        for (let i = 0; i < 240; i++) {
          g.update(0.05);
          g.events = [];
        }
        results[count === 1 ? "single" : "crowd"] = {
          dps: Math.round(
            Object.values(g.damageSources).reduce((a, b) => a + b, 0) / 12,
          ),
          coverage: g.enemies.filter((e) => e.hp < e.maxHp).length,
          companions: Math.round((g.damageSources.companions || 0) / 12),
        };
      }
      console.log(JSON.stringify({ hero: hero.id, rank, ...results }));
    }
  process.exit(0);
}
const styles = process.argv.includes("--forged")
  ? ["forged-idle"]
  : ["idle", "scavenger"];
for (const style of styles)
  for (const hero of HEROES) {
    const save = ["cinder", "briar", "nyx", "volta"].includes(hero.id)
      ? freshSave()
      : veteranSave();
    if (style === "forged-idle")
      for (const key of Object.keys(save.forge)) save.forge[key] = 100;
    const g = new Game(hero.id, save, rng(718));
    let input = { x: 0, y: 0 };
    for (let frame = 0; frame < 60 * 420 && g.state !== "dead"; frame++) {
      while (g.talentPoints > 0) {
        const node = TALENT_TREES[hero.id]
          .flatMap((b) => b.nodes)
          .find((n) => !talentLock(g, n.id));
        if (!node) break;
        g.spendTalent(node.id);
      }
      if (g.state === "levelup") {
        const options = g.choices();
        const priorities = [
          "signature",
          "active",
          ...hero.talentIds.slice(0, 2),
          "nova",
          "orbit",
          "familiar",
          "frost",
          "meteor",
          "scythe",
          "precision",
          "focus",
          "power",
          "haste",
          "recovery",
          "armor",
          "vitality",
          "magnet",
          "speed",
        ];
        if (g.p.hp < g.p.maxHp * 0.45 && options.includes("vitality"))
          g.upgrade("vitality");
        else
          g.upgrade(
            [...options].sort(
              (a, b) => priorities.indexOf(a) - priorities.indexOf(b),
            )[0],
          );
      }
      if (style === "scavenger" && frame % 6 === 0) {
        const p = g.p,
          near = g.enemies.filter(
            (e) => Math.hypot(e.x - p.x, e.y - p.y) < 260,
          ),
          drops = g.pickups.filter((d) => d.kind === "xp");
        let closest = null,
          dd = Infinity;
        for (const d of drops) {
          const dist = Math.hypot(d.x - p.x, d.y - p.y);
          if (dist < dd) {
            dd = dist;
            closest = d;
          }
        }
        let best = -Infinity;
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8,
            x = Math.cos(a),
            y = Math.sin(a),
            tx = p.x + x * 95,
            ty = p.y + y * 95;
          let score = closest
            ? -Math.hypot(closest.x - tx, closest.y - ty) * 0.045
            : Math.sin(g.time / 4 + a) * 0.5;
          for (const e of near) {
            const d = Math.hypot(e.x - tx, e.y - ty);
            score -= 1500 / (d + 10);
            if (d < e.r + 25) score -= 55;
          }
          if (score > best) {
            best = score;
            input = { x, y };
          }
        }
        const close = near.filter(
          (e) => Math.hypot(e.x - p.x, e.y - p.y) < 140,
        ).length;
        if (close > 5 || p.hp < p.maxHp * 0.4) g.skill();
        if (
          near.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < e.r + 38) &&
          g.p.invuln < 0.1
        )
          g.dash();
      }
      g.update(1 / 60, input);
      g.events = [];
    }
    console.log(
      JSON.stringify({
        style,
        hero: hero.id,
        seconds: Math.round(g.time),
        level: g.level,
        kills: g.kills,
        hp: Math.round(g.p.hp),
        embers: g.embers,
        bossesSpawned: g.bossCount,
        bossesAlive: g.enemies.filter((e) => e.boss).length,
        build: g.ranks,
      }),
    );
  }
