// Permanent progression is banked once per expedition. Run ranks remain temporary.
import {
  ARCHETYPE_FORMS,
  ARCHETYPE_SKILL_FORMS,
  archetypeForm,
  archetypeAscended,
} from "./archetypes.js";
import { updateClassForm, empowerForm } from "./class-forms.js";
import { recoveredCooldown } from "./skill-recovery.js";
export const SKILLS = [
  "signature",
  "active",
  "orbit",
  "nova",
  "familiar",
  "frost",
  "meteor",
  "scythe",
];
export const CATALYSTS = {
  core: {
    name: "Heart core",
    icon: "heart",
    color: "#f4b16c",
    desc: "Weapon & class evolution",
  },
  rune: {
    name: "Ancient rune",
    icon: "book",
    color: "#a99df5",
    desc: "Skill evolution & advanced ranks",
  },
  sigil: {
    name: "Sovereign sigil",
    icon: "star",
    color: "#f5df92",
    desc: "Mythic skills & final forms",
  },
};
export const FORMS = {
  ...ARCHETYPE_FORMS,
  cinder: [
    "Cinder",
    "Flame sovereign",
    "Solar phoenix",
    "Inferno lance",
    "Phoenix descent",
  ],
  briar: [
    "Briar",
    "Grove sentinel",
    "Worldroot avatar",
    "Thorn sanctuary",
    "Worldroot bloom",
  ],
  nyx: [
    "Nyx",
    "Veil stalker",
    "Eclipse sovereign",
    "Shadow hunt",
    "Total eclipse",
  ],
  volta: [
    "Volta",
    "Storm conductor",
    "Thunder incarnate",
    "Chain tempest",
    "Eye of the storm",
  ],
  rook: [
    "Rook",
    "Runebound guardian",
    "Mountain colossus",
    "Fault line",
    "Mountain's verdict",
  ],
  lumen: [
    "Lumen",
    "Moon huntress",
    "Celestial ranger",
    "Crescent rain",
    "Astral barrage",
  ],
};
export const SKILL_FORMS = {
  ...ARCHETYPE_SKILL_FORMS,
  cinder: ["Sunfire bolts", "Phoenix pyre", "Solar lances", "Supernova"],
  briar: [
    "Worldroot thorns",
    "Living sanctuary",
    "Verdant spears",
    "Eternal grove",
  ],
  nyx: ["Echo daggers", "Eclipse veil", "Void fangs", "Night sovereign"],
  volta: [
    "Forked lightning",
    "Tempest collapse",
    "Heaven's circuit",
    "Storm singularity",
  ],
  rook: [
    "Runic breaker",
    "Titan's guard",
    "Mountain cleaver",
    "Colossus aegis",
  ],
  lumen: ["Moonlight arrows", "Crescent storm", "Astral longbow", "Starshower"],
  orbit: ["Aegis blades", "Sovereign blades"],
  nova: ["Resonant nova", "Event horizon"],
  familiar: ["Twin spirits", "Spirit constellation"],
  frost: ["Glacial crown", "Absolute winter"],
  meteor: ["Comet shower", "Falling heavens"],
  scythe: ["Soul harvest", "Requiem"],
};
const int = (n, max = 1e9) =>
  Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));
export const heroThreshold = (level) =>
  80 * (level - 1) + 4 * (level - 1) * level;
export const heroLevel = (xp) =>
  1 + Math.floor((Math.sqrt(84 ** 2 + 16 * Math.max(0, xp)) - 84) / 8);
