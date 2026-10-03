const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const themes = {
  cinder: ["#fb853a", "#ffe5a0", "#9b352d", "fire"],
  briar: ["#8cd36f", "#edffc0", "#3a7850", "root"],
  nyx: ["#ac7ae5", "#eee0ff", "#643b96", "blade"],
  volta: ["#62d4ed", "#efffff", "#436ba1", "storm"],
  rook: ["#d1aa65", "#ffedb9", "#756044", "stone"],
  lumen: ["#8cbdff", "#eefaff", "#5b69b0", "moon"],
  vesper: ["#96ed70", "#e6ffc7", "#9863ce", "soul"],
  fen: ["#dcbd70", "#fff2ba", "#71975b", "claw"],
  solace: ["#ffe19a", "#fffbea", "#d5a358", "sun"],
  orin: ["#6fe0cb", "#dffff2", "#649bc4", "spirit"],
  kestrel: ["#87e3c1", "#effff0", "#4e998b", "wind"],
  morrow: ["#89c9f5", "#e9faff", "#636faf", "frost"],
};
const halos = new Map(),
  seals = new Map();
function line(c, points, color, width = 1) {
  c.beginPath();
  for (let i = 0; i < points.length; i++)
    i ? c.lineTo(...points[i]) : c.moveTo(...points[i]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function ring(c, x, y, r, color, width = 1, flatten = 0.72) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, r), Math.max(0.1, r * flatten), 0, 0, TAU);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function arc(c, x, y, r, angle, color, width = 2, spread = 0.65) {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), angle - spread, angle + spread);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function glow(c, x, y, r, color, alpha = 1) {
  let image = halos.get(color);
  if (!image) {
    image = document.createElement("canvas");
    image.width = image.height = 64;
    const ctx = image.getContext("2d"),
      g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color + "b0");
    g.addColorStop(0.28, color + "60");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    halos.set(color, image);
  }
  c.save();
  c.globalAlpha *= alpha;
  c.globalCompositeOperation = "screen";
  c.drawImage(image, x - r, y - r, r * 2, r * 2);
  c.restore();
}
function diamond(c, x, y, size, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x + size * 0.5, y);
  c.lineTo(x, y + size);
  c.lineTo(x - size * 0.5, y);
  c.fill();
}
// Twelve reusable pixel seals. No gradients or bitmap creation in the frame loop
// once each class palette has been warmed up.
function seal(c, hero, x, y, size, alpha = 1, angle = 0) {
  let image = seals.get(hero);
  if (!image) {
    image = document.createElement("canvas");
    image.width = image.height = 64;
    const s = image.getContext("2d"),
      [color, core, , kind] = themes[hero];
    s.translate(32, 32);
    s.lineJoin = "miter";
    if (["fire", "wind", "moon"].includes(kind)) {
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++)
          line(
            s,
            [
              [0, 8],
              [side * (8 + i * 4), 1 - i * 2],
              [side * (28 - i * 3), -20 + i * 7],
            ],
            i % 2 ? core : color,
            3,
          );
      diamond(s, 0, 0, 13, core);
    } else if (kind === "root") {
      line(
        s,
        [
          [0, 22],
          [0, -20],
        ],
        core,
        3,
      );
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++)
          line(
            s,
            [
              [0, 14 - i * 11],
              [side * 17, 4 - i * 8],
              [side * 22, -7 - i * 7],
            ],
            color,
            3,
          );
    } else if (kind === "claw" || kind === "blade") {
      for (let i = -1; i <= 1; i++)
        line(
          s,
          [
            [i * 11 - 8, 22],
            [i * 11 + 5, -5],
            [i * 11 + 10, -23],
          ],
          i ? color : core,
          4,
        );
    } else if (kind === "storm") {
      line(
        s,
        [
          [8, -25],
          [-12, 0],
          [7, -3],
          [-8, 25],
        ],
        core,
        5,
      );
      line(
        s,
        [
          [-18, -13],
          [-24, 0],
          [-18, 13],
        ],
        color,
        2,
      );
      line(
        s,
        [
          [18, -13],
          [24, 0],
          [18, 13],
        ],
        color,
        2,
      );
    } else if (kind === "sun") {
      ring(s, 0, 0, 14, core, 3, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        line(
          s,
          [
            [Math.cos(a) * 19, Math.sin(a) * 19],
            [Math.cos(a) * 28, Math.sin(a) * 28],
          ],
          color,
          3,
        );
      }
    } else if (kind === "soul") {
      line(
        s,
        [
          [-20, -24],
          [-16, -9],
          [-8, -5],
          [8, -5],
          [16, -9],
          [20, -24],
        ],
        color,
        3,
      );
      diamond(s, 0, 5, 21, color);
      s.fillStyle = core;
      s.fillRect(-7, 0, 4, 4);
      s.fillRect(3, 0, 4, 4);
    } else if (kind === "stone") {
      line(
        s,
        [
          [-24, -15],
          [-24, 3],
          [0, 25],
          [24, 3],
          [24, -15],
          [0, -23],
          [-24, -15],
        ],
        color,
        3,
      );
      line(
        s,
        [
          [0, -14],
          [0, 14],
        ],
        core,
        4,
      );
      line(
        s,
        [
          [-12, -3],
          [12, -3],
        ],
        core,
        4,
      );
    } else {
      for (let i = 0; i < (kind === "frost" ? 6 : 3); i++) {
        const a = (i * TAU) / (kind === "frost" ? 6 : 3);
        line(
          s,
          [
            [0, 0],
            [Math.cos(a) * 25, Math.sin(a) * 25],
          ],
          core,
          3,
        );
        diamond(s, Math.cos(a) * 19, Math.sin(a) * 19, 5, color);
      }
    }
    // Quantize once into a crisp pixel rune.
    const small = document.createElement("canvas");
    small.width = small.height = 32;
    small.getContext("2d").drawImage(image, 0, 0, 32, 32);
    seals.set(hero, (image = small));
  }
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.globalAlpha *= alpha;
  c.imageSmoothingEnabled = false;
  c.drawImage(image, -size / 2, -size / 2, size, size);
  c.restore();
}
function bolt(c, x, y, tx, ty, color, core, phase) {
  const dx = tx - x,
    dy = ty - y,
    d = Math.hypot(dx, dy) || 1;
  const points = [[x, y]];
  for (let j = 1; j < 6; j++) {
    const t = j / 6,
      bend = Math.sin(j * 8 + phase) * 11;
    points.push([x + dx * t - (dy / d) * bend, y + dy * t + (dx / d) * bend]);
  }
  points.push([tx, ty]);
  line(c, points, color, 5);
  line(c, points, core, 1.5);
}
function plume(c, x, y, h, width, color, core) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - width, y);
  c.quadraticCurveTo(x - width * 1.6, y - h * 0.45, x + width * 0.45, y - h);
  c.quadraticCurveTo(x + width * 0.25, y - h * 0.5, x + width, y);
  c.fill();
  c.fillStyle = core;
  c.beginPath();
  c.moveTo(x - width * 0.45, y);
  c.quadraticCurveTo(
    x - width * 0.5,
    y - h * 0.3,
    x + width * 0.3,
    y - h * 0.66,
  );
  c.lineTo(x + width * 0.45, y);
  c.fill();
}
function shard(c, x, y, h, color, core, rock = false) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - h * 0.22, y);
  c.lineTo(x - h * 0.24, y - h * 0.66);
  c.lineTo(x, y - h);
  c.lineTo(x + h * 0.25, y - h * 0.52);
  c.lineTo(x + h * 0.18, y + 2);
  c.fill();
  line(
    c,
    [
      [x, y - h],
      [x + 1, y - h * 0.52],
      [x - 1, y],
    ],
    core,
    rock ? 2 : 3,
  );
}

