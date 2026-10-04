import type { ProgressionApi } from "./api.ts";
import { element as $, optionalElement } from "../dom.ts";
import { ARTIFACTS } from "../../game/world/reliquary.ts";
import { heroUnlocked } from "../../game/combat/champions.ts";
import { artifactImage } from "./expedition-ui.ts";
import { icon } from "./icons.ts";
import { REALMS, legacyBonus, LEGACY_TRAITS } from "../../game/world/realms.ts";
import { RECIPES } from "../../game/progression/evolutions.ts";
import {
  RESEARCH,
  researchRank,
  researchBonus,
  researchCost,
  buyResearch,
} from "../../game/progression/ascension.ts";
import { HEROES, UPGRADES, formatTime } from "../../game/index.ts";
import {
  FORGE,
  forgeCost,
  forgeLock,
  forgeValue,
  totalForge,
  buyForge,
  masteryLevel,
  masteryTitle,
  masteryThreshold,
  CODEX,
  codexProgress,
  codexUnlocked,
  inscriptionSlots,
  equippedPages,
  toggleInscription,
  ENEMY_LORE,
  SYNERGIES,
} from "../../game/progression/progression.ts";
import { drawCodexSprites, artReady } from "../rendering/pixel-art.ts";

const heading = (eyebrow: string, title: string) =>
  `<div class="modal-head"><div><span class="modal-eyebrow">${eyebrow}</span><h2 id="modal-title">${title}</h2></div><button class="modal-close" aria-label="Close dialog">×</button></div>`;
