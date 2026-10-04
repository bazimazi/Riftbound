import type { TalentBranch, TalentNode, CodexPage } from "../types.ts";
import type { ForgeItem } from "../types.ts";
import type { Game } from "../Game.ts";
import type { Save } from "../types.ts";
// Persistent progression, unlock requirements and authored talent trees.
import { EXTRA_TREES, EXTRA_PAGES } from "../combat/champions.ts";
const f = (
  id: string,
  name: string,
  icon: string,
  group: string,
  desc: string,
  cap: number,
  extra: Partial<ForgeItem> = {},
): ForgeItem => ({
  id,
  name,
  icon,
  group,
  desc,
  cap,
  max: 20,
  base: 22,
  unit: "%",
  ...extra,
});
export const FORGE = [
  f("might", "Tempered soul", "⚔", "Arsenal", "All weapon damage", 0.22),
  f("precision", "Keen edge", "✧", "Arsenal", "Critical hit chance", 0.14, {
    base: 28,
  }),
  f(
    "brutality",
    "Killing blow",
    "†",
    "Arsenal",
    "Critical damage multiplier",
    0.45,
    { base: 32, gate: 4 },
  ),
  f("haste", "Quicksilver", "»", "Arsenal", "Attack speed", 0.16, { base: 30 }),
  f("blast", "Runic powder", "◉", "Arsenal", "Area-of-effect radius", 0.2, {
    base: 28,
    gate: 4,
  }),
  f("force", "Heavy hand", "✹", "Arsenal", "Knockback strength", 0.4, {
    base: 24,
  }),
  f("vigor", "Living ember", "♡", "Survival", "Maximum health", 0.25),
  f("plating", "Barksteel", "⬡", "Survival", "Damage reduction", 0.14, {
    base: 30,
  }),
  f(
    "mending",
    "Quiet renewal",
    "✚",
    "Survival",
    "Health regenerated per second",
    0.65,
    { base: 34, unit: "/s", gate: 5 },
  ),
  f("siphon", "Second breath", "❋", "Survival", "Extra healing each level", 7, {
    base: 25,
    unit: " HP",
  }),
  f("ward", "Dawn ward", "◈", "Survival", "Shield at the start of a run", 28, {
    base: 25,
    unit: " HP",
  }),
  f(
    "reprieve",
    "Last candle",
    "♜",
    "Survival",
    "Revive once per run at 35% health",
    1,
    {
      base: 500,
      max: 1,
      linear: true,
      unit: " charge",
      gate: 18,
      bosses: 3,
      shards: 3,
    },
  ),
  f("wisdom", "Old knowledge", "◎", "Wayfinding", "Experience gained", 0.18),
  f("agility", "Riftwalker", "➶", "Wayfinding", "Dash cooldown reduction", 0.2),
  f("stride", "Wanderer boots", "↟", "Wayfinding", "Movement speed", 0.12, {
    base: 28,
  }),
  f("reach", "Lodestone", "◇", "Wayfinding", "Spark collection radius", 60, {
    base: 20,
    unit: " px",
  }),
  f(
    "reserves",
    "Second sight",
    "↻",
    "Wayfinding",
    "Extra upgrade rerolls per run",
    3,
    { base: 95, max: 3, linear: true, unit: " reroll", gate: 5 },
  ),
  f(
    "banishment",
    "Severed thread",
    "×",
    "Wayfinding",
    "Banish upgrades from this run",
    3,
    { base: 110, max: 3, linear: true, unit: " banish", gate: 8 },
  ),
  f("fortune", "Gilded bones", "✧", "Occult", "Embers earned", 0.35, {
    base: 35,
  }),
  f(
    "alchemy",
    "Green tincture",
    "♧",
    "Occult",
    "Healing from hearts and caches",
    0.5,
    { base: 25 },
  ),
  f(
    "focus",
    "Clear mind",
    "ϟ",
    "Occult",
    "All skill cooldown reduction",
    0.18,
    { base: 30, gate: 5 },
  ),
  f(
    "longevity",
    "Long memory",
    "☽",
    "Occult",
    "Burn, bleed and seedling duration",
    0.3,
    { base: 30 },
  ),
  f(
    "bindings",
    "Codex bindings",
    "▣",
    "Occult",
    "Extra inscription slots per hero",
    2,
    { base: 150, max: 2, linear: true, unit: " slot", gate: 8, shards: 2 },
  ),
  f(
    "attunement",
    "Ancestral echo",
    "✦",
    "Occult",
    "Starting run resonance points",
    2,
    {
      base: 350,
      max: 2,
      linear: true,
      unit: " point",
      gate: 20,
      bosses: 4,
      shards: 4,
    },
  ),
];
export function forgeBonus(id: string, rank: number = 0) {
  const item = FORGE.find((f) => f.id === id);
  if (!item) return 0;
  rank = Math.max(0, Math.min(Number(rank) || 0, item.max));
  return item.linear ? rank : item.cap * (1 - Math.exp(-rank / 8));
}
export const forgeCost = (rank: number, id: string = "might") =>
  Math.ceil(
    (FORGE.find((f) => f.id === id)?.base || 22) *
      1.45 *
      Math.pow(rank + 1, 1.6),
  );
