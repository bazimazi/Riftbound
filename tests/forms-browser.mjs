import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { veteranSave } from "./helpers.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: "4195" },
  stdio: "pipe",
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  browser = await chromium.launch({ headless: true });
  const errors = [],
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4195/?test=1");
  const visual = await page.evaluate(async () => {
    const { HEROES } = await import("/src/core.js"),
      { FORMS } = await import("/src/journey.js"),
      { artReady, drawSprite, drawActionSprite } =
        await import("/src/pixel-art.js");
    await artReady;
    const gallery = document.createElement("canvas");
    gallery.width = 1440;
    gallery.height = 1040;
    const c = gallery.getContext("2d");
    c.fillStyle = "#111b20";
    c.fillRect(0, 0, gallery.width, gallery.height);
    const issues = [];
    let poses = 0;
    const hash = (canvas) => {
      let value = 2166136261;
      for (const byte of canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data)
        value = Math.imul(value ^ byte, 16777619);
      return value;
    };
    for (const [i, h] of HEROES.entries()) {
      const left = (i % 3) * 480,
        top = Math.floor(i / 3) * 260;
      c.fillStyle = "#25332e";
      c.fillRect(left + 8, top + 8, 464, 244);
      c.fillStyle = "#efdfb7";
      c.font = "bold 17px monospace";
      c.textAlign = "center";
      c.fillText(`${h.name} · ${h.role}`, left + 240, top + 32);
      for (const stage of [0, 1, 2]) {
        drawSprite(c, h.id, left + 88 + stage * 152, top + 196, 108, {
          frame: 0,
          stage,
        });
        c.fillStyle = stage ? "#e5cd9d" : "#9eb1a5";
        c.font = "11px monospace";
        const words = FORMS[h.id][stage].split(" "),
          line =
            words.length > 2
              ? words.slice(0, -1).join(" ")
              : FORMS[h.id][stage];
        c.fillText(line, left + 88 + stage * 152, top + 224);
        if (words.length > 2)
          c.fillText(words.at(-1), left + 88 + stage * 152, top + 240);
      }
      for (const kind of ["walk", "attack", "skill"])
        for (let frame = 0; frame < 6; frame++) {
          const signatures = [];
          for (const stage of [0, 1, 2]) {
            const sample = document.createElement("canvas");
            sample.width = sample.height = 220;
            const ctx = sample.getContext("2d");
            if (kind === "walk")
              drawSprite(ctx, h.id, 110, 175, 82, { frame, stage });
            else
              drawActionSprite(ctx, h.id, 110, 175, 82, kind, frame, { stage });
            const pixels = ctx.getImageData(0, 0, 220, 220).data;
            if (!pixels.some((v, n) => n % 4 === 3 && v > 0))
              issues.push(`${h.id}:${stage}:${kind}:${frame}: blank`);
            for (let p = 0; p < pixels.length; p += 4)
              if (pixels[p + 3] > 60) {
                const x = (p / 4) % 220,
                  y = Math.floor(p / 4 / 220);
                if (x < 3 || x > 216 || y < 3 || y > 198) {
                  issues.push(
                    `${h.id}:${stage}:${kind}:${frame}: clipped or misplaced`,
                  );
                  break;
                }
              }
            signatures.push(hash(sample));
            poses++;
          }
          if (new Set(signatures).size !== 3)
            issues.push(`${h.id}:${kind}:${frame}: form appearance repeated`);
        }
    }
    return { issues, poses, gallery: gallery.toDataURL("image/png") };
  });
  assert.deepEqual(visual.issues, []);
  assert.equal(visual.poses, 648);
  await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("./screenshots/class-form-gallery.png", import.meta.url),
    Buffer.from(visual.gallery.split(",")[1], "base64"),
  );
  await page.evaluate(async (save) => {
    const { HEROES } = await import("/src/core.js"),
      { profile, heroThreshold } = await import("/src/journey.js");
    Object.assign(__rift.save, save);
    for (const h of HEROES) {
      const p = profile(__rift.save, h.id);
      p.xp = heroThreshold(200);
      p.sparks = 10000;
      p.materials = { core: 100, rune: 100, sigil: 100 };
      p.skills.signature = p.skills.active = { level: 40, stage: 2 };
      __rift.save.chronicle[h.id] = { bosses: 20 };
    }
  }, veteranSave());
  const heroes = await page.evaluate(async () =>
    (await import("/src/core.js")).HEROES.map((h) => h.id),
  );
  let layouts = 0;
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 844, height: 540 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    for (const hero of heroes) {
      await page.evaluate((id) => {
        __rift.save.journeys[id].stage = 0;
        __rift.save.journeys[id].sparks = 10000;
        __rift.save.journeys[id].materials = {
          core: 100,
          rune: 100,
          sigil: 100,
        };
        __rift.selectHero(id);
        __rift.journeyUI.show("class");
      }, hero);
      for (const stage of [0, 1, 2]) {
        if (stage) await page.locator("#evolve-class").click();
        await page.waitForTimeout(30);
        const check = await page.evaluate((id) => {
          const panel = document.getElementById("modal-panel"),
            issues = [],
            cards = [...panel.querySelectorAll(".class-form")];
          for (const el of [
            panel,
            ...panel.querySelectorAll(
              ".panel-body,.class-form-road,.class-form,.form-action,.form-unlocks",
            ),
          ])
            if (
              el.scrollWidth > el.clientWidth + 2 ||
              el.scrollHeight > el.clientHeight + 2
            )
              issues.push(`overflow: ${el.className}`);
          if (/undefined|NaN|null/.test(panel.innerText))
            issues.push("missing data");
          const images = cards.map((card) =>
            card.querySelector("canvas").toDataURL(),
          );
          if (new Set(images).size !== 3)
            issues.push("identical class previews");
          if (
            cards.some(
              (card, i) =>
                Number(card.querySelector("canvas").dataset.form) !== i,
            )
          )
            issues.push("wrong preview form");
          return {
            issues,
            stage: __rift.save.journeys[id].stage,
          };
        }, hero);
        assert.deepEqual(
          check.issues,
          [],
          `${hero}, tier ${stage}, ${viewport.width}`,
        );
        assert.equal(check.stage, stage);
        layouts++;
        if (
          stage === 2 &&
          ["vesper", "solace"].includes(hero) &&
          [1440, 390].includes(viewport.width)
        )
          await page.screenshot({
            path: fileURLToPath(
              new URL(
                `./screenshots/class-forms-${hero}-${viewport.width}.png`,
                import.meta.url,
              ),
            ),
          });
      }
    }
  }
  // Exercise the real renderer and F ability with the new silhouettes and teams.
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const hero of ["vesper", "solace", "cinder"]) {
    await page.evaluate((id) => {
      __rift.journeyUI.close();
      __rift.returnLobby();
      __rift.selectHero(id);
      __rift.start();
      const g = __rift.game;
      g.ranks.signature = 12;
      g.ranks.active = 12;
      g.recalculate();
      g.p.invuln = 1e6;
      g.enemies = [];
      g.spawnTimer = 1e6;
      for (const key of [
        "nextBoss",
        "nextCache",
        "nextHazard",
        "nextShrine",
        "nextVault",
        "nextCatalyst",
      ])
        g[key] = 1e6;
      for (let i = 0; i < 40; i++) {
        g.spawnEnemy("brute", 250);
        const angle = i * 2.4;
        Object.assign(g.enemies.at(-1), {
          x: Math.cos(angle) * (220 + i * 5),
          y: Math.sin(angle) * (220 + i * 5),
          hp: 1e8,
          maxHp: 1e8,
        });
      }
    }, hero);
    await page.keyboard.press("f");
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => __rift.game.pendingForm), null);
    assert.ok(
      await page.evaluate(() => __rift.game.formState.surgePower === 0.35),
    );
    assert.ok(
      (await page.locator("#form-1-button").getAttribute("class")).includes(
        "form-surge",
      ),
    );
    await page.evaluate(() => {
      __rift.game.state = "paused";
    });
    await page.screenshot({
      path: fileURLToPath(
        new URL(`./screenshots/class-form-combat-${hero}.png`, import.meta.url),
      ),
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    `Class form browser checks passed: ${visual.poses} distinct-stage animation samples, ${layouts} class layouts and real transformations, all 12 heroes, no clipping or runtime errors.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
