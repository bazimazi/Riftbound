import type { Game } from "../Game.ts";
// All cast abilities share build recovery. Floors preserve late-game pressure;
// sustained effects and anti-recursion gates keep their authored cadence.
export function recoveredCooldown(g: Game, seconds: number, floor = 0) {
  return Math.max(floor, seconds * (g.skillRecoveryScale ?? 1));
}

export function recoverSkills(g: Game, seconds: number, fraction = 0) {
  const reduce = (cd: number) => Math.max(0, cd * (1 - fraction) - seconds);
  g.p.skillCd = reduce(g.p.skillCd);
  if (g.formCooldowns) g.formCooldowns = g.formCooldowns.map(reduce);
  if (g.talentState) g.talentState.cooldown = reduce(g.talentState.cooldown);
  if (g.spellCooldowns)
    for (const id of Object.keys(g.spellCooldowns))
      g.spellCooldowns[id] = reduce(g.spellCooldowns[id]);
}
