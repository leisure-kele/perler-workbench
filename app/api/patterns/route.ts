import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  const sourceType = req.nextUrl.searchParams.get("sourceType");

  const where: {
    ownerId?: string;
    sourceType?: string;
  } = {};
  if (ownerId) where.ownerId = ownerId;
  if (sourceType) where.sourceType = sourceType;

  const patterns = await prisma.pattern.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      width: true,
      height: true,
      thumbnail: true,
      sourceType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ patterns });
}
