import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { veteranSave } from "./helpers.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["--import", "tsx", "tests/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "4191" },
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    (save) => localStorage.setItem("riftbound.save.v1", JSON.stringify(save)),
    veteranSave(),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  const shot = (name) =>
    page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/${name}.png`, import.meta.url),
      ),
      fullPage: true,
    });
  await page.goto("http://localhost:4191/?test=1");
  await page.waitForFunction(
    () => !document.getElementById("start-button").disabled,
  );
  const assets = await page.evaluate(async () => {
    const { art, artReady, actionSprite, drawActionSprite, drawSprite } =
      await import("/src/client/rendering/pixel-art.ts");
    await artReady;
    const heroes = ["cinder", "briar", "nyx", "volta", "rook", "lumen"],
      audit = [],
      walk = [];
    for (const kind of ["attack", "skill", "walk"]) {
      const canvas = document.createElement("canvas");
      canvas.id = `gallery-${kind}`;
      canvas.width = 1120;
      canvas.height = 770;
      canvas.style.cssText =
        "position:fixed;top:0;left:0;width:1120px;height:770px;z-index:9999";
      document.body.append(canvas);
      const c = canvas.getContext("2d");
      c.fillStyle = "#12212b";
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = "#e5ddbe";
      c.font = "16px sans-serif";
      c.fillText(`Riftbound · ${kind} poses`, 25, 27);
      for (const [r, id] of heroes.entries()) {
        c.fillStyle = "#8596a2";
        c.fillText(id, 15, 70 + r * 115);
        drawSprite(c, id, 118, 145 + r * 115, 82, { frame: 0 });
        for (let frame = 0; frame < 6; frame++) {
          const s = kind === "walk" ? null : actionSprite(id, kind, frame),
            x = 240 + frame * 143,
            y = 145 + r * 115;
          c.strokeStyle = "#29404a";
          c.beginPath();
          c.moveTo(x - 50, y);
          c.lineTo(x + 50, y);
          c.stroke();
          if (kind === "walk") drawSprite(c, id, x, y, 82, { frame });
          else drawActionSprite(c, id, x, y, 82, kind, frame);
          c.fillStyle = "#8596a2";
          c.font = "12px sans-serif";
          c.fillText(`${frame + 1}`, x - 2, y + 18);
          const tile = document.createElement("canvas");
          tile.width = 120;
          tile.height = 115;
          const t = tile.getContext("2d");
          if (kind === "walk") drawSprite(t, id, 60, 98, 82, { frame });
          else drawActionSprite(t, id, 60, 98, 82, kind, frame);
          const data = t.getImageData(0, 0, 120, 115).data;
          let solid = 0,
            clear = 0,
            below = 0;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 180) {
              solid++;
              if (Math.floor((i - 3) / 4 / 120) > 107) below++;
            }
            if (data[i] === 0) clear++;
          }
          const hash = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
          )
            .slice(0, 8)
            .join("-");
          (kind === "walk" ? walk : audit).push({
            id,
            kind,
            frame,
            ...(s ? { foot: s.foot, anchor: s.anchor, w: s.w, h: s.h } : {}),
            solid,
            clear,
            below,
            hash,
          });
        }
      }
      canvas.hidden = kind !== "attack";
    }
    return {
      audit,
      walk,
      dimensions: [art.combatOutcasts.width, art.combatWayfarers.width],
    };
  });
  assert.equal(assets.audit.length, 72);
  assert.equal(assets.walk.length, 36);
  for (const s of assets.walk)
    assert.ok(
      s.solid > 900 && s.below < 80,
      `${s.id} has a complete walking pose`,
    );
  for (const id of ["cinder", "briar", "nyx", "volta", "rook", "lumen"])
    assert.equal(
      new Set(assets.walk.filter((s) => s.id === id).map((s) => s.hash)).size,
      6,
      `${id} has six distinct stride frames`,
    );
  for (const s of assets.audit) {
    assert.ok(
      s.solid > 900 && s.clear > 4000,
      `${s.id}/${s.kind}/${s.frame} has a visible isolated silhouette`,
    );
    assert.ok(
      s.foot > s.h * 0.6 && s.foot <= s.h,
      `${s.id} feet stay inside their frame`,
    );
    assert.ok(
      s.anchor > s.w * 0.25 && s.anchor < s.w * 0.8,
      `${s.id} body has a stable anchor`,
    );
    assert.ok(
      s.below < 80,
      `${s.id}/${s.kind}/${s.frame} has no following row bleeding below its feet`,
    );
  }
  await shot("combat-attack-poses");
  await page.evaluate(() => {
    document.getElementById("gallery-attack").hidden = true;
    document.getElementById("gallery-skill").hidden = false;
  });
  await shot("combat-skill-poses");
  await page.evaluate(() => {
    document.getElementById("gallery-skill").hidden = true;
    document.getElementById("gallery-walk").hidden = false;
  });
  await shot("combat-walk-poses");
  await page.evaluate(() =>
    document.querySelectorAll("[id^=gallery-]").forEach((c) => c.remove()),
  );
  async function setup(id) {
    await page.evaluate((id) => {
      __rift.returnLobby();
      __rift.selectHero(id);
      __rift.start();
      const g = __rift.game;
      g.spawnTimer = 1e6;
      g.enemies = [];
      g.p.invuln = 100;
      g.pickups = [];
      for (let i = 0; i < 12; i++) {
        g.spawnEnemy(["crawler", "runner", "brute", "moth"][i % 4], 200);
        const e = g.enemies.at(-1),
          a = (i * Math.PI * 2) / 12,
          r = i ? 180 + i * 9 : 120;
        Object.assign(e, {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          hp: 1e7,
          maxHp: 1e7,
          speed: 0,
        });
      }
      g.state = "paused";
    }, id);
  }
  for (const id of ["cinder", "briar", "nyx", "volta", "rook", "lumen"]) {
    await setup(id);
    const attack = await page.evaluate(() => {
      const g = __rift.game;
      g.state = "playing";
      g.attackTimer = 0.1;
      for (let i = 0; i < 15; i++) g.update(0.01);
      g.state = "paused";
      __rift.updateHud();
      return {
        kind: g.p.action?.kind,
        released: g.p.action?.released,
        fx: g.effects.length,
      };
    });
    assert.equal(attack.kind, "attack");
    assert.ok(attack.released);
    await shot(`combat-${id}-attack`);
    await page.evaluate(() => {
      const g = __rift.game;
      g.p.skillCd = 0;
      g.state = "playing";
    });
    await page.keyboard.press("q");
    assert.equal(await page.evaluate(() => __rift.game.stats.skills), 1);
    await page.waitForFunction(
      () =>
        !__rift.game.pendingSkill &&
        __rift.game.p.action?.kind === "skill" &&
        __rift.game.p.action.released,
    );
    await page.evaluate(() => {
      const g = __rift.game;
      for (let i = 0; i < 10; i++) g.update(0.01);
      g.state = "paused";
    });
    await shot(`combat-${id}-skill`);
    const phase = await page.evaluate(() =>
      JSON.stringify([
        __rift.game.p.action,
        __rift.game.bullets.map((b) => b.age),
      ]),
    );
    const canvas = await page.evaluate(() =>
      document.getElementById("arena").toDataURL(),
    );
    await page.waitForTimeout(75);
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify([
          __rift.game.p.action,
          __rift.game.bullets.map((b) => b.age),
        ]),
      ),
      phase,
    );
    assert.equal(
      await page.evaluate(() => document.getElementById("arena").toDataURL()),
      canvas,
      "paused impacts and camera remain visually frozen",
    );
  }
  // Reduced motion changes presentation, never skill damage or projectile physics.
  await page.evaluate(() => {
    const g = __rift.game;
    g.save.visuals.motion = false;
    g.save.visuals.numbers = false;
  });
  await shot("combat-reduced-motion");
  await page.setViewportSize({ width: 390, height: 844 });
  await setup("lumen");
  await page.evaluate(() => {
    const g = __rift.game;
    g.state = "playing";
    g.p.skillCd = 0;
  });
  await page.locator("#skill-button").click();
  await page.waitForFunction(
    () => __rift.game.stats.skills === 1 && !__rift.game.pendingSkill,
  );
  await page.evaluate(() => {
    __rift.game.state = "paused";
  });
  await shot("combat-mobile");
  assert.deepEqual(errors, []);
  const sound = await page.evaluate(async () => {
    const { AudioEngine } = await import("/src/client/audio/AudioEngine.ts"),
      engine = new AudioEngine(true);
    engine.unlock();
    await engine.ctx.resume();
    for (const id of ["cinder", "briar", "nyx", "volta", "rook", "lumen"]) {
      engine.last.attack = -1;
      engine.play("attack", id);
    }
    engine.play("charge");
    engine.play("impact");
    const state = engine.ctx.state;
    await engine.ctx.close();
    return state;
  });
  assert.equal(sound, "running");
  await page.setViewportSize({ width: 1366, height: 768 });
  await setup("cinder");
  await page.evaluate(async () => {
    const g = __rift.game;
    g.save.visuals.motion = true;
    g.enemies = [];
    g.level = 60;
    g.ranks = {
      signature: 30,
      orbit: 30,
      nova: 30,
      familiar: 30,
      active: 30,
      haste: 20,
    };
    const { CLASS_TREES, buyClassTalent } =
      await import("/src/game/progression/class-talents.ts");
    const { heroThreshold } = await import("/src/game/progression/journey.ts");
    g.journey.xp = heroThreshold(500);
    for (const branch of CLASS_TREES.cinder)
      for (const n of branch.nodes)
        for (let rank = g.journey.talents[n.id] || 0; rank < n.max; rank++)
          assertLearned(n.id);
    function assertLearned(id) {
      if (!buyClassTalent(g.save, "cinder", id))
        throw new Error(`Could not learn ${id}`);
    }
    Object.assign(g.ranks, g.journey.talents);
    g.journey.ultimate = "cinder_path1_3";
    g.recalculate();
    for (let i = 0; i < 270; i++) {
      g.spawnEnemy(
        ["crawler", "runner", "spitter", "brute", "moth", "revenant", "shaman"][
          i % 7
        ],
        200,
      );
      const e = g.enemies.at(-1),
        a = (i * Math.PI * 2) / 270,
        r = 100 + (i % 25) * 11;
      Object.assign(e, {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r * 0.7,
        hp: 1e9,
        maxHp: 1e9,
        speed: 0,
      });
    }
    g.nextBoss = 1e6;
    g.state = "playing";
    g.castSkill();
  });
  const perf = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let last = performance.now(),
          n = 0;
        function frame(now) {
          if (n++ > 15) samples.push(now - last);
          last = now;
          if (n < 140) requestAnimationFrame(frame);
          else {
            samples.sort((a, b) => a - b);
            const g = __rift.game;
            g.state = "paused";
            resolve({
              median: samples[Math.floor(samples.length * 0.5)],
              p95: samples[Math.floor(samples.length * 0.95)],
              enemies: g.enemies.length,
              bullets: g.bullets.length,
              effects: g.effects.length,
              talentDamage: g.damageSources.talents || 0,
              ultimateDamage: g.damageSources.talent_ultimate || 0,
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  await shot("combat-crowd");
  assert.equal(perf.enemies, 270);
  assert.ok(perf.bullets <= 221 && perf.effects <= 250);
  assert.ok(perf.talentDamage > 0 && perf.ultimateDamage > 0);
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("./screenshots/combat-audit.json", import.meta.url),
    JSON.stringify({ assets, perf }, null, 2),
  );
  console.log(
    `Combat browser: 72 action poses, 36 walking poses, six hero releases, visual pause, keyboard, phone skill input, audio and reduced motion passed. Crowd frame interval median ${perf.median.toFixed(1)}ms, p95 ${perf.p95.toFixed(1)}ms.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