export function drawAbilityGround(c, e, motion = true) {
  if (!["skillburst", "discharge"].includes(e.type) || !themes[e.hero])
    return false;
  const [color, core, shade, kind] = themes[e.hero],
    tier = e.tier ?? (e.type === "skillburst" ? 1 : 0),
    age = clamp(1 - e.life / e.maxLife),
    q = motion ? age : 0.38,
    t = 1 - (1 - q) ** 3,
    r = (e.r || 240) * (0.12 + t * 0.88),
    fade = (1 - age) ** 1.4,
    count = tier ? 6 + tier * 2 : 4;
  c.save();
  c.translate(e.x, e.y);
  c.globalAlpha *= fade;
  c.lineCap = "round";
  glow(c, 0, -8, 45 + tier * 20, color, 0.35);
  ring(c, 0, 3, r, shade, tier ? 5 : 2);
  ring(c, 0, 3, r, color, tier ? 2.5 : 1);
  if (tier > 1) {
    ring(c, 0, 3, r * 0.85, core, 1);
    seal(c, e.hero, 0, 0, 75 + tier * 14, 0.24);
  }
  if (e.motif === "ward") {
    ring(c, 0, 3, r * 0.48, core, 3);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      diamond(c, Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.35, 9, color);
    }
  } else if (["barrage", "hunt"].includes(e.motif)) {
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12 + (motion ? q * 0.3 : 0);
      line(
        c,
        [
          [Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.25],
          [Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.52],
        ],
        core,
        2,
      );
    }
  } else if (e.motif === "retinue" || e.motif === "ascension") {
    ring(c, 0, 3, r * 0.48, shade, 8);
    ring(c, 0, 3, r * 0.48, core, 1.5);
  }
  for (let i = 0; i < count; i++) {
    const a =
        (i * TAU) / count +
        (e.angle || 0) +
        (motion ? q * (kind === "wind" ? 1 : 0.16) : 0),
      x = Math.cos(a) * r,
      y = Math.sin(a) * r * 0.72,
      reach = r * (0.55 + (i % 3) * 0.1);
    if (kind === "root") {
      line(
        c,
        [
          [0, 0],
          [x * 0.3, y * 0.3 + 12],
          [x * 0.7, y * 0.7 - 9],
          [x, y],
        ],
        shade,
        7 + tier,
      );
      line(
        c,
        [
          [0, 0],
          [x * 0.3, y * 0.3 + 12],
          [x * 0.7, y * 0.7 - 9],
          [x, y],
        ],
        color,
        2,
      );
      for (let j = 1; j < 4; j++)
        diamond(c, (x * j) / 4 + 6, (y * j) / 4 - 8, 5 + tier, color);
    } else if (kind === "stone" || kind === "frost") {
      line(
        c,
        [
          [x * 0.18, y * 0.18],
          [x * 0.4 + 10, y * 0.4 - 9],
          [x * 0.68 - 8, y * 0.68],
          [x, y],
        ],
        shade,
        5,
      );
      line(
        c,
        [
          [x * 0.18, y * 0.18],
          [x * 0.4 + 10, y * 0.4 - 9],
          [x * 0.68 - 8, y * 0.68],
          [x, y],
        ],
        core,
        1.5,
      );
    } else if (kind === "storm" || kind === "spirit") {
      if (i % 2 === 0)
        bolt(
          c,
          x * 0.35,
          y * 0.35,
          x,
          y,
          shade,
          color,
          motion ? Math.floor(q * 8) : 0,
        );
    } else if (kind === "blade" || kind === "claw" || kind === "wind") {
      for (let j = 0; j < (kind === "claw" ? 3 : 1); j++)
        arc(
          c,
          x * 0.45 + j * 7,
          y * 0.45,
          reach * 0.5,
          a + q,
          color,
          3 + tier,
          0.4,
        );
    } else {
      line(
        c,
        [
          [x * 0.78, y * 0.78],
          [x, y],
        ],
        core,
        2,
      );
      diamond(c, x, y - 4, 4 + tier * 2, color);
    }
    if (tier > 1) seal(c, e.hero, x * 0.83, y * 0.83, 17 + tier * 3, 0.65, a);
  }
  c.restore();
  return true;
}

