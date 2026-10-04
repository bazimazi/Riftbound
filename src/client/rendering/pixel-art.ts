import type { SpriteTexture } from "./types.ts";
import type { Hero } from "../../game/types.ts";
import { assetUrls } from "../assets.ts";
import { formTexture, drawFormRegalia } from "./form-art.ts";
const paths = assetUrls;
export const art: Partial<Record<string, HTMLImageElement>> = {};
export const artReady = Promise.all(
  Object.entries(paths).map(
    ([id, path]) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          art[id as keyof typeof assetUrls] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = path;
      }),
  ),
);
const actorRects: Record<string, number[]> = {
  cinder: [0, 0, 0.25, 0.335],
  briar: [0.255, 0, 0.25, 0.335],
  nyx: [0.51, 0, 0.242, 0.335],
  volta: [0.777, 0, 0.223, 0.335],
  crawler: [0, 0.428, 0.254, 0.21],
  runner: [0.254, 0.433, 0.246, 0.208],
  spitter: [0.498, 0.383, 0.216, 0.263],
  brute: [0.718, 0.335, 0.282, 0.328],
  boss: [0, 0.642, 0.266, 0.343],
  moth: [0.266, 0.672, 0.236, 0.3],
  revenant: [0.496, 0.68, 0.235, 0.309],
  shaman: [0.756, 0.664, 0.244, 0.313],
};
const propRects: Record<string, number[]> = {
  tree: [0, 0, 0.287, 0.4],
  arch: [0.294, 0.035, 0.239, 0.365],
  deadTree: [0.537, 0, 0.24, 0.4],
  obelisk: [0.785, 0, 0.215, 0.4],
  altar: [0, 0.409, 0.284, 0.277],
  cache: [0.292, 0.47, 0.242, 0.215],
  ruin: [0.538, 0.41, 0.239, 0.277],
  mushrooms: [0.787, 0.42, 0.213, 0.276],
  rocks: [0, 0.723, 0.284, 0.27],
  grave: [0.3, 0.7, 0.23, 0.29],
  crystal: [0.55, 0.703, 0.215, 0.291],
  brazier: [0.803, 0.694, 0.188, 0.294],
};
const championRects: Record<string, number[]> = {
  rook: [0, 0, 0.5, 1],
  lumen: [0.5, 0, 0.5, 1],
};
const archetypeIds = ["vesper", "fen", "solace", "orin", "kestrel", "morrow"];
const companionIds = ["imp", "guardian", "wolf", "elemental", "crane", "ghoul"];
const treasureRects = Object.fromEntries(
  Object.entries({
    hourglass: [0.07, 0, 0.22, 0.329],
    crown: [0.338, 0.014, 0.33, 0.311],
    greaves: [0.683, 0.005, 0.307, 0.323],
    heart: [0.037, 0.334, 0.294, 0.316],
    grimoire: [0.331, 0.331, 0.34, 0.316],
    seed: [0.69, 0.336, 0.293, 0.313],
    mirror: [0.055, 0.676, 0.245, 0.317],
    sun: [0.336, 0.667, 0.335, 0.323],
    lantern: [0.722, 0.662, 0.25, 0.326],
  }).map(([id, rect]) => ["treasure-" + id, rect]),
);
const cache = new Map<string, SpriteTexture>();
function sprite(id: string) {
  if (cache.has(id)) return cache.get(id);
  // Portraits and idle actors must use the same gutter-aware cells as animations.
  // Equal-height atlas slices can cut off boots and leak them into the next hero.
  const heroRow = archetypeIds.indexOf(id),
    petRow = id.startsWith("pet-") ? companionIds.indexOf(id.slice(4)) : -1;
  let cell: Pick<SpriteTexture, "image"> | null | undefined = null;
  if (heroRow >= 0) cell = actionSprite(id, "walk", 0);
  else if (petRow >= 0 && art.companions) {
    const cuts = combatRows(art.companions);
    cell = isolatedCell(
      art.companions,
      0,
      cuts[petRow],
      art.companions.width / 3,
      cuts[petRow + 1] - cuts[petRow],
    );
  }
  const rect =
      (cell && [0, 0, 1, 1]) ||
      championRects[id] ||
      actorRects[id] ||
      propRects[id] ||
      treasureRects[id],
    source =
      cell?.image ||
      art[
        championRects[id]
          ? "champions"
          : treasureRects[id]
            ? "treasures"
            : actorRects[id]
              ? "actors"
              : "props"
      ];
  if (!rect || !source) return null;
  const [x, y, w, h] = rect.map(
    (v, i) => v * (i % 2 ? source.height : source.width),
  );
  const sample = document.createElement("canvas");
  sample.width = Math.ceil(w);
  sample.height = Math.ceil(h);
  const s = sample.getContext("2d", { willReadFrequently: true });
  s!.drawImage(source, x, y, w, h, 0, 0, w, h);
  const data = s!.getImageData(0, 0, sample.width, sample.height).data;
  let l = sample.width,
    r = 0,
    t = sample.height,
    b = 0;
  for (let yy = 0; yy < sample.height; yy++)
    for (let xx = 0; xx < sample.width; xx++)
      if (data[(yy * sample.width + xx) * 4 + 3] > 90) {
        l = Math.min(l, xx);
        r = Math.max(r, xx);
        t = Math.min(t, yy);
        b = Math.max(b, yy);
      }
  if (r <= l || b <= t) return null;
  const result = {
    image: source,
    x: x + l,
    y: y + t,
    w: r - l + 1,
    h: b - t + 1,
  };
  cache.set(id, result);
  return result;
}
// Cache small sprite rasters so animated crowds do not resample whole atlases each frame.
const rasterCache = new Map<string, SpriteTexture>();
function raster(
  key: string,
  source: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
) {
  const size = Math.min(Math.ceil(h), Math.ceil((height * 2) / 32) * 32),
    id = key + ":" + size;
  if (rasterCache.has(id)) return rasterCache.get(id)!;
  const canvas = document.createElement("canvas");
  canvas.height = size;
  canvas.width = Math.ceil((w * size) / h);
  const ctx = canvas.getContext("2d");
  ctx!.imageSmoothingEnabled = true;
  ctx!.imageSmoothingQuality = "high";
  ctx!.drawImage(source, x, y, w, h, 0, 0, canvas.width, canvas.height);
  const result = {
    image: canvas,
    x: 0,
    y: 0,
    w: canvas.width,
    h: canvas.height,
  };
  if (rasterCache.size >= 192)
    rasterCache.delete(rasterCache.keys().next().value!);
  rasterCache.set(id, result);
  return result;
}
// Keep a fixed scale across poses. Anchor each frame to its feet instead of
// trimming to its weapon; raising a staff must not shrink or lift the hero.
const actionRows: Record<string, [string, number, boolean?]> = {
  ...Object.fromEntries(
    archetypeIds.map((id, row) => [id, ["archetypes", row, true]]),
  ),
  cinder: ["combatOutcasts", 0],
  briar: ["combatOutcasts", 2],
  nyx: ["combatOutcasts", 4],
  volta: ["combatWayfarers", 0],
  rook: ["combatWayfarers", 2],
  lumen: ["combatWayfarers", 4],
};
const actionCache = new Map<
  string,
  SpriteTexture & { foot: number; anchor: number; key: string }
