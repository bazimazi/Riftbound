import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
assert.ok(
  !html.includes('type="module"'),
  "standalone build uses a classic script",
);
assert.ok(!html.includes("/src/"), "build never loads source files");

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, offline: true });
    const page = await context.newPage();
    const errors = [],
      failed = [],
      network = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failed.push(request.url()));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    const url = new URL("../dist/index.html", import.meta.url);
    url.search = "test=1";
    await page.goto(url.href);
    await page.waitForFunction(
      () =>
        !!window.__rift && !document.getElementById("start-button").disabled,
    );
    await page.evaluate(() => document.fonts.load("16px Outfit"));
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Outfit"')));
    await page.getByRole("button", { name: /Enter the rift/ }).click();
    await page.evaluate(() => {
      window.__rift.game.p.invuln = 1e6;
    });
    await page.waitForFunction(() => window.__rift.game.time > 0.2);
    await page.keyboard.down("d");
    await page.waitForFunction(() => window.__rift.game.p.x > 10);
    await page.keyboard.up("d");
    await page.keyboard.press("q");
    await page.waitForFunction(() => window.__rift.game.stats.skills > 0);
    await page.getByRole("button", { name: /Pause/ }).first().click();
    const paused = await page.evaluate(() => window.__rift.game.time);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__rift.game.time), paused);
    await page.evaluate(() => {
      window.__rift.save.embers = 321;
      window.__rift.game.embers = 10;
      window.__rift.finish(true);
    });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("riftbound.save.v1")),
    );
    assert.ok(saved.embers >= 331);
    assert.equal(saved.runs, 1);
    await page.reload();
    await page.waitForFunction(() => !!window.__rift);
    assert.equal(await page.evaluate(() => window.__rift.save.runs), 1);
    assert.equal(
      await page.evaluate(() => window.__rift.save.embers),
      saved.embers,
    );
    await mkdir(new URL("./screenshots/", import.meta.url), {
      recursive: true,
    });
    await page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/client-${viewport.width}.png`, import.meta.url),
      ),
      fullPage: true,
    });
    assert.deepEqual(network, [], "client needs no network");
    assert.deepEqual(failed, [], "all bundled assets load from disk");
    assert.deepEqual(errors, [], "client has no runtime errors");
    url.search = "";
    await page.goto(url.href);
    assert.equal(await page.evaluate(() => window.__rift), undefined);
    await context.close();
  }
  console.log(
    "Standalone client passed offline desktop/mobile play and save reload checks.",
  );
} finally {
  await browser.close();
}