export function profile(save, hero) {
  save.journeys ??= {};
  const p = (save.journeys[hero] ??= {
    xp: 0,
    sparks: 0,
    stage: 0,
    respecs: 0,
    sigilPity: 0,
    materials: { core: 0, rune: 0, sigil: 0 },
    skills: {},
    talents: {},
    ultimate: "",
  });
  p.spellSlots ??= 0;
  p.loadout ??= ["", "", ""];
  return p;
}
export function sanitizeJourney(raw, legacyXp = 0) {
  const p = {
    xp: int(raw?.xp ?? legacyXp),
    sparks: int(raw?.sparks),
    stage: int(raw?.stage, 2),
    respecs: int(raw?.respecs, 1000),
    sigilPity: int(raw?.sigilPity, 4),
    materials: {},
    skills: {},
    talents: {},
    spellSlots: int(raw?.spellSlots, 3),
    loadout: Array.from({ length: 3 }, (_, i) =>
      typeof raw?.loadout?.[i] === "string" ? raw.loadout[i].slice(0, 50) : "",
    ),
    ultimate:
      typeof raw?.ultimate === "string" ? raw.ultimate.slice(0, 50) : "",
  };
  // Migration grants no free training currency, purchases, or transformations.
  for (const id of Object.keys(CATALYSTS))
    p.materials[id] = int(raw?.materials?.[id], 1e6);
  for (const id of SKILLS) {
    let level = Math.max(1, int(raw?.skills?.[id]?.level, 10000));
    const stage = Math.min(
      int(raw?.skills?.[id]?.stage, 2),
      Math.floor(level / 20),
      heroLevel(p.xp) >= 100 ? 2 : heroLevel(p.xp) >= 20 ? 1 : 0,
    );
    if (stage < 2) level = Math.min(level, (stage + 1) * 20);
    p.skills[id] = { level, stage };
  }
  p.stage = Math.min(
    p.stage,
    Math.floor(heroLevel(p.xp) / 100),
    p.skills.signature.stage,
    p.skills.active.stage,
  );
  for (const [id, rank] of Object.entries(raw?.talents || {}).slice(0, 200))
    if (/^[a-z][a-z0-9_]{0,45}$/.test(id)) p.talents[id] = int(rank, 5);
  return p;
}
export const skillRecord = (p, id) => p.skills[id] || { level: 1, stage: 0 };
export function skillName(hero, id, stage, fallback = "Skill") {
  if (!stage) return fallback;
  return id === "signature" || id === "active"
    ? SKILL_FORMS[hero]?.[(stage - 1) * 2 + (id === "active" ? 1 : 0)] ||
        fallback
    : SKILL_FORMS[id]?.[stage - 1] || fallback;
}
export function skillBonus(p, id) {
  const s = skillRecord(p, id);
  return (
    1 +
    Math.min(19, s.level - 1) * 0.008 +
    s.stage * 0.22 +
    Math.log2(1 + Math.max(0, s.level - 20)) * 0.045
  );
}
export function trainingCost(p, id) {
  const s = skillRecord(p, id),
    advanced = Math.max(0, s.level - 20);
  return {
    sparks:
      s.level < 20
        ? 1 + Math.floor(s.level / 8)
        : 4 + Math.floor((advanced / 5) ** 1.35),
    core:
      s.level >= 20 && id === "signature" ? 1 + Math.floor(advanced / 20) : 0,
    rune:
      s.level >= 20 && id !== "signature" ? 1 + Math.floor(advanced / 20) : 0,
    sigil:
      s.level >= 40 && s.level % 5 === 0 ? 1 + Math.floor(advanced / 50) : 0,
  };
}
export function skillEvolutionCost(p, id) {
  const s = skillRecord(p, id),
    next = s.stage + 1;
  return {
    sparks: next === 1 ? 10 : 30,
    core: id === "signature" ? next * 4 : 0,
    rune: id === "signature" ? next : next * 4,
    sigil: next === 2 ? 1 : 0,
  };
}
export function costLock(p, cost) {
  if (p.sparks < cost.sparks) return `${cost.sparks} training sparks`;
  for (const id of Object.keys(CATALYSTS))
    if (p.materials[id] < (cost[id] || 0))
      return `${cost[id]} ${CATALYSTS[id].name.toLowerCase()}${cost[id] > 1 ? "s" : ""}`;
  return "";
}
const pay = (p, cost) => {
  p.sparks -= cost.sparks;
  for (const id of Object.keys(CATALYSTS)) p.materials[id] -= cost[id] || 0;
};
export function trainingLock(p, id) {
  if (!SKILLS.includes(id)) return "Unknown skill";
  const s = skillRecord(p, id);
  if (s.level >= 10000) return "MASTERED";
  if (s.level >= (s.stage + 1) * 20 && s.stage < 2)
    return "Evolve to keep training";
  const level = Math.max(1, Math.floor(s.level / 2));
  if (heroLevel(p.xp) < level) return `Class level ${level}`;
  return costLock(p, trainingCost(p, id));
}
export function trainSkill(save, hero, id) {
  const p = profile(save, hero);
  if (trainingLock(p, id)) return false;
  pay(p, trainingCost(p, id));
  p.skills[id] = { ...skillRecord(p, id), level: skillRecord(p, id).level + 1 };
  return true;
}
export function skillEvolutionLock(p, id) {
  if (!SKILLS.includes(id)) return "Unknown skill";
  const s = skillRecord(p, id);
  if (s.stage >= 2) return "MYTHIC";
  if (s.level < (s.stage + 1) * 20) return `Skill level ${(s.stage + 1) * 20}`;
  if (heroLevel(p.xp) < (s.stage ? 100 : 20))
    return `Class level ${s.stage ? 100 : 20}`;
  return costLock(p, skillEvolutionCost(p, id));
}
export function evolveSkill(save, hero, id) {
  const p = profile(save, hero);
  if (skillEvolutionLock(p, id)) return false;
  pay(p, skillEvolutionCost(p, id));
  p.skills[id] = { ...skillRecord(p, id), stage: skillRecord(p, id).stage + 1 };
  return true;
}
export function classCost(p) {
  return {
    sparks: p.stage ? 60 : 30,
    core: p.stage ? 16 : 8,
    rune: p.stage ? 10 : 4,
    sigil: p.stage ? 3 : 1,
  };
}
export function classGoals(save, hero) {
  const p = profile(save, hero),
    next = p.stage + 1,
    target = next * 100;
  if (p.stage === 2) return [];
  return [
    { label: "Class level", value: heroLevel(p.xp), target },
    {
      label: "Weapon evolution",
      value: skillRecord(p, "signature").stage,
      target: next,
    },
    {
      label: "Skill evolution",
      value: skillRecord(p, "active").stage,
      target: next,
    },
    {
      label: "Wardens defeated",
      value: save.chronicle?.[hero]?.bosses || 0,
      target: next === 1 ? 6 : 20,
    },
  ];
}
export function classLock(save, hero) {
  const p = profile(save, hero);
  if (p.stage === 2) return "FINAL FORM";
  const goal = classGoals(save, hero).find((g) => g.value < g.target);
  return goal ? `${goal.label} ${goal.target}` : costLock(p, classCost(p));
}
export function evolveClass(save, hero) {
  if (classLock(save, hero)) return false;
  const p = profile(save, hero);
  pay(p, classCost(p));
  p.stage++;
  return true;
}
export function initJourney(g) {
  g.journey = profile(g.save, g.hero.id);
  g.catalysts = [];
  g.foundCatalysts = { core: 0, rune: 0, sigil: 0 };
  g.nextCatalyst = 48 + g.random() * 30;
  g.catalystSerial = 0;
  g.formCooldowns = [0, 0];
  g.ascensionProcs = {};
  g.pendingForm = null;
  for (const [id, rank] of Object.entries(g.journey.talents))
    g.ranks[id] = rank;
}
export function spawnCatalyst(g, kind) {
  if (!CATALYSTS[kind] || g.catalysts.length >= 4) return null;
  const a = g.random() * Math.PI * 2,
    d = 520 + g.random() * 780;
  const item = {
    id: `catalyst:${++g.catalystSerial}`,
    kind,
    x: Math.max(
      -g.realm.width / 2 + 160,
      Math.min(g.realm.width / 2 - 160, g.p.x + Math.cos(a) * d),
    ),
    y: Math.max(
      -g.realm.height / 2 + 160,
      Math.min(g.realm.height / 2 - 160, g.p.y + Math.sin(a) * d),
    ),
    expires: g.time + 100 + g.random() * 30,
  };
  g.catalysts.push(item);
  g.event(
    `${CATALYSTS[kind].name.toUpperCase()} · M to track`,
    kind === "sigil" ? 1 : 0,
  );
  return item;
}
export function collectCatalyst(g, item) {
  if (
    g.state !== "playing" ||
    !g.catalysts.includes(item) ||
    Math.hypot(g.p.x - item.x, g.p.y - item.y) > 48
  )
    return false;
  g.catalysts.splice(g.catalysts.indexOf(item), 1);
  g.foundCatalysts[item.kind]++;
  g.effect("sun", item.x, item.y, {
    r: 100,
    color: CATALYSTS[item.kind].color,
    duration: 0.8,
  });
  if (g.waypoint?.id === item.id) g.waypoint = null;
  g.event(`${CATALYSTS[item.kind].name.toUpperCase()} +1 · keep on return`);
  g.events.push({ type: "cache" });
  return true;
}
export function updateJourney(g, dt) {
  updateClassForm(g, dt);
  for (let i = 0; i < 2; i++)
    g.formCooldowns[i] = Math.max(0, g.formCooldowns[i] - dt);
  if (g.pendingForm) {
    g.pendingForm.remaining -= dt;
    if (g.pendingForm.remaining <= 0.000001) {
      const slot = g.pendingForm.slot;
      g.pendingForm = null;
      if (g.p.action?.kind === "skill") {
        g.p.action.released = true;
        g.p.action.age = Math.max(g.p.action.age, g.p.action.releaseAt);
      }
      releaseFormSkill(g, slot);
    }
  }
  const expired = g.catalysts.filter((i) => i.expires <= g.time);
  if (expired.some((i) => i.id === g.waypoint?.id)) g.waypoint = null;
  g.catalysts = g.catalysts.filter((i) => i.expires > g.time);
  if (g.time >= g.nextCatalyst) {
    g.nextCatalyst = g.time + 70 + g.random() * 55;
    const roll = g.random(),
      protect =
        g.time >= 240 &&
        g.journey.sigilPity >= 4 &&
        !g.pitySpawned &&
        !g.foundCatalysts.sigil;
    const item = spawnCatalyst(
      g,
      protect || (g.time >= 240 && roll < 0.1)
        ? "sigil"
        : roll < 0.52
          ? "rune"
          : "core",
    );
    if (item?.kind === "sigil") g.pitySpawned = true;
  }
  for (const item of [...g.catalysts]) {
    const d = Math.hypot(item.x - g.p.x, item.y - g.p.y);
    if (!item.guarded && d < 220) {
      item.guarded = true;
      for (let i = 0; i < (item.kind === "sigil" ? 5 : 2); i++)
        g.spawnEnemy("revenant", 210);
    }
    if (d < 44) collectCatalyst(g, item);
  }
}
export function bankJourney(save, g) {
  if (g.journeyBanked) return false;
  g.journeyBanked = true;
  const p = profile(save, g.hero.id),
    before = heroLevel(p.xp);
  // XP has no connection to forge XP multipliers; high run levels alone cannot farm it.
  g.classXpEarned = Math.floor(
    Math.min(g.kills, g.time * 4) +
      g.bossesKilled * 100 +
      g.elitesKilled * 8 +
      Math.floor(g.time / 4),
  );
  p.xp += g.classXpEarned;
  g.trainingEarned =
    Math.min(30, Math.floor(Math.max(0, g.level - 1) / 2)) +
    Math.min(3, g.bossesKilled);
  p.sparks += g.trainingEarned;
  for (const id of Object.keys(CATALYSTS))
    p.materials[id] += g.foundCatalysts[id];
  if (g.foundCatalysts.sigil) p.sigilPity = 0;
  else if (g.time >= 240) p.sigilPity = Math.min(4, (p.sigilPity || 0) + 1);
  g.classLevelsEarned = heroLevel(p.xp) - before;
  return true;
}
export function formCooldown(g, slot) {
  return recoveredCooldown(
    g,
    (slot ? 52 : 20) /
      (1 + Math.log2(1 + skillRecord(g.journey, "active").level) * 0.035),
    slot ? 30 : 10,
  );
}
export function castFormSkill(g, slot) {
  if (
    ![0, 1].includes(slot) ||
    g.state !== "playing" ||
    g.journey.stage < slot + 1 ||
    g.formCooldowns[slot] > 0 ||
    g.pendingForm ||
    g.pendingSkill ||
    g.pendingSpell
  )
    return false;
  g.formCooldowns[slot] = formCooldown(g, slot);
  g.pendingForm = { slot, remaining: slot ? 0.32 : 0.22 };
  g.stats.skills++;
  g.p.cast = 0.8;
  g.events.push({ type: "charge" });
  return true;
}
export function releaseFormSkill(g, slot) {
  if (g.state !== "playing") return;
  const p = g.p,
    zoneStart = g.zones.length,
    hero = g.hero.id,
    power = g.skillPower * (slot ? 3.2 : 1.65),
    r = (slot ? 450 : 310) * g.areaScale,
    angle = p.action?.angle ?? Math.atan2(p.dy, p.dx),
    target = g.nearest(p.x, p.y, 800),
    impact =
      !slot && target ? { x: target.x, y: target.y } : { x: p.x, y: p.y };
  g.effect("skillburst", p.x, p.y, {
    hero,
    tier: slot ? 3 : 2,
    motif: slot ? "ascension" : "form",
    angle: p.action?.angle || 0,
    r,
    color: g.hero.color,
    duration: slot ? 2 : 1.6,
  });
  g.damageContext = slot ? "ultimate" : "form";
  empowerForm(g, slot);
  if (hero === "cinder") {
    if (slot) {
      g.radial(p.x, p.y, 18, 45 * power, "ember");
      g.area(p.x, p.y, r, 85 * power, "form-impact");
    } else
      for (let i = -1; i <= 1; i++)
        g.projectile(p.x, p.y, angle + i * 0.065, 80 * power, "ember", {
          pierce: 6,
        });
    g.zones.push({
      ...impact,
      r: r * 0.65,
      damage: 32 * power,
      life: slot ? 7 : 4,
      tick: 0,
      kind: "fire",
    });
    p.trait = 1;
  }
  if (hero === "briar") {
    for (let i = 0; i < (slot ? 8 : 4); i++)
      g.plant(p.x + Math.cos(i * 2.4) * 120, p.y + Math.sin(i * 2.4) * 120);
    g.zones.push({
      x: p.x,
      y: p.y,
      r,
      damage: 24 * power,
      life: slot ? 8 : 5,
      tick: 0,
      kind: "garden",
    });
    p.shield = Math.min(90, p.shield + (slot ? 40 : 16));
  }
  if (hero === "nyx") {
    const origin = { x: p.x, y: p.y };
    if (!slot && target && !target.reaper) {
      p.x = Math.max(
        -g.realm.width / 2 + 80,
        Math.min(g.realm.width / 2 - 80, target.x - Math.cos(angle) * 90),
      );
      p.y = Math.max(
        -g.realm.height / 2 + 80,
        Math.min(g.realm.height / 2 - 80, target.y - Math.sin(angle) * 90),
      );
      g.effect("ring", origin.x, origin.y, {
        r: 75,
        color: g.hero.color,
        duration: 0.4,
      });
    }
    for (let i = 0; i < (slot ? 3 : 2); i++)
      g.shadows.push({
        x: origin.x + [0, -45, 45][i],
        y: origin.y,
        life: slot ? 12 : 7,
        attack: 0,
      });
    g.shadows = g.shadows.slice(-3);
    if (slot) g.radial(p.x, p.y, 18, 24 * power, "knife");
    else
      for (let i = -2; i <= 2; i++)
        g.projectile(p.x, p.y, angle + i * 0.12, 45 * power, "knife", {
          pierce: 3,
        });
    p.invuln = Math.max(p.invuln, slot ? 1 : 0.45);
    p.trait = 1;
  }
  if (hero === "volta") {
    if (!slot) {
      const visited = new Set();
      let from = { x: p.x, y: p.y };
      for (let i = 0; i < 12; i++) {
        const next = g.nearest(from.x, from.y, i ? 440 : 800, visited);
        if (!next) break;
        visited.add(next.id);
        g.effect("arc", from.x, from.y, {
          tx: next.x,
          ty: next.y,
          color: g.hero.color,
        });
        g.hit(next, 85 * power, 8, "arc");
        if (!next.reaper) next.stun = Math.max(next.stun || 0, 0.8);
        from = next;
      }
    } else {
      g.area(p.x, p.y, r, 80 * power, "arc");
      g.zones.push({
        x: p.x,
        y: p.y,
        r: r * 0.8,
        damage: 22 * power,
        life: slot ? 8 : 4,
        tick: 0,
        kind: "vortex",
      });
    }
  }
  if (hero === "rook") {
    if (slot) {
      g.area(p.x, p.y, r, 100 * power, "hammer");
      g.radial(p.x, p.y, 16, 28 * power, "stone");
    } else {
      for (const e of g.enemies)
        if (
          e.hp > 0 &&
          Math.hypot(e.x - p.x, e.y - p.y) < 370 * g.areaScale &&
          Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - angle) > 0.6
        )
          g.hit(e, 120 * power, 45, "hammer");
      for (let i = -2; i <= 2; i++)
        g.projectile(p.x, p.y, angle + i * 0.075, 55 * power, "stone", {
          pierce: 4,
        });
      g.effect("swing", p.x, p.y, {
        r: 310 * g.areaScale,
        angle,
        empowered: true,
        color: g.hero.color,
        duration: 0.45,
      });
    }
    p.shield = Math.min(90, p.shield + (slot ? 50 : 20));
    p.trait = 1;
  }
  if (hero === "lumen") {
    for (let i = 0; i < (slot ? 18 : 10); i++)
      g.projectile(
        p.x,
        p.y,
        slot ? (i * Math.PI * 2) / 18 : angle + (i - 4.5) * 0.08,
        40 * power,
        "arrow",
        { pierce: slot ? 6 : 3 },
      );
    g.zones.push({
      ...impact,
      r: slot ? r : 145 * g.areaScale,
      damage: 26 * power,
      life: slot ? 7 : 3,
      tick: 0,
      kind: "veil",
    });
    p.trait = 1;
  }
  archetypeForm(g, slot, power, r);
  // Each lingering form effect retains the damage channel after its cast has ended.
  for (const z of g.zones.slice(zoneStart))
    z.channel = slot ? "ultimate" : "form";
  for (const e of g.enemies)
    if (!e.reaper && Math.hypot(e.x - p.x, e.y - p.y) < r) {
      e.slow = Math.max(e.slow || 0, slot ? 3 : 1.5);
      if (hero === "rook" || hero === "briar" || hero === "volta")
        e.stun = Math.max(e.stun || 0, slot ? 1.8 : 0.7);
    }
  g.damageContext = null;
  g.shake = Math.max(g.shake, slot ? 6 : 3);
  g.events.push({ type: "skill", hero: g.hero.id, tier: slot ? 3 : 2 });
}
export function ascendedHit(g, e, weapon, source) {
  if (!weapon || source === "ascended" || source === "zone" || !g.journey)
    return;
  const stage = skillRecord(g.journey, weapon).stage;
  if (!stage || g.time < (g.ascensionProcs[weapon] || 0)) return;
  g.ascensionProcs[weapon] = g.time + (weapon === "signature" ? 1.6 : 2.4);
  const r = 75 + stage * 20;
  if (weapon === "signature") {
    if (archetypeAscended(g, e, stage)) return;
    if (g.hero.id === "cinder")
      g.zones.push({
        x: e.x,
        y: e.y,
        r,
        life: 2.5,
        tick: 0,
        damage: 10 * stage * g.weaponPower("signature"),
        kind: "fire",
      });
    else if (g.hero.id === "nyx" || g.hero.id === "lumen") {
      const target = g.nearest(e.x, e.y, 450, new Set([e.id]));
      if (target) {
        g.effect("arc", e.x, e.y, {
          tx: target.x,
          ty: target.y,
          color: g.hero.color,
        });
        g.hit(
          target,
          22 * stage * g.weaponPower("signature"),
          4,
          "ascended",
          "signature",
        );
      }
    } else {
      g.area(e.x, e.y, r, 18 * stage * g.weaponPower("signature"), "ascended");
      for (const other of g.enemies)
        if (!other.reaper && Math.hypot(other.x - e.x, other.y - e.y) < r)
          other.slow = Math.max(other.slow || 0, 1.2);
    }
    if (stage === 2) {
      if (g.hero.id === "briar") g.plant(e.x, e.y);
      if (g.hero.id === "nyx") {
        g.shadows.push({ x: e.x, y: e.y, life: 2.5, attack: 0.15 });
        g.shadows = g.shadows.slice(-3);
      }
      if (g.hero.id === "cinder" || g.hero.id === "lumen") {
        const target = g.nearest(e.x, e.y, 550, new Set([e.id]));
        if (target)
          g.projectile(
            e.x,
            e.y,
            Math.atan2(target.y - e.y, target.x - e.x),
            35 + g.rank("signature") * 5,
            g.hero.id === "cinder" ? "ember" : "arrow",
            { pierce: 4 },
          );
      }
      if (g.hero.id === "volta")
        for (const other of g.enemies
          .filter(
            (other) =>
              other.hp > 0 &&
              other.id !== e.id &&
              Math.hypot(other.x - e.x, other.y - e.y) < 400,
          )
          .slice(0, 3)) {
          g.effect("arc", e.x, e.y, {
            tx: other.x,
            ty: other.y,
            color: g.hero.color,
          });
          g.hit(
            other,
            28 * g.weaponPower("signature"),
            0,
            "ascended",
            "signature",
          );
        }
      if (g.hero.id === "rook")
        g.p.shield = Math.max(g.p.shield, Math.min(75, g.p.shield + 3));
    }
  } else if (weapon === "orbit")
    g.p.shield = Math.max(g.p.shield, Math.min(60, g.p.shield + stage * 2));
  else if (weapon === "scythe")
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + stage * 0.6);
  else {
    g.area(e.x, e.y, r, 15 * stage * g.weaponPower(weapon), "ascended");
    if (weapon === "frost" || weapon === "nova")
      for (const other of g.enemies)
        if (!other.reaper && Math.hypot(other.x - e.x, other.y - e.y) < r)
          other.stun = Math.max(other.stun || 0, stage * 0.3);
  }
  g.effect("ring", e.x, e.y, { r, color: g.hero.color, duration: 0.5 });
}
export function ascendedActive(g) {
  const stage = skillRecord(g.journey, "active").stage;
  if (!stage) return;
  const p = g.p,
    r = (160 + stage * 35) * g.areaScale;
  g.zones.push({
    x: p.x,
    y: p.y,
    r,
    life: 4 + stage,
    tick: 0,
    damage: 14 * stage * g.skillPower,
    kind: {
      cinder: "fire",
      briar: "garden",
      nyx: "veil",
      volta: "vortex",
      rook: "garden",
      lumen: "veil",
      vesper: "veil",
      fen: "veil",
      solace: "garden",
      orin: "vortex",
      kestrel: "vortex",
      morrow: "frost",
    }[g.hero.id],
  });
  g.p.shield = Math.max(
    g.p.shield,
    Math.min(75, g.p.shield + stage * (g.hero.id === "rook" ? 16 : 6)),
  );
  g.effect("sun", p.x, p.y, {
    r: r * 1.25,
    color: g.hero.color,
    duration: 0.9,
  });
}