// Released spell accents are drawn above actors; the ground seal stays below
// them. Energy rises around the perimeter, keeping the player's center clear.
export function drawAbilityCrown(c, e, motion = true) {
  if (e.type !== "skillburst" || !themes[e.hero]) return;
  const [color, core, shade, kind] = themes[e.hero],
    tier = e.tier ?? 1,
    age = clamp(1 - e.life / e.maxLife),
    q = motion ? age : 0.35,
    t = 1 - (1 - q) ** 3,
    fade = Math.sin(Math.PI * clamp(age * 1.5)) * (1 - age),
    r = Math.min(e.r || 240, 460) * (0.25 + t * 0.65),
    count = 5 + tier * 2,
    height = (22 + tier * 24) * (0.4 + Math.sin(q * Math.PI) * 0.6);
  if (fade <= 0) return;
  c.save();
  c.translate(e.x, e.y);
  c.globalAlpha *= fade * 0.9;
  c.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = (i * TAU) / count + (e.angle || 0),
      x = Math.cos(a) * r,
      y = Math.sin(a) * r * 0.7,
      h = height * (0.75 + Math.sin(i * 7) * 0.25);
    if (kind === "fire") {
      glow(c, x, y - h * 0.4, 22 + tier * 9, color, 0.8);
      plume(c, x, y, h, 6 + tier * 3, color, core);
    } else if (kind === "root") {
      line(
        c,
        [
          [x, y],
          [x - 8, y - h * 0.4],
          [x + 7, y - h],
        ],
        shade,
        8,
      );
      line(
        c,
        [
          [x, y],
          [x - 8, y - h * 0.4],
          [x + 7, y - h],
        ],
        color,
        3,
      );
      diamond(c, x + 10, y - h * 0.65, 7 + tier * 2, core);
    } else if (kind === "storm" || kind === "spirit") {
      const tint =
        kind === "spirit" ? [color, "#f9ad70", "#8abaff"][i % 3] : color;
      glow(c, x, y - h, 28, tint, 0.5);
      bolt(
        c,
        x,
        y,
        x + Math.sin(i * 5) * 15,
        y - h * 1.7,
        tint,
        core,
        motion ? Math.floor(q * 10) + i : i,
      );
    } else if (kind === "stone" || kind === "frost") {
      glow(c, x, y - h * 0.25, 25, color, 0.4);
      shard(
        c,
        x,
        y,
        h,
        shade,
        kind === "frost" ? core : color,
        kind === "stone",
      );
    } else if (kind === "soul") {
      c.strokeStyle = shade;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + 35 * Math.sin(a),
        y - h * 0.6,
        x - 15 * Math.cos(a),
        y - h,
      );
      c.stroke();
      glow(c, x - 15 * Math.cos(a), y - h, 23, color);
      diamond(c, x - 15 * Math.cos(a), y - h, 7, core);
    } else if (kind === "sun") {
      glow(c, x, y - h * 0.5, 22, color, 0.7);
      line(
        c,
        [
          [x, y],
          [x, y - h * 1.6],
        ],
        color,
        9,
      );
      line(
        c,
        [
          [x, y],
          [x, y - h * 1.6],
        ],
        core,
        2,
      );
      diamond(c, x, y - h * 1.6, 9 + tier, core);
    } else if (kind === "moon") {
      arc(c, x, y - h, 13 + tier * 3, a + q * 2, core, 3, 1.1);
      line(
        c,
        [
          [x, y],
          [x, y - h * 1.4],
        ],
        shade,
        3,
      );
      diamond(c, x, y - h * 1.4, 9 + tier, color);
    } else if (kind === "claw") {
      for (let j = -1; j <= 1; j++)
        line(
          c,
          [
            [x + j * 9 - 12, y],
            [x + j * 9, y - h * 0.6],
            [x + j * 9 + 8, y - h],
          ],
          j ? color : core,
          3,
        );
    } else {
      arc(
        c,
        x,
        y - h * 0.5,
        20 + tier * 5,
        a + (motion ? q * 3 : 0),
        color,
        3,
        0.9,
      );
      arc(
        c,
        x,
        y - h * 0.5,
        14 + tier * 4,
        a + 0.3 + (motion ? q * 3 : 0),
        core,
        1.5,
        0.9,
      );
    }
    if (motion) {
      const lift = q * (35 + tier * 22),
        px = x + Math.sin(i * 9 + q * 4) * 14;
      c.fillStyle = i % 2 ? color : core;
      c.fillRect(Math.round(px), Math.round(y - lift), tier + 1, tier + 1);
    }
  }
  if (tier >= 2) {
    glow(c, 0, -105 - tier * 7, 45, color, 0.45);
    seal(c, e.hero, 0, -105 - tier * 7, 30 + tier * 9, 0.85);
  }
  if (e.motif === "ward") {
    c.globalAlpha *= 0.65;
    arc(c, 0, -15, 70 + tier * 15, -Math.PI / 2, color, 4, 1.35);
    arc(c, 0, -15, 64 + tier * 15, -Math.PI / 2, core, 1, 1.35);
  } else if (e.motif === "retinue") {
    for (const side of [-1, 1]) {
      ring(c, side * 85, -16, 35, shade, 6, 1.4);
      ring(c, side * 85, -16, 30, color, 2, 1.4);
      seal(c, e.hero, side * 85, -20, 32, 0.7);
    }
  }
  c.restore();
}

