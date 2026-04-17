import { MARD_PALETTE, type BeadColor, hexToLab } from "@/lib/bead-palette/mard-168";

// CIEDE2000 色差公式 - 标准实现
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number],
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;

  const h1p = (Math.atan2(b1, a1p) * 180) / Math.PI;
  const h2p = (Math.atan2(b2, a2p) * 180) / Math.PI;
  const h1pPos = h1p < 0 ? h1p + 360 : h1p;
  const h2pPos = h2p < 0 ? h2p + 360 : h2p;

  const deltLp = L2 - L1;
  const deltCp = C2p - C1p;

  let dhp = h2pPos - h1pPos;
  if (Math.abs(dhp) > 180) dhp -= Math.sign(dhp) * 360;
  const delthp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const avgLp = (L1 + L2) / 2;
  let avgHp = (h1pPos + h2pPos) / 2;
  if (Math.abs(h1pPos - h2pPos) > 180) avgHp += 180;
  if (avgHp >= 360) avgHp -= 360;

  const T =
    1 -
    0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);

  const deltRo = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -Math.sin((2 * deltRo * Math.PI) / 180) * Rc;

  const dE = Math.sqrt(
    Math.pow(deltLp / Sl, 2) +
      Math.pow(deltCp / Sc, 2) +
      Math.pow(delthp / Sh, 2) +
      Rt * (deltCp / Sc) * (delthp / Sh),
  );

  return dE;
}

/**
 * 在 MARD 色卡中查找与目标 RGB 最接近的珠子色。
 * 使用 Lab 空间 CIEDE2000，比 RGB 欧氏距离准得多。
 */
export function nearestBead(
  rgb: [number, number, number],
  palette: BeadColor[] = MARD_PALETTE,
): BeadColor {
  const lab = hexToLab(
    `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`,
  );
  let best = palette[0];
  let bestD = Infinity;
  for (const c of palette) {
    const d = deltaE2000(lab, c.lab);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
