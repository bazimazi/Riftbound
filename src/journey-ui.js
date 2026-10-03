import { icon } from "./icons.js";
import { UPGRADES } from "./core.js";
import { artReady, drawCodexSprites } from "./pixel-art.js";
import { skillDescription } from "./skill-descriptions.js";
import { CLASS_FORMS, formBonuses, formDescription } from "./class-forms.js";
import { recoveredCooldown } from "./skill-recovery.js";
import {
  SPELLS,
  SPELL_SLOTS,
  spellsFor,
  spellMasteryText,
} from "./spell-data.js";
import {
  spellSlotLock,
  unlockSpellSlot,
  equipSpell,
} from "./spell-progression.js";
import { spellCooldown } from "./spell-combat.js";
import {
  SKILLS,
  CATALYSTS,
  FORMS,
  heroLevel,
  heroThreshold,
  profile,
  skillRecord,
  skillName,
  skillBonus,
  formCooldown,
  trainingCost,
  trainingLock,
  trainSkill,
  skillEvolutionCost,
  skillEvolutionLock,
  evolveSkill,
  classCost,
  classGoals,
  classLock,
  evolveClass,
} from "./journey.js";
import {
  CLASS_TREES,
  CLASS_NODES,
  branchSpent,
  talentAvailable,
  talentSpent,
  classTalentPreview,
  classTalentLock,
  buyClassTalent,
  equipUltimate,
  selectedUltimate,
  respecCost,
  respecTalents,
} from "./class-talents.js";

const $ = (id) => document.getElementById(id);
const attribute = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
const nextTalentEffect = (detail) =>
  detail.nextRank === detail.currentRank
    ? "Already granted by affinity."
    : detail.next;
const talentEffectRows = (detail) =>
  `<p class="talent-effect" data-talent-effect="current"><small>${detail.source || "Now"}</small><span>${detail.current}</span></p>${detail.next === null ? "" : `<p class="talent-effect next" data-talent-effect="next"><small>Next</small><span>${nextTalentEffect(detail)}</span></p>`}`;
