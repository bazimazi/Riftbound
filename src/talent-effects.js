// Talent contributions, before other build bonuses. Keep conditions and caps explicit.
import { PASSIVE_EFFECTS } from "./specializations.js";
import { SPELLS, spellMasteryText } from "./spell-data.js";
const value = (n) => Number(n.toFixed(2));
const armor = (rate, rank) =>
  Number((100 * (1 - 1 / (1 + rate * rank))).toFixed(1));
const labels = {
  weapon: "weapon damage",
  haste: "attack speed",
  area: "area",
  elite: "elite damage",
  skill: "skill damage",
  cooldown: "skill recovery",
  duration: "effect duration",
  health: "health",
  defense: "damage reduction",
  shield: "starting shield",
  castShield: "shield on skill use",
  castHeal: "health restored on skill use",
  speed: "move speed",
  dash: "dash recovery",
  crit: "critical chance",
  critDamage: "critical damage",
};
export const statDescription = (stats, rank = 1) =>
  Object.entries(stats)
    .map(([id, amount]) => {
      const flat = ["shield", "castShield"].includes(id);
      return `+${value(amount * rank * (flat ? 1 : 100))}${flat ? "" : "%"} ${labels[id]}`;
    })
    .join(" · ");

export const TALENT_EFFECTS = {
  afterburn: (r) => `${35 * r}% weapon damage / second as burn.`,
  flashpoint: (r) => `+${12 * r}% damage to burning foes.`,
  firestorm: (r) => `+${r} embers · +${12 * r}% blast radius. Volley cap: 12.`,
  incandescence: (r) => `Above 70% heat: +${12 * r}% attack speed.`,
  phoenix: (r) =>
    `Below 35% HP: +${25 * r}% damage · ${armor(0.25, r)}% less damage taken.`,
  cauterize: (r) =>
    `Wildfire restores ${Math.min(100, 8 * r)}% maximum health.`,
  roots: (r) => `Seedlings: +${6 * r}s lifetime · +${20 * r}% firing speed.`,
  germination: (r) => `Seedling attacks pierce ${r} additional foes.`,
  bramble: (r) => `+${18 * r}% thorn reach · hits slow foes for 1.1s.`,
  venom: (r) => `${30 * r}% weapon damage / second as poison.`,
  symbiosis: (r) => `Near a seedling: restore ${value(0.7 * r)} HP / second.`,
  barkskin: (r) => `Near a seedling: ${armor(0.125, r)}% less damage taken.`,
  bloodletter: (r) =>
    `Knife hits add ${25 * r}% weapon damage as bleed. Stack cap: 150%.`,
  hemorrhage: (r) => `+${12 * r}% damage to bleeding foes.`,
  ghostwalk: (r) =>
    `${armor(0.18, r)}% shorter dash cooldown · ${Math.min(24, 6 + 2 * r)} dash knives.`,
  afterimage: (r) => `After a dash: +${18 * r}% attack speed for 3s.`,
  executioner: (r) => `Foes below 40% HP take +${30 * r}% damage.`,
  deadeye: (r) => `Full momentum: +${8 * r}% critical chance. Total cap: 75%.`,
  conduction: (r) =>
    `+${2 * r} chain targets · +${20 * r}% chain range. Link cap: 24.`,
  resonance: (r) =>
    `Arc hits: ${Math.min(100, 12 * r)}% chance of double damage.`,
  feedback: (r) =>
    `Overload: +${8 * r} shield. Shield capacity: ${35 + 4 * r}.`,
  insulation: (r) => `While shielded: ${armor(0.125, r)}% less damage taken.`,
  singularity: (r) => `Arcs pull foes together · +${20 * r}% overload radius.`,
  eventhorizon: (r) => `Overloads stun foes for ${value(0.35 * r)}s.`,
  temper: (r) => `+${10 * r}% hammer damage.`,
  quake: (r) => `+${Math.min(60, 10 * r)}% hammer reach.`,
  bulwark: (r) =>
    `Every fifth kill restores ${Math.min(16, 2 + 2 * r)} shield.`,
  bastion: (r) => `While shielded: ${armor(0.1, r)}% less damage taken.`,
  sentinelvow: (r) => `While shielded: +${4 * r}% hammer damage.`,
  retaliation: (r) => `Taking damage restores ${4 * r}% poise.`,
  drawspeed: (r) => `+${18 * r}% focus charge speed.`,
  moonsight: (r) => `+${12 * r}% charged arrow damage.`,
  fletching: (r) => `Arrows pierce ${r} additional foes.`,
  trueshot: (r) => `+${3 * r}% critical chance. Total cap: 65%.`,
  lunarstep: (r) => `+${value((2 * r) / (1 + 0.04 * r))}% movement speed.`,
  moonveil: (r) => `Moonfall grants ${5 * r} additional shield.`,
  hexcraft: (r) => `+${14 * r}% curse damage.`,
  longhex: (r) => `Curses last ${value(3 + 0.5 * r)}s.`,
  demonhide: (r) => `+${15 * r}% companion health.`,
  demonsurge: (r) => `Pact demons: +${45 + 15 * r}% damage.`,
  ruincraft: (r) => `+${8 * r}% hex bolt damage.`,
  soulwell: (r) => `+${r}s pact duration.`,
  wildbond: (r) => `+${16 * r}% beast health.`,
  savage: (r) => `Commanded beasts: +${55 + 15 * r}% damage.`,
  trailcraft: (r) => `+${9 * r}% crossbow bolt damage.`,
  longmark: (r) => `Prey marks last ${4 + r}s.`,
  trapcraft: (r) => `+${12 * r}% snare radius.`,
  thorntrap: (r) => `+${25 * r}% trap damage.`,
  grace: (r) => `Each gated mend restores ${value(1.2 + 0.15 * r)} HP.`,
  faithwell: (r) => `+${10 * r}% faith generation.`,
  discipline: (r) => `Halos grant ${2 * r} additional shield.`,
  penance: (r) => `Full faith: +${8 * r}% dawn bolt damage.`,
  judgement: (r) => `+${5 * r}% dawn bolt damage.`,
  radiance: (r) => `+${8 * r}% halo reach.`,
  embercall: (r) => `+${6 * r}% fire totem damage.`,
  longflame: (r) => `Totems last ${20 + 2 * r}s before other bonuses.`,
  stormcall: (r) => `+${6 * r}% storm totem damage.`,
  widecircle: (r) => `+${8 * r}% totem reach.`,
  tidecall: (r) =>
    `Inside the tide circle: ${value(1.2 + 0.15 * r)} HP / pulse.`,
  tideguard: (r) =>
    `Inside the tide circle: ${r} shield / pulse. Capacity: 30.`,
  windcraft: (r) => `+${5 * r}% combo damage.`,
  longkick: (r) => `+${8 * r}% kick reach.`,
  mistcraft: (r) => `Restore ${value(0.5 * r)} HP per qi spent.`,
  mistguard: (r) => `Kicks grant ${2 * r} additional shield.`,
  ironcraft: (r) => `Third strikes grant ${2 * r} shield. Capacity: 25.`,
  ironreach: (r) => `+${8 * r}% combo reach.`,
  bloodrunes: (r) =>
    `Restore ${value(0.5 * r)} HP per rune spent. Grip healing cap: 17% HP.`,
  bloodguard: (r) => `Grips grant ${2 * r} additional shield.`,
  rimecraft: (r) => `+${5 * r}% rune cleave damage.`,
  longrime: (r) => `Rune cleaves chill foes for ${value(1.2 + 0.3 * r)}s.`,
  gravecraft: (r) => `+${8 * r}% plague damage.`,
  gravecoven: (r) => `+${2 * r}s ghoul lifetime.`,
};

export function talentEffect(node, rank) {
  if (!rank) return "Not learned.";
  if (node.spell)
    return `${SPELLS[node.spell].desc} · ${SPELLS[node.spell].cooldown}s · Equip in Spells.`;
  if (node.spellMastery)
    return spellMasteryText(SPELLS[node.spellMastery], rank);
  if (node.proc) return PASSIVE_EFFECTS[node.proc.role][node.proc.slot](rank);
  if (node.stats) return statDescription(node.stats, rank);
  return TALENT_EFFECTS[node.id]?.(rank) || node.desc;
}

export function talentPreview(node, rank, { affinity = 0, bonus = 0 } = {}) {
  const currentRank = Math.max(rank, affinity) + bonus;
  const nextRank =
    rank < node.max ? Math.max(rank + 1, affinity) + bonus : null;
  return {
    currentRank,
    current: talentEffect(node, currentRank),
    nextRank,
    next: nextRank === null ? null : talentEffect(node, nextRank),
  };
}
