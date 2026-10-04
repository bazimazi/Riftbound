import type { Save } from "../types.ts";
// Damage keeps growing after the visual complexity of a weapon reaches its limit.
export const RELICS = [
  "orbit",
  "nova",
  "familiar",
  "frost",
  "meteor",
  "scythe",
];
export const rankTier = (rank: number) =>
  rank >= 20
    ? "Transcendent"
    : rank >= 10
      ? "Ascended"
      : rank >= 5
        ? "Awakened"
        : "Growing";
export const rankPotency = (rank: number) =>
  1 + Math.max(0, rank - 5) * 0.09 + Math.floor(rank / 10) * 0.25;
import { HERO_IDS, heroUnlocked } from "../combat/champions.ts";
export const RESEARCH = [
  {
    id: "weapon",
    name: "Signature",
    icon: "signature",
    desc: "Signature potency · diminishing gains",
    base: 90,
  },
  {
    id: "skill",
    name: "Soul skill",
    icon: "active",
    desc: "Skill potency · diminishing gains",
    base: 75,
  },
  {
    id: "relic",
    name: "Reliccraft",
    icon: "orbit",
    desc: "Relic potency · diminishing gains",
    base: 85,
  },
  {
    id: "insight",
    name: "Insight",
    icon: "magnet",
    desc: "Experience · diminishing gains",
    base: 100,
  },
];
export const researchRank = (save: Save, hero: string, id: string) =>
  save.research?.[hero]?.[id] || 0;
export const researchBonus = (rank: number, id: string) =>
  (({ weapon: 0.04, skill: 0.06, relic: 0.04, insight: 0.02 })[id] || 0) *
  Math.log2(1 + Math.max(0, rank));
export function researchCost(rank: number, id: string) {
  const item = RESEARCH.find((r) => r.id === id);
  return {
    embers: Math.ceil((item?.base || 100) * 1.4 * Math.pow(rank + 1, 1.5)),
    shards: (rank + 1) % 5 === 0 ? 1 + Math.floor(rank / 10) : 0,
  };
}
export function buyResearch(save: Save, hero: string, id: string) {
  if (
    !HERO_IDS.includes(hero) ||
    !heroUnlocked(save, hero) ||
    !RESEARCH.some((r) => r.id === id)
  )
    return false;
  const rank = researchRank(save, hero, id),
    cost = researchCost(rank, id);
  if (save.embers < cost.embers || save.shards < cost.shards) return false;
  save.embers -= cost.embers;
  save.shards -= cost.shards;
  save.research ??= {};
  save.research[hero] ??= {};
  save.research[hero][id] = rank + 1;
  return true;
}
