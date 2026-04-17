/**
 * 启发式给候选帧打分 + 生成缩略图。
 * 分数越高越像"成品展示帧"（画面信息丰富、色彩多样、对比度高）。
 */

import sharp from "sharp";

export interface FrameScore {
  score: number;
  width: number;
  height: number;
  thumb: Buffer;
}

export async function scoreFrameAndThumb(jpg: Buffer, thumbWidth = 320): Promise<FrameScore> {
  const pipeline = sharp(jpg);
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // 1. 通道标准差平均（对比度 proxy）——信息量越大越像成品定格
  const stats = await sharp(jpg).stats();
  const stdev =
    stats.channels.reduce((s, c) => s + c.stdev, 0) /
    Math.max(1, stats.channels.length);

  // 2. 颜色多样性：缩到 24x24 后统计粗分桶色数（每通道 /32 共 8^3=512 桶）
  const small = await sharp(jpg)
    .resize(24, 24, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const buckets = new Set<number>();
  for (let i = 0; i < small.length; i += 3) {
    const key = (small[i] >> 5) * 64 + (small[i + 1] >> 5) * 8 + (small[i + 2] >> 5);
    buckets.add(key);
  }
  const diversity = buckets.size / 512;

  // 经验加权：stdev 主导（0-80 典型），diversity 辅助
  const score = stdev + diversity * 80;

  const thumb = await sharp(jpg)
    .resize(thumbWidth, undefined, { fit: "inside" })
    .jpeg({ quality: 75 })
    .toBuffer();

  return { score, width, height, thumb };
}
