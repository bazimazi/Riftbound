import type { Ultimate, UltimateKit } from "../types.ts";
import type { Journey } from "../types.ts";
// IDs stay stable so learned final talents upgrade in existing saves.
const ultimate = (
  hero: string,
  branch: number,
  name: string,
  desc: string,
  kit: UltimateKit,
): Ultimate => ({
  id: `${hero}_path${branch}_3`,
  hero,
  branch,
  name,
  desc,
  cooldown: 40,
  seconds: 6,
  interval: 1,
  radius: 260,
  damage: 0.7,
  ...kit,
});
const rows: Record<string, Array<[string, string, UltimateKit]>> = {
  cinder: [
    [
      "Inferno cascade",
      "Q: three overlapping eruptions repeatedly scorch the horde.",
      { kind: "eruption", seconds: 6, damage: 1.4 },
    ],
    [
      "Sun avatar",
      "Q: become a moving sun; pulse fire and sustain full heat.",
      {
        kind: "avatar",
        seconds: 8,
        interval: 0.8,
        radius: 300,
        resource: true,
      },
    ],
    [
      "Phoenix ascension",
      "Q: restore 20% HP, gain 45 shield and a fiery guard.",
      { kind: "ward", heal: 0.2, shield: 45, guard: 0.3, element: "fire" },
    ],
  ],
  briar: [
    [
      "Worldroot",
      "Q: raise six seedlings; your garden follows you for 8s.",
      { kind: "garden", seconds: 8, radius: 280, damage: 0.6 },
    ],
    [
      "Plague garden",
      "Q: poison the horde; repeated blooms root lesser foes.",
      { kind: "plague", radius: 340, dot: true, cold: true },
    ],
    [
      "Forest guardian",
      "Q: restore 20% HP; a living ward heals on landed pulses.",
      {
        kind: "ward",
        heal: 0.2,
        shield: 40,
        guard: 0.25,
        mend: 2,
        element: "garden",
      },
    ],
  ],
  nyx: [
    [
      "Crimson eclipse",
      "Q: blood waves pulse around you and heal on landed hits.",
      { kind: "avatar", element: "knife", mend: 2, radius: 230, interval: 0.7 },
    ],
    [
      "Veil sovereign",
      "Q: reset dash; evade behind a storm of shadow knives.",
      {
        kind: "barrage",
        projectile: "knife",
        guard: 0.3,
        dash: true,
        interval: 0.9,
      },
    ],
    [
      "Nightfall",
      "Q: hunt eight targets with lethal echoes and expose them.",
      { kind: "hunt", mark: 0.35, radius: 550, damage: 1.25, interval: 1.5 },
    ],
  ],
  volta: [
    [
      "Storm lord",
      "Q: walking lightning strikes up to twelve foes per pulse.",
      { kind: "storm", interval: 0.8, seconds: 8, radius: 380 },
    ],
    [
      "Thunderheart",
      "Q: gain 60 shield; a thunder ward repels nearby hordes.",
      { kind: "ward", shield: 60, guard: 0.3, cold: true, element: "arc" },
    ],
    [
      "Void conductor",
      "Q: a crushing singularity pulls and stuns lesser foes.",
      { kind: "vortex", radius: 340, cold: true, damage: 0.85 },
    ],
  ],
  rook: [
    [
      "Titan force",
      "Q: full poise; repeated titan sweeps smash a wide circle.",
      { kind: "avatar", radius: 330, resource: true, damage: 1, interval: 1.2 },
    ],
    [
      "Living mountain",
      "Q: restore 20% HP, gain 60 shield and seismic armor.",
      {
        kind: "ward",
        shield: 60,
        heal: 0.2,
        guard: 0.35,
        cold: true,
        radius: 240,
      },
    ],
    [
      "World breaker",
      "Q: fracture three fault lines with repeated earthquakes.",
      { kind: "eruption", damage: 1.4, cold: true, radius: 200 },
    ],
  ],
  lumen: [
    [
      "Celestial aim",
      "Q: full focus; fire repeated fans of piercing moon arrows.",
      {
        kind: "barrage",
        projectile: "arrow",
        resource: true,
        interval: 0.8,
        damage: 0.6,
      },
    ],
    [
      "Fate arrow",
      "Q: expose eight foes; moon lances hunt them for 6s.",
      {
        kind: "hunt",
        projectile: "arrow",
        mark: 0.4,
        radius: 650,
        damage: 1.3,
        interval: 1.5,
      },
    ],
    [
      "Starlit guardian",
      "Q: gain 50 shield; moonlight pulses mend when they hit.",
      { kind: "ward", shield: 50, guard: 0.25, mend: 2, projectile: "holy" },
    ],
  ],
  vesper: [
    [
      "Nether plague",
      "Q: blanket the horde in soul curses and spreading blight.",
      { kind: "plague", dot: true, radius: 380, resource: true },
    ],
    [
      "Infernal covenant",
      "Q: call two infernal guardians; demons gain explosive fury.",
      {
        kind: "retinue",
        pet: "guardian",
        count: 2,
        seconds: 10,
        radius: 290,
        damage: 0.5,
      },
    ],
    [
      "Chaos dominion",
      "Q: repeated chaos volleys; imp impacts detonate in crowds.",
      {
        kind: "barrage",
        projectile: "hex",
        seconds: 8,
        interval: 0.9,
        petBurst: true,
      },
    ],
  ],
  fen: [
    [
      "Primal pack",
      "Q: summon three alpha wolves; the pack gains wide cleaves.",
      {
        kind: "retinue",
        pet: "wolf",
        count: 3,
        seconds: 10,
        radius: 290,
        damage: 0.5,
      },
    ],
    [
      "Wild hunt",
      "Q: mark eight prey; empowered wolves and echoes hunt them.",
      {
        kind: "hunt",
        mark: 0.35,
        radius: 650,
        seconds: 8,
        damage: 1.1,
        interval: 1.5,
      },
    ],
    [
      "Thornwild",
      "Q: grow five snare fields that damage and root the horde.",
      { kind: "thorns", radius: 140, cold: true, seconds: 8 },
    ],
  ],
  solace: [
    [
      "Seraph's grace",
      "Q: restore 25% HP; holy pulses mend through landed smites.",
      { kind: "ward", heal: 0.25, shield: 35, mend: 3, projectile: "holy" },
    ],
    [
      "Dawn aegis",
      "Q: gain 65 shield; an armored halo repeatedly repels foes.",
      { kind: "ward", shield: 65, guard: 0.35, cold: true, radius: 300 },
    ],
    [
      "Daystar",
      "Q: repeated radiant volleys pierce the surrounding horde.",
      { kind: "barrage", projectile: "holy", interval: 0.8, radius: 300 },
    ],
  ],
  orin: [
    [
      "Primal embers",
      "Q: empower and gather your totems into a mobile fire council.",
      { kind: "council", element: "fire", seconds: 8, radius: 300 },
    ],
    [
      "Storm avatar",
      "Q: mobile totems and chained lightning dominate your path.",
      {
        kind: "council",
        element: "arc",
        seconds: 8,
        radius: 360,
        interval: 0.8,
      },
    ],
    [
      "Tide sovereign",
      "Q: a moving totem sanctuary shields and mends on hits.",
      {
        kind: "council",
        shield: 50,
        guard: 0.25,
        mend: 3,
        element: "garden",
        seconds: 8,
      },
    ],
  ],
  kestrel: [
    [
      "Dragon tempest",
      "Q: call a celestial crane and unleash moving dragon sweeps.",
      {
        kind: "retinue",
        pet: "crane",
        count: 1,
        seconds: 8,
        radius: 320,
        damage: 0.9,
      },
    ],
    [
      "Celestial serenity",
      "Q: full qi, 40 shield; flowing strikes mend on contact.",
      {
        kind: "avatar",
        shield: 40,
        resource: true,
        mend: 3,
        radius: 260,
        interval: 0.8,
      },
    ],
    [
      "Jade colossus",
      "Q: armored palm waves stun lesser foes and shatter crowds.",
      { kind: "ward", shield: 45, guard: 0.35, cold: true, radius: 310 },
    ],
  ],
  morrow: [
    [
      "Blood sovereign",
      "Q: restore 25% HP; blood waves mend when they strike.",
      { kind: "ward", heal: 0.25, shield: 40, mend: 2, radius: 300 },
    ],
    [
      "Absolute winter",
      "Q: repeated frost waves freeze lesser foes around you.",
      { kind: "avatar", cold: true, radius: 360, damage: 0.9, interval: 0.8 },
    ],
    [
      "Grave legion",
      "Q: raise four cleaving ghouls and unleash a plague march.",
      {
        kind: "retinue",
        pet: "ghoul",
        count: 4,
        seconds: 12,
        dot: true,
        radius: 300,
        damage: 0.5,
      },
    ],
  ],
};
export const ULTIMATES: Record<string, Ultimate> = Object.fromEntries(
  Object.entries(rows).flatMap(([hero, branches]) =>
    branches.map(([name, desc, kit], branch) => {
      const u = ultimate(hero, branch, name, desc, kit);
      return [u.id, u];
    }),
  ),
);

