import { RELICS } from "./ascension.js";
import { ARCHETYPE_RECIPES } from "./archetypes.js";
export const PASSIVES = [
  "power",
  "haste",
  "vitality",
  "speed",
  "magnet",
  "armor",
  "recovery",
  "precision",
  "focus",
  "breadth",
  "endurance",
  "barrier",
  "fervor",
];
export const BUILD_LIMITS = { relics: 3, passives: 4 };
const recipe = (id, weapon, passive, name, summary, hero = "all") => ({
  id,
  weapon,
  passive,
  name,
  summary,
  hero,
  rank: weapon === "active" ? 5 : 8,
  passiveRank: 3,
});
export const RECIPES = [
  ...ARCHETYPE_RECIPES,
  recipe(
    "rook-soul",
    "signature",
    "armor",
    "Mountain's verdict",
    "Poised attacks scatter stone shards",
    "rook",
  ),
  recipe(
    "lumen-soul",
    "signature",
    "precision",
    "Lunar cascade",
    "Charged volleys burst at the target",
    "lumen",
  ),
  recipe(
    "rook-skill",
    "active",
    "vitality",
    "Eternal fortress",
    "Casting fills poise and fires stone shards",
    "rook",
  ),
  recipe(
    "lumen-skill",
    "active",
    "focus",
    "Moon dominion",
    "Casting doubles the storm and leaves a moon field",
    "lumen",
  ),
  recipe(
    "cinder-soul",
    "signature",
    "power",
    "Phoenix hail",
    "Burning kills scatter fire",
    "cinder",
  ),
  recipe(
    "briar-soul",
    "signature",
    "vitality",
    "Thorn citadel",
    "Seedlings bloom a healing ward",
    "briar",
  ),
  recipe(
    "nyx-soul",
    "signature",
    "precision",
    "Endless eclipse",
    "Dash leaves a blade tempest",
    "nyx",
  ),
  recipe(
    "volta-soul",
    "signature",
    "haste",
    "Storm lattice",
    "Periodic thunder roots the horde",
    "volta",
  ),
  recipe(
    "aegis",
    "orbit",
    "armor",
    "Astral aegis",
    "Orbit pulses grant shield",
  ),
  recipe(
    "choir",
    "nova",
    "focus",
    "Death knell",
    "Echoing pulses root enemies",
  ),
  recipe(
    "swarm",
    "familiar",
    "magnet",
    "Soul swarm",
    "Wisps arc through nearby foes",
  ),
  recipe(
    "winter",
    "frost",
    "recovery",
    "Absolute zero",
    "Chilled kills shatter into ice",
  ),
  recipe(
    "cataclysm",
    "meteor",
    "power",
    "Cataclysm",
    "Starfalls leave burning fissures",
  ),
  recipe(
    "harvester",
    "scythe",
    "precision",
    "Soul harvester",
    "Scythe kills heal and burst",
  ),
  recipe(
    "cinder-skill",
    "active",
    "focus",
    "Solar dominion",
    "Casting launches eight sun embers",
    "cinder",
  ),
  recipe(
    "briar-skill",
    "active",
    "vitality",
    "Eden's refuge",
    "Casting grants a living shield",
    "briar",
  ),
  recipe(
    "nyx-skill",
    "active",
    "speed",
    "Shadow regent",
    "Casting summons a blade shadow",
    "nyx",
  ),
  recipe(
    "volta-skill",
    "active",
    "haste",
    "Event horizon",
    "Casting leaves a gravity storm",
    "volta",
  ),
];
export function recipesFor(g) {
  return RECIPES.filter((r) => r.hero === "all" || r.hero === g.hero.id);
}
export function buildSlots(g, group) {
  return (group === "relics" ? RELICS : PASSIVES).filter(
    (id) => g.rank(id) > 0,
  );
}
export function upgradeFits(g, id) {
  const group = RELICS.includes(id)
    ? "relics"
    : PASSIVES.includes(id)
      ? "passives"
      : null;
  return (
    !group ||
    g.rank(id) > 0 ||
    buildSlots(g, group).length < BUILD_LIMITS[group]
  );
}
export function evolutionLock(g, r) {
  if (g.evolutions[r.weapon]) return "EVOLVED";
  if (g.level < 12) return "LV 12";
  if (g.time < 180) return "03:00";
  if (g.rank(r.weapon) < r.rank) return `${r.weapon} ${r.rank}`;
  if (g.rank(r.passive) < r.passiveRank) return `${r.passive} ${r.passiveRank}`;
  if (g.evolutionSeals < 1) return "SEAL";
  return "";
}
export function evolve(g, id) {
  const r = recipesFor(g).find((r) => r.id === id);
  if (
    !r ||
    !["paused", "levelup", "playing"].includes(g.state) ||
    evolutionLock(g, r)
  )
    return false;
  g.evolutionSeals--;
  g.evolutions[r.weapon] = r.id;
  g.recalculate();
  g.event(`EVOLVED · ${r.name.toUpperCase()}`);
  g.events.push({ type: "skill" });
  return true;
}
export function evolvedKill(g, e) {
  if (g.evolutionProc > 0) return;
  const sig = g.evolutions.signature;
  if (sig === "cinder-soul" && e.dotTime > 0) {
    g.radial(e.x, e.y, 5, 24 + g.rank("signature") * 5, "ember");
    g.evolutionProc = 0.4;
  }
  if (g.evolutions.frost && e.slow > 0) {
    g.zones.push({
      x: e.x,
      y: e.y,
      r: 100,
      life: 0.1,
      tick: 0,
      damage: 20 + g.rank("frost") * 5,
      kind: "explosion",
    });
    g.effect("burst", e.x, e.y, { r: 100, color: "#c0eef5" });
    g.evolutionProc = 0.35;
  }
  if (g.evolutions.scythe && e.lastWeapon === "scythe") {
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + 1.5);
    g.radial(e.x, e.y, 5, 20 + g.rank("scythe") * 4, "scythe");
    g.evolutionProc = 0.5;
  }
}
export function evolvedSkill(g) {
  if (!g.evolutions.active) return;
  const p = g.p;
  if (g.hero.id === "cinder")
    g.radial(p.x, p.y, 8, 30 * g.skillPower, "ember", {
      channel: "active",
      pierce: 2,
    });
  if (g.hero.id === "briar")
    p.shield = Math.min(120, p.shield + 35 * Math.sqrt(g.skillPower));
  if (g.hero.id === "nyx")
    g.shadows.push({ x: p.x, y: p.y, life: 7, attack: 0.1 });
  if (g.hero.id === "volta")
    g.zones.push({
      x: p.x,
      y: p.y,
      r: 230,
      life: 7,
      tick: 0.2,
      damage: 20 * g.skillPower,
      kind: "vortex",
    });
}
export function evolvedDash(g) {
  if (g.evolutions.signature === "nyx-soul")
    g.radial(g.p.x, g.p.y, 12, 35 + g.rank("signature") * 6, "knife", {
      pierce: 3,
    });
}
export function updateEvolutions(g, dt) {
  g.evolutionProc = Math.max(0, g.evolutionProc - dt);
  g.evolutionTimer -= dt;
  if (g.evolutionTimer > 0) return;
  g.evolutionTimer = 3;
  const p = g.p;
  if (g.evolutions.orbit) {
    g.p.shield = Math.min(65, p.shield + 5);
    g.area(p.x, p.y, 170, 12 + g.rank("orbit") * 4, "blade");
    g.effect("ring", p.x, p.y, { r: 170, color: "#efd397" });
  }
  if (g.evolutions.nova) {
    g.area(p.x, p.y, 240, 20 + g.rank("nova") * 10, "nova");
    for (const e of g.enemies)
      if (!e.reaper && Math.hypot(e.x - p.x, e.y - p.y) < 240)
        e.stun = Math.max(e.stun, 0.5);
    g.effect("ring", p.x, p.y, { r: 240, color: "#ddbd9d" });
  }
  if (
    g.evolutions.signature === "briar-soul" &&
    g.plants.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 160)
  ) {
    p.hp = Math.min(p.maxHp, p.hp + 3);
    p.shield = Math.min(50, p.shield + 4);
    g.effect("heal", p.x, p.y, { r: 70, color: "#bddda0" });
  }
  if (g.evolutions.signature === "volta-soul") {
    g.area(p.x, p.y, 240, 30 + g.rank("signature") * 6, "arc");
    for (const e of g.enemies)
      if (!e.reaper && Math.hypot(e.x - p.x, e.y - p.y) < 240)
        e.stun = Math.max(e.stun, 0.7);
    g.effect("sun", p.x, p.y, { r: 240, color: "#bce8ee" });
  }
}
