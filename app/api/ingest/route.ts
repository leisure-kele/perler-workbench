import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { analyzePatternImage } from "@/lib/ai/vision";
import { buildPatternFromImage } from "@/lib/ai/pattern-builder";
import { resolveDouyin } from "@/lib/douyin/resolver";
import {
  downloadVideo,
  extractFrames,
  pickFrameForAnalysis,
} from "@/lib/ai/frame-extractor";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("image") as File | null;
  const douyinUrl = (form.get("douyinUrl") as string) || null;
  const ownerId = (form.get("ownerId") as string) || null;
  const overrideTitle = (form.get("title") as string) || null;
  const overrideGridW = form.get("gridWidth") ? Number(form.get("gridWidth")) : null;
  const overrideGridH = form.get("gridHeight") ? Number(form.get("gridHeight")) : null;

  if (!file && !douyinUrl) {
    return NextResponse.json(
      { error: "请上传图片或粘贴抖音分享文本" },
      { status: 400 },
    );
  }

  let buf: Buffer;
  let mime = "image/jpeg";
  let sourceType: "upload" | "douyin" = "upload";
  let sourceUrl: string | null = null;
  let douyinTitle: string | undefined;

  if (douyinUrl) {
    sourceType = "douyin";
    const preJob = await prisma.job.create({
      data: { status: "extracting", step: "解析抖音短链...", progress: 10 },
    });
    try {
      const meta = await resolveDouyin(douyinUrl);
      sourceUrl = meta.playUrl;
      douyinTitle = meta.title;
      await prisma.job.update({
        where: { id: preJob.id },
        data: { step: "下载视频中...", progress: 20 },
      });
      const videoBuf = await downloadVideo(meta.playUrl);
      await prisma.job.update({
        where: { id: preJob.id },
        data: { step: "抽取关键帧...", progress: 35 },
      });
      const frames = await extractFrames(videoBuf, 5);
      buf = pickFrameForAnalysis(frames);
      await prisma.job.update({
        where: { id: preJob.id },
        data: { status: "recognizing", step: "AI 识别成品网格...", progress: 50 },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误";
      await prisma.job.update({
        where: { id: preJob.id },
        data: { status: "failed", error: msg, progress: 0 },
      });
      return NextResponse.json({ error: msg, jobId: preJob.id }, { status: 500 });
    }
  } else {
    buf = Buffer.from(await file!.arrayBuffer());
    mime = file!.type || "image/jpeg";
  }

  const job = await prisma.job.create({
    data: { status: "recognizing", step: "AI 正在识别成品网格...", progress: 55 },
  });

  try {
    const analysis = await analyzePatternImage(buf, mime);

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "quantizing", step: "色彩量化到 MARD 色卡...", progress: 60 },
    });

    const gridW = overrideGridW ?? analysis.gridWidth;
    const gridH = overrideGridH ?? analysis.gridHeight;

    const pattern = await buildPatternFromImage(buf, {
      gridWidth: gridW,
      gridHeight: gridH,
      bbox: analysis.bbox,
    });

    const saved = await prisma.pattern.create({
      data: {
        title: overrideTitle ?? douyinTitle ?? analysis.suggestedTitle,
        width: pattern.width,
        height: pattern.height,
        cells: JSON.stringify(pattern.cells),
        palette: JSON.stringify(pattern.palette),
        beadCounts: JSON.stringify(pattern.beadCounts),
        sourceType,
        sourceUrl,
        thumbnail: pattern.thumbnail,
        ownerId,
      },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "done",
        step: "完成",
        progress: 100,
        patternId: saved.id,
      },
    });

    return NextResponse.json({
      jobId: job.id,
      patternId: saved.id,
      analysisNotes: analysis.notes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "failed", error: msg, progress: 0 },
    });
    return NextResponse.json({ error: msg, jobId: job.id }, { status: 500 });
  }
}
