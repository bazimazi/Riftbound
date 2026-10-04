import type { TalentNode } from "../types.ts";
import type { Enemy } from "../types.ts";
import type { Game } from "../Game.ts";
import type { Save } from "../types.ts";
// Unlocks use banked achievements. Merely previewing or abandoning a run grants nothing.
import { recoverSkills } from "./skill-recovery.ts";
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  ARCHETYPE_TREES,
  ARCHETYPE_PAGES,
  archetypeGoals,
  archetypeStats,
  archetypeUpdate,
  archetypeAttack,
  archetypeSkill,
} from "./archetypes.ts";
export const HERO_IDS = [
  "cinder",
  "briar",
  "nyx",
  "volta",
  "rook",
  "lumen",
  ...ARCHETYPE_IDS,
];
export const EXTRA_HEROES = [
  {
    id: "rook",
    name: "Rook",
    title: "The last sentinel",
    role: "Hammer / poise / shields",
    color: "#e1bc76",
    dark: "#755931",
    icon: "⬡",
    difficulty: "DEFENDER",
    quote: "“This line will hold.”",
    desc: "A stubborn guardian who trades speed for crushing close combat.",
    hp: 145,
    speed: 158,
    cooldown: 18,
    skill: "Bastion slam",
    weapon: "Runestone hammer",
    weaponDesc:
      "A wide, close-range hammer sweep. At full poise, unleash a crushing shockwave.",
    trait: "Poise",
    traitDesc:
      "Standing builds poise; moving drains it. Every five kills restores a small shield.",
    skillDesc:
      "Slam the earth, briefly stun nearby foes and raise a shield. No free healing.",
    talents: ["Stonebreaker", "Bulwark", "Oathkeeper"],
    talentIds: ["temper", "bulwark", "sentinelvow"],
  },
  {
    id: "lumen",
    name: "Lumen",
    title: "The moon huntress",
    role: "Piercing arrows / focus",
    color: "#a7deed",
    dark: "#425e91",
    icon: "➶",
    difficulty: "MARKSMAN",
    quote: "“One breath. One arrow.”",
    desc: "A fragile moon archer. Find breathing room, charge a shot, then relocate.",
    hp: 82,
    speed: 192,
    cooldown: 15,
    skill: "Moonfall",
    weapon: "Crescent bow",
    weaponDesc:
      "Long-range piercing arrows. A fully focused shot deals extra damage and pierces deeper.",
    trait: "Moon focus",
    traitDesc:
      "Standing charges focus; moving drains it. Charged volleys consume focus, so every shot matters.",
    skillDesc:
      "Fire a radial arrow storm and three heavy arrows at the nearest threat. Briefly slow nearby foes.",
    talents: ["Moonwatch", "Fletching", "Night runner"],
    talentIds: ["drawspeed", "fletching", "lunarstep"],
  },
  ...ARCHETYPES,
];
export function heroGoals(save: Save, id: string) {
  if (id === "rook")
    return [
      {
        icon: "blade",
        label: "Wardens defeated",
        value: save.bosses || 0,
        target: 3,
      },
    ];
  if (id === "lumen")
    return [
      {
        icon: "book",
        label: "Memories recovered",
        value: Object.values(save.memories || {}).reduce(
          (n, entries) =>
            n + Object.values(entries).filter((v) => v === true).length,
          0,
        ),
        target: 4,
      },
      {
        icon: "heart",
        label: "Best survival",
        value: Math.floor(save.best || 0),
        target: 240,
        seconds: true,
      },
    ];
  return archetypeGoals(save, id);
}
export const heroUnlocked = (save: Save, id: string) =>
  HERO_IDS.includes(id) &&
  heroGoals(save, id).every((g) => g.value >= g.target);