export const PASSIVE_EFFECTS: Record<
  string,
  Array<(rank: number) => string>
> = {
  offense: [
    (r) => `Every 5 weapon hits: ${45 * r}% impact burst to 4 nearby foes.`,
    (r) => `Q: ${8 + 2 * r} piercing bolts in a circle.`,
  ],
  skill: [
    (r) =>
      `Weapon hits recover ${Number((0.15 * r).toFixed(2))}s of Q, R, F and ultimate; once / 0.6s.`,
    (r) => `Q: a ${3 + r}s damaging field slows up to 12 foes per pulse.`,
  ],
  guard: [
    (r) => `Dash: +${6 * r} shield; repel and stun up to 8 nearby foes.`,
    (r) =>
      `When hit below 60% HP: +${8 * r} shield and counterblast. 10s base.`,
  ],
  speed: [
    (r) => `Dash: release ${6 + 2 * r} piercing shadow knives.`,
    (r) => `Q: recover ${2 * r}s dash cooldown; leave a ${3 + r}s blade wake.`,
  ],
  crit: [
    (r) => `Critical weapon hits echo ${40 * r}% damage to another foe. 0.4s.`,
    (r) => `Q: expose the toughest nearby foe: +${15 * r}% damage for 5s.`,
  ],
};
export const selectedUltimate = (hero: string, p: Journey) => {
  const chosen = ULTIMATES[p.ultimate];
  if (chosen?.hero === hero && p.talents[chosen.id]) return chosen;
  return (
    Object.values(ULTIMATES).find((u) => u.hero === hero && p.talents[u.id]) ||
    null
  );
};
