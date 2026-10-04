import { defineTable } from "../../shared/records.ts";
import type { ClassTalentNode, TalentBranch } from "../types.ts";
import type { Journey } from "../types.ts";
import type { Game } from "../Game.ts";
import type { Save } from "../types.ts";
import { TALENT_TREES } from "./progression.ts";
import { profile, heroLevel } from "./journey.ts";
import { ARCHETYPE_THEMES, ARCHETYPE_ROLES } from "../combat/archetypes.ts";
import { statDescription, talentPreview } from "../data/talent-effects.ts";
import { PASSIVE_EFFECTS, ULTIMATES } from "../data/specializations.ts";
import { spellsFor } from "../data/spell-data.ts";
export { selectedUltimate } from "../data/specializations.ts";

// Existing class mechanics anchor each tree. New side paths create real tradeoffs.
const themes = defineTable({
  ...ARCHETYPE_THEMES,
  cinder: [
    ["Kindling", "Wildfire", "Flame sculptor", "Sunborn"],
    ["Hot blood", "Blazing cadence", "Fire dominion", "Solar crown"],
    ["Ashen skin", "Rekindle", "Last ember", "Undying flame"],
  ],
  briar: [
    ["Deep roots", "Seed keeper", "Living earth", "Worldroot"],
    ["Serrated vines", "Toxic bloom", "Spore veil", "Plague garden"],
    ["Green heart", "Wild shelter", "Ancient bark", "Forest guardian"],
  ],
  nyx: [
    ["Night edge", "Blood pursuit", "Dark appetite", "Crimson eclipse"],
    ["Light feet", "Silent rhythm", "Veil mastery", "Untouchable"],
    ["Keen senses", "Marked prey", "Fatal angle", "Nightfall"],
  ],
  volta: [
    ["Ion spark", "Charged rhythm", "Wide circuit", "Storm lord"],
    ["Static ward", "Living battery", "Storm shelter", "Thunderheart"],
    ["Heavy current", "Rift lens", "Graviton", "Void conductor"],
  ],
  rook: [
    ["Steel edge", "Heavy rhythm", "Runic reach", "Titan force"],
    ["Granite blood", "Steadfast", "Stone refuge", "Living mountain"],
    ["Fault sense", "Rumbling cadence", "Earth dominion", "World breaker"],
  ],
  lumen: [
    ["Silver edge", "Swift string", "Far horizon", "Celestial aim"],
    ["Owl sight", "Hunter's mark", "True horizon", "Fate arrow"],
    ["Moon heart", "Night shelter", "Lunar refuge", "Starlit guardian"],
  ],
});
const roles = defineTable({
  ...ARCHETYPE_ROLES,
  cinder: ["offense", "skill", "guard"],
  briar: ["skill", "offense", "guard"],
  nyx: ["offense", "speed", "crit"],
  volta: ["offense", "guard", "skill"],
  rook: ["offense", "guard", "skill"],
  lumen: ["offense", "crit", "guard"],
});
const bonuses = defineTable<Record<string, number>[]>({
  offense: [
    { weapon: 0.05 },
    { haste: 0.025 },
    { area: 0.025 },
    { elite: 0.18, weapon: 0.08 },
  ],
  skill: [
    { skill: 0.06 },
    { cooldown: 0.025 },
    { duration: 0.04 },
    { skill: 0.12, castShield: 8 },
  ],
  guard: [
    { health: 0.06 },
    { defense: 0.018 },
    { shield: 3 },
    { health: 0.08, castHeal: 0.04 },
  ],
  speed: [
    { speed: 0.04 },
    { dash: 0.03 },
    { duration: 0.04 },
    { speed: 0.06, elite: 0.15 },
  ],
  crit: [
    { crit: 0.015 },
    { elite: 0.04 },
    { critDamage: 0.04 },
    { crit: 0.025, critDamage: 0.18 },
  ],
});
export const CLASS_TREES: Record<
  string,
  (Omit<TalentBranch, "nodes"> & { nodes: ClassTalentNode[] })[]