>();
const rowCuts = new Map<HTMLImageElement | HTMLCanvasElement, number[]>();
function combatRows(image: HTMLImageElement | HTMLCanvasElement, rows = 6) {
  if (rowCuts.has(image)) return rowCuts.get(image)!;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx!.drawImage(image, 0, 0);
  const data = ctx!.getImageData(0, 0, canvas.width, canvas.height).data,
    cuts = [0];
  // Generated rows have slightly different padding. Locate their transparent
  // gutters once, so no frame loses its feet or includes the following row.
  for (let row = 1; row < rows; row++) {
    let best = Infinity,
      cut = Math.round((row * image.height) / rows);
    for (
      let y = cut - 26;
      y <= Math.round((row * image.height) / rows) + 26;
      y++
    ) {
      let n = 0;
      for (let x = 0; x < image.width; x++)
        if (data[(y * image.width + x) * 4 + 3] > 180) n++;
      if (n < best) {
        best = n;
        cut = y;
      }
    }
    cuts.push(cut);
  }
  cuts.push(image.height);
  rowCuts.set(image, cuts);
  return cuts;
}
function isolatedCell(
  image: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx!.drawImage(image, x, y, w, h, 0, 0, w, h);
  const pixels = ctx!.getImageData(0, 0, canvas.width, canvas.height),
    data = pixels.data,
    width = canvas.width,
    total = width * canvas.height,
    labels = new Uint32Array(total),
    queue = new Uint32Array(total);
  let component = 0,
    largest = 0,
    best = 0;
  // A neighboring cape, flame or hammer trail can cross a nominal atlas cell.
  // Keep the connected actor silhouette, removing detached edge fragments.
  for (let index = 0; index < total; index++) {
    if (labels[index] || data[index * 4 + 3] < 60) continue;
    component++;
    let head = 0,
      tail = 1;
    queue[0] = index;
    labels[index] = component;
    while (head < tail) {
      const at = queue[head++],
        px = at % width,
        py = Math.floor(at / width);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx,
            ny = py + dy,
            next = ny * width + nx;
          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= canvas.height ||
            labels[next] ||
            data[next * 4 + 3] < 60
          )
            continue;
          labels[next] = component;
          queue[tail++] = next;
        }
    }
    if (tail > best) {
      best = tail;
      largest = component;
    }
  }
  for (let i = 0; i < total; i++)
    if (labels[i] !== largest) data[i * 4 + 3] = 0;
  ctx!.putImageData(pixels, 0, 0);
  return { image: canvas, data, width };
}
export function actionSprite(id: string, kind: string, frame: number) {
  const entry = actionRows[id];
  if (!entry || !art[entry[0]]) return null;
  frame = Math.max(0, Math.min(5, Math.floor(frame)));
  const key = `${id}-${kind}-${frame}`;
  if (actionCache.has(key)) return actionCache.get(key);
  const image = art[entry[0]]!,
    row = entry[1] + (!entry[2] && kind === "skill" ? 1 : 0),
    cuts = combatRows(image),
    w = image!.width / 6,
    h = cuts[row + 1] - cuts[row],
    cell = isolatedCell(
      image,
      (entry[2]
        ? (kind === "walk" ? [0, 1, 1, 0, 2, 2] : [3, 3, 4, 4, 5, 0])[frame]
        : frame) * w,
      cuts[row],
      w,
      h,
    ),
    sample = cell.image,
    data = cell.data;
  let foot = h * 0.94;
  // Ignore sparks and trailing capes at the edges when finding the foot line.
  for (let y = sample.height - 1; y > h * 0.62; y--) {
    let solid = 0;
    for (let x = Math.floor(w * 0.28); x < w * 0.78; x++)
      if (data[(y * sample.width + x) * 4 + 3] > 180) solid++;
    if (solid > w * 0.075) {
      foot = y + 1;
      break;
    }
  }
  let sum = 0,
    count = 0;
  for (let y = Math.max(0, foot - 10); y < foot; y++)
    for (let x = Math.floor(w * 0.25); x < w * 0.8; x++)
      if (data[(y * sample.width + x) * 4 + 3] > 180) {
        sum += x;
        count++;
      }
  const anchor = count ? sum / count : w / 2;
  const result = { image: sample, x: 0, y: 0, w, h, foot, anchor, key };
  actionCache.set(key, result);
  return result;
}
export function drawActionSprite(
  c: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  height: number,
  kind: string,
  frame: number,
  { flip = false, alpha = 1, stage = 0, maxWidth = Infinity } = {},
) {
  const s = actionSprite(id, kind, frame);
  if (!s) return false;
  height *= id === "rook" ? 1.12 : id === "lumen" ? 1.06 : 1;
  if (stage) height = Math.min(height, maxWidth * 0.68);
  const texture = formTexture(
      raster("action-" + s.key, s.image, s.x, s.y, s.w, s.h, height),
      id,
      stage,
    ),
    scale = height / (s.w * 0.92);
  c.save();
  c.imageSmoothingEnabled = true;
  c.globalAlpha *= alpha;
  c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  drawFormRegalia(c, id, stage, height);
  c.drawImage(
    texture.image,
    0,
    0,
    texture.w,
    texture.h,
    -s.anchor * scale,
    -s.foot * scale,
    s.w * scale,
    s.h * scale,
  );
  drawFormRegalia(c, id, stage, height, true);
  c.restore();
  return true;
}
export function prepareCombatArt() {
  for (const id of Object.keys(actionRows))
    for (const kind of [
      "attack",
      "skill",
      ...(archetypeIds.includes(id) ? ["walk"] : []),
    ])
      for (let frame = 0; frame < 6; frame++) {
        const s = actionSprite(id, kind, frame);
        if (s) raster("action-" + s.key, s.image, s.x, s.y, s.w, s.h, 82);
      }
  for (const [id, row] of [
    ["cinder", 0],
    ["briar", 1],
    ["nyx", 2],
    ["volta", 3],
    ["rook", 0],
    ["lumen", 1],
  ] as const)
    if (["rook", "lumen"].includes(id) ? art.wayfarerWalk : art.walk)
      for (let frame = 0; frame < 6; frame++) walkSprite(id, row, frame, 82);
}
const walkCache = new Map<
  string,
  { image: HTMLCanvasElement; w: number; h: number; foot: number }
