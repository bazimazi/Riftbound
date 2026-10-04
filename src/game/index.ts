// Public simulation API. This layer has no browser or server dependencies.
export type {
  Hero,
  Save,
  Journey,
  Player,
  Enemy,
  Projectile,
  CombatEffect,
  Vec2,
} from "./types.ts";
export { Game, pressure } from "./Game.ts";
export { freshSave, sanitizeSave, bankRun } from "./save.ts";
export { HEROES, UPGRADES, EVOLUTIONS } from "./data/catalog.ts";
export { TAU, clamp, distance, formatTime } from "./math.ts";
export {
  FORGE,
  forgeBonus,
  forgeCost,
  buyForge,
} from "./progression/progression.ts";