> = Object.fromEntries(
  Object.entries(TALENT_TREES).map(([hero, branches]) => [
    hero,
    branches.map((branch, b) => {
      const old = branch.nodes,
        names = themes[hero][b],
        stats = bonuses[roles[hero][b]];
      const side = (
        i: number,
        row: number,
        col: number,
        requires: string,
        spent: number,
        level: number,
      ) => ({
        id: `${hero}_path${b}_${i}`,
        name: i === 3 ? ULTIMATES[`${hero}_path${b}_3`].name : names[i],
        desc:
          i === 3
            ? ULTIMATES[`${hero}_path${b}_3`].desc
            : i
              ? PASSIVE_EFFECTS[roles[hero][b]][i - 1](1)
              : `${statDescription(stats[i])} / rank.`,
        stats: i === 0 ? stats[i] : null,
        proc: i > 0 && i < 3 ? { role: roles[hero][b], slot: i - 1 } : null,
        ultimate: i === 3 ? ULTIMATES[`${hero}_path${b}_3`] : null,
        max: i === 3 ? 1 : 3,
        row,
        col,
        requires,
        requiredRank: i === 3 ? 1 : 2,
        spent,
        level,
        icon: ["blade", "bolt", "shield", "star"][i],
        cost: i === 3 ? 2 : 1,
        branch: b,
      });
      return {
        ...branch,
        nodes: [
          {
            ...old[0],
            max: 5,
            row: 0,
            col: 1,
            level: 5,
            spent: 0,
            cost: 1,
            icon: hero,
            branch: b,
          },
          side(0, 1, 0, old[0].id, 2, 10),
          {
            ...old[1],
            max: 3,
            row: 1,
            col: 2,
            level: 10,
            spent: 2,
            cost: 1,
            requires: old[0].id,
            requiredRank: 2,
            icon: "bolt",
            branch: b,
          },
          side(1, 2, 0, `${hero}_path${b}_0`, 5, 20),
          side(2, 2, 2, old[1].id, 5, 20),
          {
            ...old[2],
            max: 1,
            row: 3,
            col: 1,
            level: 35,
            spent: 8,
            cost: 2,
            requires: old[1].id,
            requiredRank: 2,
            icon: "star",
            branch: b,
          },
          side(3, 4, 1, old[2].id, 12, 75),
          ...spellsFor(hero)
            .filter((s) => s.branch === b)
            .flatMap((s, i, spells) => [
              {
                id: s.id,
                name: s.name,
                desc: s.desc,
                spell: s.id,
                max: 1,
                cost: i ? 3 : 2,
                row: i ? 7 : 5,
                col: 1,
                level: i ? 85 : 25,
                spent: i ? 10 : 4,
                branch: b,
                icon: s.icon,
                requires: i ? spells[0].masteryId : old[0].id,
                requiredRank: 2,
              },
              {
                id: s.masteryId,
                name: `${s.name} mastery`,
                desc: "Shape the spell's power and behavior.",
                spellMastery: s.id,
                max: 3,
                cost: 1,
                row: i ? 8 : 6,
                col: 1,
                level: i ? 110 : 45,
                spent: i ? 13 : 6,
                branch: b,
                icon: "star",
                requires: s.id,
                requiredRank: 1,
              },
            ]),
        ],
      };
    }),
  ]),
);
export const CLASS_NODES: Record<string, ClassTalentNode> = Object.fromEntries(
  Object.entries(CLASS_TREES).flatMap(([hero, branches]) =>
    branches.flatMap((b) => b.nodes.map((n) => [n.id, { ...n, hero }])),
  ),
);
export function classTalentPreview(
  save: Save,
  hero: string,
  id: string,
  game: Game | null = null,
) {
  const node = CLASS_NODES[id],
    rank = profile(save, hero).talents[id] || 0;
  const affinity =
    node.row === 0 &&
    (save.mastery[hero] || 0) >= 400 &&
    (save.affinities[hero] || CLASS_TREES[hero][0].nodes[0].id) === id
      ? 1
      : 0;
  const bonus =
    game?.hero.id === hero && !node.stats
      ? Math.max(0, game.rank(id) - Math.max(rank, affinity))
      : 0;
  return {
    ...talentPreview(node, rank, { affinity, bonus }),
    source: bonus
      ? `Run rank ${game!.rank(id)}`
      : affinity > rank
        ? "Affinity"
        : "",
  };
}
export function talentEarned(save: Save, hero: string) {
  return (
    Math.floor(heroLevel(profile(save, hero).xp) / 5) +
    Math.floor((save.chronicle?.[hero]?.bosses || 0) / 10) +
    Math.floor(Object.keys(save.memories?.[hero] || {}).length / 4)
  );
}
export const branchSpent = (p: Journey, hero: string, branch: number) =>
  CLASS_TREES[hero][branch].nodes.reduce(
    (n, t) => n + (p.talents[t.id] || 0) * t.cost,
    0,
  );
