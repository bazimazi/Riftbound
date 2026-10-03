import { summonCompanion, placeTotem } from "./archetypes.js";
import { recoveredCooldown } from "./skill-recovery.js";

// Shared combat and presentation data for all 24 permanent class transformations.
const kit = (palette, passive, traits, interval, abilities) => ({
  palette,
  passive,
  traits,
  interval,
  abilities,
});
export const CLASS_FORMS = {
  cinder: kit(
    ["#ce633f", "#ffd17b"],
    "Phoenix fire",
    [
      "Eruptions leave burning ground.",
      "Solar eruptions also launch piercing fire.",
    ],
    [5, 3.5],
    [
      "Piercing inferno lances and a larger burning field.",
      "Phoenix nova, sustained fire and a full heat surge.",
    ],
  ),
  briar: kit(
    ["#4b9964", "#b5e6a2"],
    "Living roots",
    [
      "Combat grows a guardian seed and rooting burst.",
      "Two guardian seeds, wider roots and stronger wards.",
    ],
    [8, 5],
    [
      "A sanctuary of attacking seedlings and protective roots.",
      "Worldroot bloom raises a grove and restores a great ward.",
    ],
  ),
  nyx: kit(
    ["#8861b6", "#c6b4f4"],
    "Veil echoes",
    [
      "Combat summons a shadow and piercing daggers.",
      "Twin shadows and a wider volley of void daggers.",
    ],
    [7, 4.5],
    [
      "Blink to prey, release a piercing fan and leave an echo.",
      "Total eclipse fills the arena with daggers and shadows.",
    ],
  ),
  volta: kit(
    ["#3d9eaf", "#b7efff"],
    "Storm circuit",
    [
      "Recurring lightning chains strike six enemies.",
      "Faster ten-target chains replenish an electric ward.",
    ],
    [5, 3.5],
    [
      "A long-range chain tempest strikes up to twelve foes.",
      "A violent storm vortex draws in lesser foes and pulses lightning.",
    ],
  ),
  rook: kit(
    ["#ae9160", "#e9d5a1"],
    "Titan stride",
    [
      "Combat triggers runic shockwaves and a small ward.",
      "Larger fault waves restore stronger wards.",
    ],
    [7, 5],
    [
      "A broad fault-line smash and piercing stone barrage.",
      "Mountain's verdict crushes a wide area and fortifies the colossus.",
    ],
  ),
  lumen: kit(
    ["#769cce", "#dbedff"],
    "Astral quiver",
    [
      "Automatic piercing moon volleys strike nearby prey.",
      "Faster star volleys fire twelve piercing arrows.",
    ],
    [6, 4],
    [
      "Crescent rain fires a piercing fan and a moon field.",
      "Astral barrage unleashes a star ring and sustained moonfire.",
    ],
  ),
  vesper: kit(
    ["#7f4bad", "#b2ec83"],
    "Demon court",
    [
      "A second permanent imp and recurring soul ruptures.",
      "Three permanent imps; wider, faster ruptures support the court.",
    ],
    [6, 4],
    [
      "Soul rupture blasts cursed prey and empowers your demons.",
      "An empowered infernal retinue joins your permanent demon court.",
    ],
  ),
  fen: kit(
    ["#668847", "#d8c894"],
    "Primal bond",
    [
      "A second permanent wolf and recurring pack cleaves.",
      "Three permanent wolves; faster cleaves mark the whole pack's prey.",
    ],
    [6, 4],
    [
      "Mark nearby prey, strike together and unleash pack frenzy.",
      "Primal pack summons empowered wolves for a sustained hunt.",
    ],
  ),
  solace: kit(
    ["#d7b77a", "#fff1c6"],
    "Dawn chorus",
    [
      "Radiant combat pulses heal and shield when they hit.",
      "Wider dawn pulses restore stronger healing and wards.",
    ],
    [7, 5],
    [
      "Piercing holy procession heals and raises a radiant ward.",
      "Daybreak blasts the arena, heals heavily and leaves a sanctuary.",
    ],
  ),
  orin: kit(
    ["#469c94", "#a2e6e4"],
    "Ancestral council",
    [
      "A permanent elemental; combat renews totems and spirit arcs.",
      "Two permanent elementals and a stronger, faster spirit council.",
    ],
    [8, 5],
    [
      "Thunder communion renews totems and strikes nearby enemies.",
      "All three primal totems awaken with an empowered elemental council.",
    ],
  ),
  kestrel: kit(
    ["#459f8a", "#b6edcf"],
    "Jade rhythm",
    [
      "Recurring palm barrages refill qi and open serenity.",
      "Wider, faster heavenly flurries prolong serenity.",
    ],
    [6, 4],
    [
      "A powerful flurry opens serenity and releases piercing palms.",
      "A celestial crane joins a sweeping jade tempest.",
    ],
  ),
  morrow: kit(
    ["#557ca5", "#c0e6ff"],
    "Grave dominion",
    [
      "A permanent ghoul; combat spreads a chilling grave pulse.",
      "Two permanent ghouls and wider sovereign plague pulses.",
    ],
    [7, 4.5],
    [
      "Plague march spreads rime, strikes and raises a ghoul.",
      "An empowered grave legion advances through a lasting plague field.",
    ],
  ),
};
export function formBonuses(stage) {
  return stage === 2
    ? {
        weapon: 0.55,
        skill: 0.75,
        health: 0.4,
        haste: 0.2,
        defense: 0.14,
        companion: 0.55,
      }
    : stage === 1
      ? {
          weapon: 0.25,
          skill: 0.35,
          health: 0.2,
          haste: 0.1,
          defense: 0.08,
          companion: 0.25,
        }
      : { weapon: 0, skill: 0, health: 0, haste: 0, defense: 0, companion: 0 };
}
export function formDescription(hero, stage) {
  if (!stage) return "Original class";
  const b = formBonuses(stage),
    f = CLASS_FORMS[hero];
  return `+${Math.round(b.weapon * 100)}% weapons · +${Math.round(b.skill * 100)}% skills · +${Math.round(b.health * 100)}% health · +${Math.round(b.haste * 100)}% attack speed · ${Math.round(b.defense * 100)}% damage reduction. ${f.traits[stage - 1]} Every ${f.interval[stage - 1]}s base in combat; recovery buffs apply. R: +20% all damage for 8s.${stage === 2 ? " F: +35% all damage for 12s." : ""}`;
}
export function refreshClassForm(g) {
  g.formState ??= {
    stage: -1,
    pulse: 2,
    surge: 0,
    surgePower: 0,
    surges: [0, 0],
  };
  const stage = g.journey.stage;
  if (!g.classState || g.formState.stage === stage) return;
  const previous = g.formState.stage;
  g.formState.stage = stage;
  g.formState.pulse = Math.min(g.formState.pulse, 2);
  const wanted = {
    vesper: ["imp", stage + 1],
    fen: ["wolf", stage + 1],
    orin: ["elemental", stage],
    morrow: ["ghoul", stage],
  }[g.hero.id];
  if (stage && wanted) {
    const [kind, count] = wanted;
    for (
      let i = g.companions.filter((c) => c.kind === kind && c.permanent).length;
      i < count;
      i++
    ) {
      const impCap =
        kind === "imp" &&
        g.companions.filter((c) => c.kind === "imp" && c.hp > 0).length >= 5;
      if (g.companions.length >= 8 || impCap) {
        // A newly earned permanent companion replaces an expiring summon, never another permanent pet.
        const temporary = g.companions.findIndex(
          (c) => !c.permanent && (!impCap || c.kind === "imp"),
        );
        if (temporary < 0) break;
        g.companions.splice(temporary, 1);
      }
      if (!summonCompanion(g, kind, Infinity, true)) break;
    }
  }
  if (stage > previous && previous >= 0) {
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + g.p.maxHp * 0.2);
    g.effect("skillburst", g.p.x, g.p.y, {
      hero: g.hero.id,
      tier: 3,
      motif: "ascension",
      r: 190,
      color: CLASS_FORMS[g.hero.id].palette[stage - 1],
      duration: 1.8,
    });
    g.event("CLASS TRANSFORMED", 1);
  }
}
export function empowerForm(g, slot) {
  const s = g.formState;
  s.surges[slot] = Math.max(s.surges[slot], slot ? 12 : 8);
  s.surge = Math.max(...s.surges);
  s.surgePower = s.surges[1] > 0 ? 0.35 : 0.2;
  g.p.skillCd = Math.max(0, g.p.skillCd - (slot ? 4 : 2));
}
export function updateClassForm(g, dt) {
  if (g.state !== "playing") return;
  refreshClassForm(g);
  const s = g.formState,
    stage = g.journey.stage;
  s.surges = s.surges.map((time) => Math.max(0, time - dt));
  s.surge = Math.max(...s.surges);
  s.surgePower = s.surges[1] > 0 ? 0.35 : s.surges[0] > 0 ? 0.2 : 0;
  if (!stage) return;
  s.pulse = Math.max(0, s.pulse - dt);
  const p = g.p,
    target = g.nearest(p.x, p.y, 650);
  if (s.pulse || !target) return;
  const id = g.hero.id,
    f = CLASS_FORMS[id],
    power = g.weaponPower("signature"),
    r = (stage === 2 ? 235 : 175) * g.areaScale,
    angle = Math.atan2(target.y - p.y, target.x - p.x),
    hit = (e, amount, knock = 0) =>
      g.hit(e, amount * power, knock, "transformation", "transformation"),
    burst = (x, y, radius, amount) => {
      for (const e of [...g.enemies])
        if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < radius + e.r)
          hit(e, amount, 10);
      g.effect("ring", x, y, {
        r: radius,
        color: f.palette[stage - 1],
        duration: 0.5,
      });
    },
    volley = (source, count, amount) => {
      for (let i = 0; i < count; i++)
        g.projectile(
          p.x,
          p.y,
          angle + (i - (count - 1) / 2) * 0.1,
          amount * power,
          source,
          {
            source: "transformation",
            channel: "transformation",
            pierce: stage === 2 ? 5 : 3,
          },
        );
    },
    ward = (amount) => {
      p.shield = Math.min(90, p.shield + amount);
    };
  s.pulse = recoveredCooldown(
    g,
    f.interval[stage - 1],
    f.interval[stage - 1] / 2,
  );
  if (id === "cinder") {
    burst(target.x, target.y, r, 48 + stage * 18);
    g.zones.push({
      x: target.x,
      y: target.y,
      r: r * 0.7,
      damage: (16 + stage * 6) * power,
      kind: "fire",
      life: 3,
      tick: 0,
      channel: "transformation",
    });
    if (stage === 2) volley("ember", 5, 32);
  } else if (id === "briar") {
    for (let i = 0; i < stage; i++)
      g.plant(
        p.x + Math.cos(angle + i * 2.4) * 90,
        p.y + Math.sin(angle + i * 2.4) * 90,
      );
    burst(target.x, target.y, r, 44 + stage * 16);
    for (const e of g.enemies)
      if (
        !e.reaper &&
        !e.boss &&
        Math.hypot(e.x - target.x, e.y - target.y) < r
      )
        e.stun = Math.max(e.stun || 0, 1 + stage * 0.3);
    ward(stage === 2 ? 10 : 6);
  } else if (id === "nyx") {
    const available = Math.min(
      stage,
      3 - g.shadows.filter((shadow) => shadow.life > 0).length,
    );
    for (let i = 0; i < available; i++)
      g.shadows.push({ x: p.x + (i ? 45 : -45), y: p.y, life: 5, attack: 0 });
    g.shadows = g.shadows.slice(-3);
    volley("knife", stage === 2 ? 9 : 5, 38 + stage * 12);
  } else if (id === "volta" || id === "orin") {
    const targets = g.enemies
      .filter((e) => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 650)
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )
      .slice(0, stage === 2 ? 10 : 6);
    let from = p;
    for (const e of targets) {
      g.effect("arc", from.x, from.y, {
        tx: e.x,
        ty: e.y,
        color: f.palette[stage - 1],
      });
      hit(e, 48 + stage * 18);
      from = e;
    }
    if (id === "orin") placeTotem(g);
    else if (stage === 2) ward(8);
  } else if (id === "rook") {
    burst(p.x, p.y, r * 1.35, 80 + stage * 25);
    ward(stage === 2 ? 12 : 7);
    p.trait = Math.min(1, p.trait + 0.3);
  } else if (id === "lumen") {
    volley("arrow", stage === 2 ? 12 : 8, 35 + stage * 12);
  } else if (id === "vesper") {
    burst(target.x, target.y, r, 70 + stage * 24);
  } else if (id === "fen") {
    for (const wolf of g.companions.filter(
      (c) => c.kind === "wolf" && c.hp > 0,
    ))
      burst(wolf.x, wolf.y, r, 40 + stage * 16);
    for (const e of g.enemies)
      if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 550)
        e.markUntil = Math.max(e.markUntil || 0, g.time + 6);
  } else if (id === "solace") {
    const landed = g.enemies.some(
      (e) =>
        e.hp > 0 &&
        !e.reaper &&
        Math.hypot(e.x - p.x, e.y - p.y) < r * 1.5 + e.r,
    );
    burst(p.x, p.y, r * 1.5, 62 + stage * 20);
    // Healing requires a landed pulse; distant prey cannot generate free recovery.
    if (landed) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (stage === 2 ? 0.05 : 0.03));
      ward(stage === 2 ? 12 : 8);
    }
  } else if (id === "kestrel") {
    volley("fist", stage === 2 ? 9 : 5, 48 + stage * 16);
    burst(p.x, p.y, r, 58 + stage * 20);
    g.classState.serenity = Math.max(
      g.classState.serenity,
      stage === 2 ? 3 : 2,
    );
    p.trait = Math.min(1, p.trait + 0.25);
  } else if (id === "morrow") {
    burst(target.x, target.y, r * 1.2, 65 + stage * 22);
    for (const e of g.enemies)
      if (
        e.hp > 0 &&
        !e.reaper &&
        Math.hypot(e.x - target.x, e.y - target.y) < r * 1.2
      ) {
        e.hexTime = Math.max(e.hexTime || 0, 4);
        e.hexDamage = Math.max(e.hexDamage || 0, 16 + stage * 8);
        e.slow = Math.max(e.slow || 0, 2);
      }
  }
}