export function createProgressionUI(api: ProgressionApi) {
  let forgeTab = "Arsenal",
    codexTab = "inscriptions";
  function close() {
    api.close();
  }
  function wire() {
    document
      .querySelector<HTMLElement>(".modal-close")
      ?.addEventListener("click", close);
    artReady.then(() => drawCodexSprites($("modal-panel")));
  }
  function showForge(tab = forgeTab) {
    forgeTab = tab;
    const save = api.save();
    api.modal(
      "forge",
      `${heading("SANCTUARY / THE EMBER FORGE", "Forge")}<div class="progression-intro"><p></p><div class="currency-pair"><span>✧ <b>${Math.floor(save.embers).toLocaleString()}</b></span><span>◈ <b>${save.shards}</b></span></div></div><nav class="screen-tabs">${["Arsenal", "Survival", "Wayfinding", "Occult", "Research"].map((t) => `<button data-forge-tab="${t}" class="${tab === t ? "active" : ""}">${t}<small>${t === "Research" ? RESEARCH.reduce((n, r) => n + researchRank(save, api.hero().id, r.id), 0) : FORGE.filter((f) => f.group === t).reduce((n, f) => n + save.forge[f.id], 0)} ranks</small></button>`).join("")}</nav><div class="forge-grid v2-forge">${FORGE.filter(
        (f) => f.group === tab,
      )
        .map((f) => {
          const rank = save.forge[f.id],
            lock = forgeLock(save, f),
            cost = forgeCost(rank, f.id),
            afford = save.embers >= cost && save.shards >= (f.shards || 0);
          return `<article class="forge-craft ${lock ? "locked" : ""}"><div class="craft-top"><span class="craft-icon">${icon(f.id)}</span><small>${f.linear ? "RARE CRAFT" : "SOULCRAFT"} / ${String(FORGE.indexOf(f) + 1).padStart(2, "0")}</small><b>${rank}/${f.max}</b></div><h3>${f.name}</h3><p>${f.desc}</p><div class="craft-values"><span>${forgeValue(f, rank)}</span><i>→</i><strong>${rank >= f.max ? "Mastered" : forgeValue(f, rank + 1)}</strong></div><div class="rank-segments">${Array.from({ length: f.max }, (_, i) => `<i class="${i < rank ? "filled" : ""}"></i>`).join("")}</div><button class="secondary craft-buy" data-buy="${f.id}" ${lock || !afford ? "disabled" : ""}>${lock || `✧ ${cost.toLocaleString()}${f.shards ? ` + ◈ ${f.shards}` : ""}`}</button></article>`;
        })
        .join(
          "",
        )}</div><div class="modal-foot"><span class="muted">${totalForge(save)} forge ranks · ${save.bosses} wardens</span><button class="secondary" id="forge-done">Return</button></div>`,
    );
    if (tab === "Research") {
      const hero = api.hero();
      document.querySelector<HTMLElement>(".forge-grid")!.innerHTML =
        `<div class="research-banner"><canvas width="135" height="145" data-art="${hero.id}"></canvas><div><span class="modal-eyebrow">${hero.name.toUpperCase()} / PERMANENT</span><h3>Research</h3><small>◈ / fifth rank</small></div></div>` +
        RESEARCH.map((r) => {
          const rank = researchRank(save, hero.id, r.id),
            cost = researchCost(rank, r.id);
          return `<article class="forge-craft research-craft"><div class="craft-top"><span class="craft-icon">${icon(r.icon)}</span><b>${rank} / ∞</b></div><h3>${r.name}</h3><p>${r.desc}</p><div class="craft-values"><span>+${Math.round(researchBonus(rank, r.id) * 1000) / 10}%</span><i>→</i><strong>+${Math.round(researchBonus(rank + 1, r.id) * 1000) / 10}%</strong></div><button class="secondary" data-research="${r.id}" ${save.embers < cost.embers || save.shards < cost.shards ? "disabled" : ""}>✧ ${cost.embers.toLocaleString()}${cost.shards ? ` · ◈ ${cost.shards}` : ""}</button></article>`;
        }).join("");
      for (const b of document.querySelectorAll<HTMLButtonElement>(
        "[data-research]",
      ))
        if (!heroUnlocked(save, hero.id)) {
          b.disabled = true;
          b.textContent = "Outcast locked";
        }
      for (const b of document.querySelectorAll<HTMLElement>("[data-research]"))
        b.onclick = () => {
          if (buyResearch(save, hero.id, b.dataset.research!)) {
            api.persist();
            api.refresh();
            api.sound();
            showForge("Research");
          }
        };
    }
    wire();
    $("forge-done").onclick = close;
    for (const b of document.querySelectorAll<HTMLElement>("[data-forge-tab]"))
      b.onclick = () => showForge(b.dataset.forgeTab!);
    for (const b of document.querySelectorAll<HTMLElement>("[data-buy]"))
      b.onclick = () => {
        if (buyForge(save, b.dataset.buy!)) {
          api.persist();
          api.refresh();
          api.sound();
          showForge(tab);
        }
      };
  }
  function showTalents() {
    api.journey();
  }
  function showCodex(tab = codexTab) {
    codexTab = tab;
    const save = api.save(),
      hero = api.hero(),
      equipped = equippedPages(save, hero.id),
      slots = inscriptionSlots(save),
      unlocked = CODEX.filter((p) => codexUnlocked(save, p)).length;
    let content = "";
    if (tab === "inscriptions")
      content = `<div class="inscription-loadout"><div><span class="section-label">${hero.name.toUpperCase()}'S INSCRIPTIONS</span><p>${equipped.length}/${slots} bound</p></div><div class="equipped-list">${Array.from(
        { length: slots },
        (_, i) => {
          const p = CODEX.find((p) => p.id === equipped[i]);
          return `<button class="inscription-slot ${p ? "filled" : ""}" data-unequip="${p?.id || ""}" ${p ? "" : "disabled"}>${p ? `${p.icon} ${p.name} ×` : "◇ Empty binding"}</button>`;
        },
      ).join("")}</div></div><div class="codex-grid">${CODEX.filter(
        (p) => p.hero === "all" || p.hero === hero.id,
      )
        .map((p) => {
          const open = codexUnlocked(save, p),
            value = codexProgress(save, p),
            active = equipped.includes(p.id);
          return `<article class="codex-card ${open ? "discovered" : "undiscovered"} ${active ? "equipped" : ""}"><div class="codex-card-top"><span>${icon(p.hero === "all" ? "book" : p.hero)}</span><small>${p.hero === "all" ? "UNIVERSAL INSCRIPTION" : `${hero.name.toUpperCase()} / FORGOTTEN PAGE`}</small></div><h3>${p.name}</h3><details class="codex-effect"><summary>Effect</summary><p>${p.desc}</p></details><div class="discovery-progress"><i style="width:${p.target ? (value / p.target) * 100 : 100}%"></i></div><small class="discovery-requirement">${open ? "DISCOVERED" : `${p.metric === "best" ? formatTime(value) : value} / ${p.metric === "best" ? formatTime(p.target) : p.target} ${p.metric === "best" ? "survived" : p.metric}${p.hero !== "all" ? ` as ${hero.name}` : ""}`}</small><button class="secondary" data-equip="${p.id}" ${!open || (!active && equipped.length >= slots) ? "disabled" : ""}>${active ? "✓ Bound · Remove" : !open ? "Locked" : equipped.length >= slots ? "Full" : "+ Bind"}</button></article>`;
        })
        .join("")}</div>`;
    if (tab === "treasures")
      content = `<p class="muted">Defend cyan beacons to recover artifacts. Bind up to four each run; empower each to rank 3.</p><div class="treasure-catalog">${ARTIFACTS.map((a) => `<article class="treasure-entry ${save.artifactArchive?.[a.id] || 0 ? "discovered" : "unfound"}" style="--relic:${a.color}">${artifactImage(a.id, 100)}<small>${a.tag}</small><h3>${a.name}</h3><p>${a.summary}</p><details><summary>Details</summary><p>${a.desc}</p></details><span>${save.artifactArchive?.[a.id] ? `${save.artifactArchive[a.id]} ranks recovered` : "Awaiting discovery"}</span></article>`).join("")}</div>`;
    if (tab === "legacy")
      content = `<div class="legacy-grid">${HEROES.map((h) => {
        const bonus = legacyBonus(save, h.id);
        return `<article class="legacy-card"><canvas width="130" height="160" data-art="${h.id}"></canvas><div><h3>${h.name}</h3><div class="legacy-stats"><span title="Weapon potency">${icon("blade")} +${+(bonus.weapon * 100).toFixed(2)}%</span><span title="Skill potency">${icon("bolt")} +${+(bonus.skill * 100).toFixed(2)}%</span><span title="Health">${icon("heart")} +${bonus.health}</span></div>${REALMS.map((m) => `<div class="legacy-realm"><span style="color:${m.color}">${m.name}</span><div class="memory-pips">${[10, 11, 12, 13].map((i) => `<i class="${save.memories?.[h.id]?.[`${m.id}:${i}`] ? "lit" : ""}">${icon("book")}</i>`).join("")}</div></div>`).join("")}<div class="legacy-traits">${LEGACY_TRAITS[h.id].map(([n, name, desc]) => `<span class="${bonus.count >= n ? "unlocked" : ""}" title="${desc}">${icon(bonus.count >= n ? "star" : "book")}<b>${n}</b> ${name}</span>`).join("")}</div></div></article>`;
      }).join(
        "",
      )}</div><details class="power-details"><summary>Memory bonuses</summary><p>Each recovered memory adds 0.5% weapon and 0.75% skill potency. Every three memories adds 3 health. Collect and bank all twelve per hero. Revisited memories grant eight embers. The small permanent gains reward exploration without overwhelming future runs.</p></details>`;
    if (tab === "bestiary")
      content = `<p>Records are written when an expedition ends. Discover a creature by defeating it.</p><div class="bestiary-grid">${ENEMY_LORE.map(
        ([id, name, lore]) => {
          const kills = save.bestiary[id] || 0;
          return `<article class="bestiary-entry ${kills ? "" : "undiscovered"}"><canvas width="105" height="100" data-art="${id === "reaper" ? "revenant" : id}" aria-label="${name}"></canvas><div><small>${kills ? "FIELD RECORD" : "UNDISCOVERED"}</small><h3>${name}</h3><details><summary>Behavior</summary><p>${lore}</p></details><strong>${kills.toLocaleString()} defeated</strong></div></article>`;
        },
      ).join("")}</div>`;
    if (tab === "synergies" || tab === "combos")
      content = `<p>These combinations activate automatically during a run.</p><div class="codex-grid">${SYNERGIES.map(
        (s) =>
          `<article class="codex-card"><div class="codex-card-top"><span>${s.icon}</span><small>BUILD RECIPE</small></div><h3>${s.name}</h3><p>${s.desc}</p><div class="recipe">${Object.entries(
            s.requires,
          )
            .map(([id, r]) => `<span>${UPGRADES[id].name} <b>${r}</b></span>`)
            .join("<i>+</i>")}</div></article>`,
      ).join(
        "",
      )}</div><div class="relic-catalog"><h3>The relic collection</h3><div>${["orbit", "nova", "familiar", "frost", "meteor", "scythe"].map((id) => `<article><span>${UPGRADES[id].icon}</span><strong>${UPGRADES[id].name}</strong><p>${UPGRADES[id].desc}</p></article>`).join("")}</div></div>`;
    if (tab === "synergies")
      content = `<div class="build-slot-row"><span>${icon("orbit")} 3 RELICS</span><span>${icon("book")} 4 PASSIVES</span><span>${icon("star")} 1 SEAL · LV12 · 03:00</span></div><div class="evolution-grid">${RECIPES.filter(
        (r) => r.hero === "all" || r.hero === hero.id,
      )
        .map(
          (r) =>
            `<article class="recipe-card"><div class="recipe-icons"><span>${icon(r.weapon === "signature" ? hero.id : r.weapon)}<b>${r.rank}</b></span><i>+</i><span>${icon(r.passive)}<b>3</b></span><i>+</i><span>${icon("star")}<b>1</b></span></div><h3>${r.name}</h3><p>${r.summary}</p></article>`,
        )
        .join(
          "",
        )}</div><button class="secondary" id="codex-combos">${icon("star")} ${SYNERGIES.length} automatic combinations</button>`;
    if (tab === "combos")
      content =
        content.split('<div class="relic-catalog">')[0] +
        '<button class="secondary" id="codex-recipes">Evolution recipes ↗</button>';
    if (tab === "mastery")
      content = `<div class="mastery-milestones"><span><b>III</b> Starting affinity</span><span><b>V</b> Extra reroll</span><span><b>VIII</b> Ascendant title</span><span><b>XII</b> +3% critical chance</span></div><div class="bestiary-grid">${HEROES.map(
        (h) => {
          const xp = save.mastery[h.id] || 0,
            level = masteryLevel(xp),
            c = save.chronicle[h.id] || {},
            lo = masteryThreshold(level),
            hi = masteryThreshold(level + 1);
          return `<article class="mastery-entry"><canvas width="110" height="135" data-art="${h.id}" aria-label="${h.name}"></canvas><div><small>${masteryTitle(level).toUpperCase()} / MASTERY ${level}</small><h3>${h.name}</h3><div class="mastery-track"><i style="width:${((xp - lo) / (hi - lo)) * 100}%"></i></div><p>${xp - lo} / ${hi - lo} mastery XP</p><span>${c.kills || 0} slain · ${c.bosses || 0} wardens · Best ${formatTime(c.best || 0)}</span></div></article>`;
        },
      ).join(
        "",
      )}</div><p class="muted">Every kill, level, and Warden adds mastery. Each hero keeps their own legacy.</p>`;
    api.modal(
      "codex",
      `${heading(`THE CODEX / ${unlocked} OF ${CODEX.length} INSCRIPTIONS DISCOVERED`, "Codex")}<nav class="screen-tabs">${[
        ["inscriptions", "Inscriptions"],
        ["bestiary", "Bestiary"],
        ["treasures", "Artifacts"],
        ["synergies", "Recipes"],
        ["mastery", "Mastery"],
        ["legacy", "Memories"],
      ]
        .map(
          ([id, name]) =>
            `<button data-codex-tab="${id}" class="${id === tab ? "active" : ""}">${name}</button>`,
        )
        .join("")}</nav>${content}`,
    );
    wire();
    for (const b of document.querySelectorAll<HTMLElement>("[data-codex-tab]"))
      b.onclick = () => showCodex(b.dataset.codexTab!);
    optionalElement("codex-combos")?.addEventListener("click", () =>
      showCodex("combos"),
    );
    optionalElement("codex-recipes")?.addEventListener("click", () =>
      showCodex("synergies"),
    );
    for (const b of document.querySelectorAll<HTMLElement>(
      "[data-equip],[data-unequip]",
    ))
      b.onclick = () => {
        const id = b.dataset.equip || b.dataset.unequip!;
        if (toggleInscription(save, hero.id, id)) {
          api.persist();
          api.refresh();
          api.sound();
          showCodex(tab);
        }
      };
  }
  return { showForge, showTalents, showCodex, close };
}