export const totalForge = (save: Save) =>
  Object.values(save.forge).reduce((a, b) => a + b, 0);
export function forgeLock(save: Save, item: ForgeItem) {
  if ((save.forge[item.id] || 0) >= item.max) return "MASTERED";
  if (totalForge(save) < (item.gate || 0))
    return `${item.gate} total forge ranks required`;
  if ((save.bosses || 0) < (item.bosses || 0))
    return `Defeat ${item.bosses} wardens`;
  return "";
}
export function buyForge(save: Save, id: string) {
  const item = FORGE.find((f) => f.id === id);
  if (!item || forgeLock(save, item)) return false;
  const cost = forgeCost(save.forge[id] || 0, id),
    shards = item.shards || 0;
  if (save.embers < cost || (save.shards || 0) < shards) return false;
  save.embers -= cost;
  save.shards -= shards;
  save.forge[id] = (save.forge[id] || 0) + 1;
  return true;
}
export function forgeValue(item: ForgeItem, rank: number) {
  const n = forgeBonus(item.id, rank);
  return item.unit === "%"
    ? `${(n * 100).toFixed(1)}%`
    : `${item.linear ? n : n.toFixed(1)}${item.unit}`;
}

const node = (id: string, name: string, desc: string, max = 3) => ({
  id,
  name,
  desc,
  max: max === 3 ? 12 : max === 2 ? 8 : 1,
});
const branch = (name: string, icon: string, nodes: TalentNode[]) => ({
  name,
  icon,
  nodes,
});
export const TALENT_TREES: Record<string, TalentBranch[]> = {
  cinder: [
    branch("Ash alchemist", "♨", [
      node(
        "afterburn",
        "Afterburn",
        "Embers burn for 35% extra damage per second per rank.",
      ),
      node(
        "flashpoint",
        "Flashpoint",
        "Burning targets take 12% more damage per rank.",
        2,
      ),
      node(
        "combustion",
        "Chain reaction",
        "Burning enemies explode on death for 45 damage. One blast per enemy.",
        1,
      ),
    ]),
    branch("Sun herald", "✹", [
      node(
        "firestorm",
        "Firestorm",
        "One extra ember projectile and +12% blast radius per rank.",
      ),
      node(
        "incandescence",
        "Incandescence",
        "Above 70% heat: +12% attack speed per rank.",
        2,
      ),
      node(
        "solar",
        "Solar crown",
        "At full heat, radiate a damaging sun pulse every 2 seconds.",
        1,
      ),
    ]),
    branch("Undying flame", "♡", [
      node(
        "phoenix",
        "Phoenix",
        "Below 35% HP, gain armor and +25% damage per rank.",
      ),
      node(
        "cauterize",
        "Cauterize",
        "Wildfire heals 8% maximum health per rank.",
        2,
      ),
      node(
        "rebirth",
        "Rebirth",
        "Once per run, lethal damage restores 45% health and triggers Wildfire.",
        1,
      ),
    ]),
  ],
  briar: [
    branch("Wild gardener", "❋", [
      node(
        "roots",
        "Deep roots",
        "Seedlings last 6 seconds longer and shoot 20% faster per rank.",
      ),
      node(
        "germination",
        "Germination",
        "Seedling attacks pierce one extra enemy per rank.",
        2,
      ),
      node(
        "grove",
        "Ancient grove",
        "Every seedling fires three thorns. Maximum garden size grows to 18.",
        1,
      ),
    ]),
    branch("Thorn sovereign", "✳", [
      node(
        "bramble",
        "Bramble",
        "Thorns reach 18% farther per rank and slow enemies.",
      ),
      node(
        "venom",
        "Venom sap",
        "Thorns poison for 30% extra damage per second per rank.",
        2,
      ),
      node(
        "overgrowth",
        "Strangler vine",
        "Slowed enemies take +35% damage. Sanctuary deals 90 damage.",
        1,
      ),
    ]),
    branch("Lifebinder", "♧", [
      node(
        "symbiosis",
        "Symbiosis",
        "Near a seedling, heal 0.7 HP per second per rank.",
      ),
      node(
        "barkskin",
        "Barkskin",
        "Near a seedling, gain armor per rank (diminishing returns).",
        2,
      ),
      node(
        "heartwood",
        "Heartwood",
        "Sanctuary grants 35 shield. Seedling deaths release a healing spark.",
        1,
      ),
    ]),
  ],
  nyx: [
    branch("Crimson oath", "◈", [
      node(
        "bloodletter",
        "Bloodletter",
        "Knives inflict stacking bleed: 25% weapon damage per rank.",
      ),
      node(
        "hemorrhage",
        "Hemorrhage",
        "Bleeding targets take 12% more damage per rank.",
        2,
      ),
      node(
        "feast",
        "Crimson feast",
        "Bleeding kills restore 0.8 HP and reduce skill cooldown by 0.1s.",
        1,
      ),
    ]),
    branch("Veil dancer", "☽", [
      node(
        "ghostwalk",
        "Ghostwalk",
        "Faster dash recovery; dashes unleash knives.",
      ),
      node(
        "afterimage",
        "Afterimage",
        "After a dash, gain +18% attack speed per rank for 3 seconds.",
        2,
      ),
      node(
        "phantom",
        "Phantom army",
        "Umbral Step creates a 6-second shadow that fires your knives.",
        1,
      ),
    ]),
    branch("Silent verdict", "†", [
      node(
        "executioner",
        "Executioner",
        "Deal +30% damage per rank to enemies below 40% health.",
      ),
      node(
        "deadeye",
        "Deadeye",
        "At full momentum, gain 8% critical chance per rank.",
        2,
      ),
      node(
        "reaper",
        "Final verdict",
        "Knife hits execute non-boss enemies below 15% health.",
        1,
      ),
    ]),
  ],
  volta: [
    branch("Storm architect", "ϟ", [
      node(
        "conduction",
        "Conduction",
        "Two additional chain targets and +20% chain range per rank.",
      ),
      node(
        "resonance",
        "Resonance",
        "Arc hits have a 12% chance per rank to deal double damage.",
        2,
      ),
      node(
        "tempest",
        "Perfect storm",
        "Every overload launches eight piercing lightning bolts.",
        1,
      ),
    ]),
    branch("Living circuit", "↯", [
      node(
        "feedback",
        "Feedback",
        "Overloads grant 8 shield per rank, capacity grows by 4 per rank.",
      ),
      node(
        "insulation",
        "Insulation",
        "While shielded, gain armor per rank (diminishing returns).",
        2,
      ),
      node(
        "perpetual",
        "Perpetual engine",
        "Overloads recover 2s of all skill cooldowns.",
        1,
      ),
    ]),
    branch("Gravity heretic", "◎", [
      node(
        "singularity",
        "Singularity",
        "Arcs pull enemies together; +20% overload radius per rank.",
      ),
      node(
        "eventhorizon",
        "Event horizon",
        "Overloads stun enemies for 0.35 seconds per rank.",
        2,
      ),
      node(
        "blackstar",
        "Black star",
        "Static Collapse leaves a vortex that pulls and damages enemies for 5 seconds.",
        1,
      ),
    ]),
  ],
};
Object.assign(TALENT_TREES, EXTRA_TREES);
export const TALENT_NODES: Record<string, TalentNode & { level: number }> =
  Object.fromEntries(
    Object.entries(TALENT_TREES).flatMap(([hero, branches]) =>
      branches.flatMap((b, branchIndex) =>
        b.nodes.map((n, tier) => [
          n.id,
          {
            ...n,
            hero,
            branch: branchIndex,
            tier,
            icon: b.icon,
            kind: `${hero.toUpperCase()} TALENT`,
            requires: tier ? b.nodes[tier - 1].id : null,
            requiredRank: tier ? 2 : 0,
            level: [1, 5, 9][tier],
          },
        ]),
      ),
    ),
  );
