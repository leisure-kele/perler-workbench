import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  const levels = await prisma.level.findMany({
    orderBy: { order: "asc" },
    include: {
      pattern: {
        select: { width: true, height: true, thumbnail: true, id: true },
      },
    },
  });

  return NextResponse.json({
    levels: levels.map((l) => ({
      slug: l.slug,
      title: l.title,
      difficulty: l.difficulty,
      order: l.order,
      videoUrl: l.videoUrl,
      videoTitle: l.videoTitle,
      patternId: l.pattern.id,
      thumbnail: l.pattern.thumbnail,
      gridLabel: `${l.pattern.width}×${l.pattern.height} 格`,
    })),
  });
}