>();
function walkSprite(id: string, row: number, frame: number, height: number) {
  const key = `walk-${id}-${frame}`,
    modern = ["rook", "lumen"].includes(id),
    image = (modern ? art.wayfarerWalk : art.walk)!,
    w = image!.width / 6;
  if (!walkCache.has(key)) {
    const cuts = combatRows(image, modern ? 2 : 4),
      h = cuts[row + 1] - cuts[row],
      cell = isolatedCell(image, frame * w, cuts[row], w, h);
    let foot = h;
    for (let y = Math.ceil(h) - 1; y > h * 0.6; y--) {
      let solid = 0;
      for (let x = Math.floor(w * 0.2); x < w * 0.8; x++)
        if (cell.data[(y * cell.width + x) * 4 + 3] > 180) solid++;
      if (solid > w * 0.045) {
        foot = y + 1;
        break;
      }
    }
    walkCache.set(key, { image: cell.image, w, h, foot });
  }
  const s = walkCache.get(key)!;
  return { ...s, texture: raster(key, s.image, 0, 0, s.w, s.h, height) };
}
export function drawSprite(
  c: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  height: number,
  {
    flip = false,
    alpha = 1,
    bob = 0,
    frame = null as number | null,
    tilt = 0,
    stretch = 1,
    maxWidth = Infinity,
    flash = 0,
    stage = 0,
  } = {},
) {
  if (stage) height = Math.min(height, maxWidth * 0.68);
  if (frame !== null && archetypeIds.includes(id))
    return drawActionSprite(c, id, x, y + bob, height, "walk", frame % 6, {
      flip,
      alpha,
      stage,
      maxWidth,
    });
  if (id.startsWith("pet-") && frame !== null && art.companions) {
    const row = companionIds.indexOf(id.slice(4)),
      image = art.companions,
      cuts = combatRows(image),
      w = image.width / 3,
      h = cuts[row + 1] - cuts[row];
    const key = `${id}-${frame % 3}`;
    let s = cache.get(key);
    if (!s) {
      const cell = isolatedCell(image, (frame % 3) * w, cuts[row], w, h);
      s = { image: cell.image, x: 0, y: 0, w, h };
      cache.set(key, s);
    }
    const texture = raster(key, s.image, 0, 0, w, h, height),
      scale = height / (h * 0.85);
    c.save();
    c.translate(Math.round(x), Math.round(y + bob));
    if (flip) c.scale(-1, 1);
    c.globalAlpha *= alpha;
    c.drawImage(
      texture.image,
      (-w * scale) / 2,
      -h * scale,
      w * scale,
      h * scale,
    );
    c.restore();
    return true;
  }
  const originalRow = ["cinder", "briar", "nyx", "volta"].indexOf(id),
    modernRow = ["rook", "lumen"].indexOf(id),
    row = originalRow >= 0 ? originalRow : modernRow;
  if (
    frame !== null &&
    row >= 0 &&
    (originalRow >= 0 ? art.walk : art.wayfarerWalk)
  ) {
    const s = walkSprite(id, row, frame % 6, height),
      texture = formTexture(s.texture, id, stage),
      w = height,
      drawnHeight = (height * s.h) / s.w,
      foot = (height * s.foot) / s.w;
    c.save();
    c.imageSmoothingEnabled = true;
    c.globalAlpha *= alpha;
    c.translate(Math.round(x), Math.round(y + bob));
    if (flip) c.scale(-1, 1);
    c.rotate(tilt);
    c.scale(1 / stretch, stretch);
    drawFormRegalia(c, id, stage, height);
    c.drawImage(
      texture.image,
      texture.x,
      texture.y,
      texture.w,
      texture.h,
      Math.round(-w / 2),
      Math.round(-foot),
      Math.round(w),
      Math.round(drawnHeight),
    );
    drawFormRegalia(c, id, stage, height, true);
    c.restore();
    return true;
  }
  const s = sprite(id);
  if (!s) return false;
  height = Math.min(height, (maxWidth * s.h) / s.w);
  const w = (height * s.w) / s.h;
  const texture = formTexture(
    height <= 180 ? raster(id, s.image, s.x, s.y, s.w, s.h, height) : s,
    id,
    stage,
  );
  c.save();
  c.imageSmoothingEnabled = true;
  c.globalAlpha *= alpha;
  c.translate(Math.round(x), Math.round(y + bob));
  if (flip) c.scale(-1, 1);
  c.rotate(tilt);
  c.scale(1 / stretch, stretch);
  drawFormRegalia(c, id, stage, height);
  c.drawImage(
    texture.image,
    texture.x,
    texture.y,
    texture.w,
    texture.h,
    Math.round(-w / 2),
    Math.round(-height),
    Math.round(w),
    Math.round(height),
  );
  drawFormRegalia(c, id, stage, height, true);
  if (flash > 0) {
    // The cached silhouette receives the highlight; the terrain stays untouched.
    const key = `flash-${id}`;
    let highlight = rasterCache.get(key);
    if (!highlight) {
      const mask = document.createElement("canvas");
      mask.width = texture.w;
      mask.height = texture.h;
      const m = mask.getContext("2d");
      m!.drawImage(
        texture.image,
        texture.x,
        texture.y,
        texture.w,
        texture.h,
        0,
        0,
        mask.width,
        mask.height,
      );
      m!.globalCompositeOperation = "source-in";
      m!.fillStyle = "#fff4de";
      m!.fillRect(0, 0, mask.width, mask.height);
      highlight = { image: mask, x: 0, y: 0, w: mask.width, h: mask.height };
      rasterCache.set(key, highlight);
    }
    c.globalAlpha *= flash;
    c.drawImage(
      highlight.image,
      Math.round(-w / 2),
      Math.round(-height),
      Math.round(w),
      Math.round(height),
    );
  }
  c.restore();
  return true;
}
export function drawPortrait(
  canvas: HTMLCanvasElement,
  hero: Hero,
  time = 0,
  mini = false,
) {
  const box = canvas.getBoundingClientRect(),
    w = Math.max(1, Math.round(box.width * Math.min(devicePixelRatio || 1, 2))),
    stage = Number(canvas.dataset.form || 0),
    h = Math.max(
      1,
      Math.round(box.height * Math.min(devicePixelRatio || 1, 2)),
    );
  if (!box.width || !box.height) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext("2d")!;
  c!.imageSmoothingEnabled = true;
  c!.clearRect(0, 0, w, h);
  if (mini) {
    c!.fillStyle = "#172529";
    c!.fillRect(0, 0, w, h);
    drawSprite(c, hero.id, w / 2, h - 2, h * 0.9, { stage, maxWidth: w - 8 });
    return;
  }
  if (art.sanctuary) {
    const ratio = Math.max(w / art.sanctuary.width, h / art.sanctuary.height);
    const iw = art.sanctuary.width * ratio,
      ih = art.sanctuary.height * ratio;
    c!.drawImage(art.sanctuary, (w - iw) / 2, (h - ih) / 2, iw, ih);
  } else {
    c!.fillStyle = "#152b2c";
    c!.fillRect(0, 0, w, h);
  }
  const shade = c!.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "#08152030");
  shade.addColorStop(0.6, "#08152000");
  shade.addColorStop(1, "#06151bd9");
  c!.fillStyle = shade;
  c!.fillRect(0, 0, w, h);
  c!.fillStyle = "#050a1670";
  c!.beginPath();
  c!.ellipse(w * 0.51, h * 0.78, w * 0.12, 5, 0, 0, Math.PI * 2);
  c!.fill();
  drawSprite(c, hero.id, w * 0.51, h * 0.77, Math.min(w * 0.72, h * 0.46), {
    bob: Math.round(Math.sin(time * 2) * 0.7),
    stage,
    maxWidth: w * 0.86,
  });
  for (let i = 0; i < 17; i++) {
    const x = (i * 83.7 + Math.sin(time * 0.3 + i) * 8) % w,
      y = (i * 49.3 - time * (1 + (i % 3))) % h;
    c!.fillStyle = i % 3 ? "#99c8af77" : hero.color;
    c!.fillRect(Math.round(x), Math.round((y + h) % h), 1, 1);
  }
}
export function drawCodexSprites(root: HTMLElement) {
  for (const canvas of root.querySelectorAll<HTMLCanvasElement>("[data-art]")) {
    const c = canvas.getContext("2d")!;
    c!.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(
      c,
      canvas.dataset.art!,
      canvas.width / 2,
      canvas.height - 3,
      canvas.hasAttribute("data-form")
        ? Math.min(canvas.height - 18, canvas.width * 0.68)
        : canvas.height - 8,
      { maxWidth: canvas.width - 8, stage: Number(canvas.dataset.form || 0) },
    );
  }
}
