import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { veteranSave } from "./helpers.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["--import", "tsx", "tests/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "4193" },
  stdio: "pipe",
});
let browser;
const ids = ["vesper", "fen", "solace", "orin", "kestrel", "morrow"],
  audits = [];
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  browser = await chromium.launch({ headless: true });
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1280, height: 600 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
        viewport,
        hasTouch: viewport.width < 680,
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:4193/?test=1");
    await page.waitForFunction(
      () => !document.getElementById("start-button").disabled,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#roster-next").click();
    assert.equal(await page.locator(".hero-card").count(), 6);
    async function audit(name, dialog = false) {
      const issues = await page.evaluate((dialog) => {
        const root = dialog
            ? document.getElementById("modal-panel")
            : document.getElementById("lobby"),
          out = [];
        if (
          !dialog &&
          innerWidth > 1000 &&
          document.scrollingElement.scrollHeight > innerHeight + 2
        )
          out.push("lobby overflow");
        for (const e of [root, ...root.querySelectorAll("*")]) {
          if (
            !e.getClientRects().length ||
            e.closest("[hidden]") ||
            e.matches("canvas,svg,path,i")
          )
            continue;
          const s = getComputedStyle(e),
            r = e.getBoundingClientRect();
          if (
            /auto|scroll/.test(s.overflowY) &&
            e.scrollHeight > e.clientHeight + 2
          )
            out.push(`${e.className}: scroll`);
          if (
            /auto|scroll/.test(s.overflowX) &&
            e.scrollWidth > e.clientWidth + 2
          )
            out.push(`${e.className}: horizontal scroll`);
          if (
            (dialog || innerWidth > 1000) &&
            e.matches("button,summary") &&
            (r.top < -1 ||
              r.bottom > innerHeight + 1 ||
              r.right > innerWidth + 1 ||
              r.left < -1)
          )
            out.push(`${e.id || e.className}: outside screen`);
        }
        return [...new Set(out)];
      }, dialog);
      audits.push({ viewport, name, issues });
      if (issues.length)
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `./screenshots/classes-overflow-${viewport.width}-${name}.png`,
              import.meta.url,
            ),
          ),
        });
      assert.deepEqual(
        issues,
        [],
        `${viewport.width}x${viewport.height}: ${name}`,
      );
    }
    async function checkAwakening(id) {
      await page.evaluate((id) => {
        __rift.selectHero(id);
        __rift.start();
        const g = __rift.game;
        g.p.invuln = 100;
        g.spawnTimer = g.nextBoss = 1e6;
        g.ranks.signature = 4;
        g.recalculate();
        Object.assign(g, {
          level: 9,
          state: "levelup",
          pendingLevels: 1,
          offered: ["signature", "active", "power"],
        });
        __rift.showLevel();
      }, id);
      const expected = await page.evaluate(async (id) => {
        const { EVOLUTIONS } = await import("/src/game/index.ts");
        return EVOLUTIONS[id].name;
      }, id);
      const card = page.locator('[data-upgrade="signature"]');
      assert.equal(await card.locator("strong").textContent(), expected);
      assert.ok(
        !(await page.locator("#modal-panel").textContent()).includes(
          "undefined",
        ),
        `${id}: valid awakening and active descriptions`,
      );
      await audit(`${id}-awakening`, true);
      await card.click();
      assert.deepEqual(
        await page.evaluate(() => ({
          rank: __rift.game.rank("signature"),
          state: __rift.game.state,
        })),
        { rank: 5, state: "playing" },
        `${id}: awakening selection resumes the expedition`,
      );
      await page.evaluate(() => __rift.returnLobby());
    }
    for (const id of ids) {
      await page.locator(`[data-hero="${id}"]`).click();
      assert.ok(await page.locator("#start-button").isDisabled());
      assert.ok((await page.locator("#hero-unlock").textContent()).trim());
      await audit(`locked-${id}`);
    }
    if (viewport.width === 1920)
      await page.screenshot({
        path: fileURLToPath(
          new URL("./screenshots/classes-locked-roster.png", import.meta.url),
        ),
      });
    await page.evaluate(
      (s) => localStorage.setItem("riftbound.save.v1", JSON.stringify(s)),
      veteranSave(),
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.getElementById("start-button").disabled,
    );
    await page.locator("#roster-next").click();
    for (const id of ids) {
      await page.locator(`[data-hero="${id}"]`).click();
      assert.ok(await page.locator("#start-button").isEnabled());
      await audit(`unlocked-${id}`);
      for (const tab of ["skills", "talents", "class"]) {
        await page.evaluate((t) => __rift.journeyUI.show(t), tab);
        await audit(`${id}-${tab}`, true);
        await page.keyboard.press("Escape");
      }
      await checkAwakening(id);
    }
    if (viewport.width === 1920) {
      const idleAudit = await page.evaluate(async () => {
        const { artReady, actionSprite, drawSprite } =
          await import("/src/client/rendering/pixel-art.ts");
        await artReady;
        const bounds = (image) => {
          const c = document.createElement("canvas");
          c.width = image.width;
          c.height = image.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(image, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let left = c.width,
            top = c.height,
            right = -1,
            bottom = -1,
            solid = 0;
          for (let y = 0; y < c.height; y++)
            for (let x = 0; x < c.width; x++) {
              if (data[(y * c.width + x) * 4 + 3] <= 90) continue;
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
              solid++;
            }
          return { w: right - left + 1, h: bottom - top + 1, solid };
        };
        return ["vesper", "fen", "solace", "orin", "kestrel", "morrow"].map(
          (id) => {
            // The static portrait must retain the complete idle silhouette used in combat,
            // including boots, without fragments from the preceding atlas row.
            const expected = bounds(actionSprite(id, "walk", 0).image);
            const c = document.createElement("canvas");
            c.width = 400;
            c.height = 400;
            drawSprite(c.getContext("2d"), id, 200, 350, expected.h);
            return { id, expected, actual: bounds(c) };
          },
        );
      });
      for (const { id, expected, actual } of idleAudit) {
        assert.ok(
          Math.abs(expected.w - actual.w) <= 1,
          `${id}: complete idle width`,
        );
        assert.ok(
          Math.abs(expected.h - actual.h) <= 1,
          `${id}: complete idle height`,
        );
        assert.ok(
          Math.abs(expected.solid - actual.solid) / expected.solid < 0.02,
          `${id}: no clipped feet or foreign fragments`,
        );
      }
      for (const id of ["vesper", "fen"]) {
        await page.locator(`[data-hero="${id}"]`).click();
        await page.locator("#portrait").screenshot({
          path: fileURLToPath(
            new URL(`./screenshots/portrait-${id}.png`, import.meta.url),
          ),
        });
      }
      const artAudit = await page.evaluate(async () => {
        const { art, artReady, actionSprite, drawSprite } =
          await import("/src/client/rendering/pixel-art.ts");
        await artReady;
        const c = document.createElement("canvas");
        c.width = 1120;
        c.height = 850;
        c.id = "class-gallery";
        c.style =
          "position:fixed;top:0;left:0;width:1120px;height:850px;z-index:9999";
        document.body.append(c);
        const x = c.getContext("2d");
        x.fillStyle = "#12212b";
        x.fillRect(0, 0, c.width, c.height);
        const out = [];
        for (const [row, id] of [
          "vesper",
          "fen",
          "solace",
          "orin",
          "kestrel",
          "morrow",
        ].entries()) {
          x.fillStyle = "#e2d5b3";
          x.font = "14px sans-serif";
          x.fillText(id, 10, 60 + row * 130);
          for (let frame = 0; frame < 6; frame++) {
            const s = actionSprite(id, "attack", frame);
            const pixels = s.image
              .getContext("2d")
              .getImageData(0, 0, s.image.width, s.image.height).data;
            let solid = 0;
            for (let i = 3; i < pixels.length; i += 4)
              if (pixels[i] > 180) solid++;
            out.push({
              id,
              frame,
              solid,
              foot: s.foot,
              anchor: s.anchor,
              w: s.w,
              h: s.h,
            });
            x.drawImage(s.image, 120 + frame * 155, 40 + row * 130, 130, 130);
          }
        }
        for (const [col, id] of [
          "imp",
          "guardian",
          "wolf",
          "elemental",
          "crane",
          "ghoul",
        ].entries())
          drawSprite(x, "pet-" + id, 170 + col * 155, 840, 54, { frame: 2 });
        return out;
      });
      assert.equal(artAudit.length, 36);
      assert.ok(
        artAudit.every(
          (s) =>
            s.solid > 1500 &&
            s.foot > 0 &&
            s.foot <= s.h &&
            s.anchor > 0 &&
            s.anchor < s.w,
        ),
      );
      await page.screenshot({
        path: fileURLToPath(
          new URL("./screenshots/classes-sprite-gallery.png", import.meta.url),
        ),
      });
      await page.evaluate(() =>
        document.getElementById("class-gallery").remove(),
      );
      for (const id of ids) {
        await page.locator(`[data-hero="${id}"]`).click();
        await page.locator("#start-button").click();
        await page.evaluate(() => {
          const g = __rift.game;
          g.p.invuln = 100;
          g.enemies = [];
          g.spawnTimer = 1e6;
          g.nextBoss = 1e6;
          g.spawnEnemy("brute", 90);
          Object.assign(g.enemies[0], {
            x: 85,
            y: 0,
            speed: 0,
            hp: 1e7,
            maxHp: 1e7,
          });
          g.attackTimer = 0;
          g.p.trait = 1;
        });
        await page.waitForTimeout(1100);
        await page.keyboard.press("q");
        await page.waitForTimeout(550);
        await page.keyboard.press("d");
        await page.waitForTimeout(150);
        const state = await page.evaluate(() => ({
          id: __rift.game.hero.id,
          damage: __rift.game.stats.damage,
          skills: __rift.game.stats.skills,
          companions: __rift.game.companions.length,
          totems: __rift.game.totems.length,
          trait: document.getElementById("trait-text").textContent,
          nan: __rift.game.effects.some(
            (e) => e.r !== undefined && !Number.isFinite(e.r),
          ),
        }));
        assert.equal(state.id, id);
        assert.ok(state.damage > 0, id);
        assert.equal(state.skills, 1);
        assert.equal(state.nan, false);
        assert.ok(state.trait && state.trait !== "undefined");
        await page.screenshot({
          path: fileURLToPath(
            new URL(`./screenshots/class-${id}-combat.png`, import.meta.url),
          ),
        });
        await page.evaluate(async () => {
          const g = __rift.game;
          const { heroThreshold } =
            await import("/src/game/progression/journey.ts");
          g.journey.xp = heroThreshold(200);
          g.journey.stage = 2;
          g.journey.skills.signature = g.journey.skills.active = {
            level: 40,
            stage: 2,
          };
          g.recalculate();
          g.castForm(0);
        });
        await page.waitForTimeout(450);
        await page.evaluate(() => __rift.game.castForm(1));
        await page.waitForTimeout(450);
        assert.ok(
          await page.evaluate(() =>
            __rift.game.formCooldowns.every((c) => c > 0),
          ),
        );
        await page.evaluate(() => __rift.returnLobby());
      }
      for (const id of ["cinder", "briar", "nyx", "volta", "rook", "lumen"])
        await checkAwakening(id);
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `Classes, awakenings, unlocks, talents, forms and bounded UI passed at ${viewport.width}x${viewport.height}`,
    );
  }
  await writeFile(
    new URL("./screenshots/classes-audit.json", import.meta.url),
    JSON.stringify(audits, null, 2),
  );
} finally {
  await browser?.close();
  server.kill();
}
