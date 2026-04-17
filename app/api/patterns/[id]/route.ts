import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { MARD_BY_ID } from "@/lib/bead-palette/mard-168";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pattern = await prisma.pattern.findUnique({
    where: { id: params.id },
  });
  if (!pattern) return NextResponse.json({ error: "not found" }, { status: 404 });

  const palette = JSON.parse(pattern.palette) as string[];
  const cells = JSON.parse(pattern.cells) as number[][];
  const beadCounts = JSON.parse(pattern.beadCounts) as Record<string, number>;

  const paletteDetails = palette.map((id) => MARD_BY_ID[id] ?? null).filter(Boolean);

  return NextResponse.json({
    id: pattern.id,
    title: pattern.title,
    width: pattern.width,
    height: pattern.height,
    cells,
    palette,
    paletteDetails,
    beadCounts,
    thumbnail: pattern.thumbnail,
    sourceType: pattern.sourceType,
    ownerId: pattern.ownerId,
    createdAt: pattern.createdAt,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.pattern.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
