import type { Save } from "../types.ts";
import { profile, heroLevel } from "./journey.ts";
import { SPELLS, SPELL_SLOTS } from "../data/spell-data.ts";

export function spellSlotLock(save: Save, hero: string) {
  const p = profile(save, hero),
    goal = SPELL_SLOTS[p.spellSlots];
  if (!goal) return "All slots unlocked";
  if (heroLevel(p.xp) < goal.level) return `Class LV ${goal.level}`;
  if ((save.chronicle?.[hero]?.bosses || 0) < goal.bosses)
    return `${goal.bosses} banked Wardens`;
  if (
    p.sparks < goal.sparks ||
    (["core", "rune", "sigil"] as const).some(
      (id) => p.materials[id] < goal[id],
    )
  )
    return "Gather catalysts";
  return "";
}
export function unlockSpellSlot(save: Save, hero: string) {
  if (spellSlotLock(save, hero)) return false;
  const p = profile(save, hero),
    goal = SPELL_SLOTS[p.spellSlots];
  p.sparks -= goal.sparks;
  for (const id of ["core", "rune", "sigil"] as const)
    p.materials[id] -= goal[id];
  p.spellSlots++;
  return true;
}
export function equipSpell(save: Save, hero: string, slot: number, id: string) {
  const p = profile(save, hero);
  if (!Number.isInteger(slot) || slot < 0 || slot >= p.spellSlots) return false;
  if (id && (SPELLS[id]?.hero !== hero || !p.talents[id])) return false;
  if (id) p.loadout = p.loadout.map((s) => (s === id ? "" : s));
  p.loadout[slot] = id;
  return true;
}
export function sanitizeSpellLoadout(save: Save, hero: string) {
  const p = profile(save, hero),
    seen = new Set<string>();
  p.spellSlots = Math.max(
    0,
    Math.min(3, Math.floor(Number(p.spellSlots) || 0)),
  );
  for (let i = 0; i < p.spellSlots; i++) {
    const goal = SPELL_SLOTS[i];
    if (
      heroLevel(p.xp) < goal.level ||
      (save.chronicle?.[hero]?.bosses || 0) < goal.bosses
    ) {
      p.spellSlots = i;
      break;
    }
  }
  p.loadout = Array.from({ length: 3 }, (_, i) => {
    const id = p.loadout?.[i];
    if (
      i >= p.spellSlots ||
      SPELLS[id]?.hero !== hero ||
      !p.talents[id] ||
      seen.has(id)
    )
      return "";
    seen.add(id);
    return id;
  });
}
