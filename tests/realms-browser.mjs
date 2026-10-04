import { chromium } from "playwright";
import { reveal } from "./helpers.mjs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["--import", "tsx", "tests/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "4189" },
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
  const errors = [],
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name, p = page) => {
    await p.waitForTimeout(120);
    await p.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/${name}.png`, import.meta.url),
      ),
      fullPage: true,
    });
  };
  await page.goto("http://localhost:4189/?test=1");
  await page.locator("#realm-button").click();
  assert.equal(await page.locator("[data-realm]").count(), 3);
  await page.locator('[data-realm="astral"]').click();
  await page.locator("#realm-done").click();
  await page.reload();
  assert.match(await page.locator("#realm-name").textContent(), /Starless/);
  await page.locator("#start-button").click();
  assert.equal(await page.evaluate(() => __rift.game.realm.id), "astral");
  const firstRoll = await page.evaluate(() =>
    __rift.game.finds.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
  );
  assert.ok(await page.locator("#minimap").isVisible());
  await page.keyboard.press("m");
  assert.equal(await page.evaluate(() => __rift.game.state), "paused");
  const time = await page.evaluate(() => __rift.game.time);
  await page.waitForTimeout(130);
  assert.equal(await page.evaluate(() => __rift.game.time), time);
  const rect = await page.locator("#world-map").boundingBox();
  await page.mouse.click(
    rect.x + rect.width * 0.67,
    rect.y + rect.height * 0.25,
  );
  assert.ok(await page.evaluate(() => !!__rift.game.waypoint));
  const trackFind = async () => {
    const target = await page.evaluate(() => {
      const g = __rift.game,
        canvas = document.getElementById("world-map"),
        scale = Math.min(
          (canvas.width - 76) / g.realm.width,
          (canvas.height - 76) / g.realm.height,
        ),
        find = g.finds.find((f) => f.kind === "memory" && !f.taken);
      return {
        waypoint: { id: find.id, x: find.x, y: find.y },
        x: 0.5 + (find.x * scale) / canvas.width,
        y: 0.5 + (find.y * scale) / canvas.height,
      };
    });
    const map = await page.locator("#world-map").boundingBox();
    await page.mouse.click(
      map.x + map.width * target.x,
      map.y + map.height * target.y,
    );
    assert.deepEqual(
      await page.evaluate(() => __rift.game.waypoint),
      target.waypoint,
    );
    assert.match(
      await page.locator("#map-destination").textContent(),
      /Ancestral memory/,
    );
  };
  await trackFind();
  assert.deepEqual(
    await page.evaluate(() =>
      __rift.game.finds.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
    ),
    firstRoll,
    "opening/tracking the map never rerolls treasures",
  );
  await shot("world-map-desktop");
  await page.keyboard.press("m");
  assert.equal(await page.evaluate(() => __rift.game.state), "playing");
  assert.ok(await page.locator("#waypoint-hud").isVisible());
  await page.evaluate(() => {
    const g = __rift.game;
    g.p.invuln = 1e6;
    const f = g.finds.find((f) => f.kind === "memory");
    g.p.x = f.x;
    g.p.y = f.y;
  });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => __rift.game.foundMemories.length), 1);
  await page.evaluate(() => __rift.finish(true));
  assert.ok(await page.locator(".memory-banked").isVisible());
  await page.locator("#return-lobby").click();
  await page.locator("#codex-button").click();
  await page.locator('[data-codex-tab="legacy"]').click();
  assert.equal(await page.locator(".legacy-card").count(), 12);
  assert.equal(await page.locator(".memory-pips .lit").count(), 1);
  await shot("legacy-desktop");
  await page.keyboard.press("Escape");
  await page.locator("#start-button").click();
  assert.notDeepEqual(
    await page.evaluate(() =>
      __rift.game.finds.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
    ),
    firstRoll,
    "a second expedition rolls new treasures",
  );
  await page.evaluate(() => {
    const g = __rift.game;
    g.time = 181;
    g.level = 16;
    g.p.invuln = 1e6;
    g.ranks.signature = 8;
    g.ranks.power = 3;
    g.evolutionSeals = 2;
    g.recalculate();
  });
  await page.keyboard.press("v");
  await page.locator("#run-recipes").click();
  assert.equal(await page.locator(".recipe-card").count(), 8);
  await shot("evolutions-desktop");
  await page.locator('[data-evolve="cinder-soul"]').click();
  assert.equal(await page.evaluate(() => __rift.game.evolutionSeals), 1);
  assert.equal(
    await page.locator('[data-evolve="cinder-soul"]').isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => __rift.game.state), "playing");
  // Level-up return retains both pending choices and frozen time.
  await page.evaluate(() => {
    const g = __rift.game;
    g.gainXp(g.threshold());
    __rift.showLevel();
  });
  await page.locator("#level-evolutions").click();
  await page.locator("#evolutions-done").click();
  assert.equal(await page.evaluate(() => __rift.game.state), "levelup");
  await page.keyboard.press("1");
  await page.evaluate(() => {
    const g = __rift.game;
    g.enemies = [];
    g.hazards = [];
    g.zones = [];
    g.shrines = [];
    g.pickups = [];
    g.vault = null;
    g.time = g.realm.doom;
    g.nextBoss = 1e6;
    g.nextVault = 1e6;
    g.nextCache = 1e6;
    g.nextHazard = 1e6;
    g.nextShrine = 1e6;
    g.p.x = 0;
    g.p.y = 0;
  });
  await page.waitForTimeout(200);
  assert.ok(
    await page.evaluate(() => __rift.game.enemies.some((e) => e.reaper)),
  );
  assert.match(await page.locator("#doom-clock").textContent(), /HUNT/);
  assert.match(
    await page.locator("#announcement").textContent(),
    /REAPERS ARRIVE/,
  );
  await page.evaluate(() => {
    const g = __rift.game;
    const e = g.enemies.find((e) => e.reaper);
    e.x = g.p.x + 200;
    e.y = g.p.y + 50;
  });
  await shot("reaper-desktop");
  await page.evaluate(() => __rift.finish(true));
  await page.locator("#return-lobby").click();
  for (const realm of ["hollow", "ashen"]) {
    await page.locator("#realm-button").click();
    await page.locator(`[data-realm="${realm}"]`).click();
    await page.locator("#realm-done").click();
    let previous;
    for (let run = 0; run < 2; run++) {
      await page.locator("#start-button").click();
      await page.evaluate(() => {
        __rift.game.p.invuln = 1e6;
      });
      const rolled = await page.evaluate(() => ({
        realm: __rift.game.realm.id,
        finds: __rift.game.finds.map(({ id, kind, x, y }) => ({
          id,
          kind,
          x,
          y,
        })),
      }));
      assert.equal(rolled.realm, realm);
      assert.equal(rolled.finds.length, 14);
      if (previous) assert.notDeepEqual(rolled.finds, previous);
      previous = rolled.finds;
      assert.ok(await page.locator("#minimap").isVisible());
      await page.keyboard.press("m");
      await trackFind();
      await page.keyboard.press("m");
      await page.evaluate(() => __rift.finish(true));
      await page.locator("#return-lobby").click();
    }
  }
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto("http://localhost:4189/?test=1");
  await mobile.locator("#realm-button").tap();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await shot("realms-mobile", mobile);
  await reveal(mobile, '[data-realm="ashen"]');
  await mobile.locator('[data-realm="ashen"]').tap();
  await mobile.locator("#realm-done").tap();
  await mobile.locator("#start-button").tap();
  await mobile.locator("#world-map-button").tap();
  assert.ok(await mobile.locator("#world-map").isVisible());
  await shot("world-map-mobile", mobile);
  await mobile.locator("#map-done").tap();
  await mobile.locator("#evolve-button").tap();
  assert.equal(await mobile.locator("[data-journey-skill]").count(), 8);
  await mobile.locator("#run-recipes").tap();
  assert.equal(await mobile.locator(".recipe-card").count(), 8);
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await shot("evolutions-mobile", mobile);
  await mobile.locator("#evolutions-done").tap();
  assert.equal(await mobile.evaluate(() => __rift.game.state), "playing");
  assert.deepEqual(errors, []);
  console.log(
    "Realm browser checks passed: fresh treasure rolls on all three maps, exact item waypoints, map selection/persistence, minimap, banking memories, legacy codex, evolution claims/return paths, Reapers, desktop and touch layouts, no runtime errors.",
  );
} finally {
  await browser?.close();
  server.kill();
}
