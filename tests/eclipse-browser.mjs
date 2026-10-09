import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["--import", "tsx", "tests/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "4198" },
  stdio: "pipe",
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`Server exited ${code}`)));
  });
  browser = await chromium.launch({ headless: true });
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [844, 540],
    [1000, 768],
    [1024, 600],
    // CSS viewport sizes for a 1536 × 864 window at 125% and 150% zoom.
    [1229, 691],
    [1024, 576],
    [1280, 600],
    [1366, 768],
    [1280, 780],
    [1280, 781],
    [1280, 800],
    [1536, 820],
    [1536, 850],
    [1536, 864],
    [1440, 900],
    [1920, 1080],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:4198/?test=1");
    await page.waitForFunction(
      () => window.__rift && !document.getElementById("start-button").disabled,
    );
    await page.evaluate(() => document.fonts.ready);
    for (const hero of [
      "cinder",
      "briar",
      "nyx",
      "volta",
      "rook",
      "lumen",
      "vesper",
      "fen",
      "solace",
      "orin",
      "kestrel",
      "morrow",
    ]) {
      await page.evaluate((id) => __rift.selectHero(id), hero);
      const issues = await page.evaluate(() => {
        const issues = [],
          root = document.scrollingElement;
        const visible = (e) =>
          e.getClientRects().length && !e.closest("[hidden]");
        if (root.scrollWidth > innerWidth + 1)
          issues.push("horizontal page overflow");
        const settings = document
          .querySelector(".expedition-settings")
          .getBoundingClientRect();
        for (const el of document.querySelectorAll(".hero-details > *")) {
          if (
            visible(el) &&
            el.getBoundingClientRect().bottom > settings.top - 2
          )
            issues.push(
              `${el.id || el.className} overlaps expedition settings`,
            );
        }
        if (innerWidth > 1000 && innerHeight >= 600) {
          // Normal scrolling is preferable to shrinking content underneath
          // the next section at intermediate heights or increased zoom.
          if (
            root.scrollHeight > innerHeight + 1 &&
            /hidden|clip/.test(getComputedStyle(root).overflowY)
          )
            issues.push("overflowing lobby cannot scroll");
          for (const portrait of document.querySelectorAll(".mini-portrait")) {
            const p = portrait.getBoundingClientRect(),
              card = portrait.parentElement.getBoundingClientRect();
            if (p.top < card.top - 1 || p.bottom > card.bottom + 1)
              issues.push("clipped roster portrait");
          }
        }
        return issues;
      });
      if (issues.length)
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `./screenshots/eclipse-issue-${hero}-${width}x${height}.png`,
              import.meta.url,
            ),
          ),
          fullPage: true,
        });
      assert.deepEqual(issues, [], `${hero} sanctuary at ${width}x${height}`);
    }
    await page.evaluate(() => __rift.selectHero("cinder"));
    await page.locator(".talent-preview").scrollIntoViewIfNeeded();
    assert.ok(
      await page.evaluate(() =>
        [...document.querySelectorAll(".talent-chip")].every((chip) => {
          const r = chip.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return hit?.closest(".talent-chip") === chip;
        }),
      ),
      `all talent paths are unobscured at normal zoom at ${width}x${height}`,
    );
    assert.match(
      await page.locator("#hero-desc").textContent(),
      /exiled firekeeper/,
    );
    assert.match(
      await page.locator("#hero-stats").textContent(),
      /105.*Health.*178.*Speed.*13s.*Recovery/,
    );
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: fileURLToPath(
          new URL(
            `./screenshots/eclipse-sanctuary-${width}.png`,
            import.meta.url,
          ),
        ),
        fullPage: true,
      });
    await page.evaluate(() => __rift.start());
    await page.evaluate(() => {
      const g = __rift.game;
      g.p.invuln = 1e6;
      // A packed arsenal must push objectives down, including on phones.
      for (const id of [
        "signature",
        "active",
        "orbit",
        "nova",
        "familiar",
        "frost",
        "meteor",
        "scythe",
      ])
        g.ranks[id] = 1;
    });
    await page.waitForFunction(
      () => document.querySelectorAll("#build-hud .build-icon").length === 8,
    );
    const separated = await page.evaluate(() => {
      const build = document
        .getElementById("build-hud")
        .getBoundingClientRect();
      const objectives = document
        .getElementById("objective-hud")
        .getBoundingClientRect();
      return build.bottom <= objectives.top;
    });
    assert.ok(
      separated,
      `arsenal and objectives do not overlap at ${width}x${height}`,
    );
    assert.deepEqual(errors, [], "no runtime errors");
    await context.close();
    console.log(
      `Eclipse: twelve heroes and packed HUD verified at ${width}x${height}`,
    );
  }
} finally {
  await browser?.close();
  server.kill();
}
