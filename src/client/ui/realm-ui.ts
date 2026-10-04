import type { RealmApi } from "./api.ts";
import { element as $ } from "../dom.ts";
import { REALMS, FINDS } from "../../game/world/realms.ts";
import { CATALYSTS } from "../../game/progression/journey.ts";
import {
  recipesFor,
  evolutionLock,
  buildSlots,
  BUILD_LIMITS,
} from "../../game/progression/evolutions.ts";
import { drawMap } from "../rendering/cartography.ts";
import { drawCodexSprites } from "../rendering/pixel-art.ts";
import { icon } from "./icons.ts";
import { UPGRADES } from "../../game/index.ts";

const head = (label: string, title: string) =>
  `<div class="modal-head"><div><span class="modal-eyebrow">${label}</span><h2 id="modal-title">${title}</h2></div><button class="modal-close" aria-label="Close dialog">×</button></div>`;
export function createRealmUI(api: RealmApi) {
  let returnState: string | null = null;
  function enter() {
    const g = api.game();
    returnState = g?.state || null;
    if (g?.state === "playing") g.state = "paused";
  }
  function close() {
    const g = api.game();
    if (g && returnState) g.state = returnState;
    api.close();
    if (g?.state === "levelup") api.level();
  }
  function wire() {
    document.querySelector<HTMLElement>(".modal-close")!.onclick = close;
    drawCodexSprites($("modal-panel"));
  }
  function showRealms() {
    enter();
    const s = api.save(),
      hero = api.hero();
    api.modal(
      "realms",
      `${head("EXPEDITIONS", "Choose a realm")}<div class="realm-grid">${REALMS.map((m) => `<button class="realm-card ${s.realm === m.id ? "selected" : ""}" data-realm="${m.id}" style="--realm:${m.color}"><div class="realm-landscape biome-${m.biome}"><canvas width="220" height="170" data-art="${m.art}"></canvas><span>${icon(m.biome === 0 ? "leaf" : m.biome === 1 ? "flame" : "star")}</span></div><h3>${m.name}</h3><div class="realm-metrics"><span title="Map dimensions">${icon("eye")} ${m.width / 1000} × ${m.height / 1000}k</span><span title="Reapers arrive">${icon("blade")} ${Math.floor(m.doom / 60)}:${String(m.doom % 60).padStart(2, "0")}</span></div><div class="memory-pips" title="${hero.name}'s permanent memories">${[10, 11, 12, 13].map((i) => `<i class="${s.memories?.[hero.id]?.[`${m.id}:${i}`] ? "lit" : ""}">${icon("book")}</i>`).join("")}</div><small>${s.realm === m.id ? "✓ SELECTED" : "SELECT"}</small></button>`).join("")}</div><div class="map-legend">${Object.entries(
        FINDS,
      )
        .map(
          ([id, f]) =>
            `<span style="--find:${f.color}">${icon(f.icon)}${f.name}${f.permanent ? " · permanent" : ""}</span>`,
        )
        .join(
          "",
        )}</div><details class="power-details"><summary>Expedition guide</summary><p>Each run rolls new treasure types and locations. Walk over a landmark to collect it. Open [M] to set a waypoint. Elder seals unlock recipes; memories become permanent when you bank. Each realm has four unique memories per hero; a random two to four appear each run. Revisited memories give embers.</p></details><div class="modal-foot"><span>14 random landmarks / run</span><button class="secondary" id="realm-done">Ready</button></div>`,
    );
    wire();
    $("realm-done").onclick = close;
    for (const b of document.querySelectorAll<HTMLElement>("[data-realm]"))
      b.onclick = () => {
        s.realm = b.dataset.realm!;
        api.persist();
        api.refresh();
        api.sound();
        showRealms();
      };
  }
  function showMap() {
    const g = api.game();
    if (!g || !["playing", "paused"].includes(g.state)) return;
    enter();
    api.modal(
      "worldmap",
      `${head(`${g.findsCollected}/14 FOUND · ${g.foundMemories.length} MEMORIES`, g.realm.name)}<canvas id="world-map" width="960" height="720" aria-label="World map. Select a destination to set a waypoint."></canvas><div id="map-destination">Select a destination</div><div class="map-legend">${Object.entries(
        FINDS,
      )
        .map(
          ([id, f]) =>
            `<span style="--find:${f.color}">${icon(f.icon)}${f.name}</span>`,
        )
        .join(
          "",
        )}</div><div class="modal-foot"><button class="secondary" id="clear-waypoint">× Waypoint</button><button class="primary" id="map-done">Return [M]</button></div>`,
    );
    wire();
    const canvas = $<HTMLCanvasElement>("world-map"),
      layout = drawMap(canvas, g, true);
    if (g.catalysts.length) {
      const tracker = document.createElement("div");
      tracker.className = "catalyst-tracker";
      tracker.innerHTML = g.catalysts
        .map(
          (item) =>
            `<button data-track-catalyst="${item.id}" style="--find:${CATALYSTS[item.kind].color}" title="Track ${CATALYSTS[item.kind].name}">${icon(CATALYSTS[item.kind].icon)}<span>${{ core: "Core", rune: "Rune", sigil: "Sigil" }[item.kind]}</span><b>${Math.ceil(item.expires - g.time)}s</b></button>`,
        )
        .join("");
      canvas.after(tracker);
      for (const b of tracker.querySelectorAll<HTMLElement>("button"))
        b.onclick = () => {
          const item = g.catalysts.find(
            (i) => i.id === b.dataset.trackCatalyst!,
          );
          if (!item) return;
          g.waypoint = { x: item.x, y: item.y, id: item.id };
          $("map-destination").textContent =
            `${CATALYSTS[item.kind].name} · ${Math.round(Math.hypot(item.x - g.p.x, item.y - g.p.y))}m`;
          drawMap(canvas, g, true);
          api.refresh();
        };
    }
    canvas.onclick = (e) => {
      const r = canvas.getBoundingClientRect(),
        x =
          (((e.clientX - r.left) / r.width) * canvas.width - canvas.width / 2) /
          layout!.scale,
        y =
          (((e.clientY - r.top) / r.height) * canvas.height -
            canvas.height / 2) /
          layout!.scale;
      if (Math.abs(x) > g.realm.width / 2 || Math.abs(y) > g.realm.height / 2)
        return;
      const near = [...g.finds, ...g.catalysts]
        .filter((f) => !("taken" in f && f.taken))
        .sort(
          (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
        )[0];
      g.waypoint =
        near && Math.hypot(near.x - x, near.y - y) < 220
          ? { x: near.x, y: near.y, id: near.id }
          : { x, y };
      const label = g.waypoint.id
        ? (CATALYSTS[near.kind] || FINDS[near.kind]).name
        : "Waypoint";
      $("map-destination").textContent =
        `${label} · ${Math.round(Math.hypot(g.waypoint.x - g.p.x, g.waypoint.y - g.p.y))}m`;
      drawMap(canvas, g, true);
      api.refresh();
    };
    $("map-done").onclick = close;
    $("clear-waypoint").onclick = () => {
      g.waypoint = null;
      drawMap(canvas, g, true);
      $("map-destination").textContent = "Select a destination";
    };
  }
  function showEvolutions(initial = true) {
    const g = api.game();
    if (!g || !["playing", "paused", "levelup"].includes(g.state)) return;
    if (initial) enter();
    const recipes = recipesFor(g);
    api.modal(
      "evolutions",
      `${head(`${g.evolutionSeals} ELDER SEALS`, "Evolutions")}<div class="build-slot-row"><span>${icon("orbit")} ${buildSlots(g, "relics").length}/${BUILD_LIMITS.relics}</span><span>${icon("book")} ${buildSlots(g, "passives").length}/${BUILD_LIMITS.passives}</span><span title="Earliest evolution">${icon("star")} LV12 · 03:00</span></div><div class="evolution-grid">${recipes
        .map((r) => {
          const lock = evolutionLock(g, r),
            done = !!g.evolutions[r.weapon],
            weapon = r.weapon === "signature" ? g.hero.id : r.weapon;
          return `<article class="recipe-card ${done ? "evolved" : !lock ? "ready" : ""}"><div class="recipe-icons"><span title="${r.weapon === "signature" ? g.hero.weapon : r.weapon === "active" ? g.hero.skill : UPGRADES[r.weapon].name}">${icon(weapon)}<b class="${g.rank(r.weapon) >= r.rank ? "met" : ""}">${g.rank(r.weapon)}/${r.rank}</b></span><i>+</i><span title="${UPGRADES[r.passive].name}">${icon(r.passive)}<b class="${g.rank(r.passive) >= r.passiveRank ? "met" : ""}">${g.rank(r.passive)}/${r.passiveRank}</b></span><i>+</i><span>${icon("star")}<b>${g.evolutionSeals ? "1" : "0"}</b></span></div><h3>${r.name}</h3><p>${r.summary}</p><button class="secondary" data-evolve="${r.id}" ${lock ? "disabled" : ""}>${done ? "✓ EVOLVED" : !lock ? "EVOLVE" : "◇ " + lock.replace(/signature|active/gi, "rank")}</button></article>`;
        })
        .join(
          "",
        )}</div><div class="modal-foot"><span>All weapon ranks continue beyond evolution</span><button class="primary" id="evolutions-done">Return</button></div>`,
    );
    wire();
    $("evolutions-done").onclick = close;
    for (const b of document.querySelectorAll<HTMLElement>("[data-evolve]"))
      b.onclick = () => {
        if (g.evolve(b.dataset.evolve!)) {
          api.sound();
          api.refresh();
          showEvolutions(false);
        }
      };
  }
  return { showRealms, showMap, showEvolutions, close };
}
