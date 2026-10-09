import { GameLoop } from "./runtime/game-loop.ts";
import { SaveRepository } from "./platform/save-repository.ts";
import { element as $, optionalElement } from "./dom.ts";
import { createExpeditionUI, artifactImage } from "./ui/expedition-ui.ts";
import { createJourneyUI } from "./ui/journey-ui.ts";
import { CLASS_FORMS } from "../game/combat/class-forms.ts";
import { recoveredCooldown } from "../game/combat/skill-recovery.ts";
import { SPELLS } from "../game/data/spell-data.ts";
import { spellCooldown } from "../game/combat/spell-combat.ts";
import {
  heroLevel,
  heroThreshold,
  FORMS,
  profile,
  skillName,
  skillEvolutionLock,
  formCooldown,
} from "../game/progression/journey.ts";
import {
  talentAvailable,
  selectedUltimate,
} from "../game/progression/class-talents.ts";
import { heroUnlocked, heroGoals } from "../game/combat/champions.ts";
import { archetypeStatus } from "../game/combat/archetypes.ts";
import { layoutPanel, closePanelDetail } from "./ui/panel-layout.ts";
import {
  ARTIFACTS,
  contractFor,
  contractProgress,
} from "../game/world/reliquary.ts";
import { drawMinimap } from "./rendering/atmosphere.ts";
import { createRealmUI } from "./ui/realm-ui.ts";
import { realmById, legacyBonus } from "../game/world/realms.ts";
import { buildSlots } from "../game/progression/evolutions.ts";
import { icon } from "./ui/icons.ts";
import { upgradeSummary, rankRoad } from "./ui/power-preview.ts";
import { drawCodexSprites } from "./rendering/pixel-art.ts";
import {
  Game,
  HEROES,
  UPGRADES,
  EVOLUTIONS,
  bankRun,
  formatTime,
  clamp,
} from "../game/index.ts";
import { Renderer, drawPortrait } from "./rendering/Renderer.ts";
import { AudioEngine } from "./audio/AudioEngine.ts";
import {
  CODEX,
  codexUnlocked,
  equippedPages,
} from "../game/progression/progression.ts";
import { createProgressionUI } from "./ui/progression-ui.ts";
import { artReady, art, prepareCombatArt } from "./rendering/pixel-art.ts";

const saves = new SaveRepository(() => localStorage);
let save = saves.load();
let selected = HEROES[0],
  rosterPage = 0,
  game: Game | null = null,
  renderer: Renderer | null = null,
  modalType = "",
  panelRevision = 0,
  lastFocus: HTMLElement | null = null,
  hudTimer = 0,
  portraitTimer = 0,
  announcementTimer = 0;
let keys = new Set<string>(),
  touch = { x: 0, y: 0 },
  lastBuild = "",
  lastObjective = "";
