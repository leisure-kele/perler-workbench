import sharp from "sharp";
import { writeFileSync } from "fs";

/**
 * 生成一张 200x200 的彩色测试图（类似拼豆作品的色块）——用于手动测试 ingest API
 */
const size = 200;
const buf = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 3;
    const hue = ((Math.floor(x / 20) + Math.floor(y / 20)) * 40) % 360;
    const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.55);
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
  }
}
sharp(buf, { raw: { width: size, height: size, channels: 3 } })
  .png()
  .toBuffer()
  .then((png) => {
    writeFileSync("test-image.png", png);
    console.log("wrote test-image.png", png.length, "bytes");
  });

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
