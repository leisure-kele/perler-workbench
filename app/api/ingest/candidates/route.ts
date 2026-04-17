import { NextRequest, NextResponse } from "next/server";
import { resolveDouyin } from "@/lib/douyin/resolver";
import { downloadVideo, extractFramesEvenly } from "@/lib/ai/frame-extractor";
import { scoreFrameAndThumb } from "@/lib/ai/frame-scorer";
import { createSession, type CandidateFrame } from "@/lib/ingest-cache";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const douyinUrl = (form.get("douyinUrl") as string) || null;
  const file = form.get("image") as File | null;

  if (!douyinUrl && !file) {
    return NextResponse.json(
      { error: "请提供抖音分享文本或上传图片" },
      { status: 400 },
    );
  }

  try {
    let frameJpgs: Buffer[];
    let sourceType: "douyin" | "upload";
    let sourceUrl: string | null = null;
    let title: string | undefined;

    if (douyinUrl) {
      sourceType = "douyin";
      const meta = await resolveDouyin(douyinUrl);
      sourceUrl = meta.playUrl;
      title = meta.title;
      const videoBuf = await downloadVideo(meta.playUrl);
      frameJpgs = await extractFramesEvenly(videoBuf, 10);
    } else {
      sourceType = "upload";
      const buf = Buffer.from(await file!.arrayBuffer());
      frameJpgs = [buf];
    }

    const scored: CandidateFrame[] = [];
    for (const jpg of frameJpgs) {
      const { score, width, height, thumb } = await scoreFrameAndThumb(jpg);
      scored.push({ full: jpg, thumb, score, width, height });
    }

    // 按分数降序放 session
    scored.sort((a, b) => b.score - a.score);

    const sessionId = createSession(scored, sourceType, sourceUrl, title);

    return NextResponse.json({
      sessionId,
      sourceType,
      title,
      frames: scored.map((f, i) => ({
        index: i,
        score: Number(f.score.toFixed(1)),
        width: f.width,
        height: f.height,
        thumbnail: `data:image/jpeg;base64,${f.thumb.toString("base64")}`,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "抽帧失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