const audio = new AudioEngine(save.sound);
const progression = createProgressionUI({
  save: () => save,
  game: () => game,
  hero: () => selected,
  modal: showModal,
  close: closeModal,
  persist,
  refresh: () => {
    lobbyStats();
    updateHeroProgress();
    updateHud();
  },
  sound: () => audio.play("pick"),
  level: showLevel,
  journey: () => journeyUI.show("talents"),
});
const expeditionUI = createExpeditionUI({
  save: () => save,
  game: () => game,
  modal: showModal,
  close: closeModal,
  persist,
  refresh: () => {
    updateHeroProgress();
    lobbyStats();
    updateHud();
    applyPresentation();
  },
  sound: () => audio.play("pick"),
  level: showLevel,
  pause,
});
const realmUI = createRealmUI({
  save: () => save,
  game: () => game,
  hero: () => selected,
  modal: showModal,
  close: closeModal,
  persist,
  refresh: () => {
    updateHeroProgress();
    updateHud();
  },
  sound: () => audio.play("pick"),
  level: showLevel,
});
const journeyUI = createJourneyUI({
  screen: () => modalType,
  save: () => save,
  game: () => game,
  hero: () => selected,
  modal: showModal,
  close: closeModal,
  persist,
  level: showLevel,
  pause,
  sound: () => audio.play("pick"),
  refresh: () => {
    updateHeroProgress();
    if (!game) setupRoster();
    updateHud();
  },
  recipes: () => realmUI.showEvolutions(),
});
function applyPresentation() {
  document.documentElement.classList.toggle("still", !save.visuals.motion);
  $("minimap").hidden = !save.visuals.minimap;
}
function persist() {
  saves.persist(save);
  $("save-status").textContent = saves.available ? "ACTIVE" : "UNAVAILABLE";
  $("shard-count").textContent = String(save.shards);
  $("codex-count").textContent =
    `${CODEX.filter((p) => codexUnlocked(save, p)).length} / ${CODEX.length}`;
}
function updateHeroProgress() {
  const realm = realmById(save.realm),
    legacy = legacyBonus(save, selected.id);
  $("realm-name").textContent = realm.name;
  $("realm-info").innerHTML =
    `${icon("book")} ${legacy.count}/12 ${icon("blade")} ${formatTime(realm.doom)}`;
  $("stage-realm").textContent = realm.name.toUpperCase();
  const contract = contractFor(save);
  $("contract-name").textContent = contract.name;
  $("contract-target").textContent =
    `${contract.id === "endure" ? formatTime(contract.target) : contract.target} ${contract.unit} · ✧ ${contract.embers} ↗`;
  const journey = profile(save, selected.id),
    xp = journey.xp,
    level = heroLevel(xp),
    lo = heroThreshold(level),
    hi = heroThreshold(level + 1);
  $("portrait").dataset.form = String(journey.stage);
  $("mastery-label").textContent =
    `CLASS ${level} / ${FORMS[selected.id][journey.stage].toUpperCase()}`;
  $("mastery-fill").style.width = `${((xp - lo) / (hi - lo)) * 100}%`;
  $("mastery-progress").textContent = `${xp - lo} / ${hi - lo} XP`;
  $("loadout-text").textContent =
    equippedPages(save, selected.id)
      .map((id) => CODEX.find((p) => p.id === id)!.name)
      .join(" · ") || "No inscriptions bound";
  $("loadout-text").title = $("loadout-text").textContent;
  $("mastery-label").title = $("mastery-label").textContent;
  $("oath-value").textContent = save.oath ? `Oath ${save.oath}` : "Unbroken";
  $("oath-description").textContent = save.oath
    ? `+${save.oath * 25}% embers · stronger, denser hordes`
    : save.maxOath
      ? "The original expedition. No oath modifiers."
      : "Defeat a Warden to unlock deeper oaths.";
  $("oath-down").disabled = save.oath <= 0;
  $("oath-up").disabled = save.oath >= save.maxOath;
}
function lobbyStats() {
  $("ash-count").textContent = Math.floor(save.embers).toLocaleString();
  $("record-time").textContent = formatTime(save.best);
  $("record-runs").textContent = save.runs
    ? `${save.runs} expeditions into the dark`
    : "Your story starts here";
  $("save-status").textContent = saves.available ? "ACTIVE" : "UNAVAILABLE";
}
function setSound(enabled: boolean) {
  save.sound = enabled;
  audio.enabled = enabled;
  audio.unlock();
  persist();
  for (const button of document.querySelectorAll<HTMLElement>(
    ".sound-toggle",
  )) {
    button.textContent = enabled ? "♫" : "♪";
    button.setAttribute("aria-label", enabled ? "Mute sound" : "Enable sound");
    button.title = enabled ? "Sound on" : "Sound off";
  }
  if (enabled) audio.play("pick");
}
function setupRoster() {
  const roster = [...HEROES].sort(
      (a, b) =>
        heroLevel(save.journeys[b.id]?.xp || 0) -
        heroLevel(save.journeys[a.id]?.xp || 0),
    ),
    pages = Math.ceil(roster.length / 6);
  rosterPage = Math.min(rosterPage, pages - 1);
  $("roster-page").textContent = `${rosterPage + 1} / ${pages}`;
  $("roster-prev").disabled = rosterPage === 0;
  $("roster-next").disabled = rosterPage === pages - 1;
  $("roster-prev").onclick = () => {
    rosterPage--;
    setupRoster();
  };
  $("roster-next").onclick = () => {
    rosterPage++;
    setupRoster();
  };
  $("roster-count").textContent =
    HEROES.filter((h) => heroUnlocked(save, h.id)).length +
    " / " +
    HEROES.length +
    " UNLOCKED";
  $("hero-list").innerHTML = roster
    .slice(rosterPage * 6, rosterPage * 6 + 6)
    .map(
      (h, i) =>
        `<button class="hero-card ${h.id === selected.id ? "selected" : ""} ${heroUnlocked(save, h.id) ? "" : "locked"}" style="--outcast: ${h.color}" data-hero="${h.id}" aria-pressed="${h.id === selected.id}" aria-label="${heroUnlocked(save, h.id) ? "Choose" : "Preview locked outcast"} ${h.name}, ${h.title}"><canvas class="mini-portrait" data-portrait="${h.id}" data-form="${save.journeys[h.id]?.stage || 0}" aria-hidden="true"></canvas><span><strong>${h.name}</strong><small>${h.role}</small></span><span class="arrow">${heroUnlocked(save, h.id) ? "✦" : "◇"}</span></button>`,
    )
    .join("");
  for (const button of document.querySelectorAll<HTMLElement>("[data-hero]"))
    button.onclick = () => {
      selectHero(button.dataset.hero!);
      audio.play("pick");
    };
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>(
    "[data-portrait]",
  ))
    drawPortrait(
      canvas,
      HEROES.find((h) => h.id === canvas.dataset.portrait!)!,
      0,
      true,
    );
}
function selectHero(id: string) {
  selected = HEROES.find((h) => h.id === id)!;
  $("portrait").dataset.form = String(save.journeys[id]?.stage || 0);
  document.documentElement.style.setProperty("--hero", selected.color);
  for (const b of document.querySelectorAll<HTMLElement>("[data-hero]")) {
    b.classList.toggle("selected", b.dataset.hero === id);
    b.setAttribute("aria-pressed", String(b.dataset.hero === id));
  }
  $("hero-class").textContent = selected.title.toUpperCase();
  $("hero-quote").textContent = selected.quote;
  $("hero-number").textContent =
    `OUTCAST / ${String(HEROES.indexOf(selected) + 1).padStart(2, "0")}`;
  $("hero-difficulty").textContent = selected.difficulty;
  $("hero-name").textContent = selected.name;
  $("hero-desc").textContent = selected.desc;
  $("hero-stats").innerHTML = [
    ["heart", selected.hp, "Health"],
    ["wings", selected.speed, "Speed"],
    ["active", `${selected.cooldown}s`, "Recovery"],
  ]
    .map(
      ([symbol, value, label]) =>
        `<span>${icon(String(symbol))}<b>${value}</b><small>${label}</small></span>`,
    )
    .join("");
  $("hero-kit").innerHTML = [
    [selected.id, "AUTO", selected.weapon, selected.weaponDesc],
    ["star", "TRAIT", selected.trait, selected.traitDesc],
    ["active", "Q", selected.skill, selected.skillDesc],
  ]
    .map(
      ([symbol, label, name, desc]) =>
        `<details class="kit-row"><summary><span class="kit-icon">${icon(symbol)}</span><span><small>${label}</small><strong>${name}</strong></span><span class="detail-plus">+</span></summary><p>${desc}</p></details>`,
    )
    .join("");
  for (const row of $("hero-kit").querySelectorAll<HTMLElement>(".kit-row")) {
    row.querySelector<HTMLElement>("summary")!.onclick = (event) => {
      event.preventDefault();
      showModal(
        "hero-info",
        `${modalHeader(selected.title, row.querySelector<HTMLElement>("strong")!.textContent)}<div class="hero-info-copy">${row.querySelector<HTMLElement>(".kit-icon")!.outerHTML}<p>${row.querySelector<HTMLElement>("p")!.textContent}</p></div><div class="modal-foot"><button class="secondary" id="hero-info-done">Return</button></div>`,
      );
      $("hero-info-done").onclick = closeModal;
      document.querySelector<HTMLElement>(".modal-close")!.onclick = closeModal;
    };
  }
  $("talent-names").innerHTML = selected.talents
    .map(
      (t, i) =>
        `<span class="talent-chip" title="${t}">${icon([selected.id, "star", "shield"][i])}<small>${t}</small></span>`,
    )
    .join("");
  drawPortrait($("portrait"), selected);
  const unlocked = heroUnlocked(save, id);
  $("start-button").disabled = !unlocked;
  $("start-button").innerHTML = unlocked
    ? "Enter the rift <span>↗</span>"
    : "Outcast locked ◇";
  $("hero-unlock").hidden = unlocked;
  $("hero-unlock").innerHTML = heroGoals(save, id)
    .map(
      (goal) =>
        `<div class="unlock-goal">${icon(goal.icon)}<span>${goal.label}</span><b>${goal.seconds ? formatTime(Math.min(goal.value, goal.target)) + " / " + formatTime(goal.target) : Math.min(goal.value, goal.target) + " / " + goal.target}</b><progress value="${Math.min(goal.value, goal.target)}" max="${goal.target}" aria-label="${goal.label}"></progress></div>`,
    )
    .join("");
  updateHeroProgress();
}
function showModal(type: string, html: string) {
  if ($("modal").hidden)
    lastFocus = document.activeElement as HTMLElement | null;
  const changedScreen = modalType !== type;
  modalType = type;
  $("modal-panel").dataset.screen = type;
  keys.clear();
  touch = { x: 0, y: 0 };
  ($("joystick").firstElementChild as HTMLElement).style.transform = "";
  $("modal-panel").innerHTML = html;
  if (changedScreen) $("modal-panel").scrollTop = 0;
  $("modal").hidden = false;
  document.documentElement.classList.add("dialog-open");
  $("lobby").inert = true;
  $("game").inert = true;
  $("modal-panel").focus();
  const revision = ++panelRevision;
  queueMicrotask(() => {
    if (revision === panelRevision) layoutPanel($("modal-panel"));
  });
}
function closeModal() {
  panelRevision++;
  $("modal").hidden = true;
  document.documentElement.classList.remove("dialog-open");
  modalType = "";
  $("lobby").inert = false;
  $("game").inert = false;
  if (lastFocus?.isConnected) lastFocus.focus();
}
const modalHeader = (label: string, title: string, close = true) =>
  `<div class="modal-head"><div><span class="modal-eyebrow">${label}</span><h2 id="modal-title">${title}</h2></div>${close ? '<button class="modal-close" aria-label="Close dialog">×</button>' : ""}</div>`;
