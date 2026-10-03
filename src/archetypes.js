// Original class kits: one resource loop, three specializations, and finite companions.
export const ARCHETYPE_IDS = [
  "vesper",
  "fen",
  "solace",
  "orin",
  "kestrel",
  "morrow",
];
const hero = (
  id,
  name,
  title,
  color,
  dark,
  hp,
  speed,
  cooldown,
  weapon,
  trait,
  skill,
  weaponDesc,
  traitDesc,
  skillDesc,
  talents,
  talentIds,
) => ({
  id,
  name,
  title,
  color,
  dark,
  hp,
  speed,
  cooldown,
  weapon,
  trait,
  skill,
  weaponDesc,
  traitDesc,
  skillDesc,
  talents,
  talentIds,
  role: `${weapon} / ${trait}`,
  icon: "✦",
  difficulty: "SPECIALIST",
  quote: "“The rift changes us. We choose how.”",
  desc: traitDesc,
});
export const ARCHETYPES = [
  hero(
    "vesper",
    "Vesper",
    "The rift warlock",
    "#b09ae8",
    "#40315e",
    86,
    174,
    17,
    "Hex bolts",
    "Soul harvest",
    "Demon pact",
    "Cursing bolts feed your demon retinue.",
    "Cursed kills harvest souls. Imp bolts burst in crowds; your guardian cleaves and intercepts lesser foes.",
    "Spend souls to summon short-lived imps, mend your permanent demons and empower the retinue.",
    ["Affliction", "Demonbinding", "Ruin"],
    ["hexcraft", "demonhide", "ruincraft"],
  ),
  hero(
    "fen",
    "Fen",
    "The beastwarden",
    "#b6cd86",
    "#536b3c",
    100,
    187,
    16,
    "Trail crossbow",
    "Bond",
    "Pack command",
    "Piercing bolts mark prey for your bonded wolf.",
    "Shared attacks build bond. Your wolf pursues marked prey and recovers eight seconds after falling.",
    "Spend bond: mend or revive your wolf, then order an explosive pack pounce.",
    ["Bond", "Tracking", "Traps"],
    ["wildbond", "trailcraft", "trapcraft"],
  ),
  hero(
    "solace",
    "Solace",
    "The dawn cleric",
    "#f3dc9b",
    "#8e7241",
    88,
    176,
    20,
    "Dawnlight",
    "Faith",
    "Mercy halo",
    "Radiant bolts build faith. Every third hit can mend a small wound.",
    "Healing requires landed attacks. Store faith for a stronger halo; cloth offers little protection.",
    "Spend faith to heal, shield and smite nearby foes. Healing has a firm cap.",
    ["Grace", "Discipline", "Judgement"],
    ["grace", "discipline", "judgement"],
  ),
  hero(
    "orin",
    "Orin",
    "The totemcaller",
    "#7dd4c1",
    "#65553b",
    108,
    170,
    10,
    "Spirit stones",
    "Totem circle",
    "Raise totem",
    "Spirit bolts support a fire totem you bring into battle.",
    "Place fire, storm and tide totems in sequence. Stay near their circles to benefit.",
    "Raise the next totem. Three can coexist; their fixed positions and short lives demand movement.",
    ["Embers", "Tempest", "Tides"],
    ["embercall", "stormcall", "tidecall"],
  ),
  hero(
    "kestrel",
    "Kestrel",
    "The wind monk",
    "#81dfd2",
    "#286f6b",
    98,
    198,
    13,
    "Wind fists",
    "Qi",
    "Dragon kick",
    "Palm, kick, spinning sweep: a three-strike melee combo.",
    "Landed combos build three qi. Missed strikes build nothing. Spend qi on your dragon kick.",
    "A sweeping kick spends qi for reach, damage and a brief guard.",
    ["Wind", "Mist", "Iron"],
    ["windcraft", "mistcraft", "ironcraft"],
  ),
  hero(
    "morrow",
    "Morrow",
    "The grave knight",
    "#9ac9f4",
    "#42557c",
    132,
    163,
    18,
    "Rime greatsword",
    "Runes",
    "Grave grip",
    "Close-range rune cleaves chill and infect foes.",
    "Successful cleaves charge runes. Spend them on a grip and a measured burst of healing.",
    "Pull lesser foes inward and spend runes on a crushing cleave. Wardens and Reapers resist the grip.",
    ["Blood", "Rime", "Grave"],
    ["bloodrunes", "rimecraft", "gravecraft"],
  ),
];
const identities = {
  vesper: ["WARLOCK", "“Every soul leaves a door ajar.”"],
  fen: ["BEASTWARDEN", "“Two hearts. One hunt.”"],
  solace: ["CLERIC", "“Dawn is something we carry.”"],
  orin: ["TOTEMCALLER", "“The stones remember thunder.”"],
  kestrel: ["MONK", "“Breathe. Step. Strike.”"],
  morrow: ["GRAVE KNIGHT", "“Death taught me patience.”"],
};
for (const h of ARCHETYPES) [h.difficulty, h.quote] = identities[h.id];
export const ARCHETYPE_AWAKENINGS = {
  vesper: {
    name: "NETHER RETINUE",
    desc: "Imp bolts pierce one foe. Your guardian gains a wider cleave and stronger protective wards.",
  },
  fen: {
    name: "ALPHA BOND",
    desc: "Your wolf deals more damage to marked prey and cleaves a wider pack. Keep marking targets to lead the hunt.",
  },
  solace: {
    name: "DAWN SCRIPTURE",
    desc: "Dawn bolts pierce another foe and generate 15% more faith. Healing limits remain unchanged.",
  },
  orin: {
    name: "ANCESTRAL CIRCLE",
    desc: "New totems reach 15% farther. Spirit stones pierce another foe.",
  },
  kestrel: {
    name: "FOUR WINDS",
    desc: "Third combo strikes gain 20% damage and reach. Land your combos to build qi.",
  },
  morrow: {
    name: "RIME REAVER",
    desc: "Rune cleaves reach 15% farther and plague lasts an additional second.",
  },
};
// Species roles and rank growth are shared by summons, attacks and recovery.
export const COMPANION_KITS = {
  imp: {
    hp: 50,
    damage: 21,
    interval: 1.25,
    speed: 245,
    reach: 420,
    ranged: true,
    resistance: 1,
  },
  guardian: {
    hp: 170,
    damage: 30,
    interval: 1.15,
    speed: 240,
    reach: 70,
    ranged: false,
    resistance: 0.72,
  },
  wolf: {
    hp: 145,
    damage: 36,
    interval: 0.9,
    speed: 285,
    reach: 65,
    ranged: false,
    resistance: 0.82,
  },
  elemental: {
    hp: 120,
    damage: 30,
    interval: 1.1,
    speed: 245,
    reach: 65,
    ranged: false,
    resistance: 0.85,
  },
  crane: {
    hp: 80,
    damage: 26,
    interval: 1.3,
    speed: 280,
    reach: 380,
    ranged: true,
    resistance: 1,
  },
  ghoul: {
    hp: 85,
    damage: 27,
    interval: 0.95,
    speed: 260,
    reach: 48,
    ranged: false,
    resistance: 0.9,
  },
};
function companionHealth(g, c) {
  return (
    c.baseHp *
    (1 +
      (c.kind === "wolf" ? 0.16 : 0.15) *
        g.rank(c.kind === "wolf" ? "wildbond" : "demonhide") +
      (g.hasPage(`${g.hero.id}_pact`) ? 0.12 : 0)) *
    (1 + Math.min(2, (g.rank("signature") - 1) * 0.075))
  );
}
function companionEnemy(g, c) {
  if (g.hero.id === "fen") {
    const prey = g.enemies.find(
      (e) =>
        e.id === g.classState.prey &&
        e.hp > 0 &&
        e.markUntil > g.time &&
        dist(e, g.p) < 760,
    );
    if (prey) return prey;
    let marked = null;
    for (const e of g.enemies)
      if (
        e.hp > 0 &&
        e.markUntil > g.time &&
        dist(e, g.p) < 760 &&
        (!marked || dist(e, c) < dist(marked, c))
      )
        marked = e;
    if (marked) return marked;
  }
  if (c.kind === "guardian") return g.nearest(g.p.x, g.p.y, 360);
  return g.nearest(c.x, c.y, 650);
}
const total = (obj, key) =>
  Object.values(obj || {}).reduce((n, v) => n + (v[key] || 0), 0);
