import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { MARD_BY_ID } from "@/lib/bead-palette/mard-168";
import { PlayClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: { patternId: string } }) {
  const pattern = await prisma.pattern.findUnique({
    where: { id: params.patternId },
    include: { level: true },
  });
  if (!pattern) notFound();

  const palette = JSON.parse(pattern.palette) as string[];
  const cells = JSON.parse(pattern.cells) as number[][];
  const beadCounts = JSON.parse(pattern.beadCounts) as Record<string, number>;
  const paletteDetails = palette
    .map((id) => MARD_BY_ID[id])
    .filter(Boolean)
    .map((c) => ({ id: c.id, code: c.code, name: c.name, hex: c.hex }));

  return (
    <PlayClient
      patternId={pattern.id}
      title={pattern.title}
      width={pattern.width}
      height={pattern.height}
      cells={cells}
      palette={palette}
      paletteDetails={paletteDetails}
      beadCounts={beadCounts}
      thumbnail={pattern.thumbnail}
      sourceType={pattern.sourceType}
      videoUrl={pattern.level?.videoUrl ?? null}
      videoTitle={pattern.level?.videoTitle ?? null}
    />
  );
}