export function createJourneyUI(api) {
  let mode = "",
    tab = "skills",
    skill = "signature",
    selectedNode = "",
    selectedSpell = "",
    selectedSlot = -1,
    treePage = 0,
    branch = 0,
    returnState = "lobby",
    respec = false;
  const costMarkup = (cost) =>
    `<span class="journey-cost">${Object.entries(cost)
      .filter(([, n]) => n)
      .map(
        ([id, n]) =>
          `<span title="${id === "sparks" ? "Training sparks" : CATALYSTS[id].name}">${icon(id === "sparks" ? "bolt" : CATALYSTS[id].icon)}${n}</span>`,
      )
      .join("")}</span>`;
  function close() {
    mode = "";
    const g = api.game();
    if (g && returnState === "levelup") {
      api.level();
      return;
    }
    if (g && returnState === "playing") g.state = "playing";
    api.close();
    if (g && returnState === "paused") {
      g.state = "playing";
      api.pause();
    }
  }
  function commit(action) {
    const g = api.game(),
      h = g?.hero || api.hero();
    const previous = { ...profile(api.save(), h.id).talents };
    if (!action(api.save(), h.id)) return;
    if (g) {
      const affinity =
        (api.save().mastery[h.id] || 0) >= 400
          ? api.save().affinities[h.id] || h.talentIds[0]
          : "";
      for (const id of new Set(
        [
          ...Object.keys(previous),
          ...Object.keys(g.journey.talents),
          affinity,
        ].filter(Boolean),
      )) {
        const free = id === affinity ? 1 : 0;
        const rank = Math.max(
          0,
          g.rank(id) -
            Math.max(free, previous[id] || 0) +
            Math.max(free, g.journey.talents[id] || 0),
        );
        if (rank) g.ranks[id] = rank;
        else delete g.ranks[id];
      }
      g.recalculate();
    }
    api.persist();
    api.sound();
    api.refresh();
    show(tab);
  }
  function show(next = tab) {
    const g = api.game(),
      h = g?.hero || api.hero(),
      save = api.save(),
      p = profile(save, h.id),
      lv = heroLevel(p.xp);
    if (!mode || (api.screen && api.screen() !== "journey")) {
      returnState = g?.state || "lobby";
      if (g?.state === "playing") g.state = "paused";
    }
    mode = "journey";
    tab = next;
    if (tab !== "talents") respec = false;
    const budget = talentAvailable(save, h.id);
    if (CLASS_NODES[selectedNode]?.hero !== h.id)
      selectedNode = CLASS_TREES[h.id][branch].nodes[treePage ? 7 : 0].id;
    if (SPELLS[selectedSpell]?.hero !== h.id) {
      selectedSpell = spellsFor(h.id)[0].id;
      selectedSlot = -1;
    }
    const pageNodes = (b) =>
      b.nodes.filter((n) => (treePage ? n.row >= 5 : n.row < 5));
    const displayRow = (n) => n.row - (treePage ? 5 : 0);
    let content;
    if (tab === "skills") {
      const s = skillRecord(p, skill),
        name = (id) =>
          id === "signature"
            ? h.weapon
            : id === "active"
              ? h.skill
              : UPGRADES[id].name;
      const lock = trainingLock(p, skill),
        evoLock = skillEvolutionLock(p, skill);
      const behavior = skillDescription(
        h.id,
        skill,
        s.stage,
        skill === "signature"
          ? h.weaponDesc
          : skill === "active"
            ? h.skillDesc
            : UPGRADES[skill].desc,
      );
      content = `<div class="skill-workshop"><nav class="skill-library" aria-label="Choose skill">${SKILLS.map(
        (id) => {
          const r = skillRecord(p, id);
          return `<button data-journey-skill="${id}" class="${skill === id ? "selected" : ""}" aria-pressed="${skill === id}" title="${name(id)}"><i>${icon(id === "signature" ? h.id : id)}</i><span>${skillName(h.id, id, r.stage, name(id))}<small>LV ${r.level} ${r.stage ? "· " + ["", "EVOLVED", "MYTHIC"][r.stage] : ""}</small></span></button>`;
        },
      ).join(
        "",
      )}</nav><section class="skill-training"><div class="skill-crest stage-${s.stage}">${icon(skill === "signature" ? h.id : skill)}</div><h3>${skillName(h.id, skill, s.stage, name(skill))}</h3><div class="skill-ladder">${[0, 1, 2].map((i) => `<span class="${s.stage >= i ? "reached" : ""}">${icon(i ? "star" : "blade")}<small>${["TRAIN", "EVOLVE · 20", "MYTHIC · 40"][i]}</small></span>`).join("<b>›</b>")}</div><p data-skill-description>${behavior}</p><div class="skill-training-stats"><b>LEVEL ${s.level}</b><span>+${Math.round((skillBonus(p, skill) - 1) * 100)}% power</span></div><div class="journey-track"><i style="width:${s.stage === 2 ? 100 : Math.min(100, (s.level / ((s.stage + 1) * 20)) * 100)}%"></i></div><div class="training-actions"><button class="secondary" id="train-skill" ${lock ? "disabled" : ""}>Train ${costMarkup(trainingCost(p, skill))}</button><button class="primary" id="ascend-skill" ${evoLock ? "disabled" : ""}>${s.stage === 2 ? "Mythic" : "Evolve"} ${s.stage === 2 ? "" : costMarkup(skillEvolutionCost(p, skill))}</button></div><small class="journey-hint">${lock || "Training lasts across expeditions."}${evoLock && s.stage < 2 ? " · " + evoLock : ""}</small>${!["signature", "active"].includes(skill) ? '<small class="journey-hint">Relics activate when drafted during a run.</small>' : ""}</section></div>`;
    } else if (tab === "talents") {
      const n = CLASS_NODES[selectedNode],
        rank = p.talents[n.id] || 0,
        lock = classTalentLock(save, h.id, n.id),
        detail = classTalentPreview(save, h.id, n.id, g),
        equipped = n.ultimate && selectedUltimate(h.id, p)?.id === n.id,
        canEquip = n.ultimate && rank > 0;
      content = `<nav class="talent-pages" aria-label="Talent chapters">${["Roots", "Spells"].map((name, i) => `<button data-talent-page="${i}" aria-pressed="${treePage === i}">${icon(i ? "bolt" : "leaf")}${name}</button>`).join("")}</nav><div class="talent-path-tabs" role="group" aria-label="Talent path">${CLASS_TREES[h.id].map((b, i) => `<button data-class-path="${i}" aria-pressed="${i === branch}">${b.name}<b>${branchSpent(p, h.id, i)}</b></button>`).join("")}</div><div class="class-tree-grid ${treePage ? "spell-tree" : ""}" style="--class-color:${h.color}">${CLASS_TREES[
        h.id
      ]
        .map(
          (b, i) =>
            `<section class="class-path ${i === branch ? "mobile-selected" : ""}" data-path="${i}"><header>${icon(h.id)}<strong>${b.name}</strong><b>${branchSpent(p, h.id, i)}</b></header><div class="class-node-field"><svg viewBox="0 0 300 ${treePage ? 400 : 500}" preserveAspectRatio="none" aria-hidden="true">${pageNodes(
              b,
            )
              .filter(
                (t) =>
                  t.requires && pageNodes(b).some((n) => n.id === t.requires),
              )
              .map((t) => {
                const parent = CLASS_NODES[t.requires],
                  met = (p.talents[parent.id] || 0) >= t.requiredRank;
                return `<path class="${met ? "lit" : ""}" d="M${parent.col * 100 + 50} ${displayRow(parent) * 100 + 50} V${displayRow(t) * 100 + 10} H${t.col * 100 + 50} V${displayRow(t) * 100 + 50}"/>`;
              })
              .join("")}</svg>${pageNodes(b)
              .map((t) => {
                const r = p.talents[t.id] || 0,
                  l = classTalentLock(save, h.id, t.id),
                  preview = classTalentPreview(save, h.id, t.id, g);
                return `<button class="class-talent ${r ? "invested" : ""} ${!l ? "available" : ""} ${t.id === n.id ? "selected" : ""} ${t.ultimate ? "ultimate" : ""} ${t.ultimate && selectedUltimate(h.id, p)?.id === t.id ? "armed" : ""}" style="grid-row:${displayRow(t) + 1};grid-column:${t.col + 1}" data-class-talent="${t.id}" aria-label="${t.name}, ${r} of ${t.max} ranks${l ? ", " + l : ""}" aria-pressed="${t.id === n.id}" title="${attribute(`${t.name} · ${r}/${t.max}\nNow${preview.source ? " · " + preview.source : ""}: ${preview.current}${preview.next === null ? "" : "\nNext: " + nextTalentEffect(preview)}${t.ultimate ? "\nUltimate: Q · 40s base cooldown · recovery buffs apply · equip one" : ""}`)}">${icon(t.icon)}<b>${r}/${t.max}</b></button>`;
              })
              .join("")}</div></section>`,
        )
        .join(
          "",
        )}</div><section class="talent-inspector"><i>${icon(n.icon)}</i><div><h3>${n.name} <small>${rank}/${n.max}</small></h3>${talentEffectRows(detail)}<small>${canEquip ? (g ? `Ultimate · Q · ${recoveredCooldown(g, 40, 20).toFixed(1)}s` : "Ultimate · Q · 40s base") : lock || "Permanent talent"}</small></div><button class="primary" id="learn-class-talent" ${canEquip ? (equipped ? "disabled" : "") : lock ? "disabled" : ""}>${canEquip ? (equipped ? "✓ Armed" : "Equip") : rank >= n.max ? "Mastered" : `Learn <b>${n.cost} ✦</b>`}</button></section><small class="talent-earning" title="Permanent points are earned per class after banking runs. Run resonance cannot buy talents.">✦ +1 / 5 class LV · +1 / 10 banked Wardens · +1 / 4 memories</small>`;
    } else if (tab === "spells") {
      const s = SPELLS[selectedSpell],
        learned = !!p.talents[s.id],
        rank = p.talents[s.masteryId] || 0;
      const slotGoal = SPELL_SLOTS[selectedSlot],
        lock = classTalentLock(save, h.id, s.id);
      const slotDetail = selectedSlot >= p.spellSlots && slotGoal;
      const cost = slotGoal
        ? {
            sparks: slotGoal.sparks,
            core: slotGoal.core,
            rune: slotGoal.rune,
            sigil: slotGoal.sigil,
          }
        : {};
      content = `<div class="spell-slots" aria-label="Next expedition spell slots">${SPELL_SLOTS.map(
        (goal, i) => {
          const bound = SPELLS[p.loadout[i]],
            open = i < p.spellSlots;
          return `<button data-spell-slot="${i}" class="spell-slot ${open ? "unlocked" : "locked"} ${selectedSlot === i ? "selected" : ""}" aria-label="Slot ${i + 1}: ${open ? bound?.name || "Empty" : `locked, class level ${goal.level}`}" title="${open ? "Choose a spell below" : `Class LV ${goal.level} · ${goal.bosses} banked Wardens`}"><kbd>${i + 1}</kbd><i>${icon(bound?.icon || (open ? "bolt" : "shield"))}</i><span>${open ? bound?.name || "Empty" : `LV ${goal.level}`}</span></button>`;
        },
      ).join(
        "",
      )}</div><div class="spell-workshop"><div class="spell-library">${spellsFor(
        h.id,
      )
        .map(
          (sp) =>
            `<button data-spell-choice="${sp.id}" class="spell-card ${p.talents[sp.id] ? "learned" : "locked"} ${selectedSpell === sp.id && !slotDetail ? "selected" : ""}" aria-pressed="${selectedSpell === sp.id && !slotDetail}"><i>${icon(sp.icon)}</i><span>${sp.name}</span><small>${p.talents[sp.id] ? `★ ${p.talents[sp.masteryId] || 0}/3` : `LV ${CLASS_NODES[sp.id].level}`}</small></button>`,
        )
        .join(
          "",
        )}</div><section class="spell-inspector">${slotDetail ? `<i class="spell-crest">${icon("shield")}</i><h3>Spell slot ${selectedSlot + 1}</h3><div class="slot-milestones"><span>LV <b>${lv}/${slotGoal.level}</b></span><span>${icon("skull")} <b>${save.chronicle[h.id]?.bosses || 0}/${slotGoal.bosses}</b></span></div><small>Class level · banked Wardens</small>${costMarkup(cost)}<button class="primary" id="unlock-spell-slot" ${selectedSlot !== p.spellSlots || spellSlotLock(save, h.id) ? "disabled" : ""}>Unlock</button><small>${selectedSlot !== p.spellSlots ? "Unlock the previous slot first" : spellSlotLock(save, h.id) || "Ready to unlock"}</small>` : `<i class="spell-crest">${icon(s.icon)}</i><h3>${s.name}</h3><p>${s.desc}</p><div class="spell-stats"><span>${icon("bolt")} ${g ? spellCooldown(g, s).toFixed(1) : s.cooldown}s</span><span>${icon("star")} ${rank}/3</span></div>${rank ? `<small>${spellMasteryText(s, rank)}</small>` : ""}${learned ? `<div class="spell-equip" aria-label="Equip to slot">${[0, 1, 2].map((i) => `<button data-equip-spell="${i}" ${i >= p.spellSlots ? "disabled" : ""} aria-label="Equip ${s.name} in slot ${i + 1}" aria-pressed="${p.loadout[i] === s.id}">${p.loadout[i] === s.id ? "✓" : "Equip"} <kbd>${i + 1}</kbd></button>`).join("")}</div>` : `<button class="primary" id="learn-spell" ${lock ? "disabled" : ""}>Learn ${CLASS_NODES[s.id].cost} ✦</button><small>${lock || "Ready to learn"}</small>`}<button class="spell-tree-link" id="spell-tree-link">Talent tree ›</button>`}</section></div>`;
    } else {
      const goals = classGoals(save, h.id),
        lock = classLock(save, h.id);
      content = `<div class="class-form-road">${[0, 1, 2].map((i) => `<article class="class-form ${i <= p.stage ? "unlocked" : ""} ${i === p.stage ? "current" : ""}"><div class="form-portrait form-${i}"><canvas width="140" height="145" data-art="${h.id}"></canvas>${i ? `<i>${icon("star")}</i>` : ""}</div><h3>${FORMS[h.id][i]}</h3><small>${i ? "LEVEL " + i * 100 : "OUTCAST"}</small><b>${i === p.stage ? "CURRENT" : i < p.stage ? "✓" : "LOCKED"}</b></article>`).join("")}</div><div class="form-unlocks"><span>${icon("bolt")}<kbd>R</kbd>${FORMS[h.id][3]}<small>Form II · LV100</small></span><span>${icon("star")}<kbd>F</kbd>${FORMS[h.id][4]}<small>Form III · LV200</small></span></div>${p.stage < 2 ? `<div class="class-goals">${goals.map((goal) => `<div class="class-goal ${goal.value >= goal.target ? "complete" : ""}"><span>${goal.value >= goal.target ? "✓" : "◇"} ${goal.label}</span><b>${Math.floor(goal.value)} / ${goal.target}</b><div class="journey-track"><i style="width:${Math.min(100, (goal.value / goal.target) * 100)}%"></i></div></div>`).join("")}</div><div class="form-action"><small>${lock || "A new form awaits."}</small><button class="primary" id="evolve-class" ${lock ? "disabled" : ""}>Transform ${costMarkup(classCost(p))}</button></div>` : '<div class="final-form-note">Final form reached · mythic skill training continues.</div>'}`;
    }
    api.modal(
      "journey",
      `<div class="modal-head"><div><span class="modal-eyebrow">${h.name.toUpperCase()} · PERMANENT</span><h2 id="modal-title">Progression <small>LV ${lv}</small></h2></div><button class="modal-close" aria-label="Close dialog">×</button></div><div class="journey-summary"><span title="Training sparks · earned by banking 2 run levels">${icon("bolt")}<b>${p.sparks}</b></span>${Object.entries(
        CATALYSTS,
      )
        .map(
          ([id, item]) =>
            `<span title="${item.name} · rare map find">${icon(item.icon)}<b>${p.materials[id]}</b></span>`,
        )
        .join(
          "",
        )}<span class="talent-wallet" title="Permanent talent points">${icon("star")}<b>${budget}</b></span></div><nav class="journey-tabs" aria-label="Progression pages">${["skills", "talents", "spells", "class"].map((t) => `<button data-journey-tab="${t}" aria-pressed="${tab === t}">${icon({ skills: "blade", talents: "book", spells: "bolt", class: "star" }[t])}${{ skills: "Skills", talents: "Talents", spells: "Spells", class: "Class" }[t]}</button>`).join("")}</nav><div class="journey-content ${tab}">${content}</div><div class="modal-foot"><span class="journey-footer">${tab === "skills" ? "Bank runs for sparks · M for rare finds" : tab === "talents" ? `${budget} points available` : tab === "spells" ? (g ? "Next run loadout · 1 / 2 / 3" : "Equip spells · 1 / 2 / 3") : "Forms persist across expeditions"}</span>${g ? `<button class="secondary" id="run-recipes">Run recipes</button>` : ""}<button class="secondary" id="journey-done">Return</button></div>`,
    );
    $("modal-panel").style.setProperty("--class-color", h.color);
    if (tab === "class") {
      for (const [i, canvas] of [
        ...document.querySelectorAll(".class-form-road canvas"),
      ].entries()) {
        canvas.dataset.form = i;
        const card = canvas.closest(".class-form"),
          description = formDescription(h.id, i),
          bonus = formBonuses(i);
        card.tabIndex = 0;
        card.title = description;
        card.setAttribute("aria-label", `${FORMS[h.id][i]}. ${description}`);
        if (i) {
          card.querySelector("small").innerHTML =
            `${icon("blade")} +${Math.round(bonus.weapon * 100)}% ${icon("bolt")} +${Math.round(bonus.skill * 100)}%`;
          card.querySelector("b").append(` · ${CLASS_FORMS[h.id].passive}`);
        }
      }
      for (const [i, row] of [
        ...document.querySelectorAll(".form-unlocks > span"),
      ].entries()) {
        row.title = `${CLASS_FORMS[h.id].abilities[i]} +${i ? 35 : 20}% all damage for ${i ? 12 : 8}s; restores ${i ? 4 : 2}s of Q cooldown. ${g ? formCooldown(g, i).toFixed(1) + "s recovery with current buffs." : "All skill recovery buffs apply."}`;
      }
    }
    for (const wallet of document.querySelectorAll(".journey-summary > span")) {
      const label = document.createElement("small");
      label.textContent = wallet.classList.contains("talent-wallet")
        ? "Talents"
        : ["Sparks", "Core", "Rune", "Sigil"][
            [...wallet.parentElement.children].indexOf(wallet)
          ];
      wallet.append(label);
    }
    if (tab === "skills") {
      const stage = skillRecord(p, skill).stage;
      $("ascend-skill").title =
        stage < 2
          ? skillDescription(h.id, skill, stage + 1)
          : "Final skill evolution reached.";
    }
    if (tab === "skills" && g) {
      const button = document.createElement("button");
      button.className = "secondary run-resonance";
      button.id = "invest-resonance";
      button.textContent = `Run resonance · ${g.talentPoints} ✦ · ${g.level < 20 ? "Spend at LV20" : "+3% damage"}`;
      button.title =
        "Spend 1 run resonance for +3% damage at run level 20. Earned from Wardens, altar tributes and run milestones. Expires when the run ends; separate from permanent talents.";
      button.disabled = g.level < 20 || g.talentPoints < 1;
      document.querySelector(".skill-training").append(button);
      button.onclick = () => {
        if (g.spendResonance()) {
          api.sound();
          api.refresh();
          show("skills");
        }
      };
    }
    if (
      tab === "talents" &&
      !g &&
      CLASS_NODES[selectedNode].row === 0 &&
      (save.mastery[h.id] || 0) >= 400
    ) {
      const id = selectedNode,
        actions = document.createElement("div");
      actions.className = "talent-actions";
      actions.append($("learn-class-talent"));
      const bind = document.createElement("button");
      bind.className = "secondary";
      bind.dataset.affinity = id;
      bind.textContent =
        (save.affinities[h.id] || h.talentIds[0]) === id
          ? "✓ Affinity"
          : "Bind affinity";
      bind.title =
        "Begin each expedition with one free rank in this root talent.";
      bind.onclick = () => {
        save.affinities[h.id] = id;
        api.persist();
        show("talents");
      };
      actions.append(bind);
      document.querySelector(".talent-inspector").append(actions);
    }
    if (tab === "talents" && talentSpent(p, h.id)) {
      const button = document.createElement("button");
      button.className = "secondary";
      button.id = "respec-request";
      button.textContent = respec ? "Cancel" : "Respec";
      document.querySelector(".talent-earning").append(button);
      button.onclick = () => {
        respec = !respec;
        show("talents");
      };
      if (respec) {
        const cost = respecCost(save, h.id),
          inspector = document.querySelector(".talent-inspector");
        inspector.innerHTML = `<i>${icon("book")}</i><div><h3>Reset talents?</h3><p>Recover all ${talentSpent(p, h.id)} spent points.</p><small>✧ ${cost.embers} embers${cost.rune ? ` · ${cost.rune} runes` : ""}</small></div><button class="primary" id="confirm-respec" ${save.embers < cost.embers || p.materials.rune < cost.rune ? "disabled" : ""}>Reset</button>`;
        $("confirm-respec").onclick = () => {
          respec = false;
          commit(respecTalents);
        };
      }
    }
    artReady.then(() => drawCodexSprites($("modal-panel")));
    document.querySelector(".modal-close").onclick = close;
    $("journey-done").onclick = close;
    for (const b of document.querySelectorAll("[data-journey-tab]"))
      b.onclick = () => show(b.dataset.journeyTab);
    for (const b of document.querySelectorAll("[data-journey-skill]"))
      b.onclick = () => {
        skill = b.dataset.journeySkill;
        show("skills");
      };
    for (const b of document.querySelectorAll("[data-class-talent]"))
      b.onclick = () => {
        selectedNode = b.dataset.classTalent;
        branch = CLASS_NODES[selectedNode].branch;
        show("talents");
        document
          .querySelector(`[data-class-talent="${selectedNode}"]`)
          ?.focus();
      };
    for (const b of document.querySelectorAll("[data-class-path]"))
      b.onclick = () => {
        branch = Number(b.dataset.classPath);
        selectedNode = pageNodes(CLASS_TREES[h.id][branch])[0].id;
        show("talents");
      };
    for (const b of document.querySelectorAll("[data-talent-page]"))
      b.onclick = () => {
        treePage = Number(b.dataset.talentPage);
        selectedNode = pageNodes(CLASS_TREES[h.id][branch])[0].id;
        show("talents");
      };
    for (const b of document.querySelectorAll("[data-spell-choice]"))
      b.onclick = () => {
        selectedSpell = b.dataset.spellChoice;
        selectedSlot = -1;
        show("spells");
      };
    for (const b of document.querySelectorAll("[data-spell-slot]"))
      b.onclick = () => {
        selectedSlot = Number(b.dataset.spellSlot);
        if (SPELLS[p.loadout[selectedSlot]])
          selectedSpell = p.loadout[selectedSlot];
        show("spells");
      };
    for (const b of document.querySelectorAll("[data-equip-spell]"))
      b.onclick = () =>
        commit((s, hero) =>
          equipSpell(
            s,
            hero,
            Number(b.dataset.equipSpell),
            profile(s, hero).loadout[Number(b.dataset.equipSpell)] ===
              selectedSpell
              ? ""
              : selectedSpell,
          ),
        );
    $("unlock-spell-slot")?.addEventListener("click", () =>
      commit(unlockSpellSlot),
    );
    $("learn-spell")?.addEventListener("click", () =>
      commit((s, hero) => buyClassTalent(s, hero, selectedSpell)),
    );
    $("spell-tree-link")?.addEventListener("click", () => {
      selectedNode = selectedSpell;
      branch = SPELLS[selectedSpell].branch;
      treePage = 1;
      show("talents");
    });
    $("train-skill")?.addEventListener("click", () =>
      commit((s, h) => trainSkill(s, h, skill)),
    );
    $("ascend-skill")?.addEventListener("click", () =>
      commit((s, h) => evolveSkill(s, h, skill)),
    );
    $("learn-class-talent")?.addEventListener("click", () =>
      commit((s, h) =>
        CLASS_NODES[selectedNode].ultimate &&
        profile(s, h).talents[selectedNode]
          ? equipUltimate(s, h, selectedNode)
          : buyClassTalent(s, h, selectedNode),
      ),
    );
    $("evolve-class")?.addEventListener("click", () => commit(evolveClass));
    $("run-recipes")?.addEventListener("click", () => {
      close();
      api.recipes();
    });
  }
  return {
    show,
    close,
    get active() {
      return !!mode;
    },
  };
}
