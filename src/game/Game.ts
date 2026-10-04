import type {
  Hero,
  Save,
  Player,
  Vec2,
  Enemy,
  Projectile,
  CombatEffect,
  Zone,
  Companion,
  Journey,
  SpellField,
  ActiveUltimate,
  Plant,
} from "./types.ts";
import {
  MOTION,
  aimAt,
  startAction,
  advanceMotion,
} from "./combat/combat-motion.ts";
import {
  initArchetype,
  archetypeHit,
  archetypeKill,
  companionImpact,
  companionTarget,
  hurtCompanion,
} from "./combat/archetypes.ts";
import {
  initJourney,
  updateJourney,
  skillBonus,
  castFormSkill,
  ascendedHit,
  ascendedActive,
} from "./progression/journey.ts";
import { classTalentBonuses } from "./progression/class-talents.ts";
import { formBonuses, refreshClassForm } from "./combat/class-forms.ts";
import { recoverSkills } from "./combat/skill-recovery.ts";

import {
  initSpellCombat,
  castEquippedSpell,
  updateSpellCombat,
  spellContact,
} from "./combat/spell-combat.ts";
import {
  initTalentCombat,
  refreshTalentCombat,
  talentHit,
  talentDash,
  talentHurt,
  talentSkill,
  updateTalentCombat,
} from "./combat/talent-combat.ts";
import {
  heroUnlocked,
  championStats,
  championUpdate,
  championAttack,
  championSkill,
} from "./combat/champions.ts";
import {
  ARTIFACTS,
  artifactRank,
  initExpedition,
  beginVault,
  claimArtifact,
  updateExpedition,
  salvageArtifact,
} from "./world/reliquary.ts";
import {
  rankPotency,
  researchRank,
  researchBonus,
} from "./progression/ascension.ts";
import {
  initRealm,
  updateRealm,
  worldPoint,
  constrain,
  legacyBonus,
} from "./world/realms.ts";
import {
  upgradeFits,
  evolve,
  evolvedKill,
  evolvedSkill,
  evolvedDash,
  updateEvolutions,
} from "./progression/evolutions.ts";
import {
  forgeBonus,
  TALENT_NODES,
  talentLock,
  talentCost,
  CODEX,
  equippedPages,
  masteryLevel,
  activeSynergies,
  SHRINE_BOONS,
} from "./progression/progression.ts";
import { HEROES, UPGRADES, EVOLUTIONS } from "./data/catalog.ts";
import { freshSave } from "./save.ts";
import { TAU, clamp, distance } from "./math.ts";
export function pressure(t: number) {
  const m = Math.max(0, t) / 60;
  const late = Math.max(0, m - 6);
  return {
    hp: Math.pow(1.34, m) * Math.pow(1.72, late),
    damage: Math.pow(1.12, m) * Math.pow(1.36, late),
    spawn: Math.min(15, 1.45 * Math.pow(1.23, m)),
    speed: Math.min(2.1, 1 + m * 0.05 + late * 0.04),
    elite: Math.min(0.32, 0.025 + m * 0.025),
  };
}
export class Game {
  declare actionSerial: number;
  declare companions: Companion[];
  declare totems: Array<
    Vec2 & {
      kind: string;
      power: number;
      formEmpoweredUntil: number;
      life: number;
      tick: number;
      r: number;
      spellPower?: number;
    }
  >;
  declare classState: Record<string, number>;
  declare formCooldowns: number[];
  declare formState: {
    stage: number;
    pulse: number;
    surge: number;
    surgePower: number;
    surges: number[];
  };
  declare journey: Journey;
  declare catalysts: Array<
    Vec2 & { id: string; kind: string; expires: number; guarded?: boolean }
  >;
  declare foundCatalysts: Record<string, number>;
  declare nextCatalyst: number;
  declare catalystSerial: number;
  declare ascensionProcs: Record<string, number>;
  declare waypoint: (Vec2 & { id?: string }) | null;
  declare pitySpawned: boolean;
  declare journeyBanked: boolean;
  declare classXpEarned: number;
  declare trainingEarned: number;
  declare classLevelsEarned: number;
  declare realm: ReturnType<typeof import("./world/realms.ts").realmById>;
  declare finds: Array<
    Vec2 & {
      id: string;
      kind: string;
      taken: boolean;
      remembered: boolean;
      guarded?: boolean;
    }
  >;
  declare foundMemories: string[];
  declare explored: Set<string>;
  declare exploration: Record<string, number>;
  declare findsCollected: number;
  declare evolutionSeals: number;
  declare nextReaper: number;
  declare reaperWave: number;
  declare doomWarned: boolean;
  declare spellSlotCount: number;
  declare spellLoadout: string[];
  declare spellCooldowns: Record<string, number>;
  declare spellState: {
    fields: SpellField[];
    guard: number;
    guardLife: number;
    rewardAt: Record<string, number>;
    move: {
      id: string;
      from: Vec2;
      to: Vec2;
      age: number;
      seconds: number;
      power: number;
      radius: number;
    } | null;
  };
  declare talentState: {
    hits: Record<string, number>;
    gates: Record<string, number>;
    fields: Array<
      Vec2 & { id: string; life: number; tick: number; rank: number }
    >;
    cooldown: number;
    ultimate: ActiveUltimate | null;
    procs: Record<
      string,
      Array<{
        node: (typeof import("./progression/class-talents.ts").CLASS_NODES)[string];
        rank: number;
      }>
    >;
  };
  declare contractBanked: boolean;
  declare artifacts: Record<string, number>;
  declare vault:
    | (Vec2 & {
        state: string;
        life: number;
        progress: number;
        remaining?: number;
        wave?: number;
      })
    | null;
  declare nextVault: number;
  declare vaultsCleared: number;
  declare artifactChoices: typeof ARTIFACTS;
  declare contract: ReturnType<
    typeof import("./world/reliquary.ts").contractFor
  >;
  declare contractReady: boolean;
  declare sunTimer: number;
  declare masteryEarned: number;
  declare discoveries: typeof CODEX;
  declare heroUnlocks: Hero[];
  declare hero: Hero;
  declare unlockedAtStart: string[];
  declare save: Save;
  declare random: () => number;
  declare oath: number;
  declare pages: string[];
  declare talentPoints: number;
  declare shards: number;
  declare bossesKilled: number;
  declare elitesKilled: number;
  declare caches: number;
  declare enemyKills: Record<string, number>;
  declare banished: string[];
  declare banishes: number;
  declare revives: number;
  declare reborn: boolean;
  declare boons: {
    damage: number;
    health: number;
    xp: number;
    enemyHp: number;
  };
  declare hazards: Array<Vec2 & { r: number; warn: number; life: number }>;
  declare zones: Zone[];
  declare shadows: Array<
    Vec2 & {
      life: number;
      attack: number;
      spellPower?: number;
      spellId?: string;
      spellRate?: number;
    }
  >;
  declare shrines: Array<Vec2 & { used: boolean; kind?: string }>;
  declare nextShrine: number;
  declare nextHazard: number;
  declare extraTimers: Record<string, number>;
  declare afterDash: number;
  declare biome: number;
  declare synergyIds: string[];
  declare time: number;
  declare level: number;
  declare xp: number;
  declare pendingLevels: number;
  declare kills: number;
  declare embers: number;
  declare state: string;
  declare banked: boolean;
  declare ranks: Record<string, number>;
  declare evolutions: Record<string, string>;
  declare evolutionProc: number;
  declare evolutionTimer: number;
  declare legacy: {
    count: number;
    weapon: number;
    skill: number;
    health: number;
  };
  declare enemies: Enemy[];
  declare bullets: Projectile[];
  declare hostile: Array<
    Vec2 & { vx: number; vy: number; life: number; r: number; damage: number }
  >;
  declare pickups: Array<
    Vec2 & {
      kind: string;
      value: number;
      phase?: number;
      magnet?: boolean;
      taken?: boolean;
    }
  >;
  declare effects: CombatEffect[];
  declare plants: Plant[];
  declare events: Array<{
    type: string;
    text?: string;
    priority?: number;
    hero?: string;
    tier?: number;
  }>;
  declare p: Player;
  declare attackTimer: number;
  declare spawnTimer: number;
  declare novaTimer: number;
  declare wispTimer: number;
  declare orbitTimer: number;
  declare nextBoss: number;
  declare nextCache: number;
  declare bossCount: number;
  declare uid: number;
  declare arcCount: number;
  declare night: number;
  declare combo: number;
  declare lastKill: number;
  declare shake: number;
  declare rerolls: number;
  declare stats: { damage: number; dashes: number; skills: number };
  declare damageSources: Record<string, number>;
  declare pendingSkill: { remaining: number } | null;
  declare trailTimer: number;
  declare offered: string[] | null;
  declare damage: number;
  declare attackSpeed: number;
  declare moveSpeed: number;
  declare pickupRange: number;
  declare xpMultiplier: number;
  declare damageReduction: number;
  declare dashCooldown: number;
  declare critChance: number;
  declare critDamage: number;
  declare areaScale: number;
  declare durationScale: number;
  declare skillRecoveryScale: number;
  declare skillPower: number;
  declare classBonuses: Record<string, number>;
  declare skillCooldown: number;
  declare baseAttackSpeed: number;
  declare lastImpactSound: number;
  declare pendingForm: { remaining: number; slot: number } | null;
  declare pendingSpell: {
    remaining: number;
    slot: number;
    id: string;
    angle?: number;
  } | null;
  declare dashHaste: number;
  declare damageContext: string | null;
  declare currentShrine: Vec2 & { used: boolean };
  declare shrineChoices: typeof SHRINE_BOONS;
  declare moving: boolean;
  declare lastGardenSound: number;
  constructor(heroId: string, save: Save = freshSave(), random = Math.random) {
    this.hero = HEROES.find((h) => h.id === heroId) || HEROES[0];
    if (!heroUnlocked(save, this.hero.id))
      throw new Error("Outcast is still locked");
    this.unlockedAtStart = HEROES.filter((h) => heroUnlocked(save, h.id)).map(
      (h) => h.id,
    );
    this.save = save;
    this.random = random;
    this.oath = clamp(save.oath || 0, 0, save.maxOath || 0);
    this.pages = equippedPages(save, this.hero.id);
    this.talentPoints = forgeBonus("attunement", save.forge.attunement);
    this.shards = 0;
    this.bossesKilled = 0;
    this.elitesKilled = 0;
    this.caches = 0;
    this.enemyKills = {};
    this.banished = [];
    this.banishes = forgeBonus("banishment", save.forge.banishment);
    this.revives = forgeBonus("reprieve", save.forge.reprieve);
    this.reborn = false;
    this.boons = { damage: 0, health: 0, xp: 0, enemyHp: 0 };
    this.hazards = [];
    this.zones = [];
    this.shadows = [];
    this.shrines = [];
    this.nextShrine = 42;
    this.nextHazard = 48;
    this.extraTimers = { frost: 2, meteor: 2, scythe: 2, solar: 2 };
    this.afterDash = 0;
    this.biome = 0;
    this.synergyIds = [];
    this.time = 0;
    this.level = 1;
    this.xp = 0;
    this.pendingLevels = 0;
    this.kills = 0;
    this.embers = 0;
    this.state = "playing";
    this.banked = false;
    this.ranks = { signature: 1 };
    this.evolutions = {};
    this.evolutionProc = 0;
    this.evolutionTimer = 3;
    initRealm(this);
    this.legacy = legacyBonus(save, this.hero.id);
    if (this.hasPage("astral")) this.ranks.orbit = 1;
    if (masteryLevel(save.mastery[this.hero.id] || 0) >= 3) {
      const affinity = save.affinities[this.hero.id] || this.hero.talentIds[0];
      if (this.hero.talentIds.includes(affinity)) this.ranks[affinity] = 1;
    }
    this.enemies = [];
    this.bullets = [];
    this.hostile = [];
    this.pickups = [];
    this.effects = [];
    this.plants = [];
    this.events = [];
    this.p = {
      x: 0,
      y: 0,
      hp: 0,
      maxHp: 0,
      shield: 0,
      dx: 1,
      dy: 0,
      invuln: 1,
      dashTime: 0,
      dashCd: 0,
      skillCd: 0,
      trait: 0,
      cast: 0,
      recoil: 0,
      hurtFlash: 0,
      walkDistance: 0,
    };
    this.attackTimer = 0.25;
    this.spawnTimer = 0.2;
    this.novaTimer = 3;
    this.wispTimer = 1;
    this.orbitTimer = 0;
    this.nextBoss = 70;
    this.nextCache = 32;
    this.bossCount = 0;
    this.uid = 0;
    this.arcCount = 0;
    this.night = 1;
    this.combo = 0;
    this.lastKill = -10;
    this.shake = 0;
    this.rerolls =
      2 +
      forgeBonus("reserves", save.forge.reserves) +
      (this.hasPage("alchemist") ? 1 : 0);
    if (masteryLevel(save.mastery[this.hero.id] || 0) >= 5) this.rerolls++;
    initJourney(this);
    this.stats = { damage: 0, dashes: 0, skills: 0 };
    this.damageSources = {};
    this.pendingSkill = null;
    this.trailTimer = 0;
    initExpedition(this);
    this.recalculate();
    this.p.hp = this.p.maxHp;
    this.p.shield =
      forgeBonus("ward", save.forge.ward) +
      (this.hasPage("guardian") ? 18 : 0) +
      (this.classBonuses.shield || 0);
    if (this.hero.id === "rook")
      this.p.shield += 12 + (this.hasPage("gildedguard") ? 6 : 0);
    this.events.push({
      type: "announce",
      text: "NIGHT I",
    });
    for (let i = 0; i < 5; i++) this.spawnEnemy("crawler", 340 + i * 30);
    if (this.hero.id === "briar") this.plant(0, 35);
    initArchetype(this);
    refreshClassForm(this);
    initTalentCombat(this);
    initSpellCombat(this);
  }
  isState(state: string): boolean {
    return this.state === state;
  }
  rank(id: string) {
    return this.ranks[id] || 0;
  }
  artifact(id: string) {
    return artifactRank(this, id);
  }
  claimArtifact(id: string) {
    return claimArtifact(this, id);
  }
  salvageArtifact() {
    return salvageArtifact(this);
  }
  nearbyVault() {
    return this.vault?.state === "waiting" && distance(this.p, this.vault) < 95
      ? this.vault
      : null;
  }
  research(id: string) {
    return researchRank(this.save, this.hero.id, id);
  }
  weaponPower(id: string) {
    return (
      rankPotency(this.rank(id)) *
      (1 +
        researchBonus(
          this.research(id === "signature" ? "weapon" : "relic"),
          id === "signature" ? "weapon" : "relic",
        )) *
      (this.evolutions[id] ? 1.18 : 1) *
      (1 + legacyBonus(this.save, this.hero.id).weapon) *
      skillBonus(this.journey, id) *
      (1 + (this.classBonuses?.weapon || 0)) *
      (1 + formBonuses(this.journey.stage).weapon)
    );
  }
  hasPage(id: string) {
    return this.pages.includes(id);
  }
  hasSynergy(id: string) {
    return activeSynergies(this).some((s) => s.id === id);
  }
  spendTalent(id: string) {
    if (
      !["playing", "paused", "levelup"].includes(this.state) ||
      talentLock(this, id)
    )
      return false;
    this.talentPoints -= talentCost(this, id);
    this.ranks[id] = (this.ranks[id] || 0) + 1;
    this.recalculate();
    this.event(`TALENT AWAKENED · ${TALENT_NODES[id].name}`);
    return true;
  }
  spendResonance() {
    if (
      !["playing", "paused", "levelup"].includes(this.state) ||
      this.level < 20 ||
      this.talentPoints < 1
    )
      return false;
    this.talentPoints--;
    this.ranks.ascendance = this.rank("ascendance") + 1;
    this.recalculate();
    return true;
  }
  banish(id: string) {
    if (
      this.state !== "levelup" ||
      !this.offered?.includes(id) ||
      this.banishes <= 0 ||
      id === "signature"
    )
      return false;
    this.banishes--;
    this.banished.push(id);
    this.offered = null;
    this.choices();
    return true;
  }
  evolve(id: string) {
    return evolve(this, id);
  }
  recalculate() {
    refreshTalentCombat(this);
    const p = this.p,
      r = (id: string) => this.rank(id),
      f = this.save.forge;
    p.maxHp =
      this.hero.hp * (1 + forgeBonus("vigor", f.vigor)) +
      r("vitality") * 10 +
      legacyBonus(this.save, this.hero.id).health;
    this.damage =
      (1 + r("power") * 0.08) *
      (1 + forgeBonus("might", f.might)) *
      (1 + this.exploration.fury * 0.08);
    this.attackSpeed =
      1 + r("haste") * 0.06 + Math.floor(r("signature") / 10) * 0.06;
    this.moveSpeed =
      this.hero.speed * (1 + 0.65 * (1 - Math.exp(-r("speed") * 0.1)));
    this.moveSpeed *= 1 + this.exploration.reach * 0.06;
    this.pickupRange = 95 + r("magnet") * 22 + this.exploration.reach * 25;
    this.xpMultiplier =
      1 + r("magnet") * 0.025 + forgeBonus("wisdom", f.wisdom);
    this.damageReduction = 1 / (1 + r("armor") * 0.13);
    this.dashCooldown =
      ((this.hero.id === "nyx" ? 2.5 : 3.8) *
        (1 - forgeBonus("agility", f.agility))) /
      (1 + r("ghostwalk") * 0.18);
    if (this.hero.id === "nyx" && this.legacy.count >= 12)
      this.dashCooldown *= 0.92;
    p.maxHp *= Math.max(
      0.35,
      1 -
        this.boons.health -
        (this.hasPage("scholar") ? 0.08 : 0) -
        (this.hasPage("nightglass") ? 0.15 : 0) -
        (this.hasPage("bloodroot") ? 0.1 : 0) -
        (this.hasPage("defiant") ? 0.1 : 0),
    );
    this.damage *= (1 + this.boons.damage) * (1 + r("ascendance") * 0.03);
    this.attackSpeed *= 1 + forgeBonus("haste", f.haste);
    if (this.hasPage("hunter")) this.attackSpeed *= 0.95;
    this.moveSpeed *= 1 + forgeBonus("stride", f.stride);
    if (this.hasPage("furnace")) this.moveSpeed *= 0.92;
    this.pickupRange +=
      forgeBonus("reach", f.reach) + (this.hasPage("pilgrim") ? 20 : 0);
    this.xpMultiplier +=
      this.boons.xp +
      (this.hasPage("scholar") ? 0.12 : 0) +
      researchBonus(this.research("insight"), "insight");
    this.damageReduction *= 1 - forgeBonus("plating", f.plating);
    this.critChance = Math.min(
      0.65,
      0.04 +
        forgeBonus("precision", f.precision) +
        r("precision") * 0.03 +
        (this.hasPage("nightglass") ? 0.15 : 0),
    );
    this.critDamage = 1.6 + forgeBonus("brutality", f.brutality);
    if (masteryLevel(this.save.mastery[this.hero.id] || 0) >= 12)
      this.critChance = Math.min(0.65, this.critChance + 0.03);
    this.areaScale = 1 + forgeBonus("blast", f.blast);
    this.durationScale = 1 + forgeBonus("longevity", f.longevity);
    this.areaScale *= 1 + 0.7 * (1 - Math.exp(-r("breadth") * 0.07));
    this.durationScale *= 1 + (1 - Math.exp(-r("endurance") * 0.07));
    this.skillRecoveryScale =
      ((1 - forgeBonus("focus", f.focus)) / (1 + r("focus") * 0.08)) *
      (this.hasPage("evergreen") ? 1.15 : 1);
    this.skillPower =
      (1 + r("active") * 0.14) *
      rankPotency(r("active")) *
      (1 + researchBonus(this.research("skill"), "skill")) *
      (1 + legacyBonus(this.save, this.hero.id).skill) *
      (this.evolutions.active ? 1.18 : 1);
    this.skillRecoveryScale /=
      1 + 0.025 * r("active") + this.exploration.flow * 0.08;
    if (this.hasPage("livewire")) this.dashCooldown *= 1.25;
    p.maxHp *=
      (1 + this.artifact("heart") * 0.12) * (1 - this.artifact("crown") * 0.08);
    this.damage *= 1 + this.artifact("crown") * 0.22;
    this.moveSpeed *= 1 - this.artifact("heart") * 0.03;
    this.xpMultiplier += this.artifact("grimoire") * 0.12;
    this.skillRecoveryScale /= 1 + this.artifact("hourglass") * 0.12;
    championStats(this);
    this.classBonuses = classTalentBonuses(this);
    const b = this.classBonuses,
      form = formBonuses(this.journey.stage);
    p.maxHp *= (1 + (b.health || 0)) * (1 + form.health);
    this.attackSpeed *= (1 + (b.haste || 0)) * (1 + form.haste);
    this.moveSpeed *= 1 + (b.speed || 0);
    this.damageReduction *= 1 - Math.min(0.22, b.defense || 0);
    this.damageReduction *= 1 - form.defense;
    this.critChance = Math.min(0.65, this.critChance + (b.crit || 0));
    this.critDamage += b.critDamage || 0;
    this.areaScale *= 1 + (b.area || 0);
    this.durationScale *= 1 + (b.duration || 0);
    this.dashCooldown /= 1 + (b.dash || 0);
    this.skillRecoveryScale /= 1 + (b.cooldown || 0);
    this.skillCooldown = Math.max(
      2.5,
      this.hero.cooldown * this.skillRecoveryScale,
    );
    this.skillPower *=
      skillBonus(this.journey, "active") *
      (1 + (b.skill || 0)) *
      (1 + form.skill);
    this.baseAttackSpeed = this.attackSpeed;
    this.attackSpeed *=
      1 + (this.dashHaste > 0 ? this.artifact("greaves") * 0.15 : 0);
    p.hp = Math.min(p.hp, p.maxHp);
    refreshClassForm(this);
  }
  threshold() {
    return Math.round(10 + Math.pow(this.level, 1.3) * 4.8);
  }
  evolved() {
    return (
      this.rank("signature") >= 5 || this.journey.skills.signature?.stage > 0
    );
  }
  choices() {
    const pool = [
      "signature",
      "active",
      "power",
      "haste",
      "vitality",
      "speed",
      "magnet",
      "armor",
      "recovery",
      "orbit",
      "nova",
      "familiar",
      "frost",
      "meteor",
      "scythe",
      "precision",
      "focus",
      "breadth",
      "endurance",
      "barrier",
      "fervor",
    ].filter(
      (id) =>
        !this.banished.includes(id) &&
        upgradeFits(this, id) &&
        this.rank(id) < (UPGRADES[id].max || Infinity) &&
        (id !== "signature" ||
          (this.rank(id) < 1 + Math.floor(this.level / 2) &&
            (this.rank(id) < 4 || this.level >= 9))),
    );
    const result: string[] = [];
    if (this.level % 3 === 0 && pool.includes("signature")) {
      result.push("signature");
      pool.splice(pool.indexOf("signature"), 1);
    }
    // At least one hero-specific choice at every level while that path is available.
    const unique = pool.filter(
      (id) =>
        this.hero.talentIds.includes(id) ||
        id === "signature" ||
        id === "active",
    );
    if (result.length === 0 && unique.length) {
      const id = unique[Math.floor(this.random() * unique.length)];
      result.push(id);
      pool.splice(pool.indexOf(id), 1);
    }
    while (result.length < 3 && pool.length) {
      const i = Math.floor(this.random() * pool.length);
      result.push(pool.splice(i, 1)[0]);
    }
    this.offered = result;
    return result;
  }
  upgrade(id: string) {
    if (
      this.state !== "levelup" ||
      !this.offered?.includes(id) ||
      !upgradeFits(this, id)
    )
      return false;
    this.ranks[id] = (this.ranks[id] || 0) + 1;
    this.recalculate();
    if (id === "vitality") this.p.hp = Math.min(this.p.maxHp, this.p.hp + 12);
    if (id === "barrier")
      this.p.shield = Math.max(this.p.shield, Math.min(50, this.p.shield + 8));
    this.pendingLevels--;
    this.offered = null;
    if (id === "signature" && this.rank(id) === 5)
      this.events.push({
        type: "announce",
        text: `AWAKENED · ${EVOLUTIONS[this.hero.id].name}`,
      });
    if (
      [
        "signature",
        "active",
        "orbit",
        "nova",
        "familiar",
        "frost",
        "meteor",
        "scythe",
      ].includes(id) &&
      this.rank(id) >= 20 &&
      this.rank(id) % 20 === 0
    ) {
      this.talentPoints++;
      this.event(`RANK ${this.rank(id)} · +1 run resonance`);
    }
    this.state = this.pendingLevels > 0 ? "levelup" : "playing";
    return true;
  }
  gainXp(value: number) {
    this.xp += value * this.xpMultiplier;
    while (this.xp >= this.threshold()) {
      this.xp -= this.threshold();
      this.level++;
      this.pendingLevels++;
      if (this.level % 8 === 0) this.talentPoints++;
      this.p.hp = Math.min(
        this.p.maxHp,
        this.p.hp + 4 + forgeBonus("siphon", this.save.forge.siphon),
      );
    }
    if (this.pendingLevels > 0 && this.state === "playing") {
      this.state = "levelup";
      this.events.push({ type: "levelup" });
    }
  }
  event(text: string, priority = 0) {
    this.events.push({ type: "announce", text, priority });
  }
  effect(
    type: string,
    x: number,
    y: number,
    data: Partial<CombatEffect> & { duration?: number } = {},
  ) {
    const cosmetic = [
      "impact",
      "muzzle",
      "trail",
      "afterimage",
      "number",
    ].includes(type);
    if (cosmetic && this.effects.length >= 180) return;
    this.effects.push({
      type,
      x,
      y,
      life: data.duration || 0.4,
      maxLife: data.duration || 0.4,
      cosmetic,
      ...data,
    });
    if (this.effects.length > 250) {
      const expendable = this.effects.findIndex(
        (e) => e.cosmetic || ["spark", "death", "fallen"].includes(e.type),
      );
      const fallback = this.effects.findIndex((e) => e.type !== "warning");
      this.effects.splice(
        expendable >= 0 ? expendable : fallback >= 0 ? fallback : 0,
        1,
      );
    }
  }
  nearest(
    x: number,
    y: number,
    range = 650,
    excluded?: Set<number>,
  ): Enemy | null {
    let best: Enemy | null = null,
      d = range * range;
    for (const e of this.enemies) {
      if (e.hp <= 0 || excluded?.has(e.id)) continue;
      const dd = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (dd < d) {
        d = dd;
        best = e;
      }
    }
    return best;
  }
  multiplier(e: Enemy | null | undefined) {
    let n = this.damage;
    if (this.formState?.surge > 0) n *= 1 + this.formState.surgePower;
    if (this.hero.id === "nyx") n *= 1 + this.p.trait * 0.45;
    if (this.hero.id === "cinder" && this.p.hp / this.p.maxHp < 0.35)
      n *= 1 + this.rank("phoenix") * 0.25;
    if (e && e.hp / e.maxHp < 0.4) n *= 1 + this.rank("executioner") * 0.3;
    if (e?.dotTime! > 0)
      n *= 1 + this.rank("flashpoint") * 0.12 + this.rank("hemorrhage") * 0.12;
    if (e?.slow! > 0 && this.rank("overgrowth")) n *= 1.35;
    if (e?.dotTime! > 0 && e!.slow > 0 && this.hasSynergy("steam")) n *= 1.25;
    if (this.hasPage("hunter") && (e?.elite || e?.boss)) n *= 1.18;
    if (e?.elite || e?.boss) n *= 1 + (this.classBonuses.elite || 0);
    if (e?.elite || e?.boss)
      n *= 1 + 0.6 * (1 - Math.exp(-this.rank("fervor") * 0.07));
    if (this.hasPage("defiant") && this.p.hp < this.p.maxHp * 0.5) n *= 1.2;
    if (e?.talentExposeUntil! > this.time)
      n *= 1 + Math.min(0.45, e!.talentExpose || 0);
    return n;
  }
  hit(
    e: Enemy,
    damage: number,
    knock: number = 0,
    source?: string,
    channelOverride?: string | null,
    impactAngle?: number,
  ) {
    if (e.hp <= 0) return;
    let weapon = {
      ember: "signature",
      knife: "signature",
      thorn: "signature",
      arc: "signature",
      hammer: "signature",
      stone: "signature",
      arrow: "signature",
      huntarrow: "signature",
      hex: "signature",
      holy: "signature",
      spirit: "signature",
      fist: "signature",
      runeblade: "signature",
      blade: "orbit",
      nova: "nova",
      wisp: "familiar",
      frost: "frost",
      meteor: "meteor",
      scythe: "scythe",
    }[source || ""];
    if (channelOverride === "familiar" && source === "arc") weapon = "familiar";
    damage *= weapon ? this.weaponPower(weapon) : 1;
    let amount = damage * this.multiplier(e);
    const crit =
      source &&
      this.random() <
        Math.min(
          0.75,
          this.critChance +
            (this.p.trait > 0.9 ? this.rank("deadeye") * 0.08 : 0),
        );
    if (crit)
      amount *=
        this.critDamage +
        (source === "blade" && this.rank("orbit") >= 10 ? 0.75 : 0);
    if (source === "arc" && this.random() < this.rank("resonance") * 0.12)
      amount *= 2;
    if (source === "ember" && this.hasPage("coldflame")) {
      e.slow = 1.2;
      amount *= 0.9;
    }
    if (source === "arc" && this.hasPage("stormglass")) amount *= 0.9;
    if (
      source === "knife" &&
      this.rank("reaper") &&
      !e.boss &&
      !e.reaper &&
      e.hp / e.maxHp < 0.15
    )
      amount = e.hp + 1;
    if (e.reaper) amount *= 0.08;
    e.lastWeapon = weapon || e.lastWeapon;
    const dealt = Math.min(Math.max(0, e.hp), amount);
    e.hp -= amount;
    if (source) {
      e.flash = 0.12;
      e.hitAngle = impactAngle ?? Math.atan2(e.y - this.p.y, e.x - this.p.x);
      e.impact = 0.16;
      e.impactStrength = Math.min(5, 1 + (amount / Math.max(1, e.maxHp)) * 12);
      if (source === "hammer") this.shake = Math.max(this.shake, crit ? 4 : 2);
      if (amount > 6 && this.time - (this.lastImpactSound ?? -1) >= 0.05) {
        this.lastImpactSound = this.time;
        this.events.push({ type: "impact" });
      }
      if (amount > 6)
        this.effect("impact", e.x, e.y, {
          angle: e.hitAngle,
          style: source,
          r: crit ? 24 : 14,
          color: this.hero.color,
          seed: e.id || 0,
          duration: 0.28,
        });
    }
    this.stats.damage += Math.round(dealt);
    const channel =
      channelOverride ||
      this.damageContext ||
      weapon ||
      (["artifact", "spark"].includes(source || "") ? "artifacts" : "effects");
    this.damageSources[channel] = (this.damageSources[channel] || 0) + dealt;
    if (crit && damage > 5)
      this.effect("number", e.x, e.y - 20, {
        text: Math.round(amount).toString(),
        color: "#ffe6a3",
        r: 0,
        duration: 0.65,
      });
    if (knock && !e.boss && !e.reaper) {
      const d = Math.max(1, distance(e, this.p));
      const force = knock * (1 + forgeBonus("force", this.save.forge.force));
      e.x += ((e.x - this.p.x) / d) * force;
      e.y += ((e.y - this.p.y) / d) * force;
    }
    if (source === "ember" && this.rank("afterburn")) {
      e.dot = Math.max(e.dot || 0, damage * 0.35 * this.rank("afterburn"));
      e.dotTime = 2.5 * this.durationScale;
    }
    if (source === "knife" && this.rank("bloodletter")) {
      e.dot = Math.min(
        (e.dot || 0) + damage * 0.25 * this.rank("bloodletter"),
        damage * 3,
      );
      e.dotTime = 3 * this.durationScale;
    }
    if (source === "thorn" && this.rank("venom")) {
      e.dot = Math.max(e.dot || 0, damage * 0.3 * this.rank("venom"));
      e.dotTime = 3 * this.durationScale;
    }
    if (source === "scythe" && this.hasSynergy("harvest")) {
      e.dot = Math.max(e.dot || 0, damage * 0.5);
      e.dotTime = 3;
    }
    if (
      source === "wisp" &&
      (this.hasSynergy("circuit") || this.evolutions.familiar)
    ) {
      const other = this.nearest(e.x, e.y, 160, new Set([e.id]));
      if (other) {
        this.effect("arc", e.x, e.y, {
          tx: other.x,
          ty: other.y,
          color: "#9fddd3",
        });
        this.hit(
          other,
          this.evolutions.familiar ? 20 + this.rank("familiar") * 5 : 20,
          0,
          "arc",
          "familiar",
        );
      }
    }
    if (source === "thorn" && this.rank("bramble")) e.slow = 1.1;
    archetypeHit(this, e, source || "");
    ascendedHit(this, e, weapon || "", source || "");
    talentHit(this, e, damage, Boolean(crit), channel);
    if (e.hp <= 0) this.kill(e);
  }
  kill(e: Enemy) {
    if (e.killed) return;
    e.killed = true;
    archetypeKill(this, e);
    evolvedKill(this, e);
    this.kills++;
    this.enemyKills[e.boss ? "boss" : e.type || "crawler"] =
      (this.enemyKills[e.boss ? "boss" : e.type || "crawler"] || 0) + 1;
    if (e.elite) {
      this.elitesKilled++;
      if (this.hasPage("guardian"))
        this.p.shield = Math.max(
          this.p.shield,
          Math.min(50, this.p.shield + 3),
        );
    }
    if (e.dotTime > 0) {
      const healing =
        (this.rank("feast") ? 0.8 : 0) + (this.hasSynergy("harvest") ? 0.4 : 0);
      this.p.hp = Math.min(this.p.maxHp, this.p.hp + healing);
      if (this.rank("feast")) recoverSkills(this, 0.1);
    }
    if (this.hasPage("bloodroot"))
      this.p.hp = Math.min(this.p.maxHp, this.p.hp + 0.2);
    if (e.dotTime > 0 && this.rank("combustion"))
      this.zones.push({
        x: e.x,
        y: e.y,
        r: 65,
        life: 0.1,
        tick: 0,
        damage: 45,
        kind: "explosion",
      });
    this.combo = this.time - this.lastKill < 1.8 ? this.combo + 1 : 1;
    this.lastKill = this.time;
    this.effect("fallen", e.x, e.y, {
      actor: e.boss ? "boss" : e.type || "crawler",
      r: e.r,
      duration: 0.65,
    });
    this.effect("death", e.x, e.y, {
      color: e.boss ? "#e3af72" : e.elite ? "#d98c79" : "#80928b",
      r: e.r,
    });
    const value = e.reaper ? 100 : e.boss ? 25 : e.elite ? 5 : 1;
    this.pickups.push({
      x: e.x,
      y: e.y,
      value,
      kind: "xp",
      phase: this.random() * TAU,
    });
    if (this.kills % 8 === 0 || e.elite) this.embers += e.elite ? 2 : 1;
    if (e.boss) {
      this.bossesKilled++;
      this.shards += 1 + Math.floor(this.oath / 3);
      this.talentPoints++;
      this.event("WARDEN FALLEN · +1 run resonance · rift shard recovered");
      this.embers += 18 + this.bossCount * 7;
      this.pickups.push({ x: e.x + 20, y: e.y, kind: "heart", value: 24 });
      this.pickups.push({ x: e.x, y: e.y + 20, kind: "seal", value: 1 });
      this.events.push({ type: "bosskill" });
    } else if (e.reaper) {
      this.shards += 3;
      this.embers += 100;
      this.event("REAPER SLAIN · +100 embers · +3 shards");
    } else if (this.random() < 0.016)
      this.pickups.push({ x: e.x + 8, y: e.y, kind: "heart", value: 10 });
    if (this.hero.id === "briar" && this.kills % 10 === 0) this.plant(e.x, e.y);
    if (this.hero.id === "rook" && this.kills % 5 === 0)
      this.p.shield = Math.min(
        60,
        this.p.shield + Math.min(16, 2 + this.rank("bulwark") * 2),
      );
    if (this.combo === 25 || this.combo === 60)
      this.events.push({ type: "combo", text: `${this.combo} CHAIN` });
    while (this.pickups.length > 260) {
      const firstXp = this.pickups.findIndex((d) => d.kind === "xp");
      const oldest =
        firstXp >= 0
          ? this.pickups.splice(firstXp, 1)[0]
          : this.pickups.shift();
      if (oldest!.kind === "xp") {
        const into = this.pickups.find((d) => d.kind === "xp");
        if (into) into.value += oldest!.value;
      }
    }
  }
  plant(x: number, y: number) {
    this.plants.push({
      x,
      y,
      life:
        (16 +
          this.rank("roots") * 6 +
          (this.hero.id === "briar" && this.legacy.count >= 4 ? 3 : 0)) *
        this.durationScale *
        (this.hasPage("evergreen") ? 1.35 : 1),
      attack: 0.1,
      phase: this.random() * TAU,
    });
    if (this.plants.length > (this.rank("grove") ? 18 : 12))
      this.plants.shift();
    this.effect("ring", x, y, { r: 40, color: "#a9c98d" });
  }
  hurt(amount: number, reaper = false) {
    if (this.p.invuln > 0 || this.state !== "playing") return;
    let damage = amount * this.damageReduction;
    if (!reaper && this.talentState?.ultimate?.guard)
      damage *= 1 - this.talentState.ultimate.guard;
    if (!reaper && this.spellState?.guardLife > 0)
      damage *= 1 - this.spellState.guard;
    if (this.hero.id === "rook") {
      if (this.p.shield > 0) damage /= 1 + this.rank("bastion") * 0.1;
      this.p.trait = Math.min(
        1,
        this.p.trait + 0.04 * this.rank("retaliation"),
      );
    }
    if (this.plants.some((s) => distance(s, this.p) < 150))
      damage /= 1 + this.rank("barkskin") * 0.125;
    if (this.p.shield > 0) damage /= 1 + this.rank("insulation") * 0.125;
    if (this.hero.id === "cinder" && this.p.hp / this.p.maxHp < 0.35)
      damage /= 1 + this.rank("phoenix") * 0.25;
    const shield = Math.min(this.p.shield, damage);
    this.p.shield -= shield;
    damage -= shield;
    this.p.hp = Math.max(0, this.p.hp - damage);
    this.p.invuln = 0.65;
    this.p.hurtFlash = 0.25;
    this.shake = 7;
    this.effect("hurt", this.p.x, this.p.y, { r: 30, color: "#df7966" });
    this.events.push({ type: "hurt" });
    talentHurt(this, reaper);
    if (this.p.hp <= 0) {
      if (this.rank("rebirth") && !this.reborn) {
        this.reborn = true;
        this.p.hp = this.p.maxHp * 0.45;
        this.p.invuln = 3;
        this.p.skillCd = 0;
        this.pendingSkill = null;
        this.pendingForm = null;
        this.pendingSpell = null;
        this.spellState.move = null;
        this.skill();
        this.event("REBIRTH · THE FLAME REFUSES");
        return;
      }
      if (this.revives > 0) {
        this.pendingSkill = this.pendingForm = this.pendingSpell = null;
        this.spellState.move = null;
        this.revives--;
        this.p.hp = this.p.maxHp * 0.35;
        this.p.invuln = 3;
        this.event("LAST CANDLE · ONE MORE CHANCE");
        return;
      }
      this.state = "dead";
      this.pendingSkill = null;
      this.pendingForm = null;
      this.pendingSpell = null;
      this.spellState.move = null;
      this.p.action = null;
      this.events.push({ type: "dead" });
    }
  }
  dash() {
    if (this.state !== "playing" || this.p.dashCd > 0) return false;
    this.p.dashTime = 0.19;
    this.p.invuln = Math.max(this.p.invuln, 0.34);
    this.p.dashCd = this.dashCooldown;
    this.stats.dashes++;
    if (this.hero.id === "rook" && this.hasPage("stonewake"))
      this.p.trait = Math.min(1, this.p.trait + 0.12);
    if (this.hero.id === "lumen" && this.hasPage("moonescape")) {
      this.p.trait = Math.min(1, this.p.trait + 0.08);
      for (const e of this.enemies)
        if (!e.reaper && distance(e, this.p) < 140) e.slow = 1;
    }
    evolvedDash(this);
    if (this.hero.id === "cinder" && this.legacy.count >= 12)
      this.zones.push({
        x: this.p.x,
        y: this.p.y,
        r: 70,
        life: 2,
        tick: 0,
        damage: 10,
        kind: "fire",
      });
    this.dashHaste = 4;
    if (this.artifact("lantern"))
      this.radial(
        this.p.x,
        this.p.y,
        8,
        (18 + this.level * 3) * this.artifact("lantern"),
        "spark",
      );
    this.afterDash = 3;
    if (this.hasPage("scorchstep"))
      this.zones.push({
        x: this.p.x,
        y: this.p.y,
        r: 70,
        life: 3,
        tick: 0,
        damage: 16,
        kind: "fire",
      });
    if (this.hasPage("wanderseed") && this.stats.dashes % 2 === 0)
      this.plant(this.p.x, this.p.y);
    if (this.hasPage("livewire")) this.overload();
    if (this.hasPage("silence")) recoverSkills(this, 0, 0.1);
    this.effect("ring", this.p.x, this.p.y, { r: 45, color: this.hero.color });
    if (this.hero.id === "nyx") {
      this.p.trait = 1;
      this.area(
        this.p.x,
        this.p.y,
        95,
        26 + this.rank("signature") * 10,
        "knife",
      );
      if (this.rank("ghostwalk") || this.evolved())
        this.radial(
          this.p.x,
          this.p.y,
          6 + this.rank("ghostwalk") * 2,
          18,
          "knife",
        );
    }
    this.events.push({ type: "dash" });
    talentDash(this);
    return true;
  }
  castSkill() {
    if (
      this.state !== "playing" ||
      this.p.skillCd > 0 ||
      this.pendingSkill ||
      this.pendingForm ||
      this.pendingSpell
    )
      return false;
    this.p.skillCd = this.skillCooldown;
    this.stats.skills++;
    this.pendingSkill = { remaining: MOTION[this.hero.id].cast };
    this.p.cast = MOTION[this.hero.id].skill;
    startAction(this, "skill");
    // The escape skill remains responsive even while its flourish is winding up.
    if (this.hero.id === "nyx") this.p.invuln = Math.max(this.p.invuln, 2);
    this.events.push({ type: "charge" });
    return true;
  }
  castForm(slot: number = 0) {
    if (!castFormSkill(this, slot)) return false;
    startAction(this, "skill", aimAt(this), false, this.pendingForm!.remaining);
    return true;
  }
  castSpell(slot: number = 0) {
    return castEquippedSpell(this, slot);
  }
  skill(reserved = false) {
    if (
      this.state !== "playing" ||
      (!reserved && (this.p.skillCd > 0 || this.pendingSkill)) ||
      (reserved && !this.pendingSkill)
    )
      return false;
    const p = this.p;
    if (!reserved) {
      p.skillCd = this.skillCooldown;
      this.stats.skills++;
      startAction(this, "skill", aimAt(this), true);
    }
    p.cast = 0.55;
    this.effect("skillburst", p.x, p.y, {
      hero: this.hero.id,
      tier: 1,
      angle: p.action?.angle ?? aimAt(this),
      r:
        {
          cinder: 235,
          briar: 260,
          nyx: 150,
          volta: 310,
          rook: 240,
          lumen: 190,
          vesper: 160,
          fen: 170,
          solace: 240,
          orin: 150,
          kestrel: 230,
          morrow: 300,
        }[this.hero.id]! * this.areaScale,
      color: this.hero.color,
      duration: this.hero.id === "briar" ? 1.35 : 1.1,
    });
    this.damageContext = "active";
    championSkill(this);
    if (this.legacy.count >= 8) {
      if (this.hero.id === "cinder")
        this.zones.push({
          x: p.x,
          y: p.y,
          r: 95,
          life: 3,
          tick: 0,
          damage: 10 * this.skillPower,
          kind: "fire",
        });
      if (["briar", "volta"].includes(this.hero.id))
        p.shield = Math.max(p.shield, Math.min(60, p.shield + 8));
      if (this.hero.id === "nyx")
        this.shadows.push({ x: p.x, y: p.y, life: 4, attack: 0 });
      if (this.hero.id === "briar" && this.legacy.count >= 12)
        this.plant(p.x, p.y);
    }
    for (let i = 0; i < this.artifact("seed"); i++)
      this.plant(
        p.x + Math.cos((i * TAU) / 3) * 75,
        p.y + Math.sin((i * TAU) / 3) * 75,
      );
    if (this.artifact("mirror"))
      this.shadows.push({
        x: p.x,
        y: p.y,
        life: 3 + this.artifact("mirror"),
        attack: 0,
      });
    this.shake = 5;
    if (this.hero.id === "cinder") {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.08 * this.rank("cauterize"));
      p.trait = 1;
      this.area(
        p.x,
        p.y,
        235,
        (75 + this.rank("signature") * 14) * this.skillPower,
        "ember",
      );
    }
    if (this.hero.id === "briar") {
      if (this.rank("overgrowth"))
        this.area(p.x, p.y, 260, 90 * this.skillPower, "thorn");
      if (this.rank("heartwood")) p.shield = Math.min(60, p.shield + 35);
      for (const e of this.enemies)
        if (distance(e, p) < 260)
          e.stun = 3 + Math.min(2, this.rank("active") * 0.12);
      for (let i = 0; i < 3; i++)
        this.plant(
          p.x + Math.cos((i * TAU) / 3) * 90,
          p.y + Math.sin((i * TAU) / 3) * 90,
        );
      p.hp = Math.min(
        p.maxHp,
        p.hp + p.maxHp * Math.min(0.4, 0.18 + this.rank("active") * 0.01),
      );
    }
    if (this.hero.id === "nyx") {
      if (this.rank("phantom") || this.hasPage("mirror"))
        this.shadows.push({
          x: p.x,
          y: p.y,
          life: this.rank("phantom") ? 6 : 4,
          attack: 0,
        });
      if (!reserved) p.invuln = 2;
      p.trait = 1;
      this.radial(
        p.x,
        p.y,
        20,
        (35 + this.rank("signature") * 8) * this.skillPower,
        "knife",
      );
    }
    if (this.hero.id === "volta") {
      if (this.rank("blackstar"))
        this.zones.push({
          x: p.x,
          y: p.y,
          r: 220,
          life: 5,
          tick: 0,
          damage: 24,
          kind: "vortex",
        });
      for (const e of this.enemies) if (distance(e, p) < 340) e.stun = 2.8;
      this.area(
        p.x,
        p.y,
        310,
        (85 + this.rank("signature") * 12) * this.skillPower,
        "arc",
      );
      this.arcCount = 0;
      this.overload();
    }
    if (this.rank("active") >= 5)
      this.zones.push({
        x: p.x,
        y: p.y,
        r: 150 + Math.min(90, this.rank("active") * 3),
        life: 3 + Math.min(4, Math.floor(this.rank("active") / 5)),
        tick: 0,
        damage: 18 * this.skillPower,
        kind:
          {
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
          }[this.hero.id] || "veil",
      });
    evolvedSkill(this);
    ascendedActive(this);
    p.shield = Math.min(90, p.shield + (this.classBonuses.castShield || 0));
    p.hp = Math.min(
      p.maxHp,
      p.hp + p.maxHp * (this.classBonuses.castHeal || 0),
    );
    this.damageContext = null;
    talentSkill(this);
    this.events.push({ type: "skill", hero: this.hero.id, tier: 1 });
    return true;
  }
  area(x: number, y: number, r: number, damage: number, source: string) {
    r *= this.areaScale;
    for (const e of this.enemies)
      if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < r + e.r)
        this.hit(e, damage, 12, source);
  }
  radial(
    x: number,
    y: number,
    count: number,
    damage: number,
    type: string,
    extra: Partial<Projectile> = {},
  ) {
    count = Math.min(24, count);
    for (let i = 0; i < count; i++) {
      const a = (i * TAU) / count;
      this.projectile(x, y, a, damage, type, { life: 1.3, pierce: 3 });
    }
  }
  projectile(
    x: number,
    y: number,
    a: number,
    damage: number,
    type: string,
    extra: Partial<Projectile> = {},
  ) {
    if (this.bullets.length > 220) return;
    if (type === "scythe" && this.rank("scythe") >= 10)
      extra.pierce = Math.max(extra.pierce || 0, 8);
    if (type === "wisp" && this.rank("familiar") >= 10)
      extra.pierce = Math.max(extra.pierce || 0, 6);
    const speed =
      type === "arrow"
        ? 620
        : type === "ember"
          ? 330
          : type === "knife"
            ? 470
            : 380;
    this.bullets.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      damage,
      age: 0,
      elevation: [
        "ember",
        "knife",
        "thorn",
        "arrow",
        "wisp",
        "hex",
        "holy",
        "spirit",
      ].includes(type)
        ? 28
        : 14,
      type,
      channel: this.damageContext || undefined,
      visualTier:
        { active: 1, form: 2, ultimate: 3, talent_ultimate: 3 }[
          extra.channel || this.damageContext || ""
        ] || 0,
      life: 1.9,
      r: type === "ember" ? 7 : 5,
      pierce: 0,
      hit: new Set(),
      ...extra,
    });
  }
  overload() {
    const r = 170 * (1 + this.rank("singularity") * 0.2);
    this.area(this.p.x, this.p.y, r, 35 + this.rank("signature") * 10, "arc");
    this.effect("discharge", this.p.x, this.p.y, {
      hero: "volta",
      r,
      color: this.hero.color,
      duration: 0.5,
    });
    this.p.shield = Math.max(
      this.p.shield,
      Math.min(
        35 + this.rank("feedback") * 4,
        this.p.shield + this.rank("feedback") * 8,
      ),
    );
    if (this.hasPage("faraday"))
      this.p.shield = Math.max(this.p.shield, Math.min(40, this.p.shield + 4));
    if (this.rank("perpetual")) recoverSkills(this, 2);
    if (this.rank("tempest")) this.radial(this.p.x, this.p.y, 8, 35, "wisp");
    if (this.hero.id === "volta" && this.legacy.count >= 4)
      this.p.shield = Math.max(this.p.shield, Math.min(60, this.p.shield + 4));
    if (this.hero.id === "volta" && this.legacy.count >= 12)
      recoverSkills(this, 0.4);
    if (this.rank("eventhorizon"))
      for (const e of this.enemies)
        if (distance(e, this.p) < r) e.stun = 0.35 * this.rank("eventhorizon");
    this.events.push({ type: "arc" });
  }
  attack() {
    const p = this.p,
      r = this.rank("signature"),
      target = this.nearest(p.x, p.y);
    if (!target) return;
    p.recoil = 0.16;
    const a = Math.atan2(target.y - p.y, target.x - p.x);
    if (p.action?.kind === "attack" && !p.action.released) {
      p.action.angle = a;
      p.action.released = true;
      p.action.age = Math.max(p.action.age, p.action.releaseAt);
    } else startAction(this, "attack", a, true);
    this.effect("muzzle", p.x, p.y, {
      angle: a,
      hero: this.hero.id,
      color: this.hero.color,
      r: 24,
      duration: 0.18,
    });
    championAttack(this, target, a);
    if (this.hero.id === "cinder") {
      const count = Math.min(
        12,
        1 + Math.floor(r / 2) + this.rank("firestorm"),
      );
      for (let i = 0; i < count; i++)
        this.projectile(
          p.x,
          p.y,
          a + (i - (count - 1) / 2) * 0.16,
          20 + r * 8,
          "ember",
          {
            blast: (37 + p.trait * 35) * (1 + this.rank("firestorm") * 0.12),
            pierce: this.evolved() ? 1 : 0,
          },
        );
      p.trait = clamp(p.trait + 0.09, 0, 1);
    }
    if (this.hero.id === "nyx") {
      const count = Math.min(
        16,
        (2 + Math.floor(r / 2)) * (this.evolved() ? 2 : 1),
      );
      for (let i = 0; i < count; i++)
        this.projectile(
          p.x,
          p.y,
          a + (i - (count - 1) / 2) * 0.13,
          13 + r * 5,
          "knife",
          { pierce: 2 + Math.floor(r / 2) },
        );
    }
    if (this.hero.id === "volta") {
      const hit = new Set<number>();
      let from = { x: p.x, y: p.y },
        next: Enemy | null = target;
      for (
        let i = 0;
        i <
          2 +
            r +
            this.rank("conduction") * 2 +
            (this.hasPage("stormglass") ? 2 : 0) && next;
        i++
      ) {
        if (i >= 24) break;
        hit.add(next.id);
        this.effect("arc", from.x, from.y, {
          emitter: i === 0,
          tx: next.x,
          ty: next.y,
          color: this.hero.color,
          duration: 0.22,
        });
        this.hit(
          next,
          (19 + r * 7) * (this.evolved() ? 1.65 : 1),
          0,
          "arc",
          undefined,
          Math.atan2(next.y - from.y, next.x - from.x),
        );
        if (this.rank("singularity") && !next.boss) {
          next.x += (target.x - next.x) * 0.12;
          next.y += (target.y - next.y) * 0.12;
        }
        from = next;
        next = this.nearest(
          from.x,
          from.y,
          155 * (1 + this.rank("conduction") * 0.2),
          hit,
        );
      }
      this.arcCount++;
      const max = this.evolved() ? 5 : 7;
      p.trait = this.arcCount / max;
      if (this.arcCount >= max) {
        this.arcCount = 0;
        p.trait = 0;
        this.overload();
      }
    }
    if (this.hero.id !== "briar")
      this.events.push({ type: "attack", hero: this.hero.id });
  }
  spawnEnemy(forced?: string, dist?: number) {
    if (
      this.enemies.length >= 270 &&
      !forced?.startsWith("boss") &&
      forced !== "reaper"
    )
      return;
    if (
      forced?.startsWith("boss") &&
      this.enemies.filter((e) => e.boss && e.hp > 0).length >= 5
    ) {
      for (const e of this.enemies.filter((e) => e.boss)) {
        e.damage *= 1.15;
        e.speed *= 1.04;
      }
      return;
    }
    const scale = pressure(this.time),
      m = this.time / 60,
      roll = this.random();
    const type =
      forced ||
      (m > 0.3 && roll < 0.18
        ? "runner"
        : m > 0.65 && roll < 0.32
          ? "spitter"
          : m > 1.2 && roll < 0.43
            ? "brute"
            : m > 0.9 && roll < 0.55
              ? "moth"
              : m > 1.5 && roll < 0.65
                ? "revenant"
                : m > 2.2 && roll < 0.72
                  ? "shaman"
                  : "crawler");
    const a = this.random() * TAU,
      d = dist || 550 + this.random() * 170;
    const boss = type.startsWith("boss"),
      reaper = type === "reaper",
      elite = !boss && !reaper && this.random() < scale.elite;
    const base = {
      crawler: [24, 64, 13, 10],
      runner: [17, 116, 10, 8],
      spitter: [32, 46, 14, 10],
      brute: [95, 40, 22, 18],
      moth: [24, 99, 12, 10],
      revenant: [65, 76, 16, 17],
      shaman: [80, 38, 17, 13],
      boss: [650, 42, 42, 24],
      reaper: [12000, 220, 27, 90],
    }[boss ? "boss" : type];
    const hp =
      base![0] *
      (reaper
        ? Math.pow(2, Math.max(0, this.time - this.realm.doom) / 60)
        : 1) *
      scale.hp *
      (elite ? 2.4 : 1) *
      Math.pow(1.24, this.oath) *
      (1 + this.boons.enemyHp);
    let position = worldPoint(this, a, d, base![2] + 16);
    if (distance(position, this.p) < d * 0.7) {
      const alternatives = [a + Math.PI, a + Math.PI / 2, a - Math.PI / 2].map(
        (angle) => worldPoint(this, angle, d, base![2] + 16),
      );
      position = alternatives.sort(
        (x, y) => distance(y, this.p) - distance(x, this.p),
      )[0];
    }
    this.enemies.push({
      id: ++this.uid,
      type,
      displayName:
        type === "boss_revenant"
          ? "THE ASHEN EXECUTIONER"
          : type === "boss_oracle"
            ? "THE SPORE MATRIARCH"
            : "THE HOLLOW WARDEN",
      ...position,
      hp,
      maxHp: hp,
      speed: base![1] * scale.speed * (elite ? 1.13 : 1),
      r: base![2] * (elite ? 1.2 : 1),
      damage: base![3] * scale.damage * Math.pow(1.14, this.oath),
      elite,
      boss,
      reaper,
      grace: reaper ? 2 : 0,
      phase: this.random() * TAU,
      attack: 2 + this.random() * 2,
      flash: 0,
      stun: 0,
      slow: 0,
      dot: 0,
      dotTime: 0,
      age: 0,
      charge: 0,
      enemySkill: 3 + this.random() * 2,
      hexTime: 0,
      hexTick: 0,
      hexDamage: 0,
      markUntil: 0,
      talentExposeUntil: 0,
    });
  }
  nearbyShrine() {
    return this.shrines.find((s) => !s.used && distance(s, this.p) < 80);
  }
  interact() {
    if (this.state !== "playing") return false;
    if (this.nearbyVault()) return beginVault(this);
    const shrine = this.nearbyShrine();
    if (!shrine) return false;
    this.currentShrine = shrine;
    this.shrineChoices = [];
    const pool = [...SHRINE_BOONS];
    while (this.shrineChoices.length < 3)
      this.shrineChoices.push(
        pool.splice(Math.floor(this.random() * pool.length), 1)[0],
      );
    this.state = "shrine";
    this.events.push({ type: "shrine" });
    return true;
  }
  chooseBoon(id: string) {
    if (
      this.state !== "shrine" ||
      !this.shrineChoices?.some((b) => b.id === id)
    )
      return false;
    if (id === "mercy" && this.embers < 10) return false;
    if (id === "blood") {
      this.boons.damage += 0.15;
      this.boons.health += 0.1;
    }
    if (id === "knowledge") {
      this.boons.xp += 0.18;
      this.boons.enemyHp += 0.12;
    }
    if (id === "mercy") {
      this.embers -= 10;
      this.p.hp = this.p.maxHp;
    }
    if (id === "tribute") {
      this.embers += 20;
      this.talentPoints++;
      for (let i = 0; i < 8; i++) {
        const before = this.enemies.length;
        this.spawnEnemy("revenant", 300);
        if (this.enemies.length > before) {
          const e = this.enemies.at(-1);
          e!.elite = true;
          e!.hp *= 1.5;
          e!.maxHp = e!.hp;
        }
      }
    }
    if (id === "relic") {
      const pool = [
        "orbit",
        "nova",
        "familiar",
        "frost",
        "meteor",
        "scythe",
      ].filter((id) => upgradeFits(this, id));
      if (pool.length) {
        const key = pool[Math.floor(this.random() * pool.length)];
        this.ranks[key] = (this.ranks[key] || 0) + 1;
      } else this.ranks.power = this.rank("power") + 1;
      for (let i = 0; i < 6; i++) this.spawnEnemy("revenant", 320);
    }
    this.currentShrine.used = true;
    this.state = "playing";
    this.recalculate();
    this.event(
      id === "tribute"
        ? "PACT SEALED · +20 embers · +1 run resonance"
        : "THE PACT IS SEALED",
    );
    return true;
  }
  leaveShrine() {
    if (this.state === "shrine") {
      this.currentShrine.used = true;
      this.state = "playing";
    }
  }
  advanceSystems(dt: number) {
    const p = this.p;
    this.afterDash = Math.max(0, this.afterDash - dt);
    updateJourney(this, dt);
    if (this.rank("barrier")) {
      const capacity = Math.min(50, 10 + this.rank("barrier") * 3);
      if (p.shield < capacity)
        p.shield = Math.min(
          capacity,
          p.shield + dt * Math.min(2, this.rank("barrier") * 0.25),
        );
    }
    updateEvolutions(this, dt);
    const synergies = activeSynergies(this);
    for (const s of synergies)
      if (!this.synergyIds.includes(s.id)) {
        this.synergyIds.push(s.id);
        this.event(`SYNERGY AWAKENED · ${s.name}`);
      }
    if (this.time >= this.nextShrine) {
      this.nextShrine += 65;
      const a = this.random() * TAU;
      this.shrines.push({
        ...worldPoint(this, a, 220),
        used: false,
      });
      this.event("A forgotten altar stirs. Approach and press E.");
    }
    this.shrines = this.shrines.filter((s) => distance(s, p) < 1600).slice(-4);
    if (this.time >= this.nextHazard) {
      this.nextHazard += Math.max(9, 23 - this.oath * 0.4);
      for (let i = 0; i < 3; i++) {
        const a = this.random() * TAU,
          d = i === 0 ? 0 : 90 + this.random() * 110;
        this.hazards.push({
          x: p.x + Math.cos(a) * d,
          y: p.y + Math.sin(a) * d,
          r: 45 + this.biome * 9,
          warn: 1.45,
          life: 4.2,
        });
      }
    }
    for (const z of this.hazards) {
      z.warn -= dt;
      z.life -= dt;
      if (z.warn < 0 && distance(z, p) < z.r)
        this.hurt((14 + this.time * 0.04) * (1 + this.oath * 0.14));
      if (this.isState("dead")) return;
    }
    this.hazards = this.hazards.filter((z) => z.life > 0);
    for (const z of [...this.zones]) {
      z.life -= dt;
      z.tick -= dt;
      if (z.kind === "vortex")
        for (const e of this.enemies)
          if (!e.boss && !e.reaper && distance(e, z) < z.r) {
            e.x += (z.x - e.x) * dt * 0.8;
            e.y += (z.y - e.y) * dt * 0.8;
          }
      if (["garden", "veil"].includes(z.kind))
        for (const e of this.enemies)
          if (distance(e, z) < z.r) e.slow = Math.max(e.slow || 0, 0.6);
      if (z.tick <= 0) {
        if (z.kind === "garden" && distance(p, z) < z.r)
          p.hp = Math.min(p.maxHp, p.hp + this.skillPower * 0.5);
        z.tick = 0.5;
        const previousContext = this.damageContext;
        this.damageContext = z.channel || null;
        this.area(z.x, z.y, z.r, z.damage, "zone");
        this.damageContext = previousContext;
        this.effect("ring", z.x, z.y, {
          r: z.r,
          color:
            {
              fire: "#ee986c",
              garden: "#afd98b",
              veil: "#b197db",
              vortex: "#8ccfdd",
            }[z.kind] || "#b197db",
          duration: 0.4,
        });
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0).slice(-35);
    for (const shadow of this.shadows) {
      shadow.life -= dt;
      shadow.attack -= dt;
      if (shadow.attack <= 0) {
        const e = this.nearest(shadow.x, shadow.y, 550);
        if (e) {
          const a = Math.atan2(e.y - shadow.y, e.x - shadow.x);
          for (let i = -1; i <= 1; i++)
            this.projectile(
              shadow.x,
              shadow.y,
              a + i * 0.13,
              shadow.spellPower || 18 + this.rank("signature") * 5,
              "knife",
              {
                pierce: 2,
                ...(shadow.spellId
                  ? {
                      source: "spell",
                      channel: "spells",
                      spellId: shadow.spellId,
                      visualTier: 3,
                    }
                  : {}),
              },
            );
        }
        shadow.attack = 0.6 / this.attackSpeed / (shadow.spellRate || 1);
      }
    }
    this.shadows = this.shadows.filter((s) => s.life > 0).slice(-3);
    for (const id of ["frost", "meteor", "scythe", "solar"]) {
      if (!this.rank(id)) continue;
      this.extraTimers[id] -= dt;
      if (this.extraTimers[id] > 0) continue;
      const rank = this.rank(id);
      if (id === "frost") {
        const radius = Math.min(340, 125 + rank * 18) * this.areaScale;
        for (const e of this.enemies)
          if (distance(e, p) < radius) {
            e.slow = rank >= 5 ? 3.2 : 2.4;
            if (rank >= 10) e.stun = Math.max(e.stun || 0, 0.5);
            this.hit(e, 12 + rank * 8, 2, "frost");
          }
        this.effect("ring", p.x, p.y, {
          r: radius,
          color: "#a0d8e8",
          duration: 0.8,
        });
        this.extraTimers[id] = 4 / Math.sqrt(this.attackSpeed);
      }
      if (id === "meteor") {
        const e = this.nearest(p.x, p.y, 600);
        if (e) {
          this.area(
            e.x,
            e.y,
            Math.min(220, 60 + rank * 12),
            35 + rank * 22,
            "meteor",
          );
          if (rank >= 10 || this.evolutions.meteor)
            this.zones.push({
              x: e.x,
              y: e.y,
              r: 85,
              life: 3,
              tick: 0,
              damage: (12 + rank * 4) * this.weaponPower("meteor"),
              kind: "fire",
            });
          this.effect("meteor", e.x, e.y, {
            r: Math.min(220, 60 + rank * 12),
            color: "#ffc382",
            duration: 0.6,
          });
        }
        this.extraTimers[id] = 3.6 / Math.sqrt(this.attackSpeed);
      }
      if (id === "scythe") {
        this.radial(p.x, p.y, 3 + rank, 15 + rank * 10, "scythe");
        this.extraTimers[id] = 3 / Math.sqrt(this.attackSpeed);
      }
      if (id === "solar") {
        if (p.trait > 0.85) {
          this.area(p.x, p.y, 165, 55, "ember");
          this.effect("flame", p.x, p.y, {
            r: 165,
            color: "#f8c47c",
            duration: 0.7,
          });
        }
        this.extraTimers[id] = 2;
      }
    }
  }
  update(dt: number, input = { x: 0, y: 0 }) {
    if (this.state !== "playing") return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.p.cast = Math.max(0, (this.p.cast || 0) - dt);
    this.p.recoil = Math.max(0, (this.p.recoil || 0) - dt);
    this.p.hurtFlash = Math.max(0, (this.p.hurtFlash || 0) - dt);
    const p = this.p,
      move = Math.hypot(input.x, input.y) > 0;
    const beforeX = p.x,
      beforeY = p.y;
    this.moving = move;
    championUpdate(this, dt, move);
    updateTalentCombat(this, dt);
    const ix = input.x || 0,
      iy = input.y || 0,
      len = Math.hypot(ix, iy) || 1;
    for (const key of ["invuln", "dashCd", "skillCd", "dashTime"] as const)
      p[key] = Math.max(0, p[key] - dt);
    advanceMotion(this, dt);
    if (move && p.dashTime <= 0) {
      p.dx = ix / len;
      p.dy = iy / len;
      p.facing = p.dx;
    }
    if (p.dashTime > 0) {
      p.x += p.dx * this.moveSpeed * 4.2 * dt;
      p.y += p.dy * this.moveSpeed * 4.2 * dt;
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.035;
        this.effect("afterimage", p.x, p.y, {
          actor: this.hero.id,
          flip: p.dx < 0,
          r: 82,
          color: this.hero.color,
          duration: 0.32,
        });
      }
      this.effect("trail", p.x, p.y, {
        r: 14,
        color: this.hero.color,
        duration: 0.3,
      });
    } else if (move) {
      p.x += (ix / len) * this.moveSpeed * dt;
      p.y += (iy / len) * this.moveSpeed * dt;
    }
    updateRealm(this);
    updateSpellCombat(this, dt);
    if (p.dashTime <= 0)
      p.walkDistance =
        (p.walkDistance || 0) + Math.hypot(p.x - beforeX, p.y - beforeY);
    if (this.hero.id === "cinder")
      p.trait = clamp(
        p.trait -
          dt *
            (move ? (this.hasPage("furnace") ? 0.1 : 0.2) : 0.012) *
            (this.legacy.count >= 4 ? 0.85 : 1),
        0,
        1,
      );
    if (this.hero.id === "nyx")
      p.trait = clamp(
        p.trait + dt * (move ? (this.legacy.count >= 4 ? 0.66 : 0.55) : -1),
        0,
        1,
      );
    if (this.hero.id === "briar") p.trait = (this.kills % 10) / 10;
    let regen =
      this.rank("recovery") * 0.35 +
      forgeBonus("mending", this.save.forge.mending);
    if (
      this.hero.id === "briar" &&
      this.plants.some((s) => distance(s, p) < 150)
    )
      regen += this.rank("symbiosis") * 0.7;
    p.hp = Math.min(p.maxHp, p.hp + regen * dt);
    p.shield = Math.max(
      0,
      p.shield - dt * (this.hasPage("faraday") ? 0.075 : 0.3),
    );
    this.advanceSystems(dt);
    if (this.isState("dead")) return;
    updateExpedition(this, dt);
    this.attackSpeed =
      this.baseAttackSpeed *
      (1 + (this.dashHaste > 0 ? this.artifact("greaves") * 0.15 : 0));
    if (this.state !== "playing") return;
    this.shake = Math.max(0, this.shake - dt * 20);
    const night = 1 + Math.floor(this.time / 60);
    if (night !== this.night) {
      this.night = night;
      this.event(
        `NIGHT ${String(night).padStart(2, "0")} · ${["", "", "They learned your scent.", "The roots run deeper.", "There is no dawn."][night] || "The dark has no end."}`,
      );
      this.embers += 4 + night;
      if (night >= 3)
        for (let i = 0; i < 8; i++) this.spawnEnemy("runner", 380);
    }
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer +=
        1 /
        (pressure(this.time).spawn *
          (1 + this.oath * 0.08) *
          (this.hasPage("avarice") ? 1.12 : 1));
    }
    if (this.time >= this.nextBoss) {
      this.nextBoss += 85;
      this.bossCount++;
      const type = ["boss", "boss_revenant", "boss_oracle"][
        (this.bossCount - 1) % 3
      ];
      this.spawnEnemy(type, 470);
      this.event(
        `${type === "boss_revenant" ? "THE ASHEN EXECUTIONER" : type === "boss_oracle" ? "THE SPORE MATRIARCH" : "THE HOLLOW WARDEN"} · ${this.bossCount}`,
      );
      this.events.push({ type: "boss" });
    }
    if (this.time >= this.nextCache) {
      this.nextCache += 38;
      const a = this.random() * TAU;
      this.pickups.push({
        ...worldPoint(this, a, 280),
        kind: "cache",
        value: 0,
        phase: 0,
      });
      this.event("A rift cache appeared. Follow the gold.");
    }
    this.attackTimer -= dt;
    if (
      this.attackTimer > 0 &&
      this.attackTimer <= MOTION[this.hero.id].attack &&
      this.nearest(p.x, p.y) &&
      !this.pendingSkill &&
      !this.pendingForm &&
      !this.pendingSpell
    )
      startAction(this, "attack", aimAt(this), false, this.attackTimer);
    if (
      this.attackTimer <= 0 &&
      !this.pendingSkill &&
      !this.pendingForm &&
      !this.pendingSpell
    ) {
      this.attack();
      const interval = {
        cinder: 0.78,
        briar: 1,
        nyx: 0.64,
        volta: 0.95,
        rook: 0.95,
        lumen: 1.1,
        vesper: 1.05,
        fen: 0.9,
        solace: 0.95,
        orin: 1,
        kestrel: 0.65,
        morrow: 1.05,
      }[this.hero.id];
      this.attackTimer =
        interval! /
        this.attackSpeed /
        (1 +
          (p.trait > 0.7 ? this.rank("incandescence") * 0.12 : 0) +
          (this.afterDash > 0 ? this.rank("afterimage") * 0.18 : 0)) /
        (this.hero.id === "cinder" && p.trait > 0.8 ? 1.4 : 1);
    }
    this.orbitTimer -= dt;
    if (this.orbitTimer <= 0) {
      this.orbitTimer = 0.24;
      this.updateOrbits();
    }
    if (this.rank("nova")) {
      this.novaTimer -= dt;
      if (this.novaTimer <= 0) {
        const r = Math.min(360, 110 + this.rank("nova") * 22);
        this.area(p.x, p.y, r, 20 + this.rank("nova") * 16, "nova");
        if (this.rank("nova") >= 10)
          for (const e of this.enemies) if (distance(e, p) < r) e.slow = 2;
        if (this.hasSynergy("choir")) this.radial(p.x, p.y, 10, 35, "knife");
        this.effect("ring", p.x, p.y, { r, color: "#dfcca0", duration: 0.55 });
        this.novaTimer = 5 / Math.sqrt(this.attackSpeed);
      }
    }
    if (this.rank("familiar")) {
      this.wispTimer -= dt;
      if (this.wispTimer <= 0) {
        const s = {
            x: p.x + Math.cos(this.time * 2) * 50,
            y: p.y - 40 + Math.sin(this.time * 2) * 20,
          },
          e = this.nearest(s.x, s.y);
        if (e) {
          const a = Math.atan2(e.y - s.y, e.x - s.x);
          for (
            let i = 0;
            i < Math.min(8, Math.ceil(this.rank("familiar") / 2));
            i++
          )
            this.projectile(
              s.x,
              s.y,
              a + i * 0.13,
              14 + this.rank("familiar") * 8,
              "wisp",
              { pierce: 1 },
            );
        }
        this.wispTimer = 1.1 / this.attackSpeed;
      }
    }
    for (const plant of this.plants) {
      plant.life -= dt;
      plant.attack -= dt;
      plant.recoil = Math.max(0, (plant.recoil || 0) - dt);
      if (plant.attack <= 0) {
        const e = this.nearest(plant.x, plant.y, 420);
        if (e) {
          const a = Math.atan2(e.y - plant.y, e.x - plant.x);
          plant.aim = a;
          plant.recoil = 0.16;
          if (this.time - (this.lastGardenSound ?? -1) > 0.16) {
            this.lastGardenSound = this.time;
            this.events.push({ type: "attack", hero: "briar" });
          }
          this.projectile(
            plant.x,
            plant.y,
            a,
            16 + this.rank("signature") * 5,
            "thorn",
            { pierce: 1 + this.rank("germination"), elevation: 13 },
          );
          if (this.rank("grove"))
            for (const offset of [-0.2, 0.2])
              this.projectile(
                plant.x,
                plant.y,
                a + offset,
                22 + this.rank("signature") * 5,
                "thorn",
                { pierce: 1 + this.rank("germination"), elevation: 13 },
              );
          if (this.evolved())
            this.projectile(plant.x, plant.y, a + 0.12, 25, "thorn", {
              pierce: 1,
              elevation: 13,
            });
        }
        plant.attack = 1 / (1 + this.rank("roots") * 0.2) / this.attackSpeed;
      }
    }
    if (this.rank("heartwood"))
      for (const s of this.plants)
        if (s.life <= 0)
          this.pickups.push({ x: s.x, y: s.y, kind: "heart", value: 3 });
    this.plants = this.plants.filter((s) => s.life > 0);
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.age += dt;
      if (e.reaper) {
        e.stun = 0;
        e.slow = 0;
        e.dotTime = 0;
        e.grace = Math.max(0, e.grace - dt);
        // Death keeps accelerating even after an unusually powerful build survives its arrival.
        e.speed = Math.min(
          900,
          220 + Math.max(0, this.time - this.realm.doom) * 1.4,
        );
        e.damage =
          90 * Math.pow(1.8, Math.max(0, this.time - this.realm.doom) / 60);
      }
      e.flash = Math.max(0, e.flash - dt);
      e.impact = Math.max(0, (e.impact || 0) - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.slow = Math.max(0, e.slow - dt);
      if (e.dotTime > 0) {
        e.dotTime -= dt;
        this.hit(e, e.dot * dt, 0);
        if (e.hp <= 0) continue;
      } else e.dot = 0;
      const bait = companionTarget(this, e) || p;
      let dx = bait.x - e.x,
        dy = bait.y - e.y,
        d = Math.hypot(dx, dy) || 1;
      e.facing = dx < 0;
      let speed = e.speed * (e.slow > 0 ? 0.48 : 1) * (e.stun > 0 ? 0 : 1);
      if (e.reaper && e.grace > 0) speed = 0;
      if (e.type === "moth" && e.stun <= 0) {
        e.x += Math.cos(e.age * 2 + e.phase) * 40 * dt;
        e.y += Math.sin(e.age * 2 + e.phase) * 40 * dt;
        if (d < 190) speed *= 0.25;
      }
      e.enemySkill -= dt;
      if (e.enemySkill <= 0 && e.stun <= 0) {
        if (e.type === "revenant") {
          e.cx = dx / d;
          e.cy = dy / d;
          e.windup = 0.75;
          this.effect("warning", e.x, e.y, {
            tx: e.x + (dx / d) * 250,
            ty: e.y + (dy / d) * 250,
            r: 28,
            color: "#e59b8c",
            duration: 0.75,
          });
          e.enemySkill = 4.5;
        }
        if (e.type === "moth") {
          this.hostileShot(e, Math.atan2(dy, dx), 160, e.damage * 0.8);
          e.enemySkill = 3.5;
        }
        if (e.type === "shaman") {
          for (const ally of this.enemies)
            if (distance(ally, e) < 150)
              ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.06);
          for (const offset of [-0.2, 0, 0.2])
            this.hostileShot(
              e,
              Math.atan2(dy, dx) + offset,
              120,
              e.damage * 0.7,
            );
          this.effect("ring", e.x, e.y, {
            r: 150,
            color: "#b6cb78",
            duration: 0.6,
          });
          e.enemySkill = 5;
        }
      }
      if (e.type === "spitter" && d < 300) speed *= d < 210 ? -0.5 : 0.1;
      if (e.type === "boss_oracle" && d < 260) speed *= 0.2;
      if (e.type === "runner" && e.age % 3.6 > 2.85) speed *= 2;
      if (e.charge > 0) {
        if (e.stun <= 0) {
          e.charge -= dt;
          e.x += e.cx! * 310 * dt;
          e.y += e.cy! * 310 * dt;
        }
      } else {
        e.x += (dx / d) * speed * dt;
        e.y += (dy / d) * speed * dt;
      }
      constrain(this, e, e.r + 8);
      if (d > 1500 && !e.boss && !e.reaper) {
        const a = this.random() * TAU;
        Object.assign(e, worldPoint(this, a, 650));
      }
      e.attack -= dt;
      if ((e.type === "spitter" || e.boss) && e.attack <= 0 && e.stun <= 0) {
        if (e.boss) {
          if (e.type === "boss_oracle") {
            for (let i = 0; i < 12; i++)
              this.hostileShot(
                e,
                (i * TAU) / 12 + e.age * 0.1,
                95,
                e.damage * 0.65,
              );
            for (let i = 0; i < 2; i++) this.spawnEnemy("moth", 400);
            this.hazards.push({ x: p.x, y: p.y, r: 68, warn: 1.5, life: 4 });
            e.attack = 4.8;
          } else {
            const count = 10 + Math.min(10, this.bossCount * 2),
              offset = e.phase + e.age * 0.2;
            for (let i = 0; i < count; i++)
              this.hostileShot(
                e,
                (i * TAU) / count + offset,
                115 + this.bossCount * 6,
                e.damage * 0.65,
              );
            e.cx = dx / d;
            e.cy = dy / d;
            e.windup = 0.7;
            this.effect("warning", e.x, e.y, {
              tx: e.x + (dx / d) * 250,
              ty: e.y + (dy / d) * 250,
              r: 42,
              color: "#e67f66",
              duration: 0.7,
            });
            e.attack = 4.2;
            if (e.type === "boss_revenant") {
              e.attack = 2.9;
              for (const a of [-0.25, 0, 0.25])
                this.hostileShot(
                  e,
                  Math.atan2(dy, dx) + a,
                  210,
                  e.damage * 0.75,
                );
            }
          }
        } else if (d < 700) {
          this.hostileShot(e, Math.atan2(dy, dx), 153, e.damage);
          e.attack = 3.4;
        } else e.attack = 1;
      }
      if (e.windup! > 0) {
        e.windup! -= dt;
        if (e.windup! <= 0) e.charge = 0.8;
      }
      if (distance(e, p) < e.r + 12 && (!e.reaper || e.grace <= 0))
        this.hurt(e.damage, !!e.reaper);
      if ("kind" in bait && distance(e, bait) < e.r + 14)
        hurtCompanion(this, bait, e.damage);
    }
    if (this.isState("dead")) return;
    // A spatial hash keeps late-run projectile collisions proportional to nearby threats.
    const grid = new Map<string, Enemy[]>(),
      cell = 80;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const key = `${Math.floor(e.x / cell)},${Math.floor(e.y / cell)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(e);
    }
    for (const b of this.bullets) {
      b.age = (b.age || 0) + dt;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const gx = Math.floor(b.x / cell),
        gy = Math.floor(b.y / cell);
      for (let x = gx - 1; x <= gx + 1; x++)
        for (let y = gy - 1; y <= gy + 1; y++)
          for (const e of grid.get(`${x},${y}`) || []) {
            if (
              b.life <= 0 ||
              e.hp <= 0 ||
              b.hit.has(e.id) ||
              distance(b, e) > b.r + e.r
            )
              continue;
            b.hit.add(e.id);
            if (b.spellId) spellContact(this, e, b.spellId, b.damage);
            this.hit(
              e,
              b.damage,
              3,
              b.source || b.type,
              b.channel,
              Math.atan2(b.vy, b.vx),
            );
            companionImpact(this, b, e);
            if (b.blast) {
              if (b.spellId) {
                for (const other of this.enemies
                  .filter(
                    (t) =>
                      t !== e && t.hp > 0 && distance(t, b) < b.blast! + t.r,
                  )
                  .slice(0, 12)) {
                  spellContact(this, other, b.spellId, b.damage * 0.48);
                  this.hit(other, b.damage * 0.48, 0, "spell", "spells");
                }
              } else this.area(b.x, b.y, b.blast, b.damage * 0.48, "ember");
              this.effect("burst", b.x, b.y, {
                r: b.blast,
                color: this.hero.color,
                duration: 0.28,
              });
            } else
              this.effect("spark", b.x, b.y, {
                r: 14,
                color: b.type === "thorn" ? "#9db881" : this.hero.color,
                duration: 0.18,
              });
            b.pierce--;
            if (b.pierce < 0) b.life = 0;
          }
    }
    for (const b of this.hostile) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (distance(b, p) < b.r + 11) {
        this.hurt(b.damage);
        b.life = 0;
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.hostile = this.hostile.filter(
      (b) => b.life > 0 && distance(b, p) < 1100,
    );
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    if (this.isState("dead")) return;
    for (const drop of this.pickups) {
      const d = distance(drop, p);
      if (d < this.pickupRange && drop.kind === "xp") drop.magnet = true;
      if (drop.magnet) {
        const amount = Math.min(d, dt * (330 + 500 / (d / 40 + 1)));
        drop.x += ((p.x - drop.x) / (d || 1)) * amount;
        drop.y += ((p.y - drop.y) / (d || 1)) * amount;
      }
      if (distance(drop, p) < 20) {
        drop.taken = true;
        if (drop.kind === "xp") {
          this.gainXp(drop.value);
          this.events.push({ type: "xp" });
        }
        if (drop.kind === "seal") {
          this.evolutionSeals += drop.value;
          this.event("ELDER SEAL · open Evolutions [ V ]");
          this.events.push({ type: "cache" });
        }
        if (drop.kind === "heart") {
          p.hp = Math.min(
            p.maxHp,
            p.hp +
              drop.value *
                (1 +
                  forgeBonus("alchemy", this.save.forge.alchemy) +
                  (this.hasPage("alchemist") ? 0.4 : 0)),
          );
          this.effect("heal", p.x, p.y, { r: 35, color: "#b4d094" });
          this.events.push({ type: "heal" });
        }
        if (drop.kind === "cache") {
          this.caches++;
          for (const d of this.pickups) if (d.kind === "xp") d.magnet = true;
          this.embers += 6;
          this.p.hp = Math.min(
            p.maxHp,
            p.hp + 12 * (1 + forgeBonus("alchemy", this.save.forge.alchemy)),
          );
          this.event("RIFT CACHE · +6 embers · heal · collect all sparks");
          this.events.push({ type: "cache" });
        }
      }
    }
    this.pickups = this.pickups.filter(
      (d) =>
        !d.taken && (["xp", "seal"].includes(d.kind) || distance(d, p) < 1800),
    );
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0);
  }
  hostileShot(e: Enemy, a: number, speed: number, damage: number) {
    if (this.hostile.length >= 180) return;
    this.hostile.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: 5,
      damage,
      life: 6,
    });
  }
  orbitPositions(): Array<Vec2 & { a: number; type: string; damage: number }> {
    const pos: Array<Vec2 & { a: number; type: string; damage: number }> = [],
      r = this.rank("signature"),
      briar = this.hero.id === "briar",
      count = briar ? Math.min(15, 3 + r) : 0;
    for (let i = 0; i < count; i++) {
      const a = this.time * 2.6 * this.attackSpeed + (i * TAU) / count;
      const radius = Math.min(
        220,
        (65 + r * 5) * (1 + this.rank("bramble") * 0.18),
      );
      pos.push({
        x: this.p.x + Math.cos(a) * radius,
        y: this.p.y + Math.sin(a) * radius,
        a,
        type: "thorn",
        damage: 12 + r * 7,
      });
    }
    if (briar && this.evolved())
      for (let i = 0; i < 6; i++) {
        const a = -this.time * 1.8 + (i * TAU) / 6;
        pos.push({
          x: this.p.x + Math.cos(a) * 140,
          y: this.p.y + Math.sin(a) * 140,
          a,
          type: "thorn",
          damage: 32,
        });
      }
    for (let i = 0; i < Math.min(12, this.rank("orbit")); i++) {
      const a = -this.time * 2.1 + (i * TAU) / Math.min(12, this.rank("orbit"));
      pos.push({
        x: this.p.x + Math.cos(a) * 110,
        y: this.p.y + Math.sin(a) * 110,
        a,
        type: "blade",
        damage: 17 + this.rank("orbit") * 6,
      });
    }
    return pos;
  }
  updateOrbits() {
    for (const orb of this.orbitPositions())
      for (const e of this.enemies)
        if (e.hp > 0 && distance(orb, e) < e.r + 19)
          this.hit(e, orb.damage, 2, orb.type);
  }
}