export function drawAbilityFields(c, g, motion = true) {
  const u = g.talentState?.ultimate;
  if (!u || !themes[g.hero.id]) return;
  const [color, core, shade] = themes[g.hero.id],
    age = Math.max(0, u.seconds - u.life),
    fade = Math.min(1, age / 0.25, u.life / 0.8),
    phase = motion ? g.time * 0.3 : 0,
    points = u.points.length ? u.points : [g.p],
    radius = u.radius * g.areaScale;
  c.save();
  c.globalAlpha *= fade * 0.5;
  for (const p of points) {
    glow(c, p.x, p.y, Math.min(radius, 180), shade, 0.25);
    ring(c, p.x, p.y, radius, color, 1.5, 0.8);
    if (u.kind === "ward") ring(c, p.x, p.y, radius * 0.82, core, 1, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + phase,
        x = p.x + Math.cos(a) * radius * 0.86,
        y = p.y + Math.sin(a) * radius * 0.8 * 0.86;
      seal(c, g.hero.id, x, y, 24, 0.8, a);
      if (u.kind === "vortex" || u.kind === "barrage")
        arc(c, p.x, p.y - 8, radius * 0.6, a, shade, 3, 0.35);
    }
  }
  c.restore();
}

// Persistent friendly glyphs communicate the spell's exact area and delayed impact.
export function drawSpellFields(c, g, motion = true) {
  if (!themes[g.hero.id]) return;
  const palettes = {
    fire: ["#ffb36e", "#fff2c1", "#804b32"],
    garden: ["#b2d38d", "#effac5", "#476d3e"],
    arc: ["#9de7ef", "#efffff", "#3e6679"],
    vortex: ["#c1aff2", "#f3e7ff", "#554674"],
    moon: ["#aacbf8", "#f1f2ff", "#435577"],
    holy: ["#f7dca4", "#fff8d8", "#7c6844"],
    spirit: ["#9be5d3", "#eaffef", "#41645e"],
    frost: ["#b1dcff", "#f0fcff", "#47607d"],
    blood: ["#de9ac4", "#ffe5f4", "#754455"],
  };
  for (const f of g.spellState?.fields || []) {
    const [color, core, shade] = palettes[f.element] || themes[g.hero.id];
    const age = Math.max(0, f.seconds - f.life),
      phase = motion ? g.time * 0.5 : 0;
    c.save();
    c.globalAlpha *= Math.min(0.55, age * 2 + 0.2, f.life * 2);
    for (const p of f.points.length ? f.points : [g.p]) {
      glow(c, p.x, p.y, Math.min(f.radius, 160), shade, 0.25);
      ring(c, p.x, p.y, f.radius, color, f.kind === "meteor" ? 3 : 1.5, 0.8);
      ring(c, p.x, p.y, f.radius * 0.78, shade, 4, 0.8);
      seal(c, g.hero.id, p.x, p.y, Math.min(f.radius * 0.6, 70), 0.8, phase);
      if (f.kind === "meteor") {
        const progress = Math.max(0, Math.min(1, 1 - f.delay / 0.8));
        ring(c, p.x, p.y, f.radius * progress, core, 2, 0.8);
        if (motion) {
          glow(c, p.x, p.y - (1 - progress) * 240, 35, color, 0.9);
          diamond(c, p.x, p.y - (1 - progress) * 240, 12, core);
        }
      } else
        for (let i = 0; i < 4; i++) {
          const a = phase + (i * TAU) / 4;
          diamond(
            c,
            p.x + Math.cos(a) * f.radius * 0.9,
            p.y + Math.sin(a) * f.radius * 0.72,
            f.kind === "trap" ? 5 : 3,
            core,
          );
        }
    }
    c.restore();
  }
}