function wireClose() {
  document
    .querySelector<HTMLElement>(".modal-close")
    ?.addEventListener("click", closeModal);
}
function showGuide() {
  showModal(
    "guide",
    `${modalHeader("CONTROLS", "Field guide")}<div class="compact-guide">${[
      [
        "wings",
        "Move",
        "WASD / arrows · Space dash · Q skill · R / F evolved skills",
      ],
      ["book", "Grow", "1–3 spells / choices · V spellbook · T talents"],
      [
        "flame",
        "Evolve",
        "V recipes · weapon 8 + passive 3 + seal · LV12 / 03:00",
      ],
      ["eye", "Explore", "M map + waypoint · walk over treasures"],
      ["star", "Recover", "E altar / beacon · B build · Esc pause"],
      [
        "blade",
        "Survive",
        "Reapers arrive at 09:00–10:00 · keep an escape route",
      ],
    ]
      .map(
        ([id, title, body]) =>
          `<div>${icon(id)}<strong>${title}</strong><p>${body}</p></div>`,
      )
      .join(
        "",
      )}</div><details class="power-details"><summary>Legacy & banking</summary><p>End a run or die to bank rewards. Permanent talents: +1 point per 5 class levels, 10 banked Wardens, or 4 unique memories, per hero. Run resonance: Wardens, altar tributes, every 8 run levels and every 20 weapon ranks. Spend it in Progress → Skills at run level 20 for +3% damage; it expires with the run. Research has increasing prices and diminishing gains. Weapons and soul skills have unlimited ranks. Your browser stores progress locally.</p></details><div class="modal-foot"><button class="secondary" id="guide-done">Ready</button></div>`,
  );
  wireClose();
  $("guide-done").onclick = closeModal;
}
function showForge() {
  progression.showForge();
}
function start() {
  if (!heroUnlocked(save, selected.id)) return;
  closeModal();
  keys.clear();
  touch = { x: 0, y: 0 };
  audio.unlock();
  game = new Game(selected.id, save);
  renderer ??= new Renderer($("arena"));
  renderer!.resize();
  lastBuild = "";
  $("lobby").hidden = true;
  $("game").hidden = false;
  document.body.style.overflow = "hidden";
  $("hud-name").textContent = selected.name.toUpperCase();
  $("hud-symbol").textContent = selected.icon;
  $("skill-name").textContent = selected.skill;
  $("hud-symbol").innerHTML = icon(selected.id);
  $("arena").focus();
  loop.reset();
  updateHud();
}
function upgradeDescription(id: string) {
  if (id === "active") return `${UPGRADES.active.desc} ${game!.hero.skillDesc}`;
  if (id !== "signature") return UPGRADES[id].desc;
  const next = game!.rank("signature") + 1;
  if (next === 5) return EVOLUTIONS[game!.hero.id].desc;
  if (next > 5)
    return "Run ranks raise damage; every 10 weapon ranks adds attack speed. Train permanent skills in [V], then evolve at skill levels 20 and 40.";
  return game!.hero.weaponDesc;
}
function showLevel() {
  if (!game || game!.state !== "levelup") return;
  const choices = game!.offered || game!.choices();
  showModal(
    "levelup",
    `${modalHeader(`LEVEL ${game!.level} · ${game!.hero.name.toUpperCase()}`, "Level up", false)}<div class="build-slot-row"><span title="Relics">${icon("orbit")} ${buildSlots(game, "relics").length}/3</span><span title="Passives">${icon("book")} ${buildSlots(game, "passives").length}/4</span><button class="inline-talent" id="level-talents" title="Permanent talents">${icon("star")} ${talentAvailable(save, game!.hero.id)}</button><button class="inline-talent" id="level-evolutions">${icon("flame")} ${game!.evolutionSeals}</button></div><div class="upgrade-grid">${choices
      .map((id, i) => {
        const u = UPGRADES[id],
          evo = id === "signature" && game!.rank(id) === 4;
        return `<div class="upgrade-option"><button class="upgrade-card ${evo ? "evolution" : ""}" data-upgrade="${id}"><span class="upgrade-symbol">${id === "signature" ? `<canvas width="160" height="155" data-art="${game!.hero.id}"></canvas>` : icon(id)}</span><small>${evo ? "✦ AWAKEN" : u.kind}</small><strong>${id === "signature" ? (evo ? EVOLUTIONS[game!.hero.id].name : game!.hero.weapon) : id === "active" ? game!.hero.skill : u.name}</strong><p class="power-summary">${upgradeSummary(game!, id)}</p><span class="rank-change">${game!.rank(id)} <i>→</i> <b>${game!.rank(id) + 1}</b></span><span class="pick">[ ${i + 1} ]</span></button><details class="power-details"><summary>Stats</summary><p>${upgradeDescription(id)}</p>${["signature", "active", "orbit", "nova", "familiar", "frost", "meteor", "scythe"].includes(id) ? rankRoad(game!.rank(id)) : ""}</details>${game!.banishes > 0 && id !== "signature" ? `<button class="banish-button" data-banish="${id}" aria-label="Banish ${u.name}">× (${game!.banishes})</button>` : ""}</div>`;
      })
      .join(
        "",
      )}</div><div class="modal-foot"><span class="muted">${game!.pendingLevels > 1 ? `${game!.pendingLevels} picks · ` : ""}Ⅱ PAUSED</span><button class="secondary" id="reroll" ${game!.rerolls <= 0 ? "disabled" : ""}>↻ ${game!.rerolls}</button></div>`,
  );
  drawCodexSprites($("modal-panel"));
  $("level-evolutions").onclick = () => realmUI.showEvolutions();
  for (const b of document.querySelectorAll<HTMLElement>("[data-upgrade]"))
    b.onclick = () => pickUpgrade(b.dataset.upgrade!);
  optionalElement("level-talents")?.addEventListener("click", () =>
    progression.showTalents(),
  );
  for (const b of document.querySelectorAll<HTMLElement>("[data-banish]"))
    b.onclick = () => {
      if (game!.banish(b.dataset.banish!)) showLevel();
    };
  $("reroll").onclick = () => {
    if (game!.rerolls > 0) {
      game!.rerolls--;
      game!.offered = null;
      showLevel();
      audio.play("pick");
    }
  };
}
function pickUpgrade(id: string) {
  if (game?.upgrade(id)) {
    audio.play("pick");
    closeModal();
    updateHud();
    if (game!.isState("levelup")) showLevel();
    else $("arena").focus();
  }
}
function pause() {
  if (!game || game!.state !== "playing") return;
  game!.state = "paused";
  showModal(
    "pause",
    `${modalHeader("TAKE A BREATH", "Paused", false)}<p>${game!.hero.name} · Level ${game!.level} · ${formatTime(game!.time)} survived · ${game!.kills} slain</p><div class="pause-actions"><button class="primary" id="resume">Resume <span>↗</span></button><button class="secondary" id="pause-build">Build <kbd>B</kbd></button><button class="secondary" id="pause-settings">Presentation</button><button class="secondary sound-toggle" id="pause-sound">${audio.enabled ? "Mute sound" : "Enable sound"}</button><button class="secondary" id="retire">End run & bank ${game!.embers} embers</button></div>`,
  );
  $("resume").onclick = resume;
  $("pause-build").onclick = () => expeditionUI.showBuild();
  $("pause-settings").onclick = () => expeditionUI.showSettings();
  $("pause-sound").onclick = () => {
    setSound(!audio.enabled);
    $("pause-sound").textContent = audio.enabled
      ? "Mute sound"
      : "Enable sound";
  };
  $("retire").onclick = () => finish(true);
}
function resume() {
  if (game?.state !== "paused") return;
  game!.state = "playing";
  closeModal();
  loop.reset();
  $("arena").focus();
}
function finish(retired = false) {
  game!.state = "dead";
  bankRun(save, game!);
  persist();
  audio.play("dead");
  const best = game!.time >= save.best && game!.time > 10;
  showModal(
    "result",
    `${modalHeader(best ? "A NEW LONGEST NIGHT" : retired ? "UNTIL NEXT TIME" : "THE RIFT REMEMBERS", retired ? "Run banked" : "Run over", false)}<div class="result-stats"><div><strong>${formatTime(game!.time)}</strong><span>TIME SURVIVED</span></div><div><strong>${game!.kills}</strong><span>ENEMIES SLAIN</span></div><div><strong>${game!.level}</strong><span>LEVEL REACHED</span></div><div><strong>+${game!.embers}</strong><span>EMBERS BANKED</span></div></div><p>${game!.bossCount ? `${game!.enemies.filter((e) => e.boss).length < game!.bossCount ? "A warden fell. A harder night awaits." : "Wardens punish straight lines. Move sideways when the charge is marked."}` : "Keep an escape route. Save your dash for the moment the circle closes."}</p><div class="modal-foot"><button class="secondary" id="return-lobby">Outcasts & forge</button><button class="primary" id="retry">One more night <span>↗</span></button></div>${!saves.available ? '<p class="saved-note">Browser storage is unavailable. Progress is kept only while this page remains open.</p>' : ""}`,
  );
  $("return-lobby").onclick = returnLobby;
  $("retry").onclick = start;
  const report = document.createElement("div");
  report.className = "expedition-report";
  report.innerHTML = `${game!.contractBanked ? `<div class="contract-complete">${icon("star")}<span>${game!.contract.name}<strong>+✧ ${game!.contract.embers}${game!.contract.shards ? ` · +◈ ${game!.contract.shards}` : ""}</strong></span></div>` : ""}<div class="result-artifacts">${Object.keys(
    game!.artifacts,
  )
    .map(
      (id) =>
        `<span title="${ARTIFACTS.find((a) => a.id === id)!.name}">${artifactImage(id, 55)}</span>`,
    )
    .join(
      "",
    )}</div><div class="result-rewards"><span>${icon("star")} ◈ ${game!.shards}</span><span>${icon(game!.hero.id)} +${game!.classXpEarned} class XP</span><span>${icon("bolt")} +${game!.trainingEarned} training sparks</span><span>${icon("blade")} ${game!.bossesKilled} wardens · ${game!.caches} caches</span></div>${game!.discoveries?.length ? `<details class="discovery-toast"><summary>+${game!.discoveries.length} Codex pages</summary><p>${game!.discoveries.map((p) => p.name).join(" · ")}</p></details>` : ""}`;
  if (game!.foundMemories.length)
    report
      .querySelector<HTMLElement>(".result-rewards")!
      .classList.add("memory-banked");
  $("modal-panel").insertBefore(
    report,
    $("modal-panel").querySelector<HTMLElement>(".modal-foot"),
  );
  drawCodexSprites($("modal-panel"));
  if (game!.heroUnlocks?.length)
    report.insertAdjacentHTML(
      "afterbegin",
      `<div class="hero-unlocked">${icon("star")}<span>Unlocked · <b>${game!.heroUnlocks.map((h) => h.name).join(" · ")}</b></span></div>`,
    );
}
function returnLobby() {
  closeModal();
  game = null;
  $("game").hidden = true;
  $("lobby").hidden = false;
  document.body.style.overflow = "";
  lobbyStats();
  selectHero(selected.id);
  setupRoster();
  $("start-button").focus();
}
function announce(text: string) {
  $("announcement").textContent = text;
  $("announcement").classList.add("visible");
  announcementTimer = 2.2;
}
function processEvents() {
  let message: Game["events"][number] | null = null;
  for (const e of game!.events) {
    if (e.type === "announce" || e.type === "combo") {
      if (!message || (e.priority || 0) >= (message.priority || 0)) message = e;
    } else audio.play(e.type, e.hero, e.tier);
  }
  if (message) announce(message.text || "");
  game!.events = [];
}
function updateHud() {
  if (!game) return;
  const p = game!.p;
  $("hud-name").textContent =
    `${game!.hero.name.toUpperCase()} LV${heroLevel(game!.journey.xp)}${game!.journey.stage ? " · " + ["", "II", "III"][game!.journey.stage] : ""}`;
  $("hud-name").title = FORMS[game!.hero.id][game!.journey.stage];
  $("skill-name").textContent =
    `${skillName(game!.hero.id, "active", game!.journey.skills.active?.stage || 0, game!.hero.skill)}${game!.rank("active") ? ` · ${game!.rank("active")}` : ""}`;
  $("shield-fill").style.width =
    `${Math.min(100, (p.shield / p.maxHp) * 100)}%`;
  $("game").classList.toggle("low-health", p.hp / p.maxHp < 0.3);
  drawMinimap($("minimap"), game);
  const v = game!.vault,
    q = game!.contract,
    progress = contractProgress(game);
  const objective = `<div class="contract-tracker"><span>${icon(q.icon)}</span><div><small>${progress >= q.target ? "✓ CONTRACT COMPLETE" : q.name.toUpperCase()}</small><strong>${q.id === "endure" ? formatTime(progress) : progress}<i> / ${q.id === "endure" ? formatTime(q.target) : q.target}</i></strong><div class="objective-track"><b style="width:${(progress / q.target) * 100}%"></b></div></div></div>${v ? `<div class="vault-tracker"><span>◇</span><div><small>${v.state === "defending" ? "HOLD THE BEACON" : "RELIQUARY"}</small><strong>${v.state === "defending" ? `${Math.ceil(v.remaining || 0)}s · ${Math.floor((v.progress / 18) * 100)}%` : "◇"}</strong>${v.state === "defending" ? `<div class="objective-track"><b style="width:${(v.progress / 18) * 100}%"></b></div>` : ""}</div></div>` : ""}`;
  if (lastObjective !== objective) {
    $("objective-hud").innerHTML = objective;
    lastObjective = objective;
  }
  $("talent-point-count").textContent = String(
    talentAvailable(save, game!.hero.id),
  );
  $("game-talents").classList.toggle(
    "has-points",
    talentAvailable(save, game!.hero.id) > 0,
  );
  $("journey-hud").textContent =
    `CLASS ${heroLevel(game!.journey.xp)} · ${FORMS[game!.hero.id][game!.journey.stage]}`;
  $("form-abilities").hidden = game!.journey.stage < 1;
  $("spell-abilities").hidden = game!.spellSlotCount < 1;
  for (let i = 0; i < 3; i++) {
    const button = $(`spell-${i}-button`),
      s = SPELLS[game!.spellLoadout[i]],
      cd = game!.spellCooldowns[s?.id] || 0;
    button.parentElement!.hidden = i >= game!.spellSlotCount;
    if (button.dataset.spell !== (s?.id || "empty")) {
      button.dataset.spell = s?.id || "empty";
      button.querySelector<HTMLElement>("i")!.innerHTML = icon(
        s?.icon || "book",
      );
    }
    button.style.setProperty(
      "--charge",
      `${s ? 100 * (1 - clamp(cd / spellCooldown(game, s), 0, 1)) : 0}%`,
    );
    button.classList.toggle("ready", !!s && cd <= 0);
    button.classList.toggle("advanced-spell", !!s?.advanced);
    button.title = s
      ? `${s.name}: ${s.desc} Recovery: ${spellCooldown(game, s).toFixed(1)}s.`
      : "Empty spell slot · configure next expedition";
    button.setAttribute(
      "aria-label",
      s
        ? `${s.name}, ${cd > 0 ? Math.ceil(cd) + " seconds remaining" : "ready"}`
        : `Empty spell slot ${i + 1}`,
    );
    $(`spell-${i}-cooldown`).textContent = s
      ? cd > 0
        ? `${Math.ceil(cd)}s`
        : "READY"
      : "EMPTY";
  }
  for (let i = 0; i < 2; i++) {
    const button = $(`form-${i}-button`),
      cd = game!.formCooldowns[i];
    button.parentElement!.hidden = game!.journey.stage < i + 1;
    button.style.setProperty(
      "--charge",
      `${100 * (1 - clamp(cd / formCooldown(game, i), 0, 1))}%`,
    );
    button.classList.toggle("ready", cd <= 0);
    button.setAttribute(
      "aria-label",
      `${FORMS[game!.hero.id][i + 3]}, ${cd > 0 ? Math.ceil(cd) + " seconds remaining" : "ready"}`,
    );
    button.title = `${FORMS[game!.hero.id][i + 3]}: ${CLASS_FORMS[game!.hero.id].abilities[i]} +${i ? 35 : 20}% all damage for ${i ? 12 : 8}s. Recovery: ${formCooldown(game, i).toFixed(1)}s with current buffs.`;
    button.classList.toggle("form-surge", game!.formState.surge > 0);
    $(`form-${i}-cooldown`).textContent =
      cd > 0 ? `${Math.ceil(cd)}s` : "READY";
  }
  $("biome-label").textContent =
    `${game!.realm.name.toUpperCase()}${game!.oath ? ` / OATH ${game!.oath}` : ""}`;
  const ready = [
    "signature",
    "active",
    "orbit",
    "nova",
    "familiar",
    "frost",
    "meteor",
    "scythe",
  ].some((id) => !skillEvolutionLock(game!.journey, id));
  const classPoints = talentAvailable(save, game!.hero.id);
  $("evolve-button").classList.toggle("has-points", ready || classPoints > 0);
  $("evolve-button").innerHTML =
    `${icon("star")} <kbd>V</kbd> Progress${classPoints ? ` <b>${classPoints}</b>` : ""}`;
  $("doom-clock").innerHTML =
    `${icon("blade")} ${game!.time < game!.realm.doom ? formatTime(game!.realm.doom - game!.time) : "HUNT"}`;
  $("doom-clock").classList.toggle(
    "hunting",
    game!.time >= game!.realm.doom - 30,
  );
  $("waypoint-hud").hidden = !game!.waypoint;
  if (game!.waypoint)
    $("waypoint-hud").textContent =
      `◇ ${Math.round(Math.hypot(game!.waypoint.x - p.x, game!.waypoint.y - p.y))}m`;
  $("interact-button").hidden =
    (!game!.nearbyShrine() && !game!.nearbyVault()) ||
    game!.state !== "playing";
  $("interact-button").innerHTML =
    `<kbd>E</kbd> ${game!.nearbyVault() ? "Defend" : "Altar"}`;
  $("health-fill").style.width = `${clamp(p.hp / p.maxHp, 0, 1) * 100}%`;
  $("hp-text").textContent =
    `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}${p.shield > 1 ? ` + ${Math.round(p.shield)} shield` : ""}`;
  $("timer").textContent = formatTime(game!.time);
  $("wave-text").textContent = `NIGHT ${String(game!.night).padStart(2, "0")}`;
  $("threat-text").textContent =
    game!.time < 20
      ? "The hollow wakes"
      : game!.time < 70
        ? "The hunt is on"
        : game!.night < 4
          ? "The dark adapts"
          : "There is no dawn";
  $("kill-count").textContent = `${game!.kills.toLocaleString()} slain`;
  $("run-embers").textContent = `✧ ${game!.embers}`;
  $("level-text").textContent = `RUN ${game!.level}`;
  $("xp-fill").style.width = `${(game!.xp / game!.threshold()) * 100}%`;
  for (const [id, cooldown] of [
    ["dash", p.dashCd],
    ["skill", p.skillCd],
  ] as const) {
    $(`${id}-button`).style.setProperty(
      "--charge",
      `${100 * (1 - clamp(cooldown / (id === "dash" ? game!.dashCooldown : game!.skillCooldown), 0, 1))}%`,
    );
    $(`${id}-cooldown`).textContent =
      cooldown > 0 ? `${cooldown.toFixed(1)}s` : "READY";
    $(`${id}-button`).classList.toggle("ready", cooldown <= 0);
    $(`${id}-button`).setAttribute(
      "aria-label",
      `${id === "dash" ? "Dash" : game!.hero.skill}, ${cooldown > 0 ? `${cooldown.toFixed(1)} seconds remaining` : "ready"}`,
    );
  }
  const ultimate = selectedUltimate(game!.hero.id, game!.journey),
    ultimateCd = game!.talentState.cooldown,
    ultimateReady = ultimate && ultimateCd <= 0;
  $("skill-button").classList.toggle("ultimate-ready", !!ultimateReady);
  if (ultimate) {
    $("skill-button").title =
      `${game!.hero.skill} + ${ultimate.name} · ${ultimateCd > 0 ? Math.ceil(ultimateCd) + "s" : "Ultimate ready"}. Ultimate recovery: ${recoveredCooldown(game, ultimate.cooldown, 20).toFixed(1)}s with current buffs.`;
    $("skill-button").setAttribute(
      "aria-label",
      `${game!.hero.skill}, ${p.skillCd > 0 ? p.skillCd.toFixed(1) + " seconds remaining" : "ready"}; ${ultimate.name}, ${ultimateCd > 0 ? Math.ceil(ultimateCd) + " seconds remaining" : "ultimate ready"}`,
    );
    if (p.skillCd <= 0)
      $("skill-cooldown").textContent = ultimateReady
        ? "ULT"
        : `U ${Math.ceil(ultimateCd)}s`;
  } else $("skill-button").title = game!.hero.skill;
  $("trait-text").textContent =
    archetypeStatus(game) ||
    {
      cinder: `HEAT ${Math.round(p.trait * 100)}%`,
      briar: `SEEDLINGS ${game!.plants.length} · ${game!.kills % 10}/10`,
      nyx: `MOMENTUM ${Math.round(p.trait * 100)}%`,
      rook: `POISE ${Math.round(p.trait * 100)}%`,
      lumen: `FOCUS ${Math.round(p.trait * 100)}%`,
      volta: `CAPACITOR ${game!.arcCount}/${game!.evolved() ? 5 : 7}`,
    }[game!.hero.id] ||
    "";
  $("trait-fill").style.width = `${p.trait * 100}%`;
  const boss = game!.enemies.find((e) => e.boss);
  $("boss-bar").hidden = !boss;
  if (boss) {
    $("boss-name").textContent =
      `${boss.displayName || "THE HOLLOW WARDEN"} · ${game!.bossCount}`;
    $("boss-fill").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  }
  const build = JSON.stringify(game!.ranks);
  if (build !== lastBuild) {
    lastBuild = build;
    $("build-hud").innerHTML = Object.entries(game!.ranks)
      .filter(([id]) =>
        [
          "signature",
          "active",
          "orbit",
          "nova",
          "familiar",
          "frost",
          "meteor",
          "scythe",
        ].includes(id),
      )
      .map(
        ([id, rank]) =>
          `<div class="build-icon" title="${id === "signature" ? game!.hero.weapon : UPGRADES[id].name} · Rank ${rank}">${icon(id === "signature" ? game!.hero.id : id)}<small>${rank}</small></div>`,
      )
      .join("");
  }
}
function frame(dt: number, now: number) {
  if (game) {
    if (game!.state === "playing") {
      const x =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
        touch.x;
      const y =
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) +
        touch.y;
      game!.moving = Math.hypot(x, y) > 0.05;
      game!.update(dt, { x, y });
      processEvents();
      if (game!.isState("levelup")) showLevel();
    }
    if (game!.state === "dead" && modalType !== "result") finish();
    if (game!.state === "shrine" && modalType !== "shrine") showShrine();
    if (game!.state === "reliquary" && modalType !== "artifact")
      expeditionUI.showArtifacts();
    renderer!.draw(game);
    hudTimer += dt;
    if (hudTimer > 0.08) {
      updateHud();
      hudTimer = 0;
    }
    if (announcementTimer > 0 && game!.state === "playing") {
      announcementTimer -= dt;
      if (announcementTimer <= 0) $("announcement").classList.remove("visible");
    }
  } else {
    portraitTimer += dt;
    if (portraitTimer > 0.065) {
      drawPortrait(
        $("portrait"),
        selected,
        save.visuals.motion ? now / 1000 : 0,
      );
      portraitTimer = 0;
    }
  }
}
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (e.key === "Tab" && !$("modal").hidden) {
    const focusable = [
      ...$("modal-panel").querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],summary,input,select,[tabindex="0"]',
      ),
    ].filter(
      (el) =>
        el.getClientRects().length &&
        !el.closest<HTMLElement>("[inert]") &&
        (!$("modal-panel").querySelector<HTMLElement>(".panel-detail") ||
          el.closest<HTMLElement>(".panel-detail")),
    );
    if (focusable.length) {
      const first = focusable[0],
        last = focusable.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === $("modal-panel"))
      ) {
        e.preventDefault();
        last!.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === $("modal-panel"))
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (
    game &&
    [
      " ",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "w",
      "a",
      "s",
      "d",
      "q",
      "r",
      "f",
      "escape",
    ].includes(key)
  )
    e.preventDefault();
  if (key === "escape" && !e.repeat) {
    if (closePanelDetail($("modal-panel"))) return;
    if (["contracts", "build", "settings"].includes(modalType))
      expeditionUI.close();
    else if (["realms", "worldmap", "evolutions"].includes(modalType))
      realmUI.close();
    else if (modalType === "pause") resume();
    else if (["forge", "codex", "talents"].includes(modalType))
      progression.close();
    else if (modalType === "journey") journeyUI.close();
    else if (modalType === "shrine") {
      game!.leaveShrine();
      closeModal();
    } else if (["guide", "hero-info"].includes(modalType)) closeModal();
    else if (game?.state === "playing") pause();
    return;
  }
  if (key === "m" && !e.repeat && modalType === "worldmap") {
    realmUI.close();
    return;
  }
  if (["t", "v"].includes(key) && !e.repeat && modalType === "journey") {
    journeyUI.close();
    return;
  }
  if (key === "v" && !e.repeat && modalType === "evolutions") {
    realmUI.close();
    return;
  }
  if (modalType === "artifact" && ["1", "2", "3"].includes(key) && !e.repeat) {
    const id = game!.artifactChoices[Number(key) - 1]?.id;
    if (id) expeditionUI.pickArtifact(id);
    return;
  }
  if (modalType === "levelup" && ["1", "2", "3"].includes(key) && !e.repeat) {
    const id = game!.offered?.[Number(key) - 1];
    if (id) pickUpgrade(id);
    return;
  }
  if (game?.state === "playing") {
    keys.add(key);
    if (!e.repeat) {
      if (key === " ") game!.dash();
      if (key === "q") game!.castSkill();
      if (key === "r") game!.castForm(0);
      if (key === "f") game!.castForm(1);
      if (["1", "2", "3"].includes(key)) game!.castSpell(Number(key) - 1);
      if (key === "t") progression.showTalents();
      if (key === "b") expeditionUI.showBuild();
      if (key === "m") realmUI.showMap();
      if (key === "v") journeyUI.show("skills");
      if (key === "e") game!.interact();
    }
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touch = { x: 0, y: 0 };
  if (game?.state === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game?.state === "playing") pause();
});
window.addEventListener("resize", () => {
  renderer?.resize();
  drawPortrait($("portrait"), selected);
  for (const c of document.querySelectorAll<HTMLCanvasElement>(
    "[data-portrait]",
  ))
    drawPortrait(
      c,
      HEROES.find((h) => h.id === c.dataset.portrait!)!,
      0,
      true,
    );
});
const stick = $("joystick");
let pointer: number | null = null;
function moveStick(e: PointerEvent) {
  if (pointer !== e.pointerId) return;
  const rect = stick.getBoundingClientRect(),
    dx = e.clientX - rect.left - rect.width / 2,
    dy = e.clientY - rect.top - rect.height / 2,
    d = Math.hypot(dx, dy) || 1,
    m = Math.min(d, 34);
  touch = {
    x: d > 6 ? (dx / d) * Math.min(1, d / 34) : 0,
    y: d > 6 ? (dy / d) * Math.min(1, d / 34) : 0,
  };
  (stick.firstElementChild as HTMLElement).style.transform =
    `translate(${(dx / d) * m}px,${(dy / d) * m}px)`;
}
stick.addEventListener("pointerdown", (e) => {
  if (game?.state !== "playing") return;
  pointer = e.pointerId;
  stick.setPointerCapture(pointer);
  moveStick(e);
});
stick.addEventListener("pointermove", moveStick);
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  stick.addEventListener(event, () => {
    pointer = null;
    touch = { x: 0, y: 0 };
    (stick.firstElementChild as HTMLElement).style.transform = "";
  });
