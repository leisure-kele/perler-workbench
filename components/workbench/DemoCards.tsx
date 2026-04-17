"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Level {
  slug: string;
  title: string;
  difficulty: number;
  gridLabel: string;
  patternId: string;
  thumbnail?: string | null;
}

export function DemoCards() {
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setLevels(d.levels ?? []))
      .catch(() => setLevels([]));
  }, []);

  if (levels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        暂无预置关卡，先上传一张成品图片试试吧。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {levels.map((l) => (
        <Link
          key={l.slug}
          href={`/play/${l.patternId}`}
          className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="aspect-square overflow-hidden rounded-lg bg-slate-50">
            {l.thumbnail ? (
              <img
                src={l.thumbnail}
                alt={l.title}
                className="h-full w-full object-contain transition group-hover:scale-105"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl">🧩</div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">{l.title}</span>
            <Stars level={l.difficulty} />
          </div>
          <p className="text-xs text-slate-400">{l.gridLabel}</p>
        </Link>
      ))}
    </div>
  );
}

function Stars({ level }: { level: number }) {
  return (
    <span className="text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn(i < level ? "text-amber-400" : "text-slate-200")}>
          ★
        </span>
      ))}
    </span>
  );
}
