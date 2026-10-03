import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4188" },
  stdio: "pipe",
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`server ${code}`)));
  });
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name, p = page) => {
    await p.waitForTimeout(350);
    await p.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/${name}.png`, import.meta.url),
      ),
      fullPage: true,
    });
  };
  await page.goto("http://localhost:4188/?test=1");
  await page.locator("#contract-button").click();
  assert.equal(await page.locator("[data-contract]").count(), 3);
  await page.locator('[data-contract="warden"]').click();
  await shot("contracts-desktop");
  await page.locator("#contract-done").click();
  assert.match(await page.locator("#contract-name").textContent(), /Kings/);
  await page.locator("#settings-button").click();
  await page.locator('[data-setting="numbers"]').click();
  await page.locator('[data-setting="motion"]').click();
  assert.equal(await page.evaluate(() => __rift.save.visuals.numbers), false);
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains("still"),
    ),
    true,
  );
  await page.reload();
  assert.equal(await page.evaluate(() => __rift.save.visuals.motion), false);
  await page.locator("#settings-button").click();
  await page.locator('[data-setting="motion"]').click();
  await page.locator('[data-setting="numbers"]').click();
  await page.locator("#settings-done").click();
  await page.locator("#start-button").click();
  await page.evaluate(() => {
    const g = __rift.game;
    g.time = 89.95;
    g.nextBoss = 170;
    g.nextHazard = 115;
    g.nextCache = 125;
    g.nextShrine = 130;
    g.p.invuln = 1e6;
    g.xpMultiplier = 0;
  });
  await page.waitForFunction(() => !!__rift.game.vault);
  await page.evaluate(() => {
    const g = __rift.game;
    g.p.x = g.vault.x;
    g.p.y = g.vault.y;
    __rift.updateHud();
  });
  await page.keyboard.press("e");
  assert.equal(await page.evaluate(() => __rift.game.vault.state), "defending");
  await page.evaluate(() => {
    const g = __rift.game;
    g.vault.progress = 9;
    g.vault.remaining = 28;
    g.state = "paused";
    __rift.updateHud();
  });
  await shot("beacon-defense");
  await page.evaluate(() => {
    const g = __rift.game;
    g.state = "playing";
    g.vault.progress = 17.99;
  });
  await page.waitForSelector("[data-artifact]");
  assert.equal(await page.locator("[data-artifact]").count(), 3);
  await shot("artifact-draft");
  const id = await page
    .locator("[data-artifact]")
    .first()
    .getAttribute("data-artifact");
  assert.ok(
    await page
      .locator("[data-artifact] canvas")
      .first()
      .evaluate((c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        return d.some((v, i) => i % 4 === 3 && v > 0);
      }),
  );
  await page.keyboard.press("1");
  assert.equal(await page.evaluate((id) => __rift.game.artifact(id), id), 1);
  await page.keyboard.press("b");
  assert.equal(await page.evaluate(() => __rift.game.state), "paused");
  assert.equal(await page.locator(".artifact-loadout article").count(), 4);
  await shot("build-inspector");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => __rift.game.state), "playing");
  await page.keyboard.press("Escape");
  await page.locator("#pause-build").click();
  await page.locator("#build-done").click();
  assert.ok(await page.locator("#resume").isVisible());
  await page.locator("#pause-settings").click();
  await page.locator('[data-setting="minimap"]').click();
  assert.equal(await page.locator("#minimap").isVisible(), false);
  await shot("settings-desktop");
  await page.locator("#settings-done").click();
  assert.ok(await page.locator("#resume").isVisible());
  await page.locator("#resume").click();
  await page.evaluate(() => {
    __rift.game.bossesKilled = 1;
    __rift.finish(true);
  });
  assert.ok(await page.locator(".contract-complete").isVisible());
  assert.equal(await page.evaluate(() => __rift.save.contracts.warden), 1);
  assert.equal(
    await page.evaluate((id) => __rift.save.artifactArchive[id], id),
    1,
  );
  await shot("contract-result");
  await page.locator("#return-lobby").click();
  await page.locator("#codex-button").click();
  await page.locator('[data-codex-tab="treasures"]').click();
  assert.equal(await page.locator(".treasure-entry").count(), 9);
  await shot("artifact-codex");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto("http://localhost:4188/?test=1");
  await phone.locator("#contract-button").tap();
  await shot("contracts-mobile", phone);
  assert.ok(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await phone.locator("#contract-done").tap();
  await phone.locator("#start-button").tap();
  await phone.evaluate(() => {
    const g = __rift.game;
    g.vault = { x: g.p.x, y: g.p.y, state: "waiting", life: 65, progress: 0 };
    g.p.invuln = 1e6;
    g.interact();
    g.vault.progress = 17.99;
  });
  await phone.waitForSelector("[data-artifact]");
  await shot("artifact-draft-mobile", phone);
  assert.ok(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await phone.locator("[data-artifact]").first().tap();
  await phone.locator("#inspect-build").tap();
  await shot("build-mobile", phone);
  assert.ok(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await phone.locator("#build-done").tap();
  await phone.evaluate(() => {
    const g = __rift.game;
    g.vault = { x: g.p.x, y: g.p.y, state: "waiting", life: 65, progress: 0 };
    g.interact();
    g.vault.progress = 17.99;
  });
  await phone.waitForSelector("#salvage-artifact");
  const beforeSalvage = await phone.evaluate(() => __rift.game.embers);
  await phone.locator("#salvage-artifact").tap();
  assert.equal(
    await phone.evaluate(() => __rift.game.embers),
    beforeSalvage + 25,
  );
  assert.equal(await phone.evaluate(() => __rift.game.state), "playing");
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(
    "Reliquary browser checks passed: contracts, beacon defense, illustrated artifact draft, banking, archive, build inspector, settings, pause return paths, touch layouts.",
  );
} finally {
  await browser?.close();
  server.kill();
}
