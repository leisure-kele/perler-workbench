"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAnonymousUserId } from "@/lib/user-id";

interface PatternItem {
  id: string;
  title: string;
  width: number;
  height: number;
  thumbnail?: string | null;
  sourceType: string;
  createdAt: string;
}

export default function MinePage() {
  const [patterns, setPatterns] = useState<PatternItem[] | null>(null);

  useEffect(() => {
    const userId = getAnonymousUserId();
    fetch(`/api/patterns?ownerId=${userId}`)
      .then((r) => r.json())
      .then((d) => setPatterns(d.patterns ?? []))
      .catch(() => setPatterns([]));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">我的作品</h1>
        <p className="mt-1 text-sm text-slate-500">
          你上传生成的每一张图纸，都会自动变成一个可玩关卡保存在这里。
        </p>
      </header>

      {patterns === null ? (
        <div className="text-sm text-slate-400">加载中…</div>
      ) : patterns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-500">还没有作品，去 </p>
          <Link href="/workbench" className="mt-2 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
            创作工作台 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {patterns.map((p) => (
            <Link
              key={p.id}
              href={`/play/${p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-slate-50">
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="h-full w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🧩</div>
                )}
              </div>
              <div className="mt-2">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-slate-400">
                  {p.width}×{p.height} · {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
