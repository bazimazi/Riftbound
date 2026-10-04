import type { PixelPoint } from "./types.ts";
import type { SpriteTexture } from "./types.ts";
import { CLASS_FORMS } from "../../game/combat/class-forms.ts";

// Recolor each existing animation raster once; faces, alpha and foot anchors survive.
const textures = new WeakMap<SpriteTexture, Map<string, SpriteTexture>>();
export function formTexture(
  texture: SpriteTexture,
  hero: string,
  stage: number,
) {
  if (!stage || !CLASS_FORMS[hero]) return texture;
  let variants = textures.get(texture);
  if (!variants) textures.set(texture, (variants = new Map()));
  const key = `${hero}:${stage}`;
  if (variants.has(key)) return variants.get(key)!;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(texture.w);
  canvas.height = Math.ceil(texture.h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx!.drawImage(
    texture.image,
    texture.x,
    texture.y,
    texture.w,
    texture.h,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const data = ctx!.getImageData(0, 0, canvas.width, canvas.height),
    hex = CLASS_FORMS[hero].palette[stage - 1],
    tint = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < data.data.length; i += 4) {
    const [r, g, b, a] = data.data.slice(i, i + 4),
      light = (r * 0.3 + g * 0.59 + b * 0.11) / 255,
      skin = r > 125 && g > 75 && r > g * 1.15 && g > b * 1.25;
    if (!a || skin || light < 0.1) continue;
    for (let c = 0; c < 3; c++)
      data.data[i + c] = Math.min(
        255,
        data.data[i + c] * 0.22 + tint[c] * (light * 1.2 + 0.1) * 0.78,
      );
  }
  ctx!.putImageData(data, 0, 0);
  const result = {
    image: canvas,
    x: 0,
    y: 0,
    w: canvas.width,
    h: canvas.height,
  };
  variants.set(key, result);
  return result;
}

// Render accessories once at the sprite's logical resolution, with shaded pixel
// clusters. No new sampling, image reads or pixel work occurs during animation.
const regalia = new Map<string, HTMLCanvasElement>();
export function drawFormRegalia(
  c: CanvasRenderingContext2D,
  hero: string,
  stage: number,
  height: number,
  front = false,
) {
  if (!stage || !CLASS_FORMS[hero]) return;
  const key = `${hero}:${stage}:${front}`;
  let canvas = regalia.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 112;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.translate(64, 104);
    paintRegalia(ctx, hero, stage, 80, front);
    const pixels = ctx.getImageData(0, 0, 128, 112);
    for (let y = 0; y < 112; y++)
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4,
          noise = ((Math.floor(x / 2) * 37 + Math.floor(y / 2) * 17) % 13) / 13,
          light =
            0.78 +
            (1 - y / 112) * 0.23 +
            (noise > 0.8 ? 0.08 : noise < 0.2 ? -0.08 : 0);
        if (pixels.data[i + 3] < 100) {
          pixels.data[i + 3] = 0;
          continue;
        }
        pixels.data[i + 3] = 255;
        for (let channel = 0; channel < 3; channel++)
          pixels.data[i + channel] = Math.min(
            255,
            Math.round((pixels.data[i + channel] * light) / 8) * 8,
          );
      }
    ctx.putImageData(pixels, 0, 0);
    regalia.set(key, canvas);
  }
  const scale = height / 80;
  c.drawImage(canvas, -64 * scale, -104 * scale, 128 * scale, 112 * scale);
}

