import sharp from "sharp";
import { MARD_PALETTE, MARD_BY_ID, type BeadColor } from "@/lib/bead-palette/mard-168";
import { nearestBead } from "@/lib/ai/color-quantizer";

export interface PatternData {
  width: number;
  height: number;
  cells: number[][]; // 每格是 palette 数组的索引
  palette: string[]; // BeadColor id
  beadCounts: Record<string, number>; // colorId -> count
  thumbnail: string; // data URL 预览图
}

export interface BuildPatternOptions {
  gridWidth: number;
  gridHeight: number;
  bbox?: { x: number; y: number; w: number; h: number };
  palette?: BeadColor[];
}

/**
 * 从原始图片 Buffer 生成 PatternData。
 * 步骤：
 * 1. 按 bbox 裁剪（若提供）
 * 2. 缩放到 gridWidth x gridHeight 像素（每格对应 1 像素的平均色）
 * 3. 对每个像素做色量化 → MARD 色号
 * 4. 统计 beadCounts、生成 palette、生成低分辨率缩略图
 */
export async function buildPatternFromImage(
  imageBuffer: Buffer,
  opts: BuildPatternOptions,
): Promise<PatternData> {
  const { gridWidth, gridHeight, bbox } = opts;
  const palette = opts.palette ?? MARD_PALETTE;

  let pipeline = sharp(imageBuffer);
  if (bbox) {
    pipeline = pipeline.extract({
      left: Math.round(bbox.x),
      top: Math.round(bbox.y),
      width: Math.round(bbox.w),
      height: Math.round(bbox.h),
    });
  }

  // 缩放到网格大小 —— sharp 会对每个目标像素做区域平均
  const { data } = await pipeline
    .resize(gridWidth, gridHeight, { fit: "fill", kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const usedColorIds = new Set<string>();
  const beadCounts: Record<string, number> = {};
  const cells: number[][] = [];
  const tempRows: string[][] = [];

  for (let y = 0; y < gridHeight; y++) {
    const row: string[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x) * 3;
      const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
      const bead = nearestBead(rgb, palette);
      row.push(bead.id);
      usedColorIds.add(bead.id);
      beadCounts[bead.id] = (beadCounts[bead.id] ?? 0) + 1;
    }
    tempRows.push(row);
  }

  // 稳定 palette 顺序：按使用频率降序
  const paletteIds = Array.from(usedColorIds).sort(
    (a, b) => (beadCounts[b] ?? 0) - (beadCounts[a] ?? 0),
  );
  const idToIndex = new Map(paletteIds.map((id, idx) => [id, idx]));
  for (const row of tempRows) {
    cells.push(row.map((id) => idToIndex.get(id)!));
  }

  const thumbnail = await buildThumbnail(cells, paletteIds);

  return {
    width: gridWidth,
    height: gridHeight,
    cells,
    palette: paletteIds,
    beadCounts,
    thumbnail,
  };
}

/**
 * 把 cells 渲染为一个小 PNG data URL，每格 4 像素。
 * 主要用于列表页缩略图。
 */
export async function buildThumbnail(
  cells: number[][],
  palette: string[],
  cellPx: number = 4,
): Promise<string> {
  const h = cells.length;
  const w = cells[0]?.length ?? 0;
  if (w === 0) return "";
  const pxW = w * cellPx;
  const pxH = h * cellPx;
  const buf = Buffer.alloc(pxW * pxH * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const colorId = palette[cells[y][x]];
      const rgb = MARD_BY_ID[colorId]?.rgb ?? [200, 200, 200];
      for (let dy = 0; dy < cellPx; dy++) {
        for (let dx = 0; dx < cellPx; dx++) {
          const pi = ((y * cellPx + dy) * pxW + (x * cellPx + dx)) * 3;
          buf[pi] = rgb[0];
          buf[pi + 1] = rgb[1];
          buf[pi + 2] = rgb[2];
        }
      }
    }
  }
  const png = await sharp(buf, {
    raw: { width: pxW, height: pxH, channels: 3 },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
