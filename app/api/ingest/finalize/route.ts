import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db/client";
import { analyzePatternImage } from "@/lib/ai/vision";
import { buildPatternFromImage } from "@/lib/ai/pattern-builder";
import { enhanceForQuantization } from "@/lib/ai/image-enhancer";
import { getSession, dropSession } from "@/lib/ingest-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  sessionId: string;
  frameIndex: number;
  /** bbox 归一化到 0-1，相对于"旋转后"帧像素空间（与客户端 canvas 一致） */
  bbox?: { x: number; y: number; w: number; h: number };
  /** 顺时针旋转角度，客户端已在 canvas 上可视旋转，服务端要做同样的 sharp.rotate */
  rotationDegrees?: number;
  gridWidth?: number;
  gridHeight?: number;
  ownerId?: string | null;
  title?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { sessionId, frameIndex, bbox, ownerId, title: overrideTitle } = body;
  const rotation = Math.max(-45, Math.min(45, Number(body.rotationDegrees) || 0));
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "会话已过期，请重新解析" }, { status: 410 });
  }
  if (frameIndex < 0 || frameIndex >= session.frames.length) {
    return NextResponse.json({ error: "帧序号无效" }, { status: 400 });
  }
  const chosen = session.frames[frameIndex];

  // 1) 服务端用 sharp.rotate 复刻客户端 canvas 的旋转效果（白底填充，同客户端一致）
  let workBuffer = chosen.full;
  if (Math.abs(rotation) > 0.1) {
    workBuffer = await sharp(workBuffer)
      .rotate(rotation, { background: "#ffffff" })
      .toBuffer();
  }

  // 2) 读旋转后像素尺寸，按归一化 bbox 像素裁剪（与客户端 canvas 坐标系一致）
  const rotatedMeta = await sharp(workBuffer).metadata();
  const rw = rotatedMeta.width ?? chosen.width;
  const rh = rotatedMeta.height ?? chosen.height;
  if (bbox) {
    const x = Math.round(bbox.x * rw);
    const y = Math.round(bbox.y * rh);
    const w = Math.round(bbox.w * rw);
    const h = Math.round(bbox.h * rh);
    if (w >= 10 && h >= 10) {
      workBuffer = await sharp(workBuffer)
        .extract({
          left: Math.max(0, x),
          top: Math.max(0, y),
          width: Math.min(rw - x, w),
          height: Math.min(rh - y, h),
        })
        .toBuffer();
    }
  }

  // 3) AI 估网格 + 标题（仅此一次；旋转和 bbox 都由用户决定了，不再需要 refine）
  let gridW = body.gridWidth ?? 0;
  let gridH = body.gridHeight ?? 0;
  let aiTitle: string | undefined;
  let aiNotes: string | undefined;
  if (gridW < 4 || gridH < 4) {
    const analysis = await analyzePatternImage(workBuffer, "image/jpeg");
    gridW = analysis.gridWidth;
    gridH = analysis.gridHeight;
    aiTitle = analysis.suggestedTitle;
    aiNotes = analysis.notes;
  }

  // 4) 色彩增强：消除珠子高光、白平衡、适度对比 / 饱和
  workBuffer = await enhanceForQuantization(workBuffer);

  const pattern = await buildPatternFromImage(workBuffer, {
    gridWidth: gridW,
    gridHeight: gridH,
  });

  const finalTitle =
    overrideTitle ?? session.title ?? aiTitle ?? "我的拼豆作品";

  const saved = await prisma.pattern.create({
    data: {
      title: finalTitle,
      width: pattern.width,
      height: pattern.height,
      cells: JSON.stringify(pattern.cells),
      palette: JSON.stringify(pattern.palette),
      beadCounts: JSON.stringify(pattern.beadCounts),
      sourceType: session.sourceType,
      sourceUrl: session.sourceUrl,
      thumbnail: pattern.thumbnail,
      ownerId: ownerId ?? null,
    },
  });

  dropSession(sessionId);

  return NextResponse.json({
    patternId: saved.id,
    aiNotes,
  });
}
