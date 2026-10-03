import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4192" },
  stdio: "pipe",
});
let browser;
const audits = [];
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  browser = await chromium.launch({ headless: true });
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 844, height: 540 },
    { width: 360, height: 640 },
  ];
  for (const viewport of viewports.filter(
    (v) =>
      !process.env.RIFT_VIEWPORT ||
      v.width === Number(process.env.RIFT_VIEWPORT),
  )) {
    const context = await browser.newContext({
        viewport,
        hasTouch: viewport.width <= 680,
        reducedMotion: "reduce",
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:4192/?test=1");
    await page.evaluate(() => document.fonts.ready);
    async function audit(name, capture = true) {
      await page.waitForTimeout(60);
      const issues = await page.evaluate(() => {
        const panel = document.getElementById("modal-panel"),
          body = panel.querySelector(".panel-body"),
          r = panel.getBoundingClientRect(),
          out = [];
        const missing = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;
        if (missing.test(panel.innerText)) out.push("missing visible content");
        for (const el of panel.querySelectorAll("[title],[aria-label]"))
          if (
            missing.test(
              `${el.getAttribute("title") || ""} ${el.getAttribute("aria-label") || ""}`,
            )
          )
            out.push(`${el.className}: missing tooltip or accessible name`);
        if (r.top < 0 || r.bottom > innerHeight + 1)
          out.push("dialog outside viewport");
        for (const el of [
          panel,
          body,
          ...panel.querySelectorAll(
            "button,.journey-content,.class-node-field,.skill-training,.skill-workshop,.talent-inspector,.class-form-road,.form-action",
          ),
        ]) {
          if (!el?.getClientRects().length || el.closest("[hidden]")) continue;
          if (
            el.scrollHeight > el.clientHeight + 2 ||
            el.scrollWidth > el.clientWidth + 2
          )
            out.push(
              `${el.className}: overflow ${el.scrollHeight}/${el.clientHeight}, ${el.scrollWidth}/${el.clientWidth}`,
            );
          const b = el.getBoundingClientRect();
          if (
            el.matches("button") &&
            (b.bottom > r.bottom - 5 ||
              b.top < r.top ||
              b.left < r.left ||
              b.right > r.right)
          )
            out.push(`${el.className}: outside panel`);
        }
        return out;
      });
      audits.push({ viewport, name, issues });
      if ((capture && [1440, 390].includes(viewport.width)) || issues.length)
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `./screenshots/journey-${name}-${viewport.width}.png`,
              import.meta.url,
            ),
          ),
        });
      assert.deepEqual(
        issues,
        [],
        `${viewport.width}×${viewport.height}: ${name}`,
      );
    }
    for (const tab of ["skills", "talents", "class"]) {
      await page.evaluate((t) => __rift.journeyUI.show(t), tab);
      await audit(`new-${tab}`);
    }
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#modal").isHidden());
    // Real boss/altar payouts must be visible even before resonance spending unlocks.
    await page.evaluate(async () => {
      __rift.start();
      const g = __rift.game;
      g.state = "paused";
      g.enemies = [];
      g.spawnEnemy("boss", 300);
      g.kill(g.enemies[0]);
      g.events = [];
      __rift.journeyUI.show("skills");
    });
    const resonance = () => page.locator("#invest-resonance");
    assert.match(await resonance().textContent(), /1 ✦.*Spend at LV20/);
    assert.ok(await resonance().isDisabled());
    assert.equal(await page.locator(".talent-wallet b").textContent(), "0");
    await audit("early-boss-resonance");
    for (const skill of [
      "active",
      "orbit",
      "nova",
      "familiar",
      "frost",
      "meteor",
      "scythe",
    ]) {
      await page.locator(`[data-journey-skill="${skill}"]`).click();
      await audit(`early-resonance-${skill}`, false);
    }
    await page.locator('[data-journey-skill="signature"]').click();
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
      const { SHRINE_BOONS } = await import("/src/progression.js");
      const g = __rift.game;
      g.state = "playing";
      g.p.invuln = 1e5;
      g.pickups = [];
      g.vaults = [];
      g.shrines = [{ x: g.p.x, y: g.p.y, used: false }];
      if (!g.interact()) throw new Error("Altar did not open");
      g.shrineChoices = ["tribute", "knowledge", "blood"].map((id) =>
        SHRINE_BOONS.find((b) => b.id === id),
      );
    });
    const tribute = page.locator('[data-boon="tribute"]');
    await tribute.waitFor({ state: "visible" });
    assert.match(await tribute.textContent(), /run resonance.*this run/);
    await audit("altar-resonance-offer");
    await tribute.click();
    await page.evaluate(() => {
      __rift.game.state = "paused";
      __rift.journeyUI.show("skills");
    });
    assert.match(await resonance().textContent(), /2 ✦.*Spend at LV20/);
    assert.ok(await resonance().isDisabled());
    await audit("early-altar-resonance");
    const damage = await page.evaluate(() => {
      const g = __rift.game;
      g.level = 20;
      __rift.journeyUI.show("skills");
      return g.damage;
    });
    assert.ok(await resonance().isEnabled());
    await resonance().click();
    assert.match(await resonance().textContent(), /1 ✦.*\+3% damage/);
    assert.ok((await page.evaluate(() => __rift.game.damage)) > damage);
    await audit("resonance-spent");
    await resonance().click();
    assert.match(await resonance().textContent(), /0 ✦/);
    assert.ok(await resonance().isDisabled());
    await page.locator('[data-journey-tab="talents"]').click();
    assert.equal(await page.locator(".talent-wallet b").textContent(), "0");
    assert.match(
      await page.locator(".talent-earning").textContent(),
      /10 banked Wardens/,
    );
    await page.evaluate(() => __rift.returnLobby());
    await page.evaluate(async () => {
      const { profile, heroThreshold } = await import("/src/journey.js");
      const p = profile(__rift.save, "cinder");
      p.xp = heroThreshold(100);
      p.sparks = 1000;
      __rift.save.embers = 500;
      p.materials = { core: 100, rune: 100, sigil: 10 };
      p.skills.signature = { level: 20, stage: 0 };
      p.skills.active = { level: 20, stage: 0 };
      __rift.save.chronicle.cinder = { bosses: 20 };
      __rift.journeyUI.show("skills");
    });
    await page.locator("#ascend-skill").click();
    assert.equal(
      await page.evaluate(
        () => __rift.save.journeys.cinder.skills.signature.stage,
      ),
      1,
    );
    await page.locator('[data-journey-skill="active"]').click();
    await page.locator("#ascend-skill").click();
    await page.locator('[data-journey-tab="class"]').click();
    await audit("ready-class");
    await page.locator("#evolve-class").click();
    assert.equal(
      await page.evaluate(() => __rift.save.journeys.cinder.stage),
      1,
    );
    await page.locator('[data-journey-tab="talents"]').click();
    await page.locator('[data-class-talent="afterburn"]').click();
    const effect = (kind) =>
      page.locator(`[data-talent-effect="${kind}"] > span`);
    assert.equal(await effect("current").textContent(), "Not learned.");
    assert.equal(
      await effect("next").textContent(),
      "35% weapon damage / second as burn.",
    );
    await page.locator("#learn-class-talent").click();
    assert.equal(
      await page.evaluate(() => __rift.save.journeys.cinder.talents.afterburn),
      1,
    );
    assert.equal(
      await effect("current").textContent(),
      "35% weapon damage / second as burn.",
    );
    assert.equal(
      await effect("next").textContent(),
      "70% weapon damage / second as burn.",
    );
    await page.locator("#learn-class-talent").click();
    assert.equal(
      await effect("current").textContent(),
      "70% weapon damage / second as burn.",
    );
    assert.equal(
      await effect("next").textContent(),
      "105% weapon damage / second as burn.",
    );
    assert.ok(
      (
        await page
          .locator('[data-class-talent="afterburn"]')
          .getAttribute("title")
      ).includes("Now: 70%"),
    );
    await page.locator('[data-class-talent="cinder_path0_0"]').click();
    await page.locator("#learn-class-talent").click();
    await page.locator("#learn-class-talent").click();
    assert.equal(await effect("current").textContent(), "+10% weapon damage");
    assert.equal(await effect("next").textContent(), "+15% weapon damage");
    await audit("invested-talents");
    await page.locator("#respec-request").click();
    await audit("respec-talents");
    await page.locator("#confirm-respec").click();
    assert.equal(
      await page.evaluate(
        () => Object.keys(__rift.save.journeys.cinder.talents).length,
      ),
      0,
    );
    await page.locator('[data-class-talent="afterburn"]').click();
    assert.equal(await effect("current").textContent(), "Not learned.");
    await page.locator("#learn-class-talent").click();
    for (const path of [1, 2]) {
      if (viewport.width <= 680)
        await page.locator(`[data-class-path="${path}"]`).click();
      else
        await page
          .locator(
            `[data-class-talent="${path === 1 ? "firestorm" : "phoenix"}"]`,
          )
          .click();
    }
    await page.keyboard.press("Escape");
    await page.reload();
    assert.equal(
      await page.evaluate(() => __rift.save.journeys.cinder.stage),
      1,
    );
    assert.equal(
      await page.evaluate(() => __rift.save.journeys.cinder.talents.afterburn),
      1,
    );
    await page.evaluate(() => __rift.start());
    assert.ok(await page.locator("#form-0-button").isVisible());
    assert.ok(await page.locator("#form-1-button").isHidden());
    await page.keyboard.press("r");
    assert.ok(await page.evaluate(() => __rift.game.formCooldowns[0] > 0));
    await page.evaluate(() => {
      __rift.game.gainXp(__rift.game.threshold());
      __rift.showLevel();
      __rift.journeyUI.show("talents");
    });
    await page.locator('[data-class-talent="afterburn"]').click();
    await page.locator("#learn-class-talent").click();
    assert.equal(
      await effect("current").textContent(),
      "70% weapon damage / second as burn.",
    );
    assert.equal(await page.evaluate(() => __rift.game.rank("afterburn")), 2);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => __rift.game.state), "levelup");
    assert.equal(
      await page.locator("#modal-panel").getAttribute("data-screen"),
      "levelup",
    );
    await page.locator("[data-upgrade]").first().click();
    await page.evaluate(async () => {
      const { spawnCatalyst } = await import("/src/journey.js");
      const item = spawnCatalyst(__rift.game, "sigil");
      for (const kind of ["core", "rune", "core"])
        spawnCatalyst(__rift.game, kind);
      item.x = __rift.game.p.x + 300;
      item.y = __rift.game.p.y + 200;
      __rift.realmUI.showMap();
    });
    await page.locator("[data-track-catalyst]").first().click();
    assert.ok(
      await page.evaluate(() =>
        __rift.game.waypoint.id.startsWith("catalyst:"),
      ),
    );
    await audit("rare-map");
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
      const { heroThreshold } = await import("/src/journey.js");
      const p = __rift.game.journey;
      p.xp = heroThreshold(200);
      p.skills.signature = { level: 40, stage: 2 };
      p.skills.active = { level: 40, stage: 2 };
      __rift.journeyUI.show("class");
    });
    await page.locator("#evolve-class").click();
    assert.equal(await page.evaluate(() => __rift.game.journey.stage), 2);
    await audit("final-class");
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#form-1-button").isVisible());
    await page.evaluate(() => {
      __rift.game.enemies.forEach((e) => (e.hp = e.maxHp = 1e8));
      __rift.game.pickups = [];
      __rift.game.xp = 0;
    });
    await page.waitForFunction(() => !__rift.game.pendingForm);
    await page.keyboard.press("f");
    await page.waitForTimeout(450);
    assert.ok(
      await page.evaluate(
        () => __rift.game.formCooldowns[1] > 0 && !__rift.game.pendingForm,
      ),
      JSON.stringify(
        await page.evaluate(() => ({
          state: __rift.game.state,
          pending: __rift.game.pendingForm,
          cooldowns: __rift.game.formCooldowns,
        })),
      ),
    );
    assert.deepEqual(errors, []);
    const controlIssues = await page.evaluate(() => {
      const elements = [...document.querySelectorAll(".ability-button")].filter(
          (el) => el.getClientRects().length && !el.closest("[hidden]"),
        ),
        out = [];
      for (const el of elements) {
        const r = el.getBoundingClientRect();
        if (r.left < 0 || r.right > innerWidth || r.bottom > innerHeight)
          out.push(`${el.id}: outside viewport`);
        if (getComputedStyle(el).pointerEvents === "none")
          out.push(`${el.id}: cannot click`);
      }
      const stick = document.getElementById("joystick").getBoundingClientRect();
      if (
        getComputedStyle(document.getElementById("joystick")).display !== "none"
      )
        for (const el of elements) {
          const r = el.getBoundingClientRect();
          if (
            r.left < stick.right &&
            r.right > stick.left &&
            r.top < stick.bottom &&
            r.bottom > stick.top
          )
            out.push(`${el.id}: overlaps movement stick`);
        }
      return out;
    });
    assert.deepEqual(
      controlIssues,
      [],
      `Evolved combat controls at ${viewport.width}`,
    );
    if (viewport.width <= 680) {
      await page.evaluate(() => (__rift.game.formCooldowns[1] = 0));
      await page.locator("#form-1-button").tap();
      assert.ok(await page.evaluate(() => __rift.game.formCooldowns[1] > 0));
    }
    if ([1440, 390].includes(viewport.width))
      await page.screenshot({
        path: fileURLToPath(
          new URL(
            `./screenshots/journey-combat-${viewport.width}.png`,
            import.meta.url,
          ),
        ),
      });
    // Check long rank-aware descriptions in every class without touching the user's save.
    const treeCases = await page.evaluate(async () => {
      __rift.returnLobby();
      const { HEROES } = await import("/src/core.js");
      const { profile, heroThreshold } = await import("/src/journey.js");
      const { CLASS_NODES, classTalentPreview } =
        await import("/src/class-talents.js");
      return HEROES.map((h) => {
        const p = profile(__rift.save, h.id),
          nodes = Object.values(CLASS_NODES).filter((n) => n.hero === h.id);
        p.xp = heroThreshold(200);
        p.talents = Object.fromEntries(
          nodes
            .filter((n) => n.max > 1)
            .map((n) => [n.id, n.row === 0 ? 3 : n.row === 1 ? 2 : 1]),
        );
        const longest = (filter) =>
          nodes
            .filter(filter)
            .map((n) => ({
              id: n.id,
              branch: n.branch,
              page: n.row >= 5 ? 1 : 0,
              ...classTalentPreview(__rift.save, h.id, n.id),
            }))
            .sort(
              (a, b) =>
                b.current.length +
                (b.next?.length || 0) -
                (a.current.length + (a.next?.length || 0)),
            )[0];
        return {
          hero: h.id,
          cases: [
            longest((n) => !n.stats && n.max > 1),
            longest((n) => !!n.stats && n.max > 1),
            longest((n) => n.max === 1),
          ],
        };
      });
    });
    for (const { hero, cases } of treeCases) {
      await page.evaluate((id) => {
        __rift.selectHero(id);
        __rift.journeyUI.show("talents");
      }, hero);
      for (const node of cases) {
        await page.locator(`[data-talent-page="${node.page}"]`).click();
        if (viewport.width <= 680)
          await page.locator(`[data-class-path="${node.branch}"]`).click();
        await page.locator(`[data-class-talent="${node.id}"]`).click();
        assert.equal(
          await effect("current").textContent(),
          node.current,
          node.id,
        );
        assert.equal(await effect("next").textContent(), node.next, node.id);
        await audit(`rank-details-${hero}-${node.id}`, hero === "cinder");
      }
    }
    // Own all final nodes legitimately, equip exactly one, and keep the inspector bounded.
    const ultimateCases = await page.evaluate(async () => {
      const { HEROES } = await import("/src/core.js");
      const { profile, heroThreshold } = await import("/src/journey.js");
      const { CLASS_TREES, buyClassTalent } =
        await import("/src/class-talents.js");
      Object.assign(__rift.save, {
        kills: 2000,
        bosses: 20,
        best: 420,
        runs: 8,
      });
      __rift.save.chronicle.cinder.dashes = 100;
      __rift.save.realmRecords.hollow = { best: 420, finds: 20 };
      __rift.save.memories.cinder = Object.fromEntries(
        [10, 11, 12, 13].map((i) => [`hollow:${i}`, true]),
      );
      return HEROES.map((h) => {
        const p = profile(__rift.save, h.id);
        p.xp = heroThreshold(500);
        p.talents = {};
        p.ultimate = "";
        for (const b of CLASS_TREES[h.id])
          for (const n of b.nodes)
            for (let i = 0; i < n.max; i++)
              if (!buyClassTalent(__rift.save, h.id, n.id))
                throw new Error(`Could not learn ${n.id}`);
        return {
          hero: h.id,
          nodes: CLASS_TREES[h.id].map((b) => ({
            id: b.nodes.find((n) => n.ultimate).id,
            branch: b.nodes.find((n) => n.ultimate).branch,
          })),
        };
      });
    });
    for (const { hero, nodes } of ultimateCases) {
      await page.evaluate((id) => {
        __rift.selectHero(id);
        __rift.journeyUI.show("talents");
      }, hero);
      for (const n of nodes) {
        await page.locator('[data-talent-page="0"]').click();
        if (viewport.width <= 680)
          await page.locator(`[data-class-path="${n.branch}"]`).click();
        await page.locator(`[data-class-talent="${n.id}"]`).click();
        const equip = page.locator("#learn-class-talent");
        if (await equip.isEnabled()) {
          assert.equal(await equip.textContent(), "Equip");
          await equip.click();
        }
        assert.equal(await equip.textContent(), "✓ Armed");
        assert.ok(await equip.isDisabled());
        assert.equal(await page.locator(".class-talent.armed").count(), 1);
        assert.match(
          await page
            .locator(`[data-class-talent="${n.id}"]`)
            .getAttribute("title"),
          /40s base cooldown · recovery buffs apply/,
        );
        assert.equal(
          await page.evaluate((h) => __rift.save.journeys[h].ultimate, hero),
          n.id,
        );
        await audit(`ultimate-${n.id}`, hero === "vesper");
      }
    }
    await page.keyboard.press("Escape");
    await page.reload();
    for (const { hero, nodes } of ultimateCases)
      assert.equal(
        await page.evaluate((h) => __rift.save.journeys[h].ultimate, hero),
        nodes.at(-1).id,
      );
    for (const [hero, ultimate] of [
      ["vesper", "vesper_path1_3"],
      ["fen", "fen_path0_3"],
    ]) {
      await page.evaluate(
        async ({ hero, ultimate }) => {
          const { equipUltimate } = await import("/src/class-talents.js");
          __rift.selectHero(hero);
          equipUltimate(__rift.save, hero, ultimate);
          __rift.start();
          const g = __rift.game;
          g.p.invuln = 1e8;
          g.attackTimer =
            g.spawnTimer =
            g.nextBoss =
            g.nextCache =
            g.nextShrine =
            g.nextHazard =
            g.nextCatalyst =
              1e8;
          g.enemies = [];
          g.pickups = [];
          for (let i = 0; i < 12; i++) {
            g.spawnEnemy("crawler", 200);
            Object.assign(g.enemies.at(-1), {
              x: g.p.x + 90 + i * 6,
              y: g.p.y + (i % 3) * 15,
              speed: 0,
              damage: 0,
              hp: 1e8,
              maxHp: 1e8,
            });
          }
        },
        { hero, ultimate },
      );
      await page.waitForFunction(() =>
        document
          .getElementById("skill-button")
          .classList.contains("ultimate-ready"),
      );
      if (viewport.width <= 680) await page.locator("#skill-button").tap();
      else await page.keyboard.press("q");
      await page.waitForFunction(
        (id) => __rift.game.talentState.ultimate?.id === id,
        ultimate,
      );
      await page.waitForFunction(
        () =>
          !document
            .getElementById("skill-button")
            .classList.contains("ultimate-ready"),
      );
      assert.ok(
        await page.evaluate(
          () => __rift.game.damageSources.talent_ultimate > 100,
        ),
      );
      assert.ok(
        await page.evaluate(() =>
          __rift.game.companions.some((c) => c.ultimate),
        ),
      );
      assert.ok(
        !(await page.locator("#skill-button").getAttribute("class")).includes(
          "ultimate-ready",
        ),
      );
      assert.match(
        await page.locator("#skill-button").getAttribute("aria-label"),
        /seconds remaining/,
      );
      await page.keyboard.press("t");
      const cooldown = await page.evaluate(
        () => __rift.game.talentState.cooldown,
      );
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => __rift.game.talentState.cooldown),
        cooldown,
      );
      await audit(`combat-ultimate-${hero}`);
      await page.keyboard.press("Escape");
      await page.evaluate(() => __rift.returnLobby());
    }
    await page.evaluate(() => {
      __rift.save.mastery.cinder = 400;
      __rift.save.affinities.cinder = "phoenix";
      __rift.save.journeys.cinder.talents = {};
      __rift.selectHero("cinder");
      __rift.journeyUI.show("talents");
    });
    if (viewport.width <= 680)
      await page.locator('[data-class-path="2"]').click();
    await page.locator('[data-class-talent="phoenix"]').click();
    const affinityEffect = await effect("current").textContent();
    assert.equal(
      await effect("next").textContent(),
      "Already granted by affinity.",
    );
    assert.ok(
      (
        await page.locator('[data-talent-effect="current"]').textContent()
      ).includes("Affinity"),
    );
    await audit("talent-affinity");
    await page.locator("#learn-class-talent").click();
    assert.equal(await effect("current").textContent(), affinityEffect);
    assert.notEqual(
      await effect("current").textContent(),
      await effect("next").textContent(),
    );
    for (let rank = 1; rank < 5; rank++)
      await page.locator("#learn-class-talent").click();
    assert.equal(await effect("next").count(), 0);
    assert.ok(await page.locator("#learn-class-talent").isDisabled());
    await audit("talent-mastered");
    // Exercise all 288 class/skill/stage combinations through the actual UI.
    const skillCases = await page.evaluate(async () => {
      const { HEROES, UPGRADES } = await import("/src/core.js");
      const { SKILLS, skillName } = await import("/src/journey.js");
      const { skillDescription } = await import("/src/skill-descriptions.js");
      return HEROES.flatMap((h) =>
        [0, 1, 2].map((stage) => ({
          hero: h.id,
          stage,
          skills: SKILLS.map((id) => ({
            id,
            name: skillName(
              h.id,
              id,
              stage,
              id === "signature"
                ? h.weapon
                : id === "active"
                  ? h.skill
                  : UPGRADES[id].name,
            ),
            desc: skillDescription(h.id, id, stage),
          })),
        })),
      );
    });
    for (const { hero, stage, skills } of skillCases) {
      await page.evaluate(
        async ({ hero, stage }) => {
          const { profile, heroThreshold, SKILLS } =
            await import("/src/journey.js");
          const p = profile(__rift.save, hero);
          p.xp = heroThreshold(200);
          p.skills = Object.fromEntries(
            SKILLS.map((id) => [id, { level: [1, 20, 40][stage], stage }]),
          );
          __rift.selectHero(hero);
          __rift.journeyUI.show("skills");
        },
        { hero, stage },
      );
      for (const s of skills) {
        await page.locator(`[data-journey-skill="${s.id}"]`).click();
        assert.equal(
          await page.locator(".skill-training h3").textContent(),
          s.name,
        );
        assert.equal(
          await page.locator("[data-skill-description]").textContent(),
          s.desc,
        );
        if (stage < 2)
          assert.equal(
            await page.locator("#ascend-skill").getAttribute("title"),
            await page.evaluate(
              async ({ hero, id, stage }) => {
                const { skillDescription } =
                  await import("/src/skill-descriptions.js");
                return skillDescription(hero, id, stage + 1);
              },
              { hero, id: s.id, stage },
            ),
          );
        await audit(
          `skill-description-${hero}-${s.id}-${stage}`,
          hero === "vesper" && s.id === "signature",
        );
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(
    new URL("./screenshots/journey-audit.json", import.meta.url),
    JSON.stringify(audits, null, 2),
  );
  console.log(
    `Progression browser checks passed: ${audits.length} layouts, all 288 skill descriptions, all 36 equipped ultimates, keyboard/touch casts, live talent details, boss/altar resonance, evolutions, persistence and rare-map tracking.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
