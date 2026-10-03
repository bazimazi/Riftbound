import { chromium } from "playwright";
import { reveal } from "./helpers.mjs";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4187" },
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
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  const shot = (name) =>
    page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/${name}.png`, import.meta.url),
      ),
      fullPage: true,
    });
  await page.goto("http://localhost:4187/?test=1");
  await page.waitForSelector(".hero-card");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.title(), "Riftbound — One more night.");
  assert.equal(await page.locator(".hero-card").count(), 6);
  await shot("lobby-desktop");
  await page.getByRole("button", { name: /Field guide/ }).click();
  assert.ok(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  for (const hero of ["cinder", "briar", "nyx", "volta"]) {
    await page.locator(`[data-hero="${hero}"]`).click();
    assert.equal(
      await page.locator("#hero-name").textContent(),
      hero[0].toUpperCase() + hero.slice(1),
    );
    await page.locator("#start-button").click();
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => ({
      x: __rift.game.p.x,
      hp: __rift.game.p.hp,
    }));
    await page.keyboard.down("d");
    await page.waitForTimeout(450);
    await page.keyboard.up("d");
    assert.ok(await page.evaluate((x) => __rift.game.p.x > x + 25, before.x));
    await page.keyboard.press("Space");
    await page.keyboard.press("q");
    assert.ok(
      await page.evaluate(
        () => __rift.game.stats.dashes === 1 && __rift.game.stats.skills === 1,
      ),
    );
    await page.keyboard.press("Escape");
    const time = await page.evaluate(() => __rift.game.time);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => __rift.game.time), time);
    await page.locator("#resume").click();
    await page.evaluate(() => {
      __rift.game.gainXp(__rift.game.threshold());
      __rift.showLevel();
    });
    assert.ok(await page.getByRole("dialog").isVisible());
    assert.equal(await page.locator(".upgrade-card").count(), 3);
    await page.locator("#reroll").click();
    assert.equal(await page.evaluate(() => __rift.game.rerolls), 1);
    await page.keyboard.press("1");
    await page.evaluate(() => {
      const g = __rift.game;
      g.ranks.signature = 4;
      g.level = 6;
      g.pendingLevels = 1;
      g.state = "levelup";
      g.offered = ["signature", "power", "vitality"];
      __rift.showLevel();
    });
    assert.ok(await page.locator(".evolution").isVisible());
    if (hero === "cinder") await shot("evolution");
    await page.keyboard.press("1");
    assert.ok(await page.evaluate(() => __rift.game.evolved()));
    await page.evaluate(() => {
      const g = __rift.game;
      g.p.invuln = 1e5;
      for (let i = 0; i < 60; i++)
        g.spawnEnemy(
          i % 5 === 0 ? "runner" : "crawler",
          170 + Math.random() * 330,
        );
      g.spawnEnemy("boss", 320);
      g.bossCount = 1;
    });
    await page.waitForTimeout(450);
    if (hero === "cinder") await shot("combat");
    await page.evaluate(() => {
      __rift.game.embers = 60;
      __rift.finish(true);
    });
    assert.ok(await page.locator("#return-lobby").isVisible());
    await page.locator("#return-lobby").click();
  }
  await page.locator("#forge-button").click();
  await page.locator('[data-buy="might"]').click();
  assert.equal(await page.evaluate(() => __rift.save.forge.might), 1);
  await shot("forge");
  await page.keyboard.press("Escape");
  await page.reload();
  assert.equal(await page.evaluate(() => __rift.save.forge.might), 1);
  assert.equal(await page.evaluate(() => __rift.save.runs), 4);
  // The expanded progression is accessible through normal player controls.
  await page.locator("#talents-button").click();
  await page.locator('[data-journey-tab="talents"]').click();
  assert.equal(await page.locator(".class-talent").count(), 21);
  await shot("talents-preview");
  await page.keyboard.press("Escape");
  await page.locator("#codex-button").click();
  assert.equal(await page.locator(".codex-card").count(), 11);
  await shot("codex");
  await page.locator('[data-codex-tab="bestiary"]').click();
  assert.equal(await page.locator(".bestiary-entry").count(), 9);
  await page.locator('[data-codex-tab="synergies"]').click();
  await page.locator("#codex-combos").click();
  assert.equal(await page.locator(".recipe").count(), 4);
  await page.locator('[data-codex-tab="mastery"]').click();
  assert.equal(await page.locator(".mastery-entry").count(), 12);
  await shot("mastery");
  await page.keyboard.press("Escape");
  await page.locator("#forge-nav").click();
  for (const tab of ["Arsenal", "Survival", "Wayfinding", "Occult"]) {
    await page.locator(`[data-forge-tab="${tab}"]`).click();
    assert.equal(await page.locator(".forge-craft").count(), 6);
  }
  await shot("forge-occult");
  await page.keyboard.press("Escape");
  await page.locator("#start-button").click();
  await page.evaluate(() => {
    __rift.game.journey.xp = 400; // class level 5
    __rift.game.journey.talents = {};
    __rift.save.chronicle.cinder.bosses = 0;
    __rift.game.level = 2;
    __rift.game.gainXp(__rift.game.threshold());
    __rift.showLevel();
  });
  await page.locator("#level-talents").click();
  await page.locator('[data-class-talent="combustion"]').click();
  assert.ok(await page.locator("#learn-class-talent").isDisabled());
  await page.locator('[data-class-talent="afterburn"]').click();
  assert.ok(await page.locator("#learn-class-talent").isEnabled());
  await page.locator("#learn-class-talent").click();
  assert.equal(
    await page.evaluate(() => __rift.save.journeys.cinder.talents.afterburn),
    1,
  );
  await page.locator("#journey-done").click();
  assert.equal(await page.locator(".upgrade-card").count(), 3);
  await page.keyboard.press("1");
  await page.evaluate(() => {
    const g = __rift.game;
    g.level = 9;
    g.journey.xp = 28120; // class level 75
  });
  await page.keyboard.press("t");
  for (const id of [
    "afterburn",
    "flashpoint",
    "flashpoint",
    "cinder_path0_0",
    "cinder_path0_0",
    "cinder_path0_1",
    "cinder_path0_1",
    "combustion",
  ]) {
    await page.locator('[data-class-talent="' + id + '"]').click();
    await page.locator("#learn-class-talent").click();
  }
  assert.equal(await page.evaluate(() => __rift.game.rank("combustion")), 1);
  await shot("talent-capstone");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => __rift.game.state), "playing");
  await page.evaluate(() => {
    const g = __rift.game;
    g.shrines = [{ x: g.p.x, y: g.p.y, used: false }];
  });
  await page.keyboard.press("e");
  await page.waitForTimeout(80);
  assert.equal(await page.locator("[data-boon]").count(), 3);
  await shot("altar");
  await page.locator("#leave-shrine").click();
  assert.equal(await page.evaluate(() => __rift.game.state), "playing");
  await page.evaluate(() => {
    const g = __rift.game;
    g.kills = 300;
    g.bossesKilled = 1;
    g.shards = 1;
    g.stats.dashes = 20;
    __rift.finish(true);
  });
  assert.ok(await page.locator(".discovery-toast").isVisible());
  await page.locator("#return-lobby").click();
  assert.ok(await page.locator("#oath-up").isEnabled());
  await page.locator("#oath-up").click();
  assert.equal(await page.evaluate(() => __rift.save.oath), 1);
  await page.locator("#oath-down").click();
  await page.locator("#codex-button").click();
  await page.locator('[data-codex-tab="inscriptions"]').click();
  await page.locator('[data-unequip="pilgrim"]').click();
  await reveal(page, '[data-equip="scorchstep"]');
  await page.locator('[data-equip="scorchstep"]').click();
  await page.keyboard.press("Escape");
  await page.reload();
  assert.ok(
    await page.evaluate(() =>
      __rift.save.loadouts.cinder.includes("scorchstep"),
    ),
  );
  await page.locator("#talents-button").click();
  await page.locator('[data-journey-tab="talents"]').click();
  await page.locator('[data-class-talent="firestorm"]').click();
  assert.ok(await page.locator('[data-affinity="firestorm"]').isEnabled());
  await page.locator('[data-affinity="firestorm"]').click();
  await page.keyboard.press("Escape");
  await page.locator("#start-button").click();
  assert.equal(await page.evaluate(() => __rift.game.rank("firestorm")), 1);
  await page.keyboard.press("Space");
  assert.ok(
    await page.evaluate(() => __rift.game.zones.some((z) => z.kind === "fire")),
  );
  await page.evaluate(() => __rift.returnLobby());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  await shot("lobby-mobile");
  await page.locator("#talents-button").click();
  await shot("talents-mobile");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.keyboard.press("Escape");
  await page.locator("#codex-button").click();
  await shot("codex-mobile");
  await page.keyboard.press("Escape");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#start-button").click();
  await page.evaluate(() => {
    __rift.game.gainXp(__rift.game.threshold());
    __rift.showLevel();
  });
  assert.ok(await page.locator(".upgrade-card").first().isVisible());
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await shot("upgrade-mobile");
  await page.keyboard.press("1");
  await page.evaluate(() => {
    __rift.game.p.invuln = 0;
    __rift.game.hurt(1e5);
  });
  await page.waitForTimeout(150);
  assert.ok(await page.locator("#retry").isVisible());
  await page.locator("#retry").click();
  assert.equal(await page.evaluate(() => __rift.game.level), 1);
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const touchPage = await mobile.newPage();
  touchPage.on("pageerror", (e) => errors.push(e.message));
  await touchPage.goto("http://localhost:4187/?test=1");
  await touchPage.locator("#start-button").tap();
  assert.ok(await touchPage.locator("#joystick").isVisible());
  const stick = await touchPage.locator("#joystick").boundingBox();
  await touchPage.mouse.move(
    stick.x + stick.width / 2,
    stick.y + stick.height / 2,
  );
  await touchPage.mouse.down();
  await touchPage.mouse.move(
    stick.x + stick.width - 5,
    stick.y + stick.height / 2,
  );
  await touchPage.waitForTimeout(300);
  await touchPage.mouse.up();
  assert.ok(
    await touchPage.evaluate(() => __rift.game.p.x > 15),
    "virtual stick moves hero",
  );
  await touchPage.locator("#dash-button").tap();
  await touchPage.locator("#skill-button").tap();
  assert.ok(
    await touchPage.evaluate(
      () => __rift.game.stats.dashes === 1 && __rift.game.stats.skills === 1,
    ),
  );
  await touchPage.screenshot({
    path: fileURLToPath(
      new URL("./screenshots/combat-mobile.png", import.meta.url),
    ),
  });
  await touchPage.evaluate(() => {
    const g = __rift.game;
    g.state = "paused";
    g.time = 600;
    g.enemies = [];
    for (let i = 0; i < 270; i++)
      g.spawnEnemy("crawler", 120 + Math.random() * 700);
    for (const id of ["signature", "orbit", "nova", "familiar"])
      g.ranks[id] = 5;
    g.recalculate();
    g.state = "playing";
    g.p.invuln = 100;
  });
  await touchPage.waitForTimeout(500);
  assert.ok(await touchPage.evaluate(() => Number.isFinite(__rift.game.p.hp)));
  assert.ok(
    await touchPage.evaluate(
      () => document.getElementById("arena").width >= innerWidth,
    ),
    "retina canvas never renders below screen resolution",
  );
  await mobile.close();
  await page.evaluate(() => __rift.returnLobby());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-hero="cinder"]').click();
  await page.evaluate(() => {
    __rift.save.embers = 10000;
    __rift.save.shards = 10;
  });
  await page.locator("#forge-nav").click();
  await page.locator('[data-forge-tab="Research"]').click();
  assert.equal(await page.locator("[data-research]").count(), 4);
  await page.locator('[data-research="weapon"]').click();
  assert.equal(
    await page.evaluate(() => __rift.save.research.cinder.weapon),
    1,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("riftbound.save.v1")).research.cinder
          .weapon,
    ),
    1,
  );
  await shot("research-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("research-mobile");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#start-button").click();
  await page.evaluate(() => {
    const g = __rift.game;
    g.level = 50;
    g.talentPoints = 10;
    g.ranks.signature = 29;
    g.ranks.active = 10;
    g.pendingLevels = 1;
    g.state = "levelup";
    g.offered = ["signature", "active", "frost"];
    __rift.showLevel();
  });
  await shot("ascension-upgrades");
  await page.locator('[data-upgrade="signature"]').click();
  assert.equal(await page.evaluate(() => __rift.game.rank("signature")), 30);
  await page.locator("#evolve-button").click();
  await page.locator("#invest-resonance").click();
  assert.equal(await page.evaluate(() => __rift.game.rank("ascendance")), 1);
  await shot("ascension-talents");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const g = __rift.game;
    g.p.invuln = 1e5;
    g.time = 900;
    g.nextBoss = 985;
    g.nextShrine = 965;
    g.nextHazard = 920;
    g.nextCache = 938;
    g.enemies = [];
    for (let i = 0; i < 270; i++)
      g.spawnEnemy("crawler", 170 + Math.random() * 500);
    for (const id of ["orbit", "nova", "familiar", "frost", "meteor", "scythe"])
      g.ranks[id] = 30;
    g.recalculate();
    g.xpMultiplier = 0;
    g.skill();
  });
  const timing = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = performance.now();
        function sample(now) {
          times.push(now - last);
          last = now;
          if (times.length < 120) requestAnimationFrame(sample);
          else {
            times.sort((a, b) => a - b);
            resolve({ median: times[60], p95: times[114] });
          }
        }
        requestAnimationFrame(sample);
      }),
  );
  console.log("Rank-30, 270-enemy frame times (ms):", timing);
  await shot("ascension-combat");
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: 4 heroes, input, skills, pause, choices, evolution, results, forge, persistence, mobile, death/retry, no runtime errors.",
  );
} finally {
  await browser?.close();
  server.kill();
}