export function talentCost(game: Game, id: string) {
  const node = TALENT_NODES[id];
  return node?.tier === 2
    ? 3
    : game.rank(id) >= (node?.tier === 0 ? 3 : 2)
      ? 2
      : 1;
}
export function talentLock(game: Game, id: string) {
  const n = TALENT_NODES[id];
  if (!n || n.hero !== game.hero.id) return "Different outcast";
  if (game.rank(id) >= n.max) return "MASTERED";
  const level = Math.max(
    n.level,
    game.rank(id) >= (n.tier === 0 ? 3 : 2)
      ? 10 + (game.rank(id) - (n.tier === 0 ? 3 : 2)) * 3
      : n.level,
  );
  if (game.level < level) return `Level ${level}`;
  if (n.requires && game.rank(n.requires) < n.requiredRank!)
    return `${TALENT_NODES[n.requires].name} rank ${n.requiredRank} required`;
  if (game.talentPoints < talentCost(game, id))
    return `${talentCost(game, id)} points`;
  return "";
}
export const masteryLevel = (xp: number) =>
  1 + Math.floor(Math.sqrt(Math.max(0, xp) / 100));
export const masteryThreshold = (level: number) => Math.pow(level - 1, 2) * 100;
export const masteryTitle = (level: number) =>
  level < 3
    ? "Wayward"
    : level < 5
      ? "Initiate"
      : level < 8
        ? "Adept"
        : level < 12
          ? "Ascendant"
          : "Rift legend";
