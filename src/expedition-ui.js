import {
  ARTIFACTS,
  CONTRACTS,
  contractFor,
  contractProgress,
} from "./reliquary.js";
import { icon } from "./icons.js";
import { drawCodexSprites, artReady } from "./pixel-art.js";
import { UPGRADES, formatTime } from "./core.js";
const head = (label, title) =>
  `<div class="modal-head"><div><span class="modal-eyebrow">${label}</span><h2 id="modal-title">${title}</h2></div><button class="modal-close" aria-label="Close dialog">×</button></div>`;
export const artifactImage = (id, size = 130) =>
  `<canvas width="${size * 2}" height="${size * 2}" data-art="treasure-${id}" class="artifact-art" aria-hidden="true"></canvas>`;
export function createExpeditionUI(api) {
  let mode = "",
    previous = "lobby";
  function enter(next) {
    if (mode !== next) {
      previous = api.game()?.state || "lobby";
      mode = next;
    }
    if (api.game()?.state === "playing") api.game().state = "paused";
  }
  function art() {
    artReady.then(() =>
      drawCodexSprites(document.getElementById("modal-panel")),
    );
    document.querySelector(".modal-close")?.addEventListener("click", close);
  }
  function close() {
    mode = "";
    const g = api.game();
    api.close();
    if (g && previous === "playing") g.state = "playing";
    else if (g && previous === "paused") {
      g.state = "playing";
      api.pause();
    }
  }
  function showContracts() {
    enter("contracts");
    const s = api.save();
    api.modal(
      "contracts",
      `${head("EXPEDITION CONTRACTS", "Contracts")}<p class="muted">One goal per expedition. Completed goals pay out when the run ends.</p><div class="contract-grid">${CONTRACTS.map(
        (c, i) => {
          const q = contractFor(s, c.id),
            chosen = s.contract === c.id;
          return `<button class="contract-card ${chosen ? "selected" : ""}" data-contract="${c.id}" aria-pressed="${chosen}">${artifactImage(["crown", "heart", "hourglass"][i])}<small>TIER ${q.tier + 1}</small><h3>${c.name}</h3><strong>${c.id === "endure" ? formatTime(q.target) : q.target}<span>${c.unit}</span></strong><div class="contract-reward">✧ ${q.embers}${q.shards ? ` · ◈ ${q.shards}` : ""}</div><span class="contract-select">${chosen ? "✓ Selected" : "Select"}</span></button>`;
        },
      ).join(
        "",
      )}</div><div class="modal-foot"><button class="secondary" id="contract-done">Ready</button></div>`,
    );
    art();
    document.getElementById("contract-done").onclick = close;
    for (const b of document.querySelectorAll("[data-contract]"))
      b.onclick = () => {
        s.contract = b.dataset.contract;
        api.persist();
        api.refresh();
        api.sound();
        showContracts();
      };
  }
  function showArtifacts() {
    mode = "artifact";
    const g = api.game();
    api.modal(
      "artifact",
      `<div class="reward-heading"><span class="modal-eyebrow">RELIQUARY SECURED</span><h2 id="modal-title">A fragment of the impossible.</h2><p>${Object.keys(g.artifacts).length} / 4 artifacts bound · Pick one</p></div><div class="artifact-draft">${g.artifactChoices.map((a, i) => `<button class="artifact-card" data-artifact="${a.id}" style="--relic:${a.color}"><span class="artifact-halo">${artifactImage(a.id)}</span><small>${a.tag} · RANK ${g.artifact(a.id) + 1}/3</small><h3>${a.name}</h3><p>${a.summary}</p><span class="artifact-ranks">${[1, 2, 3].map((n) => `<i class="${n <= g.artifact(a.id) + 1 ? "filled" : ""}"></i>`).join("")}</span><span class="pick">[ ${i + 1} ] ${g.artifact(a.id) ? "EMPOWER" : "BIND"} ↗</span></button>`).join("")}</div><div class="artifact-details">${g.artifactChoices.map((a) => `<details><summary>${a.name}</summary><p>${a.desc}</p></details>`).join("")}</div><div class="modal-foot salvage-foot"><span class="muted">Prefer embers?</span><button class="secondary" id="salvage-artifact">Salvage · +✧ 25</button></div>`,
    );
    art();
    document.getElementById("salvage-artifact").onclick = salvage;
    for (const b of document.querySelectorAll("[data-artifact]"))
      b.onclick = () => pickArtifact(b.dataset.artifact);
  }
  function salvage() {
    const g = api.game();
    if (g?.salvageArtifact()) {
      mode = "";
      api.sound();
      api.close();
      api.refresh();
      if (g.state === "levelup") api.level();
    }
  }
  function pickArtifact(id) {
    const g = api.game();
    if (g?.claimArtifact(id)) {
      mode = "";
      api.sound();
      api.close();
      api.refresh();
      if (g.state === "levelup") api.level();
    }
  }
  function showBuild() {
    const g = api.game();
    if (!g || !["playing", "paused"].includes(g.state)) return;
    enter("build");
    const total =
      Object.values(g.damageSources).reduce((a, b) => a + b, 0) || 1;
    const stats = [
      ["blade", "Damage", `${g.damage.toFixed(2)}×`],
      ["wings", "Attack speed", `${g.attackSpeed.toFixed(2)}×`],
      ["eye", "Critical", `${Math.round(g.critChance * 100)}%`],
      ["heart", "Vitality", Math.round(g.p.maxHp)],
      ["shield", "Resistance", `${Math.round((1 - g.damageReduction) * 100)}%`],
      ["bolt", "Skill cooldown", `${g.skillCooldown.toFixed(1)}s`],
    ];
    api.modal(
      "build",
      `${head(`${g.hero.name.toUpperCase()} / LEVEL ${g.level}`, "Build")}<div class="build-overview"><canvas width="160" height="190" data-art="${g.hero.id}"></canvas><div class="build-stat-grid">${stats.map(([id, label, value]) => `<div>${icon(id)}<strong>${value}</strong><small>${label}</small></div>`).join("")}</div></div><div class="build-section-title"><span>BOUND ARTIFACTS</span><small>${Object.keys(g.artifacts).length}/4</small></div><div class="artifact-loadout">${Array.from(
        { length: 4 },
        (_, i) => {
          const id = Object.keys(g.artifacts)[i],
            a = ARTIFACTS.find((a) => a.id === id);
          return a
            ? `<article style="--relic:${a.color}">${artifactImage(a.id, 80)}<strong>${a.name}</strong><small>${g.artifact(id)} / 3</small><p>${a.summary}</p></article>`
            : `<article class="empty-artifact">${icon("star")}<strong>Unbound</strong><small>Defend a beacon</small></article>`;
        },
      ).join(
        "",
      )}</div><div class="build-section-title"><span>DAMAGE SOURCES</span><small>${Math.round(g.stats.damage).toLocaleString()} total</small></div><div class="damage-breakdown">${
        Object.entries(g.damageSources)
          .sort((a, b) => b[1] - a[1])
          .map(
            ([id, n]) =>
              `<div><span>${icon(id)}${id === "signature" ? g.hero.weapon : (id === "active" ? g.hero.skill : UPGRADES[id]?.name) || { artifacts: "Artifacts", form: "Class skill", ultimate: "Class ultimate", transformation: "Form trait", talent_ultimate: "Talent ultimate", talents: "Talent effects", spells: "Spells", companions: "Companions", totems: "Totems" }[id] || "Skills & effects"}</span><i><b style="width:${(n / total) * 100}%"></b></i><strong>${Math.round((n / total) * 100)}%</strong></div>`,
          )
          .join("") ||
        '<p class="muted">Deal damage to reveal your build’s strengths.</p>'
      }</div><div class="modal-foot"><span class="muted">${formatTime(g.time)} · ${g.kills} slain · ${g.vaultsCleared} beacons secured</span><button class="primary" id="build-done">Return ↗</button></div>`,
    );
    art();
    document.getElementById("build-done").onclick = close;
  }
  function showSettings() {
    enter("settings");
    const s = api.save();
    api.modal(
      "settings",
      `${head("PRESENTATION", "Settings")}<div class="settings-list">${[
        [
          "motion",
          "Motion & screen shake",
          "Animated menus, combat sway, dash echoes and camera impact",
          "wings",
        ],
        [
          "numbers",
          "Damage numbers",
          "Show critical hit values during combat",
          "blade",
        ],
        [
          "minimap",
          "Minimap",
          "Treasures, boundaries, enemies and waypoint",
          "eye",
        ],
      ]
        .map(
          ([id, name, desc, symbol]) =>
            `<button class="setting-toggle" data-setting="${id}" aria-pressed="${s.visuals[id]}">${icon(symbol)}<span><strong>${name}</strong><small>${desc}</small></span><i class="switch ${s.visuals[id] ? "on" : ""}"></i></button>`,
        )
        .join(
          "",
        )}</div><div class="modal-foot"><span class="muted">Danger warnings always remain visible.</span><button class="secondary" id="settings-done">Done</button></div>`,
    );
    art();
    document.getElementById("settings-done").onclick = close;
    for (const b of document.querySelectorAll("[data-setting]"))
      b.onclick = () => {
        s.visuals[b.dataset.setting] = !s.visuals[b.dataset.setting];
        api.persist();
        api.refresh();
        showSettings();
      };
  }
  return {
    showContracts,
    showArtifacts,
    pickArtifact,
    showBuild,
    showSettings,
    close,
  };
}
