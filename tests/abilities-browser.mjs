import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { veteranSave } from "./helpers.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4196" },
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
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4196/?test=1");
  await page.waitForFunction(
    () => !document.getElementById("start-button").disabled,
  );
  const art = await page.evaluate(async () => {
    const { HEROES } = await import("/src/core.js"),
      { drawSprite, artReady } = await import("/src/pixel-art.js"),
      { drawAbilityGround, drawAbilityCrown } =
        await import("/src/ability-vfx.js");
    await artReady;
    const gallery = document.createElement("canvas");
    gallery.width = 1440;
    gallery.height = 1280;
    const c = gallery.getContext("2d"),
      issues = [],
      signatures = [],
      stages = [];
    c.fillStyle = "#111c21";
    c.fillRect(0, 0, 1440, 1280);
    const hash = (ctx, w, h) => {
      let n = 2166136261;
      for (const byte of ctx.getImageData(0, 0, w, h).data)
        n = Math.imul(n ^ byte, 16777619);
      return n;
    };
    let samples = 0;
    for (const [i, hero] of HEROES.entries()) {
      const left = (i % 3) * 480,
        top = Math.floor(i / 3) * 320;
      c.fillStyle = "#20332d";
      c.fillRect(left + 8, top + 8, 464, 304);
      c.fillStyle = "#eaddba";
      c.textAlign = "center";
      c.font = "bold 17px monospace";
      c.fillText(hero.name, left + 240, top + 35);
      const tiers = [];
      for (const tier of [1, 2, 3]) {
        const e = {
          type: "skillburst",
          hero: hero.id,
          x: left + 84 + (tier - 1) * 155,
          y: top + 218,
          r: 75,
          tier,
          motif: tier === 3 ? "ascension" : "form",
          life: 0.72,
          maxLife: 1,
          angle: 0,
        };
        c.save();
        c.beginPath();
        c.rect(left + 8, top + 48, 464, 233);
        c.clip();
        drawAbilityGround(c, e, true);
        drawSprite(c, hero.id, e.x, e.y + 17, 67, {
          frame: 0,
          stage: tier - 1,
        });
        drawAbilityCrown(c, e, true);
        c.restore();
        c.fillStyle = "#cbbd96";
        c.font = "11px monospace";
        c.fillText(
          ["", "Q · Active", "R · Evolved", "F · Ascended"][tier],
          e.x,
          top + 292,
        );
        for (const motion of [true, false]) {
          const frames = [];
          for (const q of [0.1, 0.28, 0.55]) {
            const tile = document.createElement("canvas");
            tile.width = tile.height = 320;
            const t = tile.getContext("2d");
            const effect = { ...e, x: 160, y: 215, r: 110, life: 1 - q };
            if (!drawAbilityGround(t, effect, motion))
              issues.push(`unhandled: ${hero.id}`);
            drawAbilityCrown(t, effect, motion);
            if (
              t.globalAlpha !== 1 ||
              t.globalCompositeOperation !== "source-over"
            )
              issues.push(`context leak: ${hero.id}`);
            const pixels = t.getImageData(0, 0, 320, 320).data;
            if (!pixels.some((v, n) => n % 4 === 3 && v > 60))
              issues.push(`blank: ${hero.id}/${tier}/${motion}`);
            frames.push(hash(t, 320, 320));
            samples++;
          }
          if (new Set(frames).size !== 3)
            issues.push(`frozen fade: ${hero.id}/${tier}/${motion}`);
          if (motion) tiers.push(frames[1]);
        }
      }
      if (new Set(tiers).size !== 3) issues.push(`identical tiers: ${hero.id}`);
      signatures.push(tiers[2]);
      stages.push(tiers);
    }
    if (new Set(signatures).size !== 12) issues.push("class effects repeat");
    return { issues, samples, image: gallery.toDataURL() };
  });
  assert.deepEqual(art.issues, []);
  assert.equal(art.samples, 216);
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("./screenshots/ability-effects-gallery.png", import.meta.url),
    Buffer.from(art.image.split(",")[1], "base64"),
  );
  await page.evaluate(
    (save) => Object.assign(__rift.save, save),
    veteranSave(),
  );
  const heroes = await page.evaluate(async () =>
    (await import("/src/core.js")).HEROES.map((h) => h.id),
  );
  async function setup(id, branch = -1) {
    await page.evaluate(
      async ({ id, branch }) => {
        const { profile } = await import("/src/journey.js");
        __rift.returnLobby();
        const p = profile(__rift.save, id);
        p.stage = 2;
        p.talents = branch >= 0 ? { [`${id}_path${branch}_3`]: 1 } : {};
        p.ultimate = branch >= 0 ? `${id}_path${branch}_3` : "";
        __rift.selectHero(id);
        __rift.start();
        const g = __rift.game;
        g.save.forge.focus = 8;
        g.ranks.focus = 4;
        g.ranks.signature = 10;
        g.ranks.active = 8;
        g.recalculate();
        g.p.invuln =
          g.spawnTimer =
          g.attackTimer =
          g.nextBoss =
          g.nextCache =
          g.nextHazard =
          g.nextShrine =
          g.nextVault =
          g.nextCatalyst =
            1e8;
        g.enemies = [];
        for (let i = 0; i < 25; i++) {
          g.spawnEnemy("brute", 250);
          const a = i * 2.4;
          Object.assign(g.enemies.at(-1), {
            x: Math.cos(a) * (160 + i * 6),
            y: Math.sin(a) * (160 + i * 6),
            hp: 1e9,
            maxHp: 1e9,
            speed: 0,
            damage: 0,
          });
        }
        g.state = "paused";
      },
      { id, branch },
    );
  }
  const shot = (name) =>
    page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/${name}.png`, import.meta.url),
      ),
    });
  let casts = 0;
  for (const hero of heroes) {
    for (const key of ["q", "r", "f"]) {
      await setup(hero);
      const result = await page.evaluate((key) => {
        const g = __rift.game;
        g.state = "playing";
        const success =
          key === "q" ? g.castSkill() : g.castForm(key === "f" ? 1 : 0);
        for (let i = 0; i < 13; i++) g.update(0.04);
        g.state = "paused";
        __rift.updateHud();
        return {
          success,
          tiers: g.effects
            .filter((e) => e.type === "skillburst")
            .map((e) => e.tier),
          finite: Number.isFinite(g.p.hp),
        };
      }, key);
      assert.ok(result.success && result.finite, `${hero}/${key}`);
      assert.ok(
        result.tiers.includes({ q: 1, r: 2, f: 3 }[key]),
        `${hero}/${key}`,
      );
      await page.waitForTimeout(20);
      if (
        key === "f" &&
        ["cinder", "vesper", "solace", "morrow"].includes(hero)
      )
        await shot(`ability-${hero}-ascended`);
      casts++;
    }
    for (const branch of [0, 1, 2]) {
      await setup(hero, branch);
      const result = await page.evaluate(() => {
        const g = __rift.game;
        g.state = "playing";
        const success = g.castSkill();
        for (let i = 0; i < 13; i++) g.update(0.04);
        g.state = "paused";
        __rift.updateHud();
        return {
          success,
          ultimate: g.talentState.ultimate?.id,
          cd: g.talentState.cooldown,
          capped: g.effects.length <= 250 && g.companions.length <= 8,
        };
      });
      assert.ok(result.success && result.capped);
      assert.equal(result.ultimate, `${hero}_path${branch}_3`);
      assert.ok(result.cd < 40 && result.cd > 19);
      assert.ok(
        (await page.locator("#skill-button").getAttribute("title")).includes(
          "with current buffs",
        ),
      );
      casts++;
      if (hero === "vesper" && branch === 1)
        await shot("ability-vesper-covenant");
    }
  }
  // Rendering respects pause and reduced motion; it does not mutate combat.
  const frozen = await page.evaluate(() =>
    document.getElementById("arena").toDataURL(),
  );
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => document.getElementById("arena").toDataURL()),
    frozen,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await setup("solace", 0);
  await page.evaluate(() => {
    __rift.game.save.visuals.motion = false;
    __rift.game.state = "playing";
  });
  await page.locator("#skill-button").click();
  await page.waitForFunction(() => !!__rift.game.talentState.ultimate);
  await page.evaluate(() => {
    __rift.game.state = "paused";
  });
  await page.waitForTimeout(50);
  await shot("ability-mobile-reduced-motion");
  const sound = await page.evaluate(async () => {
    const { AudioEngine } = await import("/src/audio.js"),
      { HEROES } = await import("/src/core.js"),
      engine = new AudioEngine(true);
    engine.unlock();
    await engine.ctx.resume();
    for (const h of HEROES)
      for (const tier of [1, 2, 3]) {
        engine.last.skill = engine.last.ultimate = -1;
        engine.play("skill", h.id, tier);
        if (tier === 3) engine.play("ultimate", h.id);
      }
    const running = engine.ctx.state;
    await engine.ctx.close();
    return running;
  });
  assert.equal(sound, "running");
  assert.deepEqual(errors, []);
  console.log(
    `Ability checks passed: ${art.samples} class/tier/motion visual samples, ${casts} actual Q/R/F and talent casts across all 12 classes, buffed cooldowns, frozen pause and touch/reduced-motion play; no runtime errors.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
