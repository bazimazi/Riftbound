import { defineTable } from "../../shared/records.ts";
// Permanent training stages are separate from run-rank awakenings and seal recipes.
const classes = {
  cinder: {
    signature: [
      "Auto-aimed embers burst on impact; heat enlarges the blast.",
      "Weapon hits periodically leave burning ground.",
      "Larger burn patches; empowered hits also launch a piercing ember.",
    ],
    active: "Burn a wide ring and fill your heat.",
    field: "burning",
  },
  briar: {
    signature: [
      "Orbiting thorns cut nearby foes; seedlings fire at the horde.",
      "Weapon hits periodically burst into slowing roots.",
      "Stronger root bursts also grow a seedling at the impact.",
    ],
    active: "Root nearby foes, grow three seedlings and restore health.",
    field: "healing",
  },
  nyx: {
    signature: [
      "Piercing knives seek nearby foes; movement increases damage.",
      "Weapon hits periodically echo into a second target.",
      "Stronger echoes also leave a short-lived attacking shadow.",
    ],
    active: "Evade damage for 2s and unleash a storm of knives.",
    field: "slowing",
  },
  volta: {
    signature: [
      "Lightning chains through crowds; repeated attacks trigger overloads.",
      "Weapon hits periodically burst into a slowing circuit.",
      "Larger circuits also strike up to three nearby foes with lightning.",
    ],
    active: "Stun nearby foes, discharge a pulse and reset your capacitor.",
    field: "pulling",
  },
  rook: {
    signature: [
      "Sweep a close-range hammer; full poise adds a shockwave.",
      "Hammer hits periodically release a slowing shockwave.",
      "Larger shockwaves also restore a small shield on empowered hits.",
    ],
    active: "Slam nearby foes, briefly stun them and raise a shield.",
    field: "healing",
  },
  lumen: {
    signature: [
      "Piercing arrows consume focus for stronger volleys.",
      "Arrow hits periodically ricochet as moonlight.",
      "Stronger ricochets also launch a piercing arrow at another foe.",
    ],
    active: "Fire an arrow storm and heavy aimed arrows; slow nearby foes.",
    field: "slowing",
  },
  vesper: {
    signature: [
      "Hex bolts and imp blasts curse foes; cursed kills harvest souls for your demons.",
      "Bolt hits periodically spread curses to two nearby foes.",
      "Spread curses to three foes; empowered hits can summon a temporary imp.",
    ],
    active:
      "Spend souls: rupture nearby and distant prey, summon imps, mend demons and empower their area attacks.",
    field: "slowing",
  },
  fen: {
    signature: [
      "Piercing bolts mark prey for your cleaving wolf and build bond.",
      "Hits periodically mark prey, build bond and split into two piercing bolts.",
      "Empowered hits build more bond and split into three stronger bolts.",
    ],
    active:
      "Spend bond: mend or revive your wolves, pounce on marked packs, empower wide cleaves and lay a snare.",
    field: "slowing",
  },
  solace: {
    signature: [
      "Dawn bolts build faith; every third landed hit can mend you.",
      "Empowered hits grant a small shield and burst around the target.",
      "Stronger sunbursts grant more shield and reach a wider group.",
    ],
    active: "Spend faith to heal, shield yourself and smite nearby foes.",
    field: "healing",
  },
  orin: {
    signature: [
      "Spirit bolts support your fire, storm and tide totems.",
      "Empowered hits burst on impact and extend your totems' lives.",
      "Stronger bursts extend totems further and can summon an elemental.",
    ],
    active:
      "Raise the next fire, storm or tide totem; keep up to three active.",
    field: "pulling",
  },
  kestrel: {
    signature: [
      "Land a three-strike melee combo to build qi; third strikes cleave.",
      "Empowered hits build extra qi and burst around the target.",
      "Stronger bursts build more qi and briefly open your serenity window.",
    ],
    active: "Spend qi on a sweeping kick for extra reach, damage and guard.",
    field: "pulling",
  },
  morrow: {
    signature: [
      "Rune cleaves chill and infect foes; landed attacks charge runes.",
      "Empowered hits spread slowing plague to nearby lesser foes.",
      "Stronger plague spreads; empowered hits can raise a temporary ghoul.",
    ],
    active:
      "Grip lesser foes and spend runes on a crushing cleave and healing.",
    field: "frost",
  },
};

export const CLASS_SKILL_DESCRIPTIONS: Record<
  string,
  Record<string, string[]>
> = Object.fromEntries(
  Object.entries(classes).map(([hero, kit]) => [
    hero,
    {
      signature: kit.signature,
      active: [
        kit.active,
        ...[1, 2].map(
          (stage) =>
            `Casting also leaves a ${4 + stage}s ${kit.field} field and grants ${stage * (hero === "rook" ? 16 : 6)} shield.`,
        ),
      ],
    },
  ]),
);
export const RELIC_SKILL_DESCRIPTIONS = defineTable({
  orbit: [
    "Orbiting blades cut nearby foes; run upgrades add blades and damage.",
    "Blade hits periodically restore 2 shield.",
    "Blade hits periodically restore 4 shield.",
  ],
  nova: [
    "Periodic force pulses strike the surrounding horde.",
    "Nova hits periodically echo into a stunning burst.",
    "Larger, stronger echo bursts stun lesser foes for longer.",
  ],
  familiar: [
    "Wisps fire auto-aimed bolts; run upgrades add bolts and damage.",
    "Wisp hits periodically detonate nearby targets.",
    "Wisp detonations hit a wider area for more damage.",
  ],
  frost: [
    "Frost pulses damage and slow nearby foes.",
    "Ice hits periodically shatter into stunning bursts.",
    "Larger shatter bursts deal more damage and stun for longer.",
  ],
  meteor: [
    "Falling stars explode around nearby threats.",
    "Meteor impacts periodically trigger a secondary blast.",
    "Secondary blasts reach farther and deal more damage.",
  ],
  scythe: [
    "Spectral scythes fire in volleys and slice through the horde.",
    "Scythe hits periodically restore 0.6 health.",
    "Scythe hits periodically restore 1.2 health.",
  ],
});
export function skillDescription(
  hero: string,
  id: string,
  stage: number,
  fallback = "",
) {
  return (
    (CLASS_SKILL_DESCRIPTIONS[hero]?.[id] || RELIC_SKILL_DESCRIPTIONS[id])?.[
      stage
    ] ||
    fallback ||
    "Train to increase this skill's power."
  );
}