$("contract-button").onclick = () => expeditionUI.showContracts();
$("settings-button").onclick = () => expeditionUI.showSettings();
$("inspect-build").onclick = () => expeditionUI.showBuild();
$("realm-button").onclick = () => realmUI.showRealms();
$("world-map-button").onclick = () => realmUI.showMap();
$("evolve-button").onclick = () => journeyUI.show("skills");
$("dash-button").insertAdjacentHTML("afterbegin", icon("wings"));
$("skill-button").insertAdjacentHTML("afterbegin", icon("bolt"));
$("form-0-button").insertAdjacentHTML("afterbegin", icon("bolt"));
$("form-1-button").insertAdjacentHTML("afterbegin", icon("star"));
$("form-0-button").onclick = () => game?.castForm(0);
$("form-1-button").onclick = () => game?.castForm(1);
for (let i = 0; i < 3; i++)
  $(`spell-${i}-button`).onclick = () => {
    if (game?.spellLoadout[i]) game!.castSpell(i);
    else if (game) journeyUI.show("spells");
  };
applyPresentation();
$("start-button").onclick = start;
$("help-button").onclick = showGuide;
$("forge-button").onclick = showForge;
$("forge-nav").onclick = showForge;
$("codex-button").onclick = () => progression.showCodex();
$("loadout-button").onclick = () => progression.showCodex("inscriptions");
$("talents-button").onclick = () => journeyUI.show("skills");
$("game-talents").onclick = () => {
  if (["playing", "paused"].includes(game?.state || ""))
    progression.showTalents();
};
$("interact-button").onclick = () => game?.interact();
$("outcasts-nav").onclick = () => selected && selectHero(selected.id);
for (const [id, delta] of [
  ["oath-down", -1],
  ["oath-up", 1],
] as const)
  $(id).onclick = () => {
    save.oath = clamp(save.oath + delta, 0, save.maxOath);
    persist();
    updateHeroProgress();
  };
