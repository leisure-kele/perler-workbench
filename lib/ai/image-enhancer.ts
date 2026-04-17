/**
 * 拼豆成品照片在量化前的"还原度"增强。
 * 针对拼豆 3 类典型偏差：高光点、灯光色偏、压缩褪色。
 * 顺序固定：median → 白平衡 → 对比度 → 饱和度。顺序换了效果会打折。
 */

import sharp from "sharp";

export interface EnhanceOptions {
  /** 中值滤波窗口（奇数）。越大越能消除高光，但会模糊细节。3-5 即可 */
  medianSize?: number;
  /** 灰度世界白平衡开关 */
  whiteBalance?: boolean;
  /** 饱和度倍率，1.0 不变 */
  saturation?: number;
  /** 对比度倍率，1.0 不变 */
  contrast?: number;
}

const DEFAULTS: Required<EnhanceOptions> = {
  medianSize: 3,
  whiteBalance: true,
  saturation: 1.15,
  contrast: 1.1,
};

export async function enhanceForQuantization(
  input: Buffer,
  opts: EnhanceOptions = {},
): Promise<Buffer> {
  const o = { ...DEFAULTS, ...opts };

  // 1. 中值滤波：去掉珠子表面高光小亮点。比 blur 好，因为保边。
  let buf = await sharp(input).median(o.medianSize).toBuffer();

  // 2. 灰度世界白平衡：让 R/G/B 三通道均值拉平，消除灯光色偏
  if (o.whiteBalance) {
    const stats = await sharp(buf).stats();
    const ch = stats.channels.slice(0, 3);
    const means = ch.map((c) => c.mean);
    const gray = (means[0] + means[1] + means[2]) / 3;
    // 避免极端场景（几乎单色图）放大噪声——增益限制在 [0.85, 1.2]
    const gains = means.map((m) => clamp(gray / Math.max(m, 1), 0.85, 1.2));
    buf = await sharp(buf)
      .linear(gains, [0, 0, 0])
      .toBuffer();
  }

  // 3. 对比度 + 饱和度：modulate 一次搞定
  buf = await sharp(buf)
    .linear(o.contrast, -(o.contrast - 1) * 128)
    .modulate({ saturation: o.saturation })
    .toBuffer();

  return buf;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