const n = (id: string, name: string, desc: string, tier: number = 0) => ({
  id,
  name,
  desc,
  max: [12, 8, 1][tier],
});
const b = (name: string, icon: string, nodes: TalentNode[]) => ({
  name,
  icon,
  nodes,
});
export const EXTRA_TREES = {
  ...ARCHETYPE_TREES,
  rook: [
    b("Stonebreaker", "⬡", [
      n("temper", "Tempered steel", "+10% hammer damage per rank."),
      n(
        "quake",
        "Fault line",
        "+10% hammer reach per rank, capped at +60%.",
        1,
      ),
      n(
        "earthshatter",
        "Earthshatter",
        "Poised attacks launch eight piercing stone shards.",
        2,
      ),
    ]),
    b("Bulwark", "⬡", [
      n(
        "bulwark",
        "Bulwark",
        "Restore 2 more shield per rank on every fifth kill, up to 16 per trigger.",
      ),
      n(
        "bastion",
        "Iron bastion",
        "While shielded, take less damage with diminishing returns.",
        1,
      ),
      n(
        "unbroken",
        "Unbroken",
        "Bastion Slam grants one second of invulnerability.",
        2,
      ),
    ]),
    b("Oathkeeper", "✦", [
      n(
        "sentinelvow",
        "Sentinel vow",
        "+4% hammer damage per rank while shielded.",
      ),
      n(
        "retaliation",
        "Retaliation",
        "Taking damage restores 4% poise per rank.",
        1,
      ),
      n(
        "laststand",
        "Last stand",
        "Bastion Slam heals 20% health when below 35% health.",
        2,
      ),
    ]),
  ],
  lumen: [
    b("Moonwatch", "➶", [
      n("drawspeed", "Patient draw", "+18% focus charge speed per rank."),
      n("moonsight", "Moon sight", "+12% charged arrow damage per rank.", 1),
      n(
        "fullmoon",
        "Full moon",
        "Charged shots launch two additional heavy arrows.",
        2,
      ),
    ]),
    b("Fletching", "➶", [
      n("fletching", "Silver fletching", "+1 arrow pierce per rank."),
      n(
        "trueshot",
        "True shot",
        "+3% critical chance per rank, within the critical cap.",
        1,
      ),
      n(
        "doubleshot",
        "Twin crescent",
        "Charged volleys fire a second volley.",
        2,
      ),
    ]),
    b("Night runner", "✦", [
      n(
        "lunarstep",
        "Lunar stride",
        "+2% movement speed per rank, with diminishing returns.",
      ),
      n("moonveil", "Moon veil", "Moonfall grants 5 shield per rank.", 1),
      n(
        "starfall",
        "Starfall",
        "Moonfall leaves a damaging moon field for five seconds.",
        2,
      ),
    ]),
  ],
};
const p = (
  id: string,
  name: string,
  hero: string,
  desc: string,
  metric: string,
  target: number,
) => ({
  id,
  name,
  hero,
  icon: "✦",
  desc,
  metric,
  target,
  lore: "A promise carried beyond the rift.",
});
export const EXTRA_PAGES = [
  ...ARCHETYPE_PAGES,
  p(
    "stonewake",
    "Stonewake",
    "rook",
    "Dash restores 12% poise; dash cooldown +15%.",
    "dashes",
    80,
  ),
  p(
    "gildedguard",
    "Gilded guard",
    "rook",
    "+6 starting shield; shielded hammer hits deal +8% damage.",
    "kills",
    350,
  ),
  p(
    "oldvow",
    "The old vow",
    "rook",
    "Poised shockwaves restore 3 shield.",
    "evolutions",
    1,
  ),
  p(
    "moonstring",
    "Moonstring",
    "lumen",
    "+20% focus charge speed; −5% arrow damage.",
    "kills",
    350,
  ),
  p(
    "farshot",
    "Distant promise",
    "lumen",
    "Arrows deal +15% damage beyond 260 range.",
    "best",
    300,
  ),
  p(
    "moonescape",
    "Moon escape",
    "lumen",
    "Dash restores 8% focus and briefly slows nearby foes.",
    "dashes",
    100,
  ),
];
export function championStats(g: Game) {
  archetypeStats(g);
  if (g.hero.id === "rook" && g.hasPage("stonewake")) g.dashCooldown *= 1.15;
  if (g.hero.id === "lumen") {
    g.moveSpeed *=
      1 + (0.02 * g.rank("lunarstep")) / (1 + 0.04 * g.rank("lunarstep"));
    g.critChance = Math.min(0.65, g.critChance + 0.03 * g.rank("trueshot"));
  }
}
export function championUpdate(g: Game, dt: number, moving: boolean) {
  archetypeUpdate(g, dt);
  if (g.hero.id === "rook")
    g.p.trait = Math.max(
      0,
      Math.min(
        1,
        g.p.trait +
          dt * (moving ? -0.1 : 0.22) * (g.legacy.count >= 4 ? 1.1 : 1),
      ),
    );
  if (g.hero.id === "lumen")
    g.p.trait = Math.max(
      0,
      Math.min(
        1,
        g.p.trait +
          dt *
            (moving
              ? -0.25
              : 0.55 *
                (1 +
                  0.18 * g.rank("drawspeed") +
                  (g.hasPage("moonstring") ? 0.2 : 0) +
                  (g.legacy.count >= 4 ? 0.1 : 0))),
      ),
    );
}
export function championAttack(g: Game, target: Enemy | null, angle: number) {
  archetypeAttack(g, target, angle);
  const { p } = g,
    rank = g.rank("signature"),
    poised = p.trait >= 0.95;
  if (g.hero.id === "rook") {
    const radius =
      (g.evolved() ? 180 : 145) * (1 + Math.min(0.6, g.rank("quake") * 0.1));
    const damage =
      (32 + rank * 9) *
      (1 + 0.1 * g.rank("temper")) *
      (p.shield > 0
        ? 1 +
          0.04 * g.rank("sentinelvow") +
          (g.hasPage("gildedguard") ? 0.08 : 0)
        : 1);
    for (const e of g.enemies) {
      const distance = Math.hypot(e.x - p.x, e.y - p.y),
        facing = Math.atan2(e.y - p.y, e.x - p.x);
      if (
        e.hp > 0 &&
        distance < radius * g.areaScale + e.r &&
        (poised || Math.cos(facing - angle) > 0.1)
      )
        g.hit(e, damage * (poised ? 1.65 : 1), 26, "hammer");
    }
    g.effect("swing", p.x, p.y, {
      r: radius * g.areaScale,
      angle,
      empowered: poised,
      color: g.hero.color,
      duration: 0.28,
    });
    if (poised) {
      p.trait = 0;
      if (g.rank("earthshatter") || g.evolutions.signature)
        g.radial(p.x, p.y, 8, 18 + rank * 5, "stone");
      if (g.hasPage("oldvow")) p.shield = Math.min(60, p.shield + 3);
      if (g.legacy.count >= 12) p.shield = Math.min(60, p.shield + 2);
    }
  }
  if (g.hero.id === "lumen") {
    const count = Math.min(
      7,
      2 +
        Math.floor(rank / 4) +
        (g.evolved() ? 1 : 0) +
        (poised && g.rank("fullmoon") ? 2 : 0),
    );
    let damage =
      (24 + rank * 8) *
      (poised ? 1.6 * (1 + 0.12 * g.rank("moonsight")) : 1) *
      (g.hasPage("moonstring") ? 0.95 : 1);
    if (
      g.hasPage("farshot") &&
      Math.hypot(target!.x - p.x, target!.y - p.y) > 260
    )
      damage *= 1.15;
    for (
      let volley = 0;
      volley < (poised && g.rank("doubleshot") ? 2 : 1);
      volley++
    )
      for (let i = 0; i < count; i++)
        g.projectile(
          p.x,
          p.y,
          angle + (i - (count - 1) / 2) * 0.11 + volley * 0.04,
          damage,
          "arrow",
          {
            pierce:
              2 + Math.floor(rank / 3) + g.rank("fletching") + (poised ? 3 : 0),
            life: 2.2,
            r: poised ? 7 : 4,
            charged: poised,
          },
        );
    if (poised) {
      p.trait = 0;
      if (g.evolutions.signature)
        g.radial(target!.x, target!.y, 6, 20 + rank * 5, "arrow");
      if (g.legacy.count >= 12) recoverSkills(g, 0.3);
    }
  }
}
export function championSkill(g: Game) {
  archetypeSkill(g);
  const { p } = g,
    rank = g.rank("signature");
  if (g.hero.id === "rook") {
    p.shield = Math.min(
      100,
      p.shield + 20 * Math.sqrt(g.skillPower) + (g.legacy.count >= 8 ? 5 : 0),
    );
    g.area(p.x, p.y, 240, (55 + rank * 10) * g.skillPower, "hammer");
    for (const e of g.enemies)
      if (!e.reaper && Math.hypot(e.x - p.x, e.y - p.y) < 240)
        e.stun = Math.max(e.stun, 1.1);
    if (g.rank("unbroken")) p.invuln = Math.max(p.invuln, 1);
    if (g.rank("laststand") && p.hp < p.maxHp * 0.35)
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2);
    if (g.evolutions.active) {
      p.trait = 1;
      g.radial(p.x, p.y, 12, (24 + rank * 5) * g.skillPower, "stone");
    }
  }
  if (g.hero.id === "lumen") {
    g.radial(
      p.x,
      p.y,
      g.evolutions.active ? 16 : 8,
      (25 + rank * 7) * g.skillPower,
      "arrow",
    );
    const target = g.nearest(p.x, p.y);
    if (target)
      for (const a of [-0.12, 0, 0.12])
        g.projectile(
          p.x,
          p.y,
          Math.atan2(target.y - p.y, target.x - p.x) + a,
          (50 + rank * 10) * g.skillPower,
          "arrow",
          { pierce: 8, charged: true },
        );
    p.invuln = Math.max(p.invuln, 0.4);
    p.shield = Math.min(
      50,
      p.shield + g.rank("moonveil") * 5 + (g.legacy.count >= 8 ? 4 : 0),
    );
    for (const e of g.enemies)
      if (!e.reaper && Math.hypot(e.x - p.x, e.y - p.y) < 190) e.slow = 1.6;
    if (g.rank("starfall") || g.evolutions.active)
      g.zones.push({
        x: p.x,
        y: p.y,
        r: 180,
        life: g.evolutions.active ? 7 : 5,
        tick: 0,
        damage: 20 * g.skillPower,
        kind: "veil",
      });
  }
}
