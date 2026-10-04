/** Shared simulation contracts. Keep browser APIs out of this module. */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  role: string;
  color: string;
  dark: string;
  icon: string;
  difficulty: string;
  quote: string;
  desc: string;
  hp: number;
  speed: number;
  cooldown: number;
  skill: string;
  weapon: string;
  weaponDesc: string;
  trait: string;
  traitDesc: string;
  skillDesc: string;
  talents: string[];
  talentIds: string[];
}

export interface SkillTraining {
  level: number;
  stage: number;
}

export interface Journey {
  xp: number;
  sparks: number;
  stage: number;
  respecs: number;
  sigilPity: number;
  materials: Record<string, number>;
  skills: Record<string, SkillTraining>;
  talents: Record<string, number>;
  spellSlots: number;
  loadout: string[];
  ultimate: string;
}

export interface Save {
  version: number;
  journeys: Record<string, Journey>;
  realm: string;
  memories: Record<string, Record<string, boolean>>;
  realmRecords: Record<string, { best: number; finds: number }>;
  contract: string;
  contracts: Record<string, number>;
  artifactArchive: Record<string, number>;
  visuals: { motion: boolean; numbers: boolean; minimap: boolean };
  research: Record<string, Record<string, number>>;
  embers: number;
  runs: number;
  best: number;
  kills: number;
  forge: Record<string, number>;
  mastery: Record<string, number>;
  shards: number;
  bosses: number;
  elites: number;
  caches: number;
  embersEarned: number;
  maxOath: number;
  oath: number;
  chronicle: Record<string, Record<string, number>>;
  bestiary: Record<string, number>;
  loadouts: Record<string, string[]>;
  affinities: Record<string, string>;
  sound: boolean;
}

export interface Upgrade {
  name: string;
  desc: string;
  icon?: string;
  max?: number;
  kind: string;
  hero?: string;
  minLevel?: number;
  requires?: string;
}

export interface Action {
  kind: string;
  angle: number;
  age: number;
  releaseAt: number;
  duration: number;
  released: boolean;
  empowered: boolean;
  serial: number;
}

export interface Player extends Vec2 {
  hp: number;
  maxHp: number;
  shield: number;
  dx: number;
  dy: number;
  invuln: number;
  dashTime: number;
  dashCd: number;
  skillCd: number;
  trait: number;
  action?: Action | null;
  facing?: number;
  stride?: number;
  cast: number;
  recoil: number;
  hurtFlash: number;
  walkDistance: number;
}

export interface Enemy extends Vec2 {
  id: number;
  type: string;
  displayName: string;
  hp: number;
  maxHp: number;
  speed: number;
  r: number;
  damage: number;
  elite: boolean;
  boss: boolean;
  reaper: boolean;
  grace: number;
  phase: number;
  attack: number;
  flash: number;
  stun: number;
  slow: number;
  dot: number;
  dotTime: number;
  age: number;
  charge: number;
  enemySkill: number;
  hexTime: number;
  hexTick: number;
  hexDamage: number;
  markUntil: number;
  exposure?: number;
  exposureUntil?: number;
  plague?: boolean;
  dotSource?: string;
  dead?: boolean;
  killed?: boolean;
  guardian?: boolean;
  lastWeapon?: string;
  hitAngle?: number;
  impactStrength?: number;
  impact?: number;
  facing?: boolean;
  cx?: number;
  cy?: number;
  windup?: number;
  talentExpose?: number;
  talentExposeUntil: number;
  spellDot?: { id?: string; life: number; tick: number; damage: number } | null;
}

export interface Projectile extends Vec2 {
  vx: number;
  vy: number;
  damage: number;
  age: number;
  elevation: number;
  type: string;
  channel?: string | null;
  visualTier: number;
  life: number;
  r: number;
  pierce: number;
  hit: Set<number>;
  source?: string;
  spellId?: string;
  companionId?: number;
  splash?: number;
  homing?: boolean;
  charged?: boolean;
  petSplashSpent?: boolean;
  blast?: number;
}

