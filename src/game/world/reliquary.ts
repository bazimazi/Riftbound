import type { Save } from "../types.ts";
import type { Game } from "../Game.ts";
import { worldPoint } from "./realms.ts";
import { upgradeFits } from "../progression/evolutions.ts";
// Expedition goals and treasures are independent of frame rate and rendering.
export const ARTIFACTS = [
  {
    id: "hourglass",
    name: "Borrowed time",
    icon: "focus",
    color: "#8ed9d8",
    tag: "TEMPO",
    summary: "12% faster skills",
    desc: "Active skill recovery improves by 12% per rank, with diminishing returns.",
  },
  {
    id: "crown",
    name: "Bloodglass crown",
    icon: "blade",
    color: "#ed9c9f",
    tag: "SACRIFICE",
    summary: "+22% damage · −8% HP",
    desc: "Gain 22% damage per rank, but sacrifice 8% maximum health per rank.",
  },
  {
    id: "greaves",
    name: "Windborne",
    icon: "wings",
    color: "#a7e0cf",
    tag: "MOMENTUM",
    summary: "Dash → attack speed",
    desc: "For four seconds after dashing, attack 15% faster per rank.",
  },
  {
    id: "heart",
    name: "Obsidian heart",
    icon: "heart",
    color: "#dd9a77",
    tag: "BULWARK",
    summary: "+12% HP · −3% speed",
    desc: "Gain 12% maximum health per rank, at the cost of 3% movement speed per rank. Heal the health gained when claimed.",
  },
  {
    id: "grimoire",
    name: "Astral grimoire",
    icon: "book",
    color: "#c7afe9",
    tag: "KNOWLEDGE",
    summary: "+12% XP · +1 reroll",
    desc: "Gain 12% experience per rank and an extra upgrade reroll each time this artifact is claimed.",
  },
  {
    id: "seed",
    name: "Worldseed",
    icon: "leaf",
    color: "#b7d68c",
    tag: "LIFE",
    summary: "Skill → living garden",
    desc: "Each skill cast grows one attacking seedling per rank, regardless of your hero.",
  },
  {
    id: "mirror",
    name: "Echo of the veil",
    icon: "eye",
    color: "#c6afe9",
    tag: "ECHO",
    summary: "Skill → attacking shadow",
    desc: "Each skill cast creates a knife-throwing shadow lasting 3 seconds plus 1 second per rank. At most three shadows can exist.",
  },
  {
    id: "sun",
    name: "Pocket sun",
    icon: "star",
    color: "#edc784",
    tag: "RADIANCE",
    summary: "Radiant pulse every 8s",
    desc: "Every eight seconds, strike nearby enemies for (24 + 3 × hero level) damage per rank. Its pulse grows stronger with your level.",
  },
  {
    id: "lantern",
    name: "Storm in a bottle",
    icon: "bolt",
    color: "#86d6e9",
    tag: "DISCHARGE",
    summary: "Dash → lightning volley",
    desc: "Dashing releases eight piercing bolts dealing (18 + 3 × hero level) damage per rank.",
  },
];
export const CONTRACTS: Array<{
  id: string;
  name: string;
  icon: string;
  metric: "kills" | "bossesKilled" | "time";
  base: number;
  step: number;
  unit: string;
  reward: number;
}> = [
  {
    id: "hunt",
    name: "Thin the horde",
    icon: "blade",
    metric: "kills",
    base: 180,
    step: 80,
    unit: "slain",
    reward: 45,
  },
  {
    id: "warden",
    name: "Kings of the hollow",
    icon: "shield",
    metric: "bossesKilled",
    base: 1,
    step: 1,
    unit: "wardens",
    reward: 75,
  },
  {
    id: "endure",
    name: "Until the last light",
    icon: "lantern",
    metric: "time",
    base: 180,
    step: 45,
    unit: "survived",
    reward: 60,
  },
];
export const artifactRank = (game: Game, id: string) =>
  game.artifacts?.[id] || 0;
export function contractFor(save: Save, id: string = save.contract || "hunt") {
  const c = CONTRACTS.find((c) => c.id === id) || CONTRACTS[0];
  const tier = Math.max(0, Math.floor(save.contracts?.[c.id] || 0));
  return {
    ...c,
    tier,
    target: c.base + tier * c.step,
    embers: c.reward + tier * 20,
    shards:
      c.id === "warden"
        ? 1 + Math.floor(tier / 3)
        : (tier + 1) % 3 === 0
          ? 1
          : 0,
  };
}
export const contractProgress = (g: Game) =>
  Math.min(g.contract.target, Math.floor(g[g.contract.metric] || 0));
