// Each expedition rolls its own treasures; their locations stay fixed within that run.
import { ARCHETYPE_LEGACY } from "./archetypes.js";
export const REALMS = [
  {
    id: "hollow",
    name: "Hollow Wilds",
    biome: 0,
    width: 9600,
    height: 8000,
    color: "#a6cc8b",
    art: "tree",
    doom: 600,
  },
  {
    id: "ashen",
    name: "Ashen March",
    biome: 1,
    width: 12000,
    height: 7600,
    color: "#e5a17d",
    art: "brazier",
    doom: 570,
  },
  {
    id: "astral",
    name: "Starless Vale",
    biome: 2,
    width: 10000,
    height: 11000,
    color: "#b7a5e3",
    art: "crystal",
    doom: 540,
  },
];
export const FINDS = {
  fury: {
    name: "War idol",
    icon: "blade",
    art: "brazier",
    color: "#f1a079",
    summary: "+8% weapon damage",
    permanent: false,
  },
  flow: {
    name: "Moon spring",
    icon: "bolt",
    art: "mushrooms",
    color: "#92d9ce",
    summary: "+8% skill recovery",
    permanent: false,
  },
  reach: {
    name: "Wind shrine",
    icon: "wings",
    art: "arch",
    color: "#bee8a0",
    summary: "+6% speed · +25 pickup",
    permanent: false,
  },
  ward: {
    name: "Stone heart",
    icon: "shield",
    art: "rocks",
    color: "#d8c3a3",
    summary: "+30 shield · heal 15",
    permanent: false,
  },
  seal: {
    name: "Elder seal",
    icon: "star",
    art: "obelisk",
    color: "#f9db8e",
    summary: "+1 evolution seal",
    permanent: false,
  },
  memory: {
    name: "Ancestral memory",
    icon: "book",
    art: "altar",
    color: "#d9b0f7",
    summary: "Permanent hero legacy",
    permanent: true,
  },
};
export const LEGACY_TRAITS = {
  ...ARCHETYPE_LEGACY,
  rook: [
    [4, "Steady stone", "10% faster poise gain"],
    [8, "Ancient rampart", "Skills grant 5 extra shield"],
    [12, "Eternal watch", "Poised attacks restore 2 shield"],
  ],
  lumen: [
    [4, "Moon patience", "10% faster focus charge"],
    [8, "Silver veil", "Skills grant 4 extra shield"],
    [12, "Moon cycle", "Charged volleys recover 0.3s skill cooldown"],
  ],
  cinder: [
    [4, "Banked flame", "15% less heat loss"],
    [8, "Ash circle", "Skills leave a small pyre"],
    [12, "Cinder wings", "Dashes leave fire"],
  ],
  briar: [
    [4, "Old roots", "Seedlings last 3s longer"],
    [8, "Green ward", "Skills grant 8 shield"],
    [12, "Heartseed", "Skills grow an extra seedling"],
  ],
  nyx: [
    [4, "Swift dusk", "Momentum builds 20% faster"],
    [8, "Night echo", "Skills summon a 4s shadow"],
    [12, "Slipstream", "Dash recovers 8% faster"],
  ],
  volta: [
    [4, "Capacitor shell", "Overloads grant 4 shield"],
    [8, "Static ward", "Skills grant 8 shield"],
    [12, "Thundersong", "Overloads recover 0.4s skill cooldown"],
  ],
};
export function realmById(id) {
  return REALMS.find((m) => m.id === id) || REALMS[0];
}
export function constrain(g, o, margin = 32) {
  o.x = Math.max(
    -g.realm.width / 2 + margin,
    Math.min(g.realm.width / 2 - margin, o.x),
  );
  o.y = Math.max(
    -g.realm.height / 2 + margin,
    Math.min(g.realm.height / 2 - margin, o.y),
  );
  return o;
}
export function worldPoint(g, angle, radius, margin = 80) {
  return constrain(
    g,
    {
      x: g.p.x + Math.cos(angle) * radius,
      y: g.p.y + Math.sin(angle) * radius,
    },
    margin,
  );
}
function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function rollFinds(g) {
  const memoryCount = 2 + Math.floor(g.random() * 3),
    memoryIds = shuffle([10, 11, 12, 13], g.random).slice(0, memoryCount),
    kinds = ["fury", "flow", "reach", "ward", "seal"],
    weights = { fury: 3, flow: 3, reach: 3, ward: 3, seal: 1 },
    types = [...kinds];
  // Guarantee a useful mix, then roll extra treasures with bounded buff/seal counts.
  while (types.length < 14 - memoryCount) {
    const pool = kinds.flatMap((kind) =>
      types.filter((t) => t === kind).length < 3
        ? Array(weights[kind]).fill(kind)
        : [],
    );
    types.push(pool[Math.floor(g.random() * pool.length)]);
  }
  shuffle(types, g.random);
  const cells = shuffle(
      Array.from({ length: 16 }, (_, i) => i),
      g.random,
    ),
    memoryCells = cells
      .filter((i) => i < 4 || i >= 12 || i % 4 === 0 || i % 4 === 3)
      .slice(0, memoryCount),
    remainingCells = cells.filter((i) => !memoryCells.includes(i)),
    locations = [...memoryCells, ...remainingCells.slice(0, types.length)],
    records = [
      ...memoryIds.map((i) => ({ id: `${g.realm.id}:${i}`, kind: "memory" })),
      ...types.map((kind, i) => ({ id: `${g.realm.id}:find:${i}`, kind })),
    ];
  return shuffle(
    records.map((find, i) => {
      // Stratified, jittered cells avoid item piles and terminate even with a constant RNG.
      const cell = locations[i],
        point = {
          x:
            (((cell % 4) + 0.22 + g.random() * 0.56) / 4 - 0.5) * g.realm.width,
          y:
            ((Math.floor(cell / 4) + 0.22 + g.random() * 0.56) / 4 - 0.5) *
            g.realm.height,
        },
        distance = Math.hypot(point.x, point.y),
        minimum = find.kind === "memory" ? 3200 : 1100;
      if (distance < minimum) {
        point.x *= minimum / distance;
        point.y *= minimum / distance;
      }
      constrain(g, point, 160);
      return {
        ...find,
        ...point,
        taken: false,
        remembered:
          find.kind === "memory" && !!g.save.memories?.[g.hero.id]?.[find.id],
      };
    }),
    g.random,
  );
}
export function initRealm(g) {
  g.realm = realmById(g.save.realm);
  g.biome = g.realm.biome;
  g.finds = [];
  g.foundMemories = [];
  g.explored = new Set();
  g.exploration = { fury: 0, flow: 0, reach: 0 };
  g.findsCollected = 0;
  g.evolutionSeals = 0;
  g.nextReaper = g.realm.doom;
  g.reaperWave = 0;
  g.finds = rollFinds(g);
}
export function legacyBonus(save, hero) {
  // Only twelve unique memories exist per hero. Repeat visits cannot farm permanent power.
  const n = Object.keys(save.memories?.[hero] || {}).length;
  return {
    count: n,
    weapon: Math.min(12, n) * 0.005,
    skill: Math.min(12, n) * 0.0075,
    health: Math.floor(Math.min(12, n) / 3) * 3,
  };
}
export function collectFind(g, find) {
  if (!find || find.taken || !g.finds.includes(find) || g.state !== "playing")
    return false;
  find.taken = true;
  g.findsCollected++;
  const item = FINDS[find.kind];
  if (find.kind === "memory") {
    if (!find.remembered) g.foundMemories.push(find.id);
    else g.embers += 8;
    g.p.shield = Math.min(90, g.p.shield + 20);
  } else if (find.kind === "seal") g.evolutionSeals++;
  else if (find.kind === "ward") {
    g.p.shield = Math.min(90, g.p.shield + 30);
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + 15);
  } else g.exploration[find.kind]++;
  g.recalculate();
  g.effect("sun", find.x, find.y, { r: 95, color: item.color, duration: 0.9 });
  g.event(
    find.kind === "memory"
      ? find.remembered
        ? "MEMORY · +8 embers"
        : "MEMORY RECOVERED · bank to keep"
      : `${item.name.toUpperCase()} · ${item.summary}`,
  );
  g.events.push({ type: "cache" });
  return true;
}
export function updateRealm(g) {
  constrain(g, g.p);
  g.explored.add(
    `${Math.floor((g.p.x + g.realm.width / 2) / 240)},${Math.floor((g.p.y + g.realm.height / 2) / 240)}`,
  );
  for (const find of g.finds) {
    if (find.taken) continue;
    const d = Math.hypot(find.x - g.p.x, find.y - g.p.y);
    if (!find.guarded && ["seal", "memory"].includes(find.kind) && d < 300) {
      find.guarded = true;
      for (let i = 0; i < 3; i++) {
        const before = g.enemies.length;
        g.spawnEnemy(i ? "revenant" : "brute", 260);
        if (g.enemies.length > before) {
          const e = g.enemies.at(-1);
          e.elite = true;
          e.hp *= 1.6;
          e.maxHp = e.hp;
        }
      }
    }
    if (d < 44) collectFind(g, find);
  }
  if (g.waypoint && Math.hypot(g.waypoint.x - g.p.x, g.waypoint.y - g.p.y) < 55)
    g.waypoint = null;
  if (g.time >= g.nextReaper) {
    g.doomWarned = true;
    g.reaperWave++;
    g.nextReaper += Math.max(12, 32 - g.reaperWave * 2);
    const alive = g.enemies.filter((e) => e.reaper && e.hp > 0).length;
    for (
      let i = 0;
      i < Math.min(1 + Math.floor(g.reaperWave / 3), 8 - alive);
      i++
    )
      g.spawnEnemy("reaper", 520 + i * 80);
    g.event(
      g.reaperWave === 1
        ? "THE REAPERS ARRIVE"
        : `REAPER HUNT · ${g.reaperWave}`,
      2,
    );
    g.events.push({ type: "boss" });
  } else if (!g.doomWarned && g.time >= g.realm.doom - 30) {
    g.doomWarned = true;
    g.event("30 SECONDS UNTIL THE REAPER HUNT", 2);
  }
}
export function bankMemories(save, g) {
  save.memories ??= {};
  save.memories[g.hero.id] ??= {};
  for (const id of g.foundMemories) save.memories[g.hero.id][id] = true;
  save.realmRecords ??= {};
  const record = (save.realmRecords[g.realm.id] ||= { best: 0, finds: 0 });
  record.best = Math.max(record.best, g.time);
  record.finds += g.findsCollected;
}