$("pause-button").onclick = pause;
$("dash-button").onclick = () => game?.dash();
$("skill-button").onclick = () => game?.castSkill();
document.querySelector<HTMLElement>(".sound-toggle")!.onclick = () =>
  setSound(!audio.enabled);
setupRoster();
selectHero("cinder");
lobbyStats();
setSound(save.sound);
const loop = new GameLoop(frame);
loop.start();
$("start-button").disabled = true;
$("start-button").innerHTML = "Summoning the world <span>…</span>";
artReady.then(() => {
  prepareCombatArt();
  setupRoster();
  selectHero(selected.id);
  $("start-button").disabled =
    !art.actors || !art.walk || !heroUnlocked(save, selected.id);
  $("start-button").innerHTML =
    art.actors && art.walk
      ? "Enter the rift <span>↗</span>"
      : "Art unavailable · refresh";
});
function showShrine() {
  showModal(
    "shrine",
    `${modalHeader("FORGOTTEN ALTAR / A BARGAIN IN THE DARK", "Altar", false)}<div class="upgrade-grid">${game!.shrineChoices.map((b) => `<button class="upgrade-card" data-boon="${b.id}" ${b.id === "mercy" && game!.embers < 10 ? "disabled" : ""}><span class="upgrade-symbol">${b.icon}</span><small>RIFT PACT</small><strong>${b.name}</strong><p>${b.desc}</p><span class="pick">ACCEPT</span></button>`).join("")}</div><div class="modal-foot"><span class="muted">${game!.embers} unbanked embers</span><button class="secondary" id="leave-shrine">Leave the altar</button></div>`,
  );
  for (const b of document.querySelectorAll<HTMLElement>("[data-boon]"))
    b.onclick = () => {
      if (game!.chooseBoon(b.dataset.boon!)) {
        closeModal();
        audio.play("skill");
        updateHud();
      }
    };
  $("leave-shrine").onclick = () => {
    game!.leaveShrine();
    closeModal();
  };
}
// Explicit opt-in test harness: no debug shortcuts are present in normal play.
function createDebugApi() {
  return {
    get game() {
      return game;
    },
    get save() {
      return save;
    },
    start,
    selectHero,
    updateHud,
    showLevel,
    pause,
    resume,
    finish,
    returnLobby,
    progression,
    expeditionUI,
    realmUI,
    journeyUI,
  };
}

declare global {
  interface Window {
    __rift?: ReturnType<typeof createDebugApi>;
  }
}
if (new URLSearchParams(location.search).get("test") === "1")
  window.__rift = createDebugApi();
