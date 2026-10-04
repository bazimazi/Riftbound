import { defineTable } from "../../shared/records.ts";
import type { Projectile } from "../types.ts";
import type { Action } from "../types.ts";
import type { Game } from "../Game.ts";
// Simulation time drives poses and release cues, so pause freezes the entire action.
export const MOTION = defineTable({
  vesper: { attack: 0.13, strike: 0.48, cast: 0.24, skill: 0.9 },
  fen: { attack: 0.1, strike: 0.38, cast: 0.16, skill: 0.72 },
  solace: { attack: 0.14, strike: 0.48, cast: 0.24, skill: 0.88 },
  orin: { attack: 0.14, strike: 0.46, cast: 0.2, skill: 0.8 },
  kestrel: { attack: 0.08, strike: 0.32, cast: 0.16, skill: 0.72 },
  morrow: { attack: 0.16, strike: 0.52, cast: 0.24, skill: 0.9 },
  cinder: { attack: 0.1, strike: 0.34, cast: 0.15, skill: 0.7 },
  briar: { attack: 0.12, strike: 0.45, cast: 0.18, skill: 0.82 },
  nyx: { attack: 0.07, strike: 0.28, cast: 0.1, skill: 0.55 },
  volta: { attack: 0.09, strike: 0.34, cast: 0.16, skill: 0.7 },
  rook: { attack: 0.15, strike: 0.48, cast: 0.2, skill: 0.82 },
  lumen: { attack: 0.13, strike: 0.4, cast: 0.17, skill: 0.72 },
});
export function aimAt(g: Game) {
  const target = g.nearest(g.p.x, g.p.y);
  return target
    ? Math.atan2(target.y - g.p.y, target.x - g.p.x)
    : Math.atan2(g.p.dy, g.p.dx);
}
export function startAction(
  g: Game,
  kind: string,
  angle: number = aimAt(g),
  released = false,
  windup?: number,
) {
  const old = g.p.action,
    profile = MOTION[g.hero.id];
  if (kind === "attack" && old && (old.kind === "skill" || old.age < 0.12))
    return old;
  if (kind === "attack" && old?.kind === "attack" && !old.released) {
    old.angle = angle;
    return old;
  }
  const releaseAt =
    windup ?? (kind === "skill" ? profile.cast : profile.attack);
  const duration = kind === "skill" ? profile.skill : profile.strike;
  g.p.action = {
    kind,
    angle,
    age: released ? releaseAt : 0,
    releaseAt,
    duration,
    released,
    empowered: g.p.trait >= 0.95,
    serial: (g.actionSerial = (g.actionSerial || 0) + 1),
  };
  return g.p.action;
}
export function actionFrame(action: Action | null | undefined) {
  if (!action) return 0;
  if (!action.released)
    return Math.min(
      1,
      Math.floor((action.age / Math.max(0.001, action.releaseAt)) * 2),
    );
  const after = Math.max(0, action.age - action.releaseAt),
    recovery = Math.max(0.001, action.duration - action.releaseAt);
  // Contact is quick; weight carries into a longer follow-through and settling.
  if (after < Math.min(0.04, recovery * 0.22)) return 2;
  if (after < recovery * 0.42) return 3;
  return after < recovery * 0.8 ? 4 : 5;
}
export function advanceMotion(g: Game, dt: number) {
  const action = g.p.action;
  if (action) {
    if (!g.moving) g.p.facing = Math.cos(action.angle);
    action.age += dt;
    if (action.age >= action.duration) g.p.action = null;
  }
  if (g.pendingSkill) {
    g.pendingSkill.remaining -= dt;
    if (g.pendingSkill.remaining <= 0.000001) {
      if (action?.kind === "skill") {
        action.released = true;
        action.age = Math.max(action.age, action.releaseAt);
      }
      g.skill(true);
      g.pendingSkill = null;
    }
  }
}
export function projectileHeight(b: Projectile) {
  const age = b.age || 0;
  return (
    (b.elevation || 0) +
    (b.type === "ember" ? Math.sin(Math.min(1, age / 0.65) * Math.PI) * 12 : 0)
  );
}