const page = (
  id: string,
  name: string,
  hero: string,
  icon: string,
  desc: string,
  metric: string,
  target: number,
  lore: string,
) => ({
  id,
  name,
  hero,
  icon,
  desc,
  metric,
  target,
  lore,
});
export const CODEX: CodexPage[] = [
  page(
    "pilgrim",
    "Pilgrim’s compass",
    "all",
    "◇",
    "+20 pickup range. A small comfort in a very large dark.",
    "runs",
    0,
    "Every exile carries something from home. Yours remembers the way back.",
  ),
  page(
    "scholar",
    "Forbidden thesis",
    "all",
    "▤",
    "+12% experience; −8% maximum health.",
    "kills",
    100,
    "Understanding the rift leaves less room for being human.",
  ),
  page(
    "avarice",
    "Gilded oath",
    "all",
    "✧",
    "+20% embers, but 12% more enemies spawn.",
    "embersEarned",
    120,
    "The coins are warm. Something on the other side is counting them.",
  ),
  page(
    "guardian",
    "Sentinel’s seal",
    "all",
    "⬡",
    "Start with 18 shield. Elite kills restore 3 shield.",
    "elites",
    15,
    "The last watch never ended.",
  ),
  page(
    "hunter",
    "Warden’s mark",
    "all",
    "†",
    "+18% damage to elites and wardens; −5% attack speed.",
    "bosses",
    1,
    "Predators recognize the scent of a rival.",
  ),
  page(
    "astral",
    "Astral inheritance",
    "all",
    "✦",
    "Begin each run with Astral blades at rank 1.",
    "best",
    180,
    "A star fell into the hollow. Its orbit never stopped.",
  ),
  page(
    "alchemist",
    "Mercy in glass",
    "all",
    "✚",
    "Hearts heal 40% more. Start with one extra reroll.",
    "caches",
    8,
    "Even the dead woods still know a few remedies.",
  ),
  page(
    "defiant",
    "Defiant scripture",
    "all",
    "♜",
    "+20% damage below half health; maximum health −10%.",
    "best",
    300,
    "Fear was the last thing you left at the gate.",
  ),
  page(
    "scorchstep",
    "The burning road",
    "cinder",
    "♨",
    "Dashing leaves a fire pool for 3 seconds.",
    "dashes",
    20,
    "Where the firekeeper walked, winter never returned.",
  ),
  page(
    "coldflame",
    "Pale fire",
    "cinder",
    "❄",
    "Ember hits slow targets. Ember damage −10%.",
    "kills",
    250,
    "Not every flame remembers warmth.",
  ),
  page(
    "furnace",
    "Heart of the kiln",
    "cinder",
    "✹",
    "Heat cools 50% slower while moving. −8% movement speed.",
    "evolutions",
    1,
    "She carries the last furnace behind her ribs.",
  ),
  page(
    "wanderseed",
    "The wandering grove",
    "briar",
    "❋",
    "Every second dash plants a seedling.",
    "dashes",
    20,
    "The roots learned to follow her.",
  ),
  page(
    "bloodroot",
    "Bloodroot pact",
    "briar",
    "♡",
    "Every kill heals 0.2 HP. Maximum health −10%.",
    "kills",
    250,
    "The garden is generous. The garden is hungry.",
  ),
  page(
    "evergreen",
    "Evergreen scripture",
    "briar",
    "♧",
    "Seedlings live 35% longer. All skill cooldowns +15%.",
    "evolutions",
    1,
    "Some things must be allowed to outlive their keeper.",
  ),
  page(
    "mirror",
    "The second shadow",
    "nyx",
    "☽",
    "Umbral Step summons a 4-second knife-firing shadow.",
    "skills",
    15,
    "One shadow is always a moment late.",
  ),
  page(
    "nightglass",
    "Nightglass edge",
    "nyx",
    "◈",
    "+15% critical chance; −15% maximum health.",
    "kills",
    250,
    "Sharp enough to cut the hand that remembers it.",
  ),
  page(
    "silence",
    "A silent tomorrow",
    "nyx",
    "†",
    "Dashing restores 10% of remaining skill cooldown.",
    "evolutions",
    1,
    "Between two footsteps, a future disappeared.",
  ),
  page(
    "stormglass",
    "Stormglass lens",
    "volta",
    "ϟ",
    "Arcs chain to two more targets; arc damage −10%.",
    "skills",
    15,
    "The storm looks much smaller through the right lens.",
  ),
  page(
    "livewire",
    "The live wire",
    "volta",
    "↯",
    "Dashing triggers an overload. Dash cooldown +25%.",
    "kills",
    250,
    "This is probably safe. Probably.",
  ),
  page(
    "faraday",
    "Faraday’s vow",
    "volta",
    "⬡",
    "Shield decays 75% slower; overloads grant 4 extra shield.",
    "evolutions",
    1,
    "A small brass cage, built to hold a god.",
  ),
];
CODEX.push(...EXTRA_PAGES);
export function codexProgress(save: Save, page: CodexPage) {
  const source = page.hero === "all" ? save : save.chronicle?.[page.hero] || {};
  const value = source[page.metric as keyof typeof source];
  return Math.min(
    page.target,
    Math.max(0, typeof value === "number" ? value : 0),
  );
}
export const codexUnlocked = (save: Save, page: CodexPage) =>
  codexProgress(save, page) >= page.target;