export const talentSpent = (p: Journey, hero: string) =>
  CLASS_TREES[hero].reduce((n, _, b) => n + branchSpent(p, hero, b), 0);
export const talentAvailable = (save: Save, hero: string) =>
  Math.max(
    0,
    talentEarned(save, hero) - talentSpent(profile(save, hero), hero),
  );
export function classTalentLock(save: Save, hero: string, id: string) {
  const n = CLASS_NODES[id],
    p = profile(save, hero);
  if (!n || n.hero !== hero) return "Different class";
  if ((p.talents[id] || 0) >= n.max) return "MASTERED";
  if (heroLevel(p.xp) < n.level) return `Class level ${n.level}`;
  if (n.requires && (p.talents[n.requires] || 0) < n.requiredRank!)
    return `${CLASS_NODES[n.requires].name} ${n.requiredRank}/${CLASS_NODES[n.requires].max}`;
  if (branchSpent(p, hero, n.branch) < n.spent)
    return `${n.spent} points in this path`;
  if (talentAvailable(save, hero) < n.cost)
    return `${n.cost} talent point${n.cost > 1 ? "s" : ""}`;
  return "";
}
export function buyClassTalent(save: Save, hero: string, id: string) {
  if (classTalentLock(save, hero, id)) return false;
  const p = profile(save, hero);
  p.talents[id] = (p.talents[id] || 0) + 1;
  if (CLASS_NODES[id].ultimate && !p.ultimate) p.ultimate = id;
  return true;
}
export function equipUltimate(save: Save, hero: string, id: string) {
  const p = profile(save, hero);
  if (ULTIMATES[id]?.hero !== hero || !p.talents[id]) return false;
  p.ultimate = id;
  return true;
}
export function respecCost(save: Save, hero: string) {
  const p = profile(save, hero),
    spent = talentSpent(p, hero);
  return {
    embers: 150 + spent * 45 + (p.respecs || 0) ** 2 * 100,
    rune: spent >= 10 ? 2 : 0,
  };
}
export function respecTalents(save: Save, hero: string) {
  const p = profile(save, hero),
    cost = respecCost(save, hero);
  if (
    !talentSpent(p, hero) ||
    save.embers < cost.embers ||
    p.materials.rune < cost.rune
  )
    return false;
  save.embers -= cost.embers;
  p.materials.rune -= cost.rune;
  p.respecs = (p.respecs || 0) + 1;
  p.talents = {};
  p.ultimate = "";
  p.loadout = ["", "", ""];
  return true;
}
export function classTalentBonuses(g: Game) {
  const result: Record<string, number> = {};
  for (const [id, rank] of Object.entries(g.journey.talents)) {
    const n = CLASS_NODES[id];
    if (n?.hero !== g.hero.id) continue;
    for (const [key, value] of Object.entries(
      (n.stats || {}) as Record<string, number>,
    ))
      result[key] = (result[key] || 0) + value * rank;
  }
  return result;
}
export function sanitizeClassTalents(save: Save, hero: string) {
  const p = profile(save, hero),
    raw = p.talents;
  p.talents = {};
  let budget = talentEarned(save, hero);
  // Iterate prerequisites: a spell investment can legitimately unlock an older capstone.
  let changed;
  do {
    changed = false;
    for (const n of CLASS_TREES[hero].flatMap((b) => b.nodes)) {
      const requested = Math.min(
        n.max,
        Math.max(0, Math.floor(Number(raw[n.id]) || 0)),
      );
      while ((p.talents[n.id] || 0) < requested) {
        if (budget < n.cost || classTalentLock(save, hero, n.id)) break;
        p.talents[n.id] = (p.talents[n.id] || 0) + 1;
        budget -= n.cost;
        changed = true;
      }
    }
  } while (changed);
  if (ULTIMATES[p.ultimate]?.hero !== hero || !p.talents[p.ultimate])
    p.ultimate = "";
}
