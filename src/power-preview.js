import { icon } from "./icons.js";
import { rankTier, rankPotency, researchBonus } from "./ascension.js";
export const talentSummary = {
  temper: "+10% hammer damage / rank",
  quake: "+10% reach / rank · max 60%",
  earthshatter: "Poised strike: 8 stone shards",
  bulwark: "Every 5 kills: extra shield",
  bastion: "Armor while shielded",
  unbroken: "Skill: 1s invulnerability",
  sentinelvow: "+4% shielded damage / rank",
  retaliation: "Taking damage restores poise",
  laststand: "Low-HP skill: heal 20%",
  drawspeed: "+18% focus charge / rank",
  moonsight: "+12% charged damage / rank",
  fullmoon: "Charged volley: +2 arrows",
  fletching: "+1 pierce / rank",
  trueshot: "+3% critical chance / rank",
  doubleshot: "Repeat charged volleys",
  lunarstep: "+movement speed / rank",
  moonveil: "Skill: 5 shield / rank",
  starfall: "Skill: 5s moon field",
  afterburn: "35% burn / rank",
  flashpoint: "12% vs burning / rank",
  combustion: "45 damage on death",
  firestorm: "+1 ember · +12% area",
  incandescence: "12% speed at high heat",
  solar: "Sun pulse every 2s",
  phoenix: "25% low-HP damage",
  cauterize: "8% heal / rank",
  rebirth: "Revive once · 45% HP",
  roots: "+6s garden · +20% speed",
  germination: "+1 thorn pierce / rank",
  grove: "Triple seedling shots",
  bramble: "18% thorn reach / rank",
  venom: "30% poison / rank",
  overgrowth: "35% vs slowed targets",
  symbiosis: "0.7 HP/s / rank",
  barkskin: "Armor near seedlings",
  heartwood: "35 shield · healing seeds",
  bloodletter: "25% stacking bleed",
  hemorrhage: "12% vs bleeding / rank",
  feast: "Kills heal · skill recovery",
  ghostwalk: "Dash recovery · knife ring",
  afterimage: "18% speed after dash",
  phantom: "6s attacking shadow",
  executioner: "30% execute damage",
  deadeye: "8% moving crit / rank",
  reaper: "Execute below 15% HP",
  conduction: "+2 chain targets / rank",
  resonance: "12% double-hit / rank",
  tempest: "8 bolts on overload",
  feedback: "Shield on overload",
  insulation: "Armor while shielded",
  perpetual: "Overload: −2s skill CD",
  singularity: "Pull · 20% pulse area",
  eventhorizon: "0.35s stun / rank",
  blackstar: "5s gravity vortex",
};
export function upgradeSummary(g, id) {
  const r = g.rank(id) + 1;
  if (id === "signature")
    return {
      cinder: `${Math.min(12, 1 + Math.floor(r / 2) + g.rank("firestorm"))} embers · ${20 + r * 8} base damage`,
      briar: `${Math.min(15, 3 + r)} thorns · ${12 + r * 7} base damage`,
      nyx: `${Math.min(16, (2 + Math.floor(r / 2)) * (r >= 5 ? 2 : 1))} knives · ${13 + r * 5} base damage`,
      volta: `${Math.min(24, 2 + r + g.rank("conduction") * 2)} links · ${19 + r * 7} base damage`,
      rook: `${32 + r * 9} base damage · ${r >= 5 ? 180 : 145} hammer reach`,
      lumen: `${Math.min(7, 2 + Math.floor(r / 4) + (r >= 5 ? 1 : 0))} arrows · ${24 + r * 8} base damage`,
      vesper: `${19 + r * 5} bolt damage · curses & imp blasts`,
      fen: `${23 + r * 6} bolt damage · marks & wolf cleaves`,
      solace: `${22 + r * 6} dawn damage · faith`,
      orin: `${22 + r * 5} spirit damage · totems`,
      kestrel: `${25 + r * 7} palm damage · 3-hit combo`,
      morrow: `${32 + r * 8} cleave damage · plague`,
    }[g.hero.id];
  if (id === "active")
    return `+${Math.round(((1 + r * 0.14) * rankPotency(r) * (1 + researchBonus(g.research("skill"), "skill")) - 1) * 100)}% skill power · faster recovery`;
  return (
    {
      orbit: `${Math.min(12, r)} blades · ${17 + r * 6} base damage`,
      nova: `${20 + r * 16} base damage · pulse`,
      familiar: `${Math.min(8, Math.ceil(r / 2))} bolts · ${14 + r * 8} base damage`,
      frost: `${12 + r * 8} base damage · slow`,
      meteor: `${35 + r * 22} base damage · blast`,
      scythe: `${Math.min(24, 3 + r)} scythes · ${15 + r * 10} base damage`,
      power: "+8% all damage",
      haste: "+6% attack speed",
      vitality: "+10 HP · heal 12",
      speed: "+movement speed",
      magnet: "+22 reach · +2.5% XP",
      armor: "+damage resistance",
      recovery: "+0.35 HP / sec",
      precision: "+3% critical chance",
      focus: "+skill recovery",
      breadth: "+weapon & skill area",
      endurance: "+effect duration",
      barrier: "+8 shield · slow shield recovery",
      fervor: "+elite & Warden damage",
    }[id] || ""
  );
}
export function rankRoad(rank) {
  return `<div class="rank-road" aria-label="${rankTier(rank)}: milestones at ranks 5, 10 and 20; no rank limit">${[5, 10, 20].map((n) => `<span class="${rank >= n ? "lit" : ""}"><b>${n}</b><small>${n === 5 ? "Awaken" : n === 10 ? "Ascend" : "Transcend"}</small></span>`).join("")}<span class="lit"><b>∞</b><small>Power</small></span></div>`;
}
export const statBadge = (id, text) =>
  `<span class="stat-badge">${icon(id)}${text}</span>`;
