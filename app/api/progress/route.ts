import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

/**
 * 进度接口。
 * 新游戏逻辑下 filledCells 是 (number | null)[]：
 *   每个位置存"用户填入的颜色索引"，null 代表未填。
 * DB 字段 completedCells 继续复用（存 JSON 字符串），避免 schema 迁移。
 */

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const patternId = req.nextUrl.searchParams.get("patternId");
  if (!userId || !patternId) {
    return NextResponse.json({ filledCells: null, status: "in_progress" });
  }
  const p = await prisma.userProgress.findUnique({
    where: { userId_patternId: { userId, patternId } },
  });
  if (!p) {
    return NextResponse.json({ filledCells: null, status: "in_progress" });
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(p.completedCells);
  } catch {
    parsed = null;
  }
  // 兼容旧格式（number[] 已完成索引）——旧数据不包含颜色，返回 null 让前端用空白重玩
  let filledCells: (number | null)[] | null = null;
  if (Array.isArray(parsed) && parsed.every((v) => v === null || typeof v === "number")) {
    // 新格式，长度可能与当前 total 不等，交给前端校验
    const isSparseNull = parsed.some((v) => v === null);
    const looksLikeNew = isSparseNull || parsed.length > 0;
    if (looksLikeNew) filledCells = parsed as (number | null)[];
  }
  return NextResponse.json({
    filledCells,
    status: p.status,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, patternId, filledCells, status } = body as {
    userId: string;
    patternId: string;
    filledCells: (number | null)[];
    status?: string;
  };
  if (!userId || !patternId || !Array.isArray(filledCells)) {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const saved = await prisma.userProgress.upsert({
    where: { userId_patternId: { userId, patternId } },
    create: {
      userId,
      patternId,
      completedCells: JSON.stringify(filledCells),
      status: status ?? "in_progress",
    },
    update: {
      completedCells: JSON.stringify(filledCells),
      status: status ?? "in_progress",
    },
  });

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
}
