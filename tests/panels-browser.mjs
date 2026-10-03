import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4190" },
  stdio: "pipe",
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  browser = await chromium.launch({ headless: true });
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 1000 },
    { width: 1366, height: 768 },
    { width: 1280, height: 640 },
    { width: 1280, height: 600 },
    { width: 390, height: 844 },
    { width: 844, height: 540 },
  ].filter((v) => !process.argv.includes("--short") || v.height === 540)) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:4190/?test=1");
    await page.evaluate(() => document.fonts.ready);
    async function lobbyAudit(hero) {
      const issues = await page.evaluate(() => {
        if (innerWidth <= 1000 || innerHeight < 600) return [];
        const root = document.scrollingElement,
          issues = [];
        if (
          root.scrollHeight > innerHeight + 2 ||
          root.scrollWidth > innerWidth + 2
        )
          issues.push(
            `lobby document overflow ${root.scrollWidth}×${root.scrollHeight}`,
          );
        for (const el of document.querySelectorAll(
          "#lobby button,#lobby summary,#hero-kit,#hero-unlock,.talent-preview",
        )) {
          if (!el.getClientRects().length || el.closest("[hidden]")) continue;
          const r = el.getBoundingClientRect();
          if (
            r.top < -1 ||
            r.bottom > innerHeight + 1 ||
            r.left < -1 ||
            r.right > innerWidth + 1
          )
            issues.push(`${el.id || el.className}: outside lobby viewport`);
        }
        const cards = [...document.querySelectorAll("#hero-list .hero-card")];
        cards.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const next = (
            cards[i + 1] || document.getElementById("forge-button")
          ).getBoundingClientRect();
          if (
            r.bottom > next.top + 1 &&
            r.top < next.bottom - 1 &&
            r.right > next.left + 1 &&
            r.left < next.right - 1
          )
            issues.push("overlapping roster buttons");
          const icon = el
            .querySelector(".mini-portrait")
            .getBoundingClientRect();
          if (icon.top < r.top || icon.bottom > r.bottom)
            issues.push("clipped roster portrait");
        });
        return [...new Set(issues)];
      });
      if (issues.length)
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `./screenshots/lobby-overflow-${hero}-${viewport.width}x${viewport.height}.png`,
              import.meta.url,
            ),
          ),
        });
      assert.deepEqual(
        issues,
        [],
        `${viewport.width}x${viewport.height} ${hero} lobby`,
      );
    }
    for (const hero of ["cinder", "briar", "nyx", "volta", "rook", "lumen"]) {
      await page.evaluate((h) => __rift.selectHero(h), hero);
      await lobbyAudit(hero);
    }
    await page.locator('[data-hero="rook"]').click();
    assert.ok(await page.locator("#start-button").isDisabled());
    assert.ok(
      (await page.locator("#hero-unlock").textContent()).includes("0 / 3"),
    );
    await page.locator('[data-hero="lumen"]').click();
    assert.ok(await page.locator("#start-button").isDisabled());
    await page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/unlock-${viewport.width}.png`, import.meta.url),
      ),
      fullPage: true,
    });
    await page.evaluate(() => __rift.selectHero("cinder"));
    async function audit(name) {
      await page.waitForTimeout(30);
      const issues = await page.evaluate(() => {
        const panel = document.getElementById("modal-panel"),
          bounds = panel.getBoundingClientRect(),
          issues = [];
        if (
          getComputedStyle(document.scrollingElement).overflowY !== "hidden" ||
          getComputedStyle(document.body).overflowY !== "hidden"
        )
          issues.push("background page scrollbar remains active");
        if (bounds.top < 0 || bounds.bottom > innerHeight + 1)
          issues.push("dialog outside viewport");
        for (const el of [panel, ...panel.querySelectorAll("*")]) {
          if (
            !el.getClientRects().length ||
            el.closest("[hidden]") ||
            el.matches("canvas,svg,path,progress,i")
          )
            continue;
          const style = getComputedStyle(el),
            r = el.getBoundingClientRect();
          if (
            /auto|scroll/.test(style.overflowY) &&
            el.scrollHeight > el.clientHeight + 2
          )
            issues.push(
              `${el.className}: vertical scrollbar ${el.scrollHeight}/${el.clientHeight}`,
            );
          if (
            /auto|scroll/.test(style.overflowX) &&
            el.scrollWidth > el.clientWidth + 2
          )
            issues.push(`${el.className}: horizontal scrollbar`);
          if (
            el.matches(
              "button,summary,select,.forge-craft,.recipe-card,.talent-node,.legacy-card",
            ) &&
            (r.bottom > bounds.bottom - 8 ||
              r.top < bounds.top ||
              r.right > bounds.right - 5 ||
              r.left < bounds.left)
          )
            issues.push(
              `${el.className}: outside frame ${Math.round(r.bottom)} / ${Math.round(bounds.bottom)}`,
            );
        }
        if (panel.scrollHeight > panel.clientHeight + 2)
          issues.push(
            `panel content overflow ${panel.scrollHeight}/${panel.clientHeight}`,
          );
        if (panel.scrollWidth > panel.clientWidth + 2)
          issues.push(
            `panel horizontal overflow ${panel.scrollWidth}/${panel.clientWidth}`,
          );
        const body = panel.querySelector(".panel-body");
        if (body.scrollHeight > body.clientHeight + 2)
          issues.push(
            `body content overflow ${body.scrollHeight}/${body.clientHeight}`,
          );
        if (body.scrollWidth > body.clientWidth + 2)
          issues.push(
            `body horizontal overflow ${body.scrollWidth}/${body.clientWidth}`,
          );
        return [...new Set(issues)];
      });
      assert.deepEqual(
        issues,
        [],
        `${viewport.width}x${viewport.height} ${name}`,
      );
    }
    async function pages(name) {
      await audit(name);
      for (let n = 0; n < 20; n++) {
        const next = page.getByRole("button", {
          name: "Next page",
          exact: true,
        });
        if (!(await next.isVisible()) || !(await next.isEnabled())) break;
        await next.click();
        await audit(name + ` page ${n + 2}`);
      }
    }
    await page.locator("#hero-kit summary").first().click();
    await audit("hero ability details");
    assert.equal(await page.locator("#hero-kit details[open]").count(), 0);
    const backgroundY = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => scrollY),
      backgroundY,
      "wheel cannot scroll background while a panel is open",
    );
    await page.keyboard.press("Escape");
    assert.ok(await page.locator("#modal").isHidden());
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("dialog-open"),
      ),
      false,
    );
    await lobbyAudit("after details");
    for (const tab of [
      "Arsenal",
      "Survival",
      "Wayfinding",
      "Occult",
      "Research",
    ]) {
      await page.evaluate((tab) => __rift.progression.showForge(tab), tab);
      await pages("forge " + tab);
    }
    await page.evaluate(() => __rift.progression.showTalents());
    await pages("talents preview");
    for (const tab of [
      "inscriptions",
      "bestiary",
      "treasures",
      "synergies",
      "combos",
      "mastery",
      "legacy",
    ]) {
      await page.evaluate((tab) => __rift.progression.showCodex(tab), tab);
      await pages("codex " + tab);
    }
    await page.evaluate(() => __rift.realmUI.showRealms());
    await pages("realms");
    await page.evaluate(() => __rift.expeditionUI.showContracts());
    await pages("contracts");
    await page.evaluate(() => __rift.expeditionUI.showSettings());
    await audit("settings");
    await page.keyboard.press("Escape");
    await page.locator("#help-button").click();
    await pages("guide");
    await page.keyboard.press("Escape");
    await page.evaluate(() => __rift.start());
    await page.evaluate(() => {
      const g = __rift.game;
      g.state = "paused";
      g.level = 12;
      g.talentPoints = 9;
      g.ranks.signature = 7;
      g.ranks.active = 5;
      g.damageSources = {
        signature: 100,
        active: 70,
        orbit: 50,
        nova: 40,
        familiar: 30,
        frost: 20,
        meteor: 10,
        scythe: 5,
      };
    });
    await page.evaluate(() => __rift.expeditionUI.showBuild());
    await audit("build stats");
    await page.getByRole("button", { name: "Artifacts", exact: true }).click();
    await pages("build artifacts");
    await page.getByRole("button", { name: "Damage", exact: true }).click();
    await audit("build damage");
    await page.evaluate(async () => {
      const { ARTIFACTS } = await import("/src/reliquary.js");
      __rift.game.artifactChoices = ARTIFACTS.slice(0, 3);
      __rift.game.state = "artifact";
      __rift.expeditionUI.showArtifacts();
    });
    await pages("artifact draft");
    await page.evaluate(() => {
      __rift.game.state = "paused";
      __rift.progression.showTalents();
    });
    await pages("talents run");
    await page.evaluate(() => __rift.realmUI.showEvolutions());
    await pages("evolutions");
    await page.evaluate(() => __rift.realmUI.showMap());
    await audit("world map");
    await page.evaluate(() => {
      const g = __rift.game;
      g.state = "playing";
      g.gainXp(g.threshold());
      __rift.showLevel();
    });
    await pages("level up");
    await page.locator("details:visible summary").first().click();
    await audit("detail overlay");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".panel-detail").count(), 0);
    assert.ok(
      await page
        .locator("details:visible summary")
        .first()
        .evaluate((el) => document.activeElement === el),
    );
    assert.ok(await page.locator(".upgrade-card:visible").count());
    await page.evaluate(() => {
      const g = __rift.game;
      g.state = "dead";
      g.kills = 400;
      g.time = 300;
      g.bossesKilled = 3;
      // The unlock fixture needs four memories; real maps roll only two to four.
      g.foundMemories = [10, 11, 12, 13].map((i) => `${g.realm.id}:${i}`);
      g.artifacts = { heart: 1, crown: 1, lantern: 1, seed: 1 };
      __rift.finish(true);
    });
    await audit("result");
    await page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/result-${viewport.width}.png`, import.meta.url),
      ),
    });
    await page.locator("#return-lobby").click();
    assert.ok(await page.locator('[data-hero="rook"]').isVisible());
    assert.ok(
      !(
        await page.locator('[data-hero="rook"]').getAttribute("class")
      ).includes("locked"),
    );
    await page.locator('[data-hero="rook"]').click();
    await page.locator("#start-button").click();
    assert.equal(await page.evaluate(() => __rift.game.hero.id), "rook");
    await page.evaluate(() => {
      const g = __rift.game;
      g.p.invuln = 100;
      g.skill();
      __rift.pause();
    });
    await page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/rook-${viewport.width}.png`, import.meta.url),
      ),
    });
    assert.deepEqual(errors, []);
    await page.evaluate(() => __rift.returnLobby());
    await page.reload();
    await page.evaluate(
      async () => (await import("/src/pixel-art.js")).artReady,
    );
    for (const id of ["rook", "lumen"]) {
      await page.locator(`[data-hero="${id}"]`).click();
      assert.ok(await page.locator("#start-button").isEnabled());
      await page.locator("#start-button").click();
      assert.equal(await page.evaluate(() => __rift.game.hero.id), id);
      await page.evaluate(() => {
        const g = __rift.game;
        g.p.invuln = 100;
        g.skill();
      });
      await page.waitForTimeout(250);
      assert.ok(
        await page.evaluate(() => Number.isFinite(__rift.game.attackTimer)),
      );
      await page.screenshot({
        path: fileURLToPath(
          new URL(
            `./screenshots/${id}-arena-${viewport.width}.png`,
            import.meta.url,
          ),
        ),
      });
      await page.evaluate(() => {
        __rift.pause();
        __rift.progression.showTalents();
      });
      await pages(id + " talents");
      await page.evaluate(() => __rift.returnLobby());
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `Panel bounds, pages, help, build tabs and unlocks verified at ${viewport.width}x${viewport.height}`,
    );
  }
} finally {
  await browser?.close();
  server.kill();
}