// Stepped silhouettes attach to the same body anchor in every action pose.
function paintRegalia(
  c: CanvasRenderingContext2D,
  hero: string,
  stage: number,
  height: number,
  front = false,
) {
  if (!stage || !CLASS_FORMS[hero]) return;
  const color = CLASS_FORMS[hero].palette[stage - 1],
    gold =
      {
        nyx: "#b2a0de",
        morrow: "#9cd8f1",
        volta: "#8ad9de",
        fen: "#c1b39a",
        orin: "#b7dfd4",
      }[hero] || (stage === 2 ? "#ffe3a3" : "#b29e73");
  c.save();
  c.scale(height / 80, height / 80);
  c.lineJoin = "miter";
  c.lineWidth = 1.4;
  const poly = (
      points: PixelPoint[],
      fill: string,
      outline: string | null = "#17202d",
    ) => {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (outline) {
        c.strokeStyle = outline;
        c.stroke();
      }
    },
    rect = (x: number, y: number, w: number, h: number, fill: string) => {
      c.fillStyle = fill;
      c.fillRect(x, y, w, h);
    },
    sides = (draw: () => void) => {
      for (const side of [-1, 1]) {
        c.save();
        c.scale(side, 1);
        draw();
        c.restore();
      }
    },
    wing = (feather: string, fill: string) =>
      sides(() => {
        poly(
          [
            [10, -44],
            [22, -52],
            [32, -65],
            [49, -76],
            [46, -58],
            [52, -57],
            [41, -44],
            [46, -41],
            [30, -29],
            [22, -25],
            [15, -32],
          ],
          fill,
        );
        poly(
          [
            [17, -42],
            [27, -49],
            [43, -66],
            [38, -48],
            [30, -35],
            [22, -30],
          ],
          color,
          gold,
        );
        for (let i = 0; i < 4; i++)
          poly(
            [
              [24 + i * 5, -42 - i * 5],
              [36 + i * 3, -54 - i * 5],
              [30 + i * 3, -39 - i * 5],
              [22 + i * 4, -31 - i * 5],
            ],
            feather,
            null,
          );
      }),
    crown = (tall = false) => {
      poly(
        [
          [-13, -60],
          [-14, -70],
          [-7, -66],
          [-5, tall ? -79 : -75],
          [0, -68],
          [5, tall ? -79 : -75],
          [7, -66],
          [14, -70],
          [13, -60],
        ],
        color,
        gold,
      );
      rect(-3, -65, 6, 4, gold);
    },
    halo = (radius: number, fill: string) => {
      c.strokeStyle = fill;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, -65, radius, radius * 0.35, 0, 0, Math.PI * 2);
      c.stroke();
      rect(-2, -70 - radius * 0.35, 4, 4, fill);
    };
  if (front) {
    if (["cinder", "rook", "morrow"].includes(hero)) crown(stage === 2);
    else if (["solace", "lumen", "kestrel"].includes(hero))
      halo(stage === 2 ? 21 : 14, gold);
    if (["rook", "volta", "morrow"].includes(hero))
      sides(() => {
        poly(
          [
            [12, -39],
            [20, -44],
            [28, -40],
            [26, -31],
            [17, -32],
          ],
          color,
          gold,
        );
        rect(19, -39, 3, 4, gold);
      });
    else
      sides(() => {
        poly(
          [
            [13, -36],
            [17, -42],
            [22, -37],
            [20, -32],
          ],
          color,
          gold,
        );
        rect(16, -37, 2, 3, gold);
      });
    if (hero === "morrow")
      sides(() =>
        poly(
          [
            [17, -42],
            [23, -56],
            [29, -43],
            [24, -34],
          ],
          "#c7efff",
          color,
        ),
      );
    if (hero === "volta")
      sides(() => {
        rect(19, -52, 6, 5, gold);
        rect(21, -59, 2, 6, color);
      });
    c.restore();
    return;
  }
  // A larger mantle is visible even while effects are disabled.
  sides(() => {
    poly(
      [
        [8, -48],
        [21, -47],
        [27, -29],
        [31, -12],
        [23, -17],
        [20, -9],
        [10, -21],
      ],
      color,
    );
    poly(
      [
        [14, -40],
        [21, -33],
        [25, -18],
        [20, -22],
        [15, -17],
      ],
      "#253039",
      null,
    );
  });
  if (hero === "cinder") {
    if (stage === 2) wing("#fff0a3", "#b34230");
    else
      sides(() =>
        poly(
          [
            [13, -39],
            [21, -50],
            [24, -65],
            [31, -57],
            [35, -70],
            [40, -48],
            [29, -33],
          ],
          "#efaa57",
          color,
        ),
      );
  } else if (hero === "briar") {
    sides(() => {
      poly(
        [
          [9, -56],
          [13, -68],
          [18, -68],
          [20, -81],
          [24, -83],
          [23, -68],
          [32, -73],
          [35, -82],
          [39, -82],
          [37, -67],
          [25, -61],
          [18, -53],
        ],
        "#74583e",
        gold,
      );
      for (let i = 0; i < (stage === 2 ? 5 : 3); i++)
        poly(
          [
            [20 + i * 5, -53 - i * 5],
            [27 + i * 5, -59 - i * 5],
            [29 + i * 5, -52 - i * 5],
            [22 + i * 5, -47 - i * 5],
          ],
          color,
          "#304335",
        );
      if (stage === 2) {
        rect(34, -71, 5, 5, "#f4d6bf");
        rect(37, -77, 4, 4, gold);
      }
    });
  } else if (hero === "nyx") {
    sides(() => {
      poly(
        [
          [13, -48],
          [23, -62],
          [31, -72],
          [27, -54],
          [35, -49],
          [24, -41],
        ],
        "#302745",
        color,
      );
      for (let i = 0; i < stage + 1; i++)
        poly(
          [
            [27 + i * 8, -42 - i * 8],
            [33 + i * 8, -56 - i * 8],
            [35 + i * 8, -43 - i * 8],
            [30 + i * 8, -34 - i * 8],
          ],
          "#c6bde8",
          "#5b4780",
        );
    });
  } else if (hero === "volta") {
    sides(() => {
      poly(
        [
          [15, -31],
          [18, -64],
          [23, -70],
          [29, -64],
          [31, -31],
        ],
        "#435b68",
        gold,
      );
      for (let i = 0; i < 4; i++) rect(18, -62 + i * 7, 11, 3, color);
      if (stage === 2)
        poly(
          [
            [29, -71],
            [39, -66],
            [34, -58],
            [45, -54],
            [37, -45],
            [43, -42],
            [29, -35],
            [34, -49],
            [26, -53],
            [32, -62],
          ],
          "#c7f3ff",
          color,
        );
    });
  } else if (hero === "rook") {
    sides(() => {
      poly(
        [
          [10, -48],
          [21, -59],
          [33, -56],
          [stage === 2 ? 43 : 36, -43],
          [35, -24],
          [21, -28],
        ],
        "#5b636b",
        gold,
      );
      poly(
        [
          [21, -52],
          [31, -49],
          [33, -35],
          [23, -36],
        ],
        color,
        gold,
      );
      rect(25, -47, 4, 8, "#e2f4dc");
      rect(22, -44, 10, 2, "#e2f4dc");
    });
  } else if (hero === "lumen") {
    if (stage === 2) wing("#e2f3ff", "#6477aa");
    else
      sides(() =>
        poly(
          [
            [17, -42],
            [24, -55],
            [22, -70],
            [29, -65],
            [34, -55],
            [31, -41],
            [25, -31],
          ],
          "#aecfe5",
          color,
        ),
      );
  } else if (hero === "vesper") {
    sides(() => {
      poly(
        [
          [11, -53],
          [19, -65],
          [19, -78],
          [27, -77],
          [31, -67],
          [27, -61],
          [25, -71],
          [23, -71],
          [23, -58],
          [16, -49],
        ],
        "#a1bd73",
        gold,
      );
      if (stage === 2) {
        poly(
          [
            [13, -42],
            [27, -58],
            [45, -70],
            [47, -47],
            [54, -28],
            [42, -36],
            [32, -27],
            [22, -35],
          ],
          "#442956",
          "#b0d27e",
        );
        poly(
          [
            [18, -40],
            [31, -52],
            [42, -61],
            [38, -43],
            [45, -33],
            [33, -34],
            [28, -29],
          ],
          color,
          "#243827",
        );
      }
    });
  } else if (hero === "fen") {
    sides(() => {
      poly(
        [
          [11, -46],
          [18, -59],
          [25, -56],
          [31, -59],
          [36, -50],
          [34, -39],
          [40, -31],
          [29, -32],
          [25, -24],
          [17, -30],
        ],
        "#988571",
        "#24352a",
      );
      for (let i = 0; i < stage + 2; i++)
        poly(
          [
            [23 + i * 4, -49 + i * 3],
            [28 + i * 4, -50 + i * 3],
            [25 + i * 4, -39 + i * 3],
          ],
          gold,
          "#5c5543",
        );
      if (stage === 2)
        poly(
          [
            [29, -31],
            [38, -19],
            [41, -7],
            [32, -12],
            [25, -23],
          ],
          color,
          gold,
        );
    });
  } else if (hero === "solace") {
    if (stage === 2) wing("#fff6dc", "#b99c69");
    else
      sides(() =>
        poly(
          [
            [12, -46],
            [24, -50],
            [30, -37],
            [37, -16],
            [25, -20],
            [20, -12],
            [13, -27],
          ],
          "#e9dfc4",
          gold,
        ),
      );
    halo(stage === 2 ? 25 : 18, "#f4d277");
  } else if (hero === "orin") {
    for (let i = 0; i < (stage === 2 ? 5 : 3); i++) {
      const angle = Math.PI + (i / (stage === 2 ? 4 : 2)) * Math.PI,
        x = Math.round(Math.cos(angle) * 34),
        y = -41 + Math.round(Math.sin(angle) * 31),
        fill = ["#f3b477", "#a9e3dc", "#d2bbf0"][i % 3];
      poly(
        [
          [x - 5, y - 8],
          [x + 5, y - 8],
          [x + 8, y],
          [x + 5, y + 8],
          [x - 5, y + 8],
          [x - 8, y],
        ],
        "#365061",
        fill,
      );
      rect(x - 1, y - 4, 2, 8, fill);
      rect(x - 4, y - 1, 8, 2, fill);
    }
  } else if (hero === "kestrel") {
    if (stage === 2) wing("#e2fff1", "#417969");
    else
      sides(() =>
        poly(
          [
            [13, -43],
            [26, -48],
            [34, -59],
            [33, -45],
            [42, -36],
            [35, -29],
            [31, -38],
            [21, -32],
          ],
          color,
          gold,
        ),
      );
  } else if (hero === "morrow") {
    sides(() => {
      poly(
        [
          [14, -44],
          [25, -62],
          [29, -77],
          [34, -70],
          [33, -55],
          [stage === 2 ? 47 : 39, -65],
          [43, -43],
          [31, -35],
          [23, -25],
        ],
        "#6b89ab",
        "#bfe8fc",
      );
      for (let i = 0; i < stage + 1; i++)
        poly(
          [
            [24 + i * 6, -48 - i * 7],
            [29 + i * 6, -65 - i * 7],
            [32 + i * 6, -46 - i * 7],
          ],
          "#d1f1ff",
          color,
        );
    });
  }
  c.restore();
}