export function bankContract(save: Save, g: Game) {
  if (g.contractBanked || contractProgress(g) < g.contract.target) return false;
  g.contractBanked = true;
  save.contracts ??= {};
  save.contracts[g.contract.id] = Math.max(
    save.contracts[g.contract.id] || 0,
    g.contract.tier + 1,
  );
  save.embers += g.contract.embers;
  save.embersEarned += g.contract.embers;
  save.shards += g.contract.shards;
  return true;
}
export function initExpedition(g: Game) {
  g.artifacts = {};
  g.vault = null;
  g.nextVault = 90;
  g.vaultsCleared = 0;
  g.artifactChoices = [];
  g.contract = contractFor(g.save);
  g.contractReady = false;
  g.contractBanked = false;
  g.sunTimer = 8;
  g.dashHaste = 0;
}
export function beginVault(g: Game) {
  const v = g.vault;
  if (
    g.state !== "playing" ||
    !v ||
    v.state !== "waiting" ||
    Math.hypot(g.p.x - v.x, g.p.y - v.y) > 95
  )
    return false;
  g.events.push({ type: "beacon" });
  v.state = "defending";
  v.remaining = 38;
  v.progress = 0;
  v.wave = 0;
  g.event("HOLD THE BEACON · Stay inside the ring");
  return true;
}
function offerArtifacts(g: Game) {
  const owned = Object.keys(g.artifacts);
  const pool = ARTIFACTS.filter(
    (a) =>
      artifactRank(g, a.id) < 3 && (owned.length < 4 || owned.includes(a.id)),
  );
  g.artifactChoices = [];
  while (pool.length && g.artifactChoices.length < 3)
    g.artifactChoices.push(
      pool.splice(Math.floor(g.random() * pool.length), 1)[0],
    );
  if (!g.artifactChoices.length) {
    g.shards++;
    const reward = upgradeFits(g, "power") ? "power" : "active";
    g.ranks[reward] = (g.ranks[reward] || 0) + 2;
    g.recalculate();
    g.event(
      `VAULT MASTERED · +2 ${reward === "power" ? "Ruin" : "Soul skill"} · +1 shard`,
    );
    return;
  }
  g.state = "reliquary";
}
export function claimArtifact(g: Game, id: string) {
  if (
    g.state !== "reliquary" ||
    !g.artifactChoices.some((a) => a.id === id) ||
    artifactRank(g, id) >= 3
  )
    return false;
  if (!g.artifacts[id] && Object.keys(g.artifacts).length >= 4) return false;
  const hp = g.p.maxHp;
  g.artifacts[id] = artifactRank(g, id) + 1;
  if (id === "grimoire") g.rerolls++;
  g.recalculate();
  if (id === "heart")
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + Math.max(0, g.p.maxHp - hp));
  g.events.push({ type: "treasure" });
  g.artifactChoices = [];
  g.state = g.pendingLevels > 0 ? "levelup" : "playing";
  g.event(
    `${ARTIFACTS.find((a) => a.id === id)!.name.toUpperCase()} · ${g.artifacts[id]}/3`,
  );
  return true;
}
export function updateExpedition(g: Game, dt: number) {
  g.dashHaste = Math.max(0, g.dashHaste - dt);
  if (!g.contractReady && contractProgress(g) >= g.contract.target) {
    g.contractReady = true;
    g.event("CONTRACT COMPLETE · Reward banks with your run");
  }
  g.sunTimer -= dt;
  if (artifactRank(g, "sun") && g.sunTimer <= 0) {
    g.sunTimer = 8;
    g.area(
      g.p.x,
      g.p.y,
      190,
      (24 + g.level * 3) * artifactRank(g, "sun"),
      "artifact",
    );
    g.effect("sun", g.p.x, g.p.y, { r: 190, color: "#ebc78e", duration: 0.7 });
  }
  if (g.time >= g.nextVault && !g.vault) {
    const angle = g.random() * Math.PI * 2;
    g.vault = {
      ...worldPoint(g, angle, 270),
      state: "waiting",
      life: 65,
      progress: 0,
    };
    g.event("A RELIQUARY APPEARS · Follow the cyan beacon");
  }
  const v = g.vault;
  if (!v) return;
  v.life -= dt;
  if (v.state === "waiting" && v.life <= 0) {
    g.vault = null;
    g.nextVault = g.time + 70;
    return;
  }
  if (v.state !== "defending") return;
  v.remaining! -= dt;
  const inside = Math.hypot(g.p.x - v.x, g.p.y - v.y) <= 110;
  v.progress = Math.max(0, Math.min(18, v.progress + dt * (inside ? 1 : -0.6)));
  const wave = Math.floor((38 - v.remaining!) / 7) + 1;
  if (wave > v.wave!) {
    v.wave = wave;
    for (let i = 0; i < 3; i++) {
      const before = g.enemies.length;
      g.spawnEnemy(i % 2 ? "runner" : "revenant", 280);
      if (g.enemies.length > before) {
        const e = g.enemies.at(-1);
        e!.elite = true;
        e!.hp *= 1.35;
        e!.maxHp = e!.hp;
        e!.guardian = true;
      }
    }
  }
  if (v.progress >= 18) {
    g.vaultsCleared++;
    g.embers += 15 + g.vaultsCleared * 5;
    g.effect("sun", v.x, v.y, { r: 180, color: "#9ee5de", duration: 1 });
    g.vault = null;
    g.nextVault = g.time + 95;
    offerArtifacts(g);
  } else if (v.remaining! <= 0) {
    g.vault = null;
    g.nextVault = g.time + 70;
    g.event("BEACON LOST · Another chance will come");
  }
}

export function salvageArtifact(g: Game) {
  if (g.state !== "reliquary" || !g.artifactChoices.length) return false;
  g.embers += 25;
  g.artifactChoices = [];
  g.state = g.pendingLevels > 0 ? "levelup" : "playing";
  g.event("SALVAGED · +25 embers");
  return true;
}
