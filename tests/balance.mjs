// Repeatable balance probes, not a substitute for human playtesting.
import { Game, HEROES, freshSave } from "../src/core.js";
import { veteranSave } from "./helpers.mjs";
import { TALENT_TREES, talentLock } from "../src/progression.js";
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
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