export interface CombatEffect extends Vec2 {
  type: string;
  life: number;
  maxLife: number;
  r?: number;
  color?: string;
  hero?: string;
  tier?: number;
  angle?: number;
  tx?: number;
  ty?: number;
  text?: string;
  motif?: string;
  style?: string;
  seed?: number;
  actor?: string;
  flip?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface Zone extends Vec2 {
  r: number;
  life: number;
  tick: number;
  damage: number;
  kind: string;
  channel?: string;
}

export interface Companion extends Vec2 {
  id: number;
  kind: string;
  baseHp: number;
  offsetX: number;
  offsetY: number;
  hp: number;
  maxHp: number;
  life: number;
  permanent: boolean;
  down: number;
  attack: number;
  hurtAt: number;
  lastHurtAt: number;
  wardAt: number;
  engageCd: number;
  lunge: number;
  pose: number;
  moving: boolean;
  facing: boolean;
  ultimate?: boolean;
  spellPower?: number;
  spellId?: string;
}

export interface SpellKit {
  radius?: number;
  count?: number;
  shield?: number;
  guard?: number;
  distance?: number;
  follow?: boolean;
  recover?: number;
  pull?: boolean;
  projectile?: string;
  element?: string;
  pet?: string;
  totem?: string;
  council?: boolean;
  pact?: boolean;
  command?: boolean;
  serenity?: boolean;
  petHeal?: number;
  root?: number;
  expose?: number;
  mend?: number;
  shieldPulse?: number;
  resource?: number;
  dot?: boolean;
  echoes?: number;
  summons?: number;
  plants?: number;
  shadows?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface SpellField {
  id: string;
  kind: string;
  element?: string;
  points: Vec2[];
  radius: number;
  power: number;
  seconds: number;
  life: number;
  tick: number;
  interval: number;
  follow?: boolean;
  angle?: number;
  delay?: number;
}

export interface UltimateKit {
  kind: string;
  seconds?: number;
  damage?: number;
  interval?: number;
  radius?: number;
  heal?: number;
  shield?: number;
  guard?: number;
  count?: number;
  dash?: boolean;
  resource?: boolean;
  mark?: number;
  slow?: boolean;
  pet?: string;
  projectile?: string;
  element?: string;
  dot?: boolean;
  mend?: number;
  cold?: boolean;
  petBurst?: boolean;
}

export interface Ultimate extends UltimateKit {
  id: string;
  hero: string;
  branch: number;
  name: string;
  desc: string;
  cooldown: number;
  seconds: number;
  interval: number;
  radius: number;
  damage: number;
}

export interface Plant extends Vec2 {
  life: number;
  attack: number;
  phase: number;
  recoil?: number;
  aim?: number;
}

export interface ForgeItem {
  id: string;
  name: string;
  icon: string;
  group: string;
  desc: string;
  cap: number;
  max: number;
  base: number;
  unit: string;
  linear?: boolean;
  shards?: number;
  gate?: number;
  bosses?: number;
}

export interface TalentNode {
  id: string;
  name: string;
  desc: string;
  max: number;
  hero?: string;
  icon?: string;
  kind?: string;
  requires?: string | null;
  requiredRank?: number;
  level?: number;
  branch?: number;
  tier?: number;
}

export interface TalentBranch {
  name: string;
  icon: string;
  nodes: TalentNode[];
}

export interface ClassTalentNode extends TalentNode {
  row: number;
  col: number;
  level: number;
  spent: number;
  cost: number;
  branch: number;
  hero?: string;
  stats?: Record<string, number> | null;
  proc?: { role: string; slot: number } | null;
  ultimate?: Ultimate | null;
  spell?: string;
  spellMastery?: string;
}

export interface CodexPage {
  id: string;
  name: string;
  hero: string;
  icon: string;
  desc: string;
  metric: string;
  target: number;
  lore: string;
}

export interface ActiveUltimate extends Ultimate {
  life: number;
  tick: number;
  power: number;
  points: Vec2[];
  garden?: Array<{ plant: Plant; angle: number; radius: number }>;
}

export interface Spell extends SpellKit {
  name: string;
  kind: string;
  desc: string;
  cooldown: number;
  id: string;
  hero: string;
  branch: number;
  advanced: boolean;
  icon: string;
  masteryId: string;
  damage: number;
  radius: number;
  seconds: number;
  count: number;
}