const memories = (save) =>
  Object.values(save.memories || {}).reduce(
    (n, v) => n + Object.values(v).filter((x) => x === true).length,
    0,
  );
export function archetypeGoals(save, id) {
  const goal = (icon, label, value, target, seconds = false) => ({
    icon,
    label,
    value,
    target,
    seconds,
  });
  const survival = (target) =>
    goal("heart", "Best survival", Math.floor(save.best || 0), target, true);
  return (
    {
      vesper: [
        goal("blade", "Foes defeated", save.kills || 0, 1500),
        goal("star", "Wardens defeated", save.bosses || 0, 2),
      ],
      fen: [
        survival(180),
        goal("book", "Memories recovered", memories(save), 2),
      ],
      solace: [
        goal("heart", "Expeditions banked", save.runs || 0, 6),
        survival(180),
      ],
      orin: [
        goal("book", "Map finds banked", total(save.realmRecords, "finds"), 20),
        goal("star", "Wardens defeated", save.bosses || 0, 3),
      ],
      kestrel: [
        goal("bolt", "Dashes banked", total(save.chronicle, "dashes"), 100),
        survival(240),
      ],
      morrow: [
        goal("star", "Wardens defeated", save.bosses || 0, 8),
        survival(360),
      ],
    }[id] || []
  );
}
const node = (id, name, desc, tier = 0) => ({
  id,
  name,
  desc,
  max: [12, 8, 1][tier],
});
const branch = (name, a, b, c) => ({
  name,
  icon: "✦",
  nodes: [node(...a), node(...b, 1), node(...c, 2)],
});
export const ARCHETYPE_TREES = {
  vesper: [
    branch(
      "Affliction",
      ["hexcraft", "Deep hex", "+14% curse damage / rank."],
      ["longhex", "Lingering curse", "+0.5s curse duration / rank."],
      [
        "hexplague",
        "Plague bearer",
        "Cursed deaths infect nearby lesser foes.",
      ],
    ),
    branch(
      "Demonbinding",
      ["demonhide", "Demon hide", "+15% companion health / rank."],
      [
        "demonsurge",
        "Empowered retinue",
        "+15% demon damage / rank during a pact.",
      ],
      [
        "twinpact",
        "Twin pact",
        "Pacts summon one additional imp, within the retinue cap.",
      ],
    ),
    branch(
      "Ruin",
      ["ruincraft", "Ruin bolts", "+8% hex bolt damage / rank."],
      ["soulwell", "Soul well", "+1s pact duration / rank."],
      [
        "implosion",
        "Implosion",
        "Temporary imps explode when their pact ends.",
      ],
    ),
  ],
  fen: [
    branch(
      "Bond",
      ["wildbond", "Wild bond", "+16% beast health / rank."],
      ["savage", "Savage command", "+15% commanded beast damage / rank."],
      [
        "beastcleave",
        "Beast cleave",
        "Wolf strikes cleave a small circle during commands.",
      ],
    ),
    branch(
      "Tracking",
      ["trailcraft", "Trailcraft", "+9% bolt damage / rank."],
      ["longmark", "Patient tracker", "+1s prey mark duration / rank."],
      ["packprey", "Pack prey", "Marked prey takes 20% more wolf damage."],
    ),
    branch(
      "Traps",
      ["trapcraft", "Snare line", "+12% snare radius / rank."],
      ["thorntrap", "Barbed traps", "+25% trap damage / rank."],
      ["ambush", "Wild ambush", "Commands leave two additional traps."],
    ),
  ],
  solace: [
    branch(
      "Grace",
      ["grace", "Gentle light", "+0.15 health on each gated mend / rank."],
      ["faithwell", "Faith well", "+10% faith generation / rank."],
      ["overflow", "Overflow", "Mending at full health grants a small shield."],
    ),
    branch(
      "Discipline",
      ["discipline", "Radiant ward", "+2 halo shield / rank."],
      ["penance", "Penance", "+8% empowered bolt damage / rank."],
      [
        "absolution",
        "Absolution",
        "Full-faith halos grant 0.6s invulnerability.",
      ],
    ),
    branch(
      "Judgement",
      ["judgement", "Judgement", "+5% radiant damage / rank."],
      ["radiance", "Wide halo", "+8% halo reach / rank."],
      ["sunchoir", "Sun choir", "Halos release eight piercing dawn bolts."],
    ),
  ],
  orin: [
    branch(
      "Embers",
      ["embercall", "Ember call", "+6% fire totem damage / rank."],
      ["longflame", "Long flame", "+2s totem lifetime / rank."],
      ["flameecho", "Flame echo", "Fire totems shoot an additional bolt."],
    ),
    branch(
      "Tempest",
      ["stormcall", "Storm call", "+6% storm totem damage / rank."],
      ["widecircle", "Wide circle", "+8% totem reach / rank."],
      ["stormlink", "Storm link", "Storm totems strike three foes per pulse."],
    ),
    branch(
      "Tides",
      ["tidecall", "Tide call", "+0.15 tide healing per pulse / rank."],
      [
        "tideguard",
        "Tide guard",
        "+1 shield per tide pulse / rank, capped at 30 shield.",
      ],
      [
        "spiritbond",
        "Spirit bond",
        "Placing a tide totem also calls a temporary elemental.",
      ],
    ),
  ],
  kestrel: [
    branch(
      "Wind",
      ["windcraft", "Wind craft", "+5% combo damage / rank."],
      ["longkick", "Long kick", "+8% kick reach / rank."],
      ["fourwinds", "Four winds", "Third strikes release four wind bolts."],
    ),
    branch(
      "Mist",
      ["mistcraft", "Mist craft", "+0.5 healing per qi spent / rank."],
      ["mistguard", "Mist guard", "+2 kick shield / rank."],
      [
        "serenity",
        "Serenity",
        "Full-qi kicks reset the combo for an empowered sweep.",
      ],
    ),
    branch(
      "Iron",
      [
        "ironcraft",
        "Iron craft",
        "+2 shield on a third strike / rank, capped at 25 shield.",
      ],
      ["ironreach", "Iron reach", "+8% combo reach / rank."],
      [
        "steelheart",
        "Steel heart",
        "Full-qi kicks grant 0.5s invulnerability.",
      ],
    ),
  ],
  morrow: [
    branch(
      "Blood",
      ["bloodrunes", "Blood runes", "+0.5 healing per rune spent / rank."],
      ["bloodguard", "Blood guard", "+2 grip shield / rank."],
      [
        "bloodfeast",
        "Blood feast",
        "Full-rune grips heal an additional 5% health.",
      ],
    ),
    branch(
      "Rime",
      ["rimecraft", "Rime craft", "+5% rune cleave damage / rank."],
      ["longrime", "Long rime", "+0.3s chill duration / rank."],
      ["frostwake", "Frostwake", "Rune cleaves launch a piercing frost bolt."],
    ),
    branch(
      "Grave",
      ["gravecraft", "Grave craft", "+8% plague damage / rank."],
      ["gravecoven", "Grave coven", "+2s ghoul lifetime / rank."],
      ["ghoulpact", "Ghoul pact", "Grips summon a temporary ghoul."],
    ),
  ],
};
export const ARCHETYPE_ROLES = {
  vesper: ["offense", "guard", "skill"],
  fen: ["guard", "crit", "skill"],
  solace: ["guard", "skill", "offense"],
  orin: ["offense", "skill", "guard"],
  kestrel: ["offense", "skill", "guard"],
  morrow: ["guard", "offense", "skill"],
};
export const ARCHETYPE_THEMES = Object.fromEntries(
  ARCHETYPES.map((h) => [
    h.id,
    h.talents.map((name) => [
      name + " adept",
      name + " rhythm",
      name + " mastery",
      name + " sovereign",
    ]),
  ]),
);
export const ARCHETYPE_FORMS = {
  vesper: [
    "Vesper",
    "Rift binder",
    "Demon sovereign",
    "Soul rupture",
    "Infernal retinue",
  ],
  fen: ["Fen", "Pack leader", "Wild sovereign", "Marked hunt", "Primal pack"],
  solace: [
    "Solace",
    "Dawn prelate",
    "Sun seraph",
    "Dawn procession",
    "Daybreak",
  ],
  orin: [
    "Orin",
    "Spirit speaker",
    "Storm avatar",
    "Thunder communion",
    "Primal council",
  ],
  kestrel: [
    "Kestrel",
    "Wind master",
    "Jade ascendant",
    "Serene flurry",
    "Celestial crane",
  ],
  morrow: [
    "Morrow",
    "Grave marshal",
    "Rime sovereign",
    "Plague march",
    "Grave legion",
  ],
};
export const ARCHETYPE_SKILL_FORMS = {
  vesper: ["Soul lances", "Greater pact", "Nether curses", "Infernal covenant"],
  fen: ["Predator bolts", "Pack frenzy", "Wildfang volley", "Primal command"],
  solace: [
    "Radiant spears",
    "Sanctuary halo",
    "Solar scripture",
    "Seraph's mercy",
  ],
  orin: ["Ancestral stones", "Grand totems", "Primal spears", "Spirit council"],
  kestrel: ["Gale strikes", "Dragon sweep", "Heavenly palms", "Jade tempest"],
  morrow: ["Frost reaver", "Death embrace", "Sovereign rime", "Grave dominion"],
};
export const ARCHETYPE_LEGACY = Object.fromEntries(
  ARCHETYPE_IDS.map((id) => [
    id,
    [
      [4, "Old discipline", "+10% class resource or totem reach"],
      [8, "Ancient pact", "+4 shield on skill use"],
      [12, "Rift communion", "Skills recover 0.5s dash cooldown"],
    ],
  ]),
);
const page = (hero, suffix, name, desc, metric, target) => ({
  id: `${hero}_${suffix}`,
  hero,
  name,
  desc,
  metric,
  target,
  icon: "✦",
  lore: "The rift preserves those who learn its cost.",
});
export const ARCHETYPE_PAGES = ARCHETYPE_IDS.flatMap((id) => [
  page(
    id,
    "vow",
    "First oath",
    "+8% damage; −4% movement speed.",
    "kills",
    600,
  ),
  page(
    id,
    "pact",
    "Second path",
    "+12% companion health or +2 starting shield; +8% skill cooldown.",
    "skills",
    100,
  ),
  page(
    id,
    "echo",
    "Last echo",
    "+10% class resource generation or totem range.",
    "best",
    360,
  ),
]);
export const ARCHETYPE_RECIPES = ARCHETYPES.flatMap((h) => [
  {
    id: `${h.id}-soul`,
    hero: h.id,
    weapon: "signature",
    passive: {
      vesper: "power",
      fen: "precision",
      solace: "fervor",
      orin: "breadth",
      kestrel: "haste",
      morrow: "armor",
    }[h.id],
    name: ARCHETYPE_SKILL_FORMS[h.id][0],
    summary: {
      vesper: "Curses add a piercing hex lance",
      fen: "Marked shots split into a second bolt",
      solace: "Empowered shots pierce deeply",
      orin: "Spirit bolts fork",
      kestrel: "Third strikes gain reach and damage",
      morrow: "Cleave hits spread plague",
    }[h.id],
    rank: 8,
    passiveRank: 3,
  },
  {
    id: `${h.id}-skill`,
    hero: h.id,
    weapon: "active",
    passive: "focus",
    name: ARCHETYPE_SKILL_FORMS[h.id][1],
    summary: {
      vesper: "Longer pacts and an additional imp",
      fen: "Longer commands and a stronger pounce",
      solace: "A larger halo leaves a dawn field",
      orin: "Totems live longer and strike harder",
      kestrel: "The kick leaves a wind field",
      morrow: "Grips summon a grave ghoul",
    }[h.id],
    rank: 5,
    passiveRank: 3,
  },
]);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bound = (g, o) => {
  o.x = clamp(o.x, -g.realm.width / 2 + 40, g.realm.width / 2 - 40);
  o.y = clamp(o.y, -g.realm.height / 2 + 40, g.realm.height / 2 - 40);
};
const isClass = (g) => ARCHETYPE_IDS.includes(g.hero.id);
const gain = (g, amount) => {
  g.p.trait = Math.min(
    1,
    g.p.trait +
      amount *
        (1 +
          (g.legacy.count >= 4 ? 0.1 : 0) +
          (g.hasPage(`${g.hero.id}_echo`) ? 0.1 : 0)),
  );
};
const shield = (g, amount, cap = 60) => {
  g.p.shield = Math.max(g.p.shield, Math.min(cap, g.p.shield + amount));
};
const heal = (g, amount) => {
  g.p.hp = Math.min(g.p.maxHp, g.p.hp + amount);
};
const color = {
  imp: "#89dc95",
  guardian: "#ad8ede",
  wolf: "#b6cd86",
  elemental: "#7dd4c1",
  crane: "#81dfd2",
  ghoul: "#9ac9f4",
};
export function summonCompanion(g, kind, life = Infinity, permanent = false) {
  if (
    g.companions.length >= 8 ||
    (kind === "imp" &&
      g.companions.filter((c) => c.kind === kind && c.hp > 0).length >= 5)
  )
    return null;
  const health = COMPANION_KITS[kind].hp;
  const maxHp = companionHealth(g, { kind, baseHp: health });
  const a = g.companions.length * 2.4 + 0.6,
    ox = Math.cos(a) * 55,
    oy = Math.sin(a) * 45;
  const c = {
    id: ++g.uid,
    kind,
    baseHp: health,
    offsetX: ox,
    offsetY: oy,
    x: g.p.x + ox,
    y: g.p.y + oy,
    hp: maxHp,
    maxHp,
    life,
    permanent,
    down: 0,
    attack: 0.3 + g.companions.length * 0.11,
    hurtAt: 0,
    lastHurtAt: 0,
    wardAt: 0,
    engageCd: 0,
    lunge: 0,
    pose: 0,
    moving: false,
    facing: false,
  };
  g.companions.push(c);
  g.effect("ring", c.x, c.y, { r: 35, color: color[kind], duration: 0.4 });
  return c;
}
export function initArchetype(g) {
  g.companions = [];
  g.totems = [];
  g.classState = {
    combo: 0,
    hits: 0,
    mendAt: 0,
    nextTotem: 0,
    pact: 0,
    command: 0,
    serenity: 0,
    resourceAt: 0,
    plagueAt: 0,
    impBurstAt: 0,
  };
  if (
    isClass(g) &&
    g.hasPage(`${g.hero.id}_pact`) &&
    !["vesper", "fen"].includes(g.hero.id)
  )
    shield(g, 2);
  if (g.hero.id === "vesper") {
    summonCompanion(g, "imp", Infinity, true);
    summonCompanion(g, "guardian", Infinity, true);
  }
  if (g.hero.id === "fen") summonCompanion(g, "wolf", Infinity, true);
  if (g.hero.id === "orin") placeTotem(g);
}
export function archetypeStats(g) {
  if (!isClass(g)) return;
  if (g.hasPage(`${g.hero.id}_vow`)) {
    g.damage *= 1.08;
    g.moveSpeed *= 0.96;
  }
  if (g.hasPage(`${g.hero.id}_pact`)) g.skillRecoveryScale *= 1.08;
}
export function companionTarget(g, e) {
  if (
    e.reaper ||
    e.boss ||
    ["spitter", "moth", "shaman", "revenant"].includes(e.type)
  )
    return null;
  return (
    g.companions?.find(
      (c) =>
        c.hp > 0 &&
        (c.kind === "guardian" || c.kind === "wolf") &&
        dist(c, e) < 150 &&
        dist(c, g.p) < 380,
    ) || null
  );
}
export function hurtCompanion(g, c, damage, reaper = false) {
  if (c.hp <= 0 || g.time < c.hurtAt) return false;
  c.hurtAt = g.time + 0.7;
  c.lastHurtAt = g.time;
  if (!reaper)
    damage *=
      COMPANION_KITS[c.kind].resistance *
      (1 - Math.min(0.25, (1 - g.damageReduction) * 0.3));
  c.hp = Math.max(0, c.hp - damage);
  c.pose = 0.15;
  if (!c.hp) {
    c.down = c.permanent ? 8 : 0;
    g.effect("death", c.x, c.y, { color: color[c.kind], r: 16 });
  }
  return true;
}
export function placeTotem(g, forced) {
  const s = g.classState,
    kind = forced || ["fire", "storm", "tide"][s.nextTotem++ % 3],
    formEmpoweredUntil =
      g.totems.find((t) => t.kind === kind)?.formEmpoweredUntil || 0;
  g.totems = g.totems.filter((t) => t.kind !== kind);
  g.totems.push({
    x: g.p.x,
    y: g.p.y + 30,
    kind,
    power: Math.sqrt(g.skillPower) * (formEmpoweredUntil > g.time ? 1.6 : 1),
    formEmpoweredUntil: formEmpoweredUntil > g.time ? formEmpoweredUntil : 0,
    life: 20 + 2 * g.rank("longflame") + (g.evolutions.active ? 7 : 0),
    tick: 0,
    r:
      170 *
      (1 +
        0.08 * g.rank("widecircle") +
        (g.legacy.count >= 4 ? 0.1 : 0) +
        (g.hasPage("orin_echo") ? 0.1 : 0) +
        (g.evolved() ? 0.15 : 0)),
  });
  if (kind === "tide" && g.rank("spiritbond"))
    summonCompanion(g, "elemental", 12);
}
function trap(g, x, y) {
  g.zones.push({
    x,
    y,
    r: 95 * (1 + g.rank("trapcraft") * 0.12),
    life: 5,
    tick: 0,
    damage: 12 * g.skillPower * (1 + g.rank("thorntrap") * 0.25),
    kind: "veil",
  });
}
export function archetypeUpdate(g, dt) {
  if (!g.classState) return;
  const s = g.classState;
  for (const key of ["pact", "command", "serenity"])
    s[key] = Math.max(0, s[key] - dt);
  for (const e of g.enemies)
    if (e.hp > 0 && e.hexTime > 0 && !e.reaper) {
      e.hexTime -= dt;
      e.hexTick = (e.hexTick || 0) - dt;
      if (e.hexTick <= 0) {
        e.hexTick = 0.5;
        g.hit(
          e,
          e.hexDamage * g.weaponPower("signature"),
          0,
          "curse",
          "signature",
        );
      }
    }
  for (const c of g.companions) {
    const kit = COMPANION_KITS[c.kind],
      maxHp = companionHealth(g, c);
    if (maxHp !== c.maxHp) {
      c.hp *= maxHp / c.maxHp;
      c.maxHp = maxHp;
    }
    c.life -= dt;
    c.pose = Math.max(0, c.pose - dt);
    c.engageCd = Math.max(0, c.engageCd - dt);
    c.lunge = Math.max(0, c.lunge - dt);
    if (c.life <= 0) {
      if (c.kind === "imp" && c.hp > 0 && g.rank("implosion"))
        g.area(c.x, c.y, 135, 60 * g.weaponPower("signature"), "pet");
      continue;
    }
    if (c.hp <= 0) {
      if (c.permanent) {
        c.down -= dt;
        if (c.down <= 0) {
          c.hp = c.maxHp * 0.75;
          c.x = g.p.x + 25;
          c.y = g.p.y;
          c.hurtAt = g.time + 1;
          c.lastHurtAt = g.time;
        }
      }
      continue;
    }
    if (g.time - c.lastHurtAt >= 3 && dist(c, g.p) < 380)
      c.hp = Math.min(c.maxHp, c.hp + Math.min(5, c.maxHp * 0.02) * dt);
    const enemy = companionEnemy(g, c),
      marked = enemy?.markUntil > g.time && g.hero.id === "fen";
    const ranged = kit.ranged,
      reach = kit.reach + (c.kind === "guardian" && g.evolved() ? 20 : 0);
    const tooFar = dist(c, g.p) > 520;
    const target =
      !tooFar && enemy && dist(enemy, g.p) < 760
        ? enemy
        : {
            x:
              g.p.x +
              (c.kind === "guardian"
                ? 65 * Math.cos(g.p.action?.angle || 0)
                : c.offsetX),
            y: g.p.y + c.offsetY,
          };
    const d = dist(c, target);
    if (
      c.kind === "wolf" &&
      marked &&
      d > 150 &&
      d < 600 &&
      c.engageCd <= 0 &&
      !tooFar
    ) {
      c.lunge = 0.65;
      c.engageCd = 5;
      g.effect("ring", c.x, c.y, { r: 26, color: color.wolf, duration: 0.25 });
    }
    const speed =
      (kit.speed + Math.max(0, g.moveSpeed - g.hero.speed)) *
      (s.command > 0 ? 1.25 : 1) *
      (c.lunge > 0 ? 2.4 : 1) *
      (dist(c, g.p) > 300 ? 1.5 : 1);
    c.moving = d > (target === enemy ? reach * 0.85 : 22);
    c.facing = target.x < c.x;
    if (c.moving) {
      c.x += ((target.x - c.x) / d) * Math.min(d, speed * dt);
      c.y += ((target.y - c.y) / d) * Math.min(d, speed * dt);
    }
    for (const other of g.companions)
      if (other !== c && other.hp > 0) {
        const gap = dist(c, other);
        if (gap > 0.01 && gap < 24) {
          c.x += ((c.x - other.x) / gap) * (24 - gap) * dt * 3;
          c.y += ((c.y - other.y) / gap) * (24 - gap) * dt * 3;
        }
      }
    if (tooFar && dist(c, g.p) > 850) {
      c.x = g.p.x - 30;
      c.y = g.p.y + 30;
    }
    bound(g, c);
    c.attack -= dt;
    if (enemy && !tooFar && dist(c, enemy) < reach + enemy.r && c.attack <= 0) {
      const boosted =
        (s.pact > 0
          ? (1.45 + 0.15 * g.rank("demonsurge")) * (s.pactPower || 1)
          : 1) *
        (s.command > 0
          ? (1.55 + 0.15 * g.rank("savage")) * (s.commandPower || 1)
          : 1);
      const damage =
        kit.damage *
        (1 + Math.max(0, g.rank("signature") - 1) * 0.09) *
        g.weaponPower("signature") *
        (1 +
          (g.journey.stage === 2 ? 0.55 : g.journey.stage === 1 ? 0.25 : 0)) *
        (c.ultimate ? 1.6 : 1) *
        (c.spellPower || 1) *
        boosted *
        (marked
          ? 1.15 + (g.evolved() ? 0.15 : 0) + (g.rank("packprey") ? 0.2 : 0)
          : 1);
      if (ranged)
        g.projectile(
          c.x,
          c.y,
          Math.atan2(enemy.y - c.y, enemy.x - c.x),
          damage,
          c.kind === "imp" ? "hex" : "holy",
          {
            source: c.kind === "imp" ? "demon" : "pet",
            channel: "companions",
            pierce: c.kind === "imp" && g.evolved() ? 1 : 0,
            elevation: 17,
          },
        );
      else {
        g.hit(enemy, damage, 8, "pet", "companions");
        const cleave =
          c.kind === "guardian" ||
          c.kind === "wolf" ||
          c.kind === "elemental" ||
          c.kind === "ghoul";
        if (cleave) {
          const r = c.ultimate
            ? 150
            : c.kind === "guardian"
              ? g.evolved()
                ? 120
                : 100
              : c.kind === "wolf" && s.command > 0
                ? 130
                : 95;
          const targets = g.enemies
            .filter((e) => e !== enemy && e.hp > 0 && dist(c, e) < r + e.r)
            .sort((a, b) => dist(c, a) - dist(c, b))
            .slice(
              0,
              c.ultimate ||
                g.journey.stage > 0 ||
                (c.kind === "wolf" && s.command > 0 && g.rank("beastcleave"))
                ? 6
                : c.kind === "guardian" || (c.kind === "wolf" && g.evolved())
                  ? 4
                  : 2,
            );
          for (const other of targets)
            g.hit(
              other,
              damage *
                (c.ultimate ||
                g.journey.stage > 0 ||
                (s.command > 0 && g.rank("beastcleave"))
                  ? 0.75
                  : c.kind === "guardian" || g.evolved()
                    ? 0.6
                    : 0.4),
              6,
              "pet",
              "companions",
            );
        }
        if (
          c.kind === "guardian" &&
          !enemy.reaper &&
          dist(c, g.p) < 230 &&
          g.time >= c.wardAt
        ) {
          c.wardAt = g.time + 6;
          shield(g, g.evolved() ? 6 : 4, 25);
          g.effect("ring", g.p.x, g.p.y, {
            r: 28,
            color: color.guardian,
            duration: 0.4,
          });
        }
      }
      if (g.hero.id === "fen") gain(g, 0.08);
      c.pose = 0.3;
      c.attack = kit.interval / Math.sqrt(g.attackSpeed);
      g.effect("swing", c.x, c.y, {
        r: ranged ? 25 : 40,
        angle: Math.atan2(enemy.y - c.y, enemy.x - c.x),
        color: color[c.kind],
        duration: 0.22,
      });
    }
    for (const e of g.enemies)
      if (e.hp > 0 && dist(c, e) < e.r + 14 && (!e.reaper || e.grace <= 0))
        hurtCompanion(g, c, e.damage * (e.reaper ? 2 : 1), !!e.reaper);
  }
  g.companions = g.companions.filter(
    (c) => c.life > 0 && (c.hp > 0 || c.permanent),
  );
  for (const t of g.totems) {
    if (t.formEmpoweredUntil && t.formEmpoweredUntil <= g.time) {
      t.power /= 1.6;
      t.formEmpoweredUntil = 0;
    }
    t.life -= dt;
    t.tick -= dt;
    if (t.tick > 0 || t.life <= 0) continue;
    t.tick = 1.4 / Math.sqrt(g.attackSpeed);
    if (t.kind === "tide") {
      if (dist(t, g.p) < t.r) {
        heal(g, 1.2 + g.rank("tidecall") * 0.15);
        shield(g, g.rank("tideguard"), 30);
      }
    } else {
      const targets = g.enemies
        .filter((e) => e.hp > 0 && dist(e, t) < t.r + 60)
        .sort((a, b) => dist(a, t) - dist(b, t))
        .slice(0, t.kind === "storm" && g.rank("stormlink") ? 3 : 1);
      for (const e of targets) {
        const power =
          (1 + 0.06 * g.rank(t.kind === "fire" ? "embercall" : "stormcall")) *
          g.weaponPower("signature") *
          t.power *
          (t.spellPower || 1) *
          (1 +
            (g.journey.stage === 2 ? 0.55 : g.journey.stage === 1 ? 0.25 : 0)) *
          (g.evolutions.active ? 1.2 : 1) *
          (g.talentState?.ultimate?.kind === "council" ? 1.6 : 1);
        if (t.kind === "fire")
          for (let i = 0; i < (g.rank("flameecho") ? 2 : 1); i++)
            g.projectile(
              t.x,
              t.y,
              Math.atan2(e.y - t.y, e.x - t.x) + i * 0.08,
              20 * power,
              "ember",
              { source: "totem", channel: "totems" },
            );
        else {
          g.hit(e, 23 * power, 0, "totem", "totems");
          if (!e.reaper) e.slow = Math.max(e.slow, 1.5);
          g.effect("arc", t.x, t.y, { tx: e.x, ty: e.y, color: g.hero.color });
        }
      }
    }
    g.effect("ring", t.x, t.y, {
      r: t.r,
      color:
        t.kind === "fire"
          ? "#efb27c"
          : t.kind === "tide"
            ? "#89d8af"
            : "#82cef3",
      duration: 0.45,
    });
  }
  g.totems = g.totems.filter((t) => t.life > 0);
}
export function archetypeAttack(g, target, angle) {
  const id = g.hero.id,
    p = g.p,
    n = g.rank("signature"),
    s = g.classState;
  if (!isClass(g)) return;
  const shot = (type, damage, extra = {}, spread = 0) =>
    g.projectile(p.x, p.y, angle + spread, damage, type, extra);
  if (id === "vesper") {
    shot("hex", (19 + n * 5) * (1 + g.rank("ruincraft") * 0.08), { pierce: 1 });
    if (g.evolutions.signature) shot("hex", 12 + n * 3, { pierce: 3 }, 0.12);
  }
  if (id === "fen") {
    shot("arrow", (23 + n * 6) * (1 + g.rank("trailcraft") * 0.09), {
      pierce: 1,
      source: "huntarrow",
    });
    if (g.evolutions.signature)
      shot("arrow", 14 + n * 3, { pierce: 2, source: "huntarrow" }, -0.1);
  }
  if (id === "solace") {
    shot(
      "holy",
      (22 + n * 6) *
        (1 + g.rank("judgement") * 0.05) *
        (1 + (p.trait >= 0.9 ? g.rank("penance") * 0.08 : 0)),
      { pierce: g.evolutions.signature ? 4 : g.evolved() ? 2 : 1 },
    );
  }
  if (id === "orin") {
    shot("spirit", 22 + n * 5, { pierce: g.evolved() ? 2 : 1 });
    if (g.evolutions.signature) shot("spirit", 14 + n * 3, { pierce: 2 }, 0.15);
  }
  if (id === "kestrel" || id === "morrow") {
    const third = s.combo === 2 || s.serenity > 0;
    const r =
      (id === "kestrel" ? (third ? 125 : 95) : 145) *
      (1 + 0.08 * g.rank("ironreach")) *
      (g.evolutions.signature && third ? 1.2 : 1) *
      (g.evolved()
        ? id === "kestrel" && third
          ? 1.2
          : id === "morrow"
            ? 1.15
            : 1
        : 1);
    const damage =
      (id === "kestrel" ? 25 + n * 7 : 32 + n * 8) *
      (1 + 0.05 * g.rank(id === "kestrel" ? "windcraft" : "rimecraft")) *
      (third ? 1.4 : 1) *
      (id === "kestrel" && third && g.evolved() ? 1.2 : 1);
    let landed = false;
    for (const e of g.enemies)
      if (
        e.hp > 0 &&
        dist(e, p) < r * g.areaScale + e.r &&
        (third || Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - angle) > 0.15)
      ) {
        g.hit(e, damage, 15, id === "kestrel" ? "fist" : "runeblade");
        landed = true;
      }
    g.effect("swing", p.x, p.y, {
      r: r * g.areaScale,
      angle,
      empowered: third,
      color: g.hero.color,
      duration: 0.25,
    });
    if (landed) {
      gain(g, id === "kestrel" ? 1 / 3 : 0.22);
      s.combo = (s.combo + 1) % 3;
      if (id === "kestrel" && third) {
        shield(g, 2 * g.rank("ironcraft"), 25);
        if (g.rank("fourwinds")) g.radial(p.x, p.y, 4, 15 + n * 3, "spirit");
      }
      if (id === "morrow" && g.rank("frostwake"))
        shot("spirit", 18 + n * 4, { pierce: 3 });
    }
  }
}
export function archetypeHit(g, e, source, damage = 0) {
  if (!g.classState || e.reaper) return;
  const s = g.classState;
  if (g.hero.id === "vesper" && (source === "hex" || source === "demon")) {
    e.hexTime = 3 + 0.5 * g.rank("longhex");
    e.hexDamage = Math.max(
      e.hexDamage || 0,
      (5 + g.rank("signature") * 1.5) *
        (1 + g.rank("hexcraft") * 0.14) *
        (source === "demon" ? 0.6 : 1),
    );
    if (source === "demon" && damage > 0 && g.time >= s.impBurstAt) {
      s.impBurstAt = g.time + 0.4;
      const empowered =
        g.journey.stage > 0 ||
        g.talentState?.ultimate?.petBurst ||
        g.talentState?.ultimate?.kind === "retinue";
      const radius = empowered ? 135 : g.evolved() ? 105 : 85;
      const targets = g.enemies
        .filter(
          (o) => o !== e && o.hp > 0 && dist(o, e) < radius * g.areaScale + o.r,
        )
        .slice(0, empowered ? 6 : g.evolved() ? 5 : 3);
      for (const other of targets)
        g.hit(
          other,
          damage * (empowered ? 0.7 : 0.4),
          4,
          "pet-splash",
          "companions",
        );
      g.effect("ring", e.x, e.y, {
        r: radius,
        color: "#acdf8d",
        duration: 0.4,
      });
    }
  }
  if (g.hero.id === "fen" && source === "huntarrow") {
    s.prey = e.id;
    e.markUntil = g.time + 4 + g.rank("longmark");
    gain(g, 0.04);
  }
  if (g.hero.id === "solace" && source === "holy") {
    gain(g, 0.07 * (1 + g.rank("faithwell") * 0.1) * (g.evolved() ? 1.15 : 1));
    s.hits++;
    if (s.hits % 3 === 0 && g.time >= s.mendAt) {
      s.mendAt = g.time + 1.2;
      if (g.p.hp >= g.p.maxHp && g.rank("overflow")) shield(g, 2, 25);
      else heal(g, 1.2 + 0.15 * g.rank("grace"));
    }
  }
  if (g.hero.id === "morrow" && source === "runeblade") {
    e.slow = Math.max(e.slow, 1.2 + g.rank("longrime") * 0.3);
    e.hexTime = g.evolved() ? 4 : 3;
    e.hexDamage = (4 + g.rank("signature")) * (1 + g.rank("gravecraft") * 0.08);
  }
}
export function archetypeKill(g, e) {
  const blighted = e.hexTime > 0 || e.spellDot?.life > 0;
  const spread = (other, seconds, scale = 1) => {
    if (e.hexTime > 0) {
      other.hexTime = Math.max(other.hexTime || 0, seconds);
      other.hexDamage = e.hexDamage * scale;
    } else if (e.spellDot?.life > 0) {
      other.spellDot = {
        ...e.spellDot,
        life: seconds,
        tick: 0.5,
        damage: e.spellDot.damage * scale,
      };
    }
  };
  if (g.hero.id === "vesper" && blighted) {
    gain(g, 0.2);
    if (g.rank("hexplague"))
      for (const other of g.enemies)
        if (
          other !== e &&
          !other.killed &&
          !other.reaper &&
          other.hp > 0 &&
          dist(other, e) < 90
        ) {
          spread(other, 2, 0.5);
        }
  }
  if (
    g.hero.id === "morrow" &&
    g.evolutions.signature &&
    blighted &&
    g.time >= g.classState.plagueAt
  ) {
    g.classState.plagueAt = g.time + 0.8;
    for (const other of g.enemies)
      if (
        other !== e &&
        !other.killed &&
        !other.reaper &&
        other.hp > 0 &&
        dist(other, e) < 90
      ) {
        spread(other, 3);
      }
  }
}
export function archetypeSkill(g) {
  if (!isClass(g)) return;
  const p = g.p,
    s = g.classState,
    id = g.hero.id,
    resource = p.trait,
    n = g.rank("signature"),
    power = g.skillPower;
  s.pactPower = Math.sqrt(power);
  s.commandPower = Math.sqrt(power);
  p.trait = 0;
  if (id === "vesper") {
    s.pact =
      7 + resource * 4 + g.rank("soulwell") + (g.evolutions.active ? 4 : 0);
    const count =
      1 +
      Math.floor(resource * 3) +
      (g.rank("twinpact") ? 1 : 0) +
      (g.evolutions.active ? 1 : 0);
    for (const c of g.companions)
      if (c.permanent) {
        c.hp = Math.min(
          c.maxHp,
          Math.max(c.hp, c.maxHp * 0.35) + c.maxHp * (0.2 + resource * 0.15),
        );
        c.down = 0;
        c.hurtAt = g.time + 0.5;
      }
    for (let i = 0; i < count; i++) summonCompanion(g, "imp", s.pact);
    g.area(p.x, p.y, 240, (34 + n * 6) * power, "hex");
  }
  if (id === "fen") {
    s.command = 6 + resource * 5 + (g.evolutions.active ? 4 : 0);
    const wolf = g.companions.find((c) => c.kind === "wolf");
    if (wolf) {
      wolf.hp = Math.min(
        wolf.maxHp,
        Math.max(wolf.hp, wolf.maxHp * 0.3) +
          wolf.maxHp * (0.3 + resource * 0.25),
      );
      wolf.down = 0;
      const target = g.nearest(p.x, p.y, 600);
      if (target) {
        wolf.x = target.x - 25;
        wolf.y = target.y;
        g.area(
          target.x,
          target.y,
          145,
          (45 + n * 8) * power * (1 + resource),
          "pet",
        );
      }
    }
    trap(g, p.x, p.y);
    if (g.rank("ambush")) {
      trap(g, p.x - 100, p.y);
      trap(g, p.x + 100, p.y);
    }
  }
  if (id === "solace") {
    heal(g, p.maxHp * (0.08 + resource * 0.12));
    shield(g, 10 + resource * 12 + g.rank("discipline") * 2);
    const r =
      (g.evolutions.active ? 260 : 210) * (1 + g.rank("radiance") * 0.08);
    g.area(p.x, p.y, r, (40 + n * 8) * power * (1 + resource), "holy");
    if (resource >= 0.95 && g.rank("absolution"))
      p.invuln = Math.max(p.invuln, 0.6);
    if (g.rank("sunchoir")) g.radial(p.x, p.y, 8, 24 * power, "holy");
    if (g.evolutions.active)
      g.zones.push({
        x: p.x,
        y: p.y,
        r: 150,
        life: 5,
        tick: 0,
        damage: 12 * power,
        kind: "garden",
      });
  }
  if (id === "orin") {
    placeTotem(g);
    p.trait = (g.classState.nextTotem % 3) / 3;
    g.area(p.x, p.y, 130, (25 + n * 5) * power, "spirit");
  }
  if (id === "kestrel") {
    const r = (155 + resource * 90) * (1 + g.rank("longkick") * 0.08);
    g.area(p.x, p.y, r, (40 + n * 9) * power * (1 + resource), "fist");
    heal(g, resource * 3 * g.rank("mistcraft") * 0.5);
    shield(g, 5 + resource * 10 + g.rank("mistguard") * 2);
    if (resource >= 0.95) {
      if (g.rank("steelheart")) p.invuln = Math.max(p.invuln, 0.5);
      if (g.rank("serenity")) s.serenity = 4;
    }
    if (g.evolutions.active)
      g.zones.push({
        x: p.x,
        y: p.y,
        r: 140,
        life: 4,
        tick: 0,
        damage: 15 * power,
        kind: "vortex",
      });
  }
  if (id === "morrow") {
    for (const e of g.enemies)
      if (e.hp > 0 && !e.boss && !e.reaper && dist(e, p) < 300) {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.x = p.x + Math.cos(a) * 80;
        e.y = p.y + Math.sin(a) * 80;
        e.stun = Math.max(e.stun, 0.4);
      }
    g.area(p.x, p.y, 190, (48 + n * 9) * power * (1 + resource), "runeblade");
    heal(
      g,
      Math.min(
        p.maxHp * 0.17,
        resource *
          (p.maxHp * 0.08 +
            1.5 * g.rank("bloodrunes") +
            (g.rank("bloodfeast") && resource >= 0.95 ? p.maxHp * 0.05 : 0)),
      ),
    );
    shield(g, resource * 10 + g.rank("bloodguard") * 2);
    if (g.rank("ghoulpact") || g.evolutions.active)
      summonCompanion(g, "ghoul", 12 + g.rank("gravecoven") * 2);
  }
  if (g.legacy.count >= 8) shield(g, 4);
  if (g.legacy.count >= 12) p.dashCd = Math.max(0, p.dashCd - 0.5);
}
export function archetypeForm(g, slot, power, r) {
  if (!isClass(g)) return;
  const id = g.hero.id,
    p = g.p,
    s = g.classState;
  const summon = (kind, life) => {
    const c = summonCompanion(g, kind, life);
    if (c) c.ultimate = true;
    return c;
  };
  s.pactPower = Math.sqrt(power);
  s.commandPower = Math.sqrt(power);
  if (id === "vesper") {
    if (slot) {
      s.pact = Math.max(s.pact, 18);
      for (let i = 0; i < 4; i++) summon("imp", 18);
      summon("guardian", 18);
      g.area(p.x, p.y, r, 120 * power, "hex");
    } else {
      s.pact = Math.max(s.pact, 10);
      const prey = g.nearest(p.x, p.y, 650) || p;
      g.area(prey.x, prey.y, r, 110 * power, "hex");
    }
    for (const c of g.companions) {
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.35);
      if (c.hp > 0) c.down = 0;
    }
  }
  if (id === "fen") {
    s.command = Math.max(s.command, slot ? 18 : 11);
    if (slot) {
      summon("wolf", 18);
      summon("wolf", 18);
      g.area(p.x, p.y, r, 100 * power, "huntarrow");
    } else
      for (const e of g.enemies)
        if (dist(e, p) < r) {
          e.markUntil = g.time + 10;
          g.hit(e, 70 * power, 8, "huntarrow");
        }
  }
  if (id === "solace") {
    g.radial(p.x, p.y, slot ? 18 : 10, 65 * power, "holy");
    g.area(p.x, p.y, r, 85 * power, "holy");
    heal(g, p.maxHp * (slot ? 0.3 : 0.12));
    shield(g, slot ? 45 : 22, 90);
    if (slot)
      g.zones.push({
        x: p.x,
        y: p.y,
        r,
        damage: 28 * power,
        life: 9,
        tick: 0,
        kind: "garden",
      });
  }
  if (id === "orin") {
    if (slot) {
      for (const kind of ["fire", "storm", "tide"]) {
        placeTotem(g, kind);
        g.totems.at(-1).power = Math.sqrt(g.skillPower) * 1.6;
        g.totems.at(-1).formEmpoweredUntil = g.time + 16;
      }
      summon("elemental", 20);
      g.area(p.x, p.y, r, 110 * power, "spirit");
    } else {
      placeTotem(g);
      for (const e of g.enemies
        .filter((e) => e.hp > 0 && dist(e, p) < r)
        .slice(0, 12)) {
        g.hit(e, 120 * power, 5, "spirit");
        g.effect("arc", p.x, p.y, { tx: e.x, ty: e.y, color: g.hero.color });
      }
    }
  }
  if (id === "kestrel") {
    s.serenity = Math.max(s.serenity, slot ? 14 : 9);
    p.trait = 1;
    g.area(p.x, p.y, r, 115 * power, "fist");
    g.radial(p.x, p.y, slot ? 12 : 8, 42 * power, "fist");
    if (slot) summon("crane", 18);
  }
  if (id === "morrow") {
    if (slot)
      for (let i = 0; i < 4; i++)
        summon("ghoul", 20 + g.rank("gravecoven") * 2);
    else
      for (const e of g.enemies)
        if (e.hp > 0 && !e.reaper && dist(e, p) < r) {
          e.hexTime = 8;
          e.hexDamage = Math.max(e.hexDamage || 0, 32 * power);
          e.slow = 3;
        }
    g.area(p.x, p.y, r, 100 * power, "runeblade");
    if (slot)
      g.zones.push({
        x: p.x,
        y: p.y,
        r,
        damage: 30 * power,
        life: 9,
        tick: 0,
        kind: "veil",
      });
    else summon("ghoul", 12);
  }
}
export function archetypeAscended(g, e, stage) {
  if (!isClass(g)) return false;
  const id = g.hero.id,
    power = g.weaponPower("signature");
  if (id === "vesper") {
    for (const other of g.enemies
      .filter((o) => !o.reaper && o.hp > 0 && o !== e && dist(o, e) < 150)
      .slice(0, stage + 1)) {
      other.hexTime = 3 + stage;
      other.hexDamage =
        (7 + g.rank("signature") * 1.5) * (1 + g.rank("hexcraft") * 0.14);
    }
    if (
      stage === 2 &&
      g.companions.filter((c) => c.kind === "imp" && c.hp > 0).length < 3
    )
      summonCompanion(g, "imp", 6);
  }
  if (id === "fen") {
    e.markUntil = g.time + 6;
    gain(g, 0.08 * stage);
    for (const other of g.enemies
      .filter((o) => o.hp > 0 && o !== e && dist(o, e) < 220)
      .slice(0, stage + 1))
      g.projectile(
        e.x,
        e.y,
        Math.atan2(other.y - e.y, other.x - e.x),
        25 * stage * power,
        "arrow",
        { source: "ascended", channel: "signature", pierce: 2 },
      );
  }
  if (id === "solace") {
    shield(g, stage, 25);
    g.area(e.x, e.y, 80 + stage * 25, 22 * stage * power, "ascended");
    if (stage === 2)
      g.effect("sun", e.x, e.y, { r: 130, color: g.hero.color, duration: 0.7 });
  }
  if (id === "orin") {
    for (const t of g.totems) t.life = Math.min(35, t.life + 0.6 * stage);
    g.area(e.x, e.y, 90, 22 * stage * power, "ascended");
    if (
      stage === 2 &&
      !g.companions.some((c) => c.kind === "elemental" && c.hp > 0)
    )
      summonCompanion(g, "elemental", 8);
  }
  if (id === "kestrel") {
    gain(g, 0.08 * stage);
    g.area(e.x, e.y, 95, 24 * stage * power, "ascended");
    if (stage === 2)
      g.classState.serenity = Math.max(g.classState.serenity, 0.8);
  }
  if (id === "morrow") {
    for (const other of g.enemies)
      if (!other.reaper && other.hp > 0 && dist(other, e) < 100) {
        other.slow = Math.max(other.slow, 1.5);
        other.hexTime = 4;
        other.hexDamage = 7 * stage;
      }
    if (
      stage === 2 &&
      g.companions.filter((c) => c.kind === "ghoul" && c.hp > 0).length < 2
    )
      summonCompanion(g, "ghoul", 7);
  }
  return true;
}
export function archetypeStatus(g) {
  if (!isClass(g)) return null;
  const n = Math.floor(g.p.trait * (g.hero.id === "vesper" ? 5 : 3) + 0.001);
  if (g.hero.id === "vesper")
    return `SOULS ${n}/5 · ${g.companions.filter((c) => c.hp > 0).length} DEMONS`;
  if (g.hero.id === "fen") {
    const c = g.companions.find((c) => c.kind === "wolf");
    return `BOND ${Math.floor(g.p.trait * 100)}% · ${c?.hp > 0 ? "BEAST " + Math.ceil((c.hp / c.maxHp) * 100) + "%" : "RECOVERY " + Math.ceil(c?.down || 0) + "s"}`;
  }
  if (g.hero.id === "solace") return `FAITH ${Math.floor(g.p.trait * 100)}%`;
  if (g.hero.id === "orin")
    return `${g.totems.length}/3 TOTEMS · NEXT ${["FIRE", "STORM", "TIDE"][g.classState.nextTotem % 3]}`;
  return `${g.hero.id === "kestrel" ? "QI" : "RUNES"} ${n}/3`;
}
