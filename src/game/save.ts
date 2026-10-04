import type { Game } from "./Game.ts";
import type { Save } from "./types.ts";
import { HEROES } from "./data/catalog.ts";
import { clamp } from "./math.ts";
import {
  FORGE,
  CODEX,
  forgeBonus,
  codexUnlocked,
} from "./progression/progression.ts";
import { REALMS, bankMemories } from "./world/realms.ts";
import { RESEARCH } from "./progression/ascension.ts";
import { ARTIFACTS, CONTRACTS, bankContract } from "./world/reliquary.ts";
import { EXTRA_HEROES, heroUnlocked } from "./combat/champions.ts";
import { sanitizeJourney, bankJourney } from "./progression/journey.ts";
import { sanitizeClassTalents } from "./progression/class-talents.ts";
import { sanitizeSpellLoadout } from "./progression/spell-progression.ts";
export function freshSave(): Save {
  return {
    version: 7,
    journeys: {},
    realm: "hollow",
    memories: {},
    realmRecords: {},
    contract: "hunt",
    contracts: {},
    artifactArchive: {},
    visuals: { motion: true, numbers: true, minimap: true },
    research: {},
    embers: 0,
    runs: 0,
    best: 0,
    kills: 0,
    forge: Object.fromEntries(FORGE.map((f) => [f.id, 0])),
    mastery: {},
    shards: 0,
    bosses: 0,
    elites: 0,
    caches: 0,
    embersEarned: 0,
    maxOath: 0,
    oath: 0,
    chronicle: {},
    bestiary: {},
    loadouts: Object.fromEntries(HEROES.map((h) => [h.id, ["pilgrim"]])),
    affinities: {},
    sound: false,
  };
}
export function sanitizeSave(value: unknown): Save {
  const raw = value as Partial<Save> | null;
  const clean = freshSave();
  if (!raw || typeof raw !== "object") return clean;
  for (const key of [
    "embers",
    "runs",
    "best",
    "kills",
    "shards",
    "bosses",
    "elites",
    "caches",
    "embersEarned",
    "maxOath",
    "oath",
  ] as const)
    clean[key] = clamp(Number(raw[key]) || 0, 0, 1e12);
  for (const f of FORGE)
    clean.forge[f.id] = Math.floor(
      clamp(Number(raw.forge?.[f.id]) || 0, 0, f.max),
    );
  for (const h of HEROES)
    clean.mastery[h.id] = Math.floor(
      clamp(Number(raw.mastery?.[h.id]) || 0, 0, 1e8),
    );
  clean.realm = REALMS.some((m) => m.id === raw.realm) ? raw.realm! : "hollow";
  for (const h of HEROES) {
    clean.memories[h.id] = {};
    for (const m of REALMS)
      for (const i of [10, 11, 12, 13]) {
        const id = `${m.id}:${i}`;
        if (raw.memories?.[h.id]?.[id] === true)
          clean.memories[h.id][id] = true;
      }
  }
  for (const m of REALMS)
    clean.realmRecords[m.id] = {
      best: clamp(Number(raw.realmRecords?.[m.id]?.best) || 0, 0, 1e7),
      finds: Math.floor(
        clamp(Number(raw.realmRecords?.[m.id]?.finds) || 0, 0, 1e9),
      ),
    };
  for (const hero of HEROES) {
    clean.research[hero.id] = {};
    for (const item of RESEARCH)
      clean.research[hero.id][item.id] = Math.floor(
        clamp(Number(raw.research?.[hero.id]?.[item.id]) || 0, 0, 1e6),
      );
    clean.chronicle[hero.id] = {};
    for (const key of [
      "kills",
      "bosses",
      "elites",
      "dashes",
      "skills",
      "evolutions",
      "best",
      "caches",
    ])
      clean.chronicle[hero.id][key] = clamp(
        Number(raw.chronicle?.[hero.id]?.[key]) || 0,
        0,
        1e10,
      );
    if (!raw.chronicle && clean.mastery[hero.id])
      clean.chronicle[hero.id].kills = clean.mastery[hero.id];
    clean.loadouts[hero.id] = Array.isArray(raw.loadouts?.[hero.id])
      ? [...new Set(raw.loadouts[hero.id])].filter((id) =>
          CODEX.some((p) => p.id === id),
        )
      : ["pilgrim"];
    clean.affinities[hero.id] = hero.talentIds.includes(
      raw.affinities?.[hero.id] || "",
    )
      ? raw.affinities![hero.id]
      : hero.talentIds[0];
  }
  for (const type of [
    "crawler",
    "runner",
    "spitter",
    "brute",
    "moth",
    "revenant",
    "shaman",
    "reaper",
    "boss",
  ])
    clean.bestiary[type] = clamp(Number(raw.bestiary?.[type]) || 0, 0, 1e10);
  clean.oath = Math.floor(clamp(clean.oath, 0, Math.min(99, clean.maxOath)));
  clean.maxOath = Math.floor(clamp(clean.maxOath, 0, 99));
  clean.contract = CONTRACTS.some((c) => c.id === raw.contract)
    ? raw.contract!
    : "hunt";
  for (const c of CONTRACTS)
    clean.contracts[c.id] = Math.floor(
      clamp(Number(raw.contracts?.[c.id]) || 0, 0, 1e5),
    );
  for (const a of ARTIFACTS)
    clean.artifactArchive[a.id] = Math.floor(
      clamp(Number(raw.artifactArchive?.[a.id]) || 0, 0, 1e8),
    );
  for (const key of ["motion", "numbers", "minimap"] as const)
    clean.visuals[key] = raw.visuals?.[key] !== false;
  for (const h of HEROES) {
    clean.journeys[h.id] = sanitizeJourney(
      raw.journeys?.[h.id],
      clean.mastery[h.id],
    );
    const bosses = clean.chronicle[h.id].bosses;
    clean.journeys[h.id].stage = Math.min(
      clean.journeys[h.id].stage,
      bosses >= 20 ? 2 : bosses >= 6 ? 1 : 0,
    );
    sanitizeClassTalents(clean, h.id);
    sanitizeSpellLoadout(clean, h.id);
  }
  clean.sound = raw.sound === true;
  return clean;
}
export function bankRun(save: Save, game: Game) {
  if (game.banked) return false;
  game.banked = true;
  const previous = CODEX.filter((p) => codexUnlocked(save, p)).map((p) => p.id);
  game.embers = Math.floor(
    game.embers *
      (1 +
        forgeBonus("fortune", save.forge.fortune) +
        game.oath * 0.25 +
        (game.hasPage("avarice") ? 0.2 : 0)),
  );
  save.embers += game.embers;
  save.embersEarned += game.embers;
  save.shards += game.shards;
  save.bosses += game.bossesKilled;
  save.elites += game.elitesKilled;
  save.caches += game.caches;
  save.runs++;
  save.kills += game.kills;
  save.best = Math.max(save.best, game.time);
  game.masteryEarned =
    game.kills +
    game.bossesKilled * 80 +
    Math.floor(game.time / 8) +
    Math.max(0, game.level - 1) * 12;
  save.mastery[game.hero.id] =
    (save.mastery[game.hero.id] || 0) + game.masteryEarned;
  const c = save.chronicle[game.hero.id] || {};
  for (const [key, value] of Object.entries({
    kills: game.kills,
    bosses: game.bossesKilled,
    elites: game.elitesKilled,
    dashes: game.stats.dashes,
    skills: game.stats.skills,
    evolutions: game.evolved() ? 1 : 0,
    caches: game.caches,
  }))
    c[key] = (c[key] || 0) + value;
  c.best = Math.max(c.best || 0, game.time);
  save.chronicle[game.hero.id] = c;
  for (const [id, count] of Object.entries(game.enemyKills))
    save.bestiary[id] = (save.bestiary[id] || 0) + count;
  if (game.bossesKilled > 0 && (game.oath === 0 || game.time >= 180))
    save.maxOath = Math.max(save.maxOath, Math.min(99, game.oath + 1));
  game.discoveries = CODEX.filter(
    (p) => codexUnlocked(save, p) && !previous.includes(p.id),
  );
  save.artifactArchive ??= {};
  for (const [id, rank] of Object.entries(game.artifacts))
    save.artifactArchive[id] = (save.artifactArchive[id] || 0) + rank;
  bankContract(save, game);
  bankMemories(save, game);
  bankJourney(save, game);
  game.heroUnlocks = EXTRA_HEROES.filter(
    (h) => !game.unlockedAtStart.includes(h.id) && heroUnlocked(save, h.id),
  );
  return true;
}