export const inscriptionSlots = (save: Save) =>
  1 + Math.floor(forgeBonus("bindings", save.forge.bindings));
export function equippedPages(save: Save, hero: string) {
  return (save.loadouts?.[hero] || [])
    .filter((id) => {
      const p = CODEX.find((p) => p.id === id);
      return (
        p && (p.hero === "all" || p.hero === hero) && codexUnlocked(save, p)
      );
    })
    .slice(0, inscriptionSlots(save));
}
export function toggleInscription(save: Save, hero: string, id: string) {
  const p = CODEX.find((p) => p.id === id);
  if (!p || (p.hero !== "all" && p.hero !== hero) || !codexUnlocked(save, p))
    return false;
  const list = equippedPages(save, hero);
  if (list.includes(id)) {
    save.loadouts[hero] = list.filter((x) => x !== id);
    return true;
  }
  if (list.length >= inscriptionSlots(save)) return false;
  save.loadouts[hero] = [...list, id];
  return true;
}
export const ENEMY_LORE = [
  [
    "crawler",
    "The Hollow",
    "Slow, relentless. They win when you run out of space.",
  ],
  [
    "runner",
    "Briar hound",
    "Accelerates in bursts. Avoid narrow escape routes.",
  ],
  [
    "spitter",
    "Spore bearer",
    "Keeps its distance and fires aimed projectiles.",
  ],
  ["brute", "Rootbound colossus", "Heavy armor and a wide collision radius."],
  ["moth", "Veil moth", "Circles your position and fires spectral darts."],
  ["revenant", "Ash revenant", "Telegraphs a fast charge. Step sideways."],
  ["shaman", "Fungal oracle", "Heals nearby foes and sends spreading volleys."],
  [
    "boss",
    "Hollow Warden",
    "Radial barrages, telegraphed charges. Drops a rift shard.",
  ],
  [
    "reaper",
    "The Reaper",
    "Arrives at the realm's deadline. Resists 92% damage and ignores control, knockback, and executions. Accelerates relentlessly.",
  ],
];
export const BIOMES = [
  {
    id: "hollow",
    name: "THE HOLLOW WILDS",
    sub: "Moss, moonlight, and things that remember.",
    ground: "#182c2c",
    accent: "#7bba96",
  },
  {
    id: "ashen",
    name: "THE ASHEN MARCH",
    sub: "Every ember still remembers the fire.",
    ground: "#2a232d",
    accent: "#d78b69",
  },
  {
    id: "astral",
    name: "THE STARLESS VALE",
    sub: "The sky is buried beneath your feet.",
    ground: "#192338",
    accent: "#9c94d1",
  },
];
export const SYNERGIES = [
  {
    id: "steam",
    name: "Steam engine",
    icon: "♨",
    requires: { afterburn: 2, frost: 2 },
    desc: "Burning, chilled enemies take +25% damage.",
  },
  {
    id: "choir",
    name: "Eclipse choir",
    icon: "☽",
    requires: { orbit: 3, nova: 3 },
    desc: "Hollow bell also releases a ring of piercing blades.",
  },
  {
    id: "circuit",
    name: "Wild circuit",
    icon: "ϟ",
    requires: { familiar: 3, conduction: 2 },
    desc: "Wisp hits discharge 20-damage lightning to a nearby foe.",
  },
  {
    id: "harvest",
    name: "Crimson harvest",
    icon: "†",
    requires: { scythe: 2, bloodletter: 2 },
    desc: "Scythes inflict bleed. Bleeding kills restore 0.4 health.",
  },
];
export const activeSynergies = (game: Game) =>
  SYNERGIES.filter((s) =>
    Object.entries(s.requires).every(([id, rank]) => game.rank(id) >= rank),
  );
export const SHRINE_BOONS = [
  {
    id: "blood",
    name: "Blood for power",
    icon: "◈",
    desc: "+15% damage this run. Lose 10% maximum health.",
  },
  {
    id: "knowledge",
    name: "A forbidden lesson",
    icon: "▤",
    desc: "+18% experience this run. Future enemies gain 12% health.",
  },
  {
    id: "mercy",
    name: "A moment of mercy",
    icon: "♡",
    desc: "Restore all health. Costs 10 unbanked embers.",
  },
  {
    id: "tribute",
    name: "Call the faithful",
    icon: "✧",
    desc: "+20 embers · +1 run resonance (this run; spend at LV20). Summon 8 elites.",
  },
  {
    id: "relic",
    name: "Unearth a relic",
    icon: "✦",
    desc: "Gain a random unmastered relic rank. Summon 6 revenants.",
  },
];
