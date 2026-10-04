import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["--import", "tsx", "tests/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "4197" },
  stdio: "pipe",
});
let browser;
const audits = [];
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", (c) => reject(new Error(`Server exited ${c}`)));
  });
  browser = await chromium.launch({ headless: true });
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 844, height: 540 },
    { width: 360, height: 640 },
  ].filter(
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
    await page.goto("http://localhost:4197/?test=1");
    await page.waitForFunction(
      () =>
        !!window.__rift && !document.getElementById("start-button").disabled,
    );
    await page.evaluate(() => document.fonts.ready);
    async function audit(name, shot = false) {
      const issues = await page.evaluate(() => {
        const panel = document.getElementById("modal-panel"),
          r = panel.getBoundingClientRect(),
          out = [];
        if (/undefined|NaN|\[object Object\]/.test(panel.innerText))
          out.push("Missing content");
        for (const el of [
          panel,
          ...panel.querySelectorAll(
            ".panel-body,.journey-content,.spell-workshop,.spell-library,.spell-inspector,.spell-slots,.class-tree-grid,.class-node-field,.talent-inspector,button",
          ),
        ]) {
          if (!el.getClientRects().length || el.closest("[hidden]")) continue;
          if (
            el.scrollHeight > el.clientHeight + 2 ||
            el.scrollWidth > el.clientWidth + 2
          )
            out.push(
              `${el.className}: overflow ${el.scrollHeight}/${el.clientHeight} ${el.scrollWidth}/${el.clientWidth}`,
            );
          const b = el.getBoundingClientRect();
          if (
            el.matches("button") &&
            (b.bottom > r.bottom - 3 ||
              b.top < r.top ||
              b.left < r.left ||
              b.right > r.right)
          )
            out.push(`${el.className}: outside panel`);
        }
        if (r.top < 0 || r.bottom > innerHeight + 1)
          out.push("Panel outside viewport");
        return out;
      });
      audits.push({ viewport, name, issues });
      if (shot || issues.length)
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `./screenshots/spells-${name}-${viewport.width}.png`,
              import.meta.url,
            ),
          ),
        });
      assert.deepEqual(
        issues,
        [],
        `${viewport.width}×${viewport.height} ${name}`,
      );
    }
    await page.evaluate(() => __rift.journeyUI.show("spells"));
    await audit(
      "fresh-book",
      viewport.width === 1440 || viewport.width === 390,
    );
    await page.locator('[data-spell-slot="0"]').click();
    assert.ok(await page.locator("#unlock-spell-slot").isDisabled());
    await audit("fresh-slot");
    await page.evaluate(async () => {
      const { HEROES } = await import("/src/game/index.ts"),
        { profile, heroThreshold } =
          await import("/src/game/progression/journey.ts");
      Object.assign(__rift.save, {
        bosses: 8,
        best: 500,
        kills: 2000,
        runs: 6,
        embers: 1e6,
      });
      __rift.save.realmRecords.hollow = { best: 500, finds: 20 };
      __rift.save.memories.cinder = Object.fromEntries(
        [10, 11, 12, 13].map((i) => [`hollow:${i}`, true]),
      );
      for (const h of HEROES) {
        __rift.save.chronicle[h.id] = { bosses: 20, dashes: 100 };
        const p = profile(__rift.save, h.id);
        p.xp = heroThreshold(600);
        p.sparks = 1000;
        p.materials = { core: 100, rune: 100, sigil: 100 };
        p.stage = 2;
        p.skills.signature = { level: 40, stage: 2 };
        p.skills.active = { level: 40, stage: 2 };
      }
      __rift.journeyUI.show("spells");
    });
    // Actual UI purchases charge once and don't auto-equip an unlearned spell.
    for (let i = 0; i < 3; i++) {
      await page.locator(`[data-spell-slot="${i}"]`).click();
      await audit(`unlock-${i}`);
      assert.ok(await page.locator("#unlock-spell-slot").isEnabled());
      await page.locator("#unlock-spell-slot").click();
      assert.equal(
        await page.evaluate(() => __rift.save.journeys.cinder.spellSlots),
        i + 1,
      );
    }
    assert.equal(
      await page.evaluate(() => __rift.save.journeys.cinder.sparks),
      938,
    );
    await page.locator('[data-spell-choice="cinder_spell0"]').click();
    await page.locator("#spell-tree-link").click();
    assert.equal(
      await page.locator('[data-talent-page="1"]').getAttribute("aria-pressed"),
      "true",
    );
    assert.ok(
      await page.locator('[data-class-talent="cinder_spell0"]').isVisible(),
    );
    const heroes = await page.evaluate(async () => {
      const { HEROES } = await import("/src/game/index.ts"),
        { CLASS_TREES, buyClassTalent } =
          await import("/src/game/progression/class-talents.ts"),
        { unlockSpellSlot } =
          await import("/src/game/progression/spell-progression.ts"),
        { spellsFor } = await import("/src/game/data/spell-data.ts");
      for (const h of HEROES) {
        for (const b of CLASS_TREES[h.id])
          for (const n of b.nodes)
            for (let i = 0; i < n.max; i++)
              if (!buyClassTalent(__rift.save, h.id, n.id))
                throw new Error(`Could not learn ${n.id}`);
        while (unlockSpellSlot(__rift.save, h.id)) {}
      }
      return HEROES.map((h) => ({
        id: h.id,
        spells: spellsFor(h.id).map((s) => ({
          id: s.id,
          mastery: s.masteryId,
          branch: s.branch,
        })),
      }));
    });
    for (const h of heroes) {
      await page.evaluate((id) => {
        __rift.selectHero(id);
        __rift.journeyUI.show("spells");
      }, h.id);
      for (const s of h.spells) {
        await page.locator(`[data-spell-choice="${s.id}"]`).click();
        await audit(
          s.id,
          h.id === "vesper" &&
            s.id.endsWith("3") &&
            [1440, 390].includes(viewport.width),
        );
        assert.equal(await page.locator("[data-equip-spell]").count(), 3);
        await page
          .locator(`[data-equip-spell="${Number(s.id.at(-1)) % 3}"]`)
          .click();
        await audit(`${s.id}-equipped`);
      }
      await page.locator("#spell-tree-link").click();
      for (const s of h.spells) {
        if (viewport.width <= 680)
          await page.locator(`[data-class-path="${s.branch}"]`).click();
        await page.locator(`[data-class-talent="${s.mastery}"]`).click();
        assert.match(
          await page.locator('[data-talent-effect="current"]').textContent(),
          /36% spell power/,
        );
        await audit(
          s.mastery,
          h.id === "vesper" &&
            s.id.endsWith("3") &&
            [1440, 390].includes(viewport.width),
        );
      }
      await page.locator('[data-talent-page="0"]').click();
      await audit(`${h.id}-roots`);
      await page.keyboard.press("Escape");
    }
    // Test the real HUD and input handlers, using an isolated fixture rather than the live run.
    await page.evaluate(() => {
      __rift.selectHero("volta");
      __rift.start();
      const g = __rift.game;
      g.state = "paused";
      g.enemies = [];
      g.p.invuln = 1e5;
      g.spawnTimer = 1e5;
      g.attackTimer = 1e5;
      g.nextBoss = 1e5;
      g.nextHazard = 1e5;
      g.events = [];
      g.spawnEnemy("brute", 200);
      Object.assign(g.enemies[0], {
        x: 150,
        y: 0,
        hp: 1e8,
        maxHp: 1e8,
        speed: 0,
        damage: 0,
      });
    });
    await page.waitForTimeout(150);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => (__rift.game.state = "playing"));
      if (viewport.width <= 680) await page.locator(`#spell-${i}-button`).tap();
      else await page.keyboard.press(String(i + 1));
      await page.waitForFunction(
        (slot) =>
          (__rift.game.spellCooldowns[__rift.game.spellLoadout[slot]] || 0) > 0,
        i,
      );
      await page.waitForTimeout(350);
      await page.evaluate(() => (__rift.game.state = "paused"));
    }
    const hudIssues = await page.evaluate(() => {
      const buttons = [
          ...document.querySelectorAll(".bottom-hud .ability-button"),
        ].filter((e) => e.getClientRects().length),
        out = [];
      for (const [i, el] of buttons.entries()) {
        const a = el.getBoundingClientRect();
        if (
          a.left < 0 ||
          a.right > innerWidth ||
          a.top < 0 ||
          a.bottom > innerHeight
        )
          out.push(`${el.id} outside viewport`);
        if (a.width < 44 || a.height < 44) out.push(`${el.id} too small`);
        for (const next of buttons.slice(i + 1)) {
          const b = next.getBoundingClientRect();
          if (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          )
            out.push(`${el.id} overlaps ${next.id}`);
        }
      }
      return out;
    });
    assert.deepEqual(hudIssues, [], `HUD ${viewport.width}`);
    await page.screenshot({
      path: fileURLToPath(
        new URL(
          `./screenshots/spells-combat-${viewport.width}.png`,
          import.meta.url,
        ),
      ),
    });
    assert.ok(await page.evaluate(() => __rift.game.damageSources.spells > 0));
    assert.deepEqual(errors, [], `Runtime errors ${viewport.width}`);
    await context.close();
  }
  await writeFile(
    new URL("./screenshots/spells-layout-audit.json", import.meta.url),
    JSON.stringify(audits, null, 2),
  );
  console.log(
    `Spell browser checks passed: ${audits.length} layouts, all 72 spells and masteries, paid slot purchases, equip actions, keyboard/touch casts and HUD bounds.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
