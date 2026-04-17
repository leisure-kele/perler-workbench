"use client";

import { cn } from "@/lib/utils";

interface BeadColorLite {
  id: string;
  code: string;
  name: string;
  hex: string;
}

interface Props {
  palette: BeadColorLite[];
  beadCounts: Record<string, number>;
  completedByColor?: Record<string, number>;
  highlightColorId?: string | null;
  onHighlight?: (id: string | null) => void;
}

export function BeadCountList({
  palette,
  beadCounts,
  completedByColor,
  highlightColorId,
  onHighlight,
}: Props) {
  const total = palette.reduce((s, c) => s + (beadCounts[c.id] ?? 0), 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs text-slate-500">{palette.length} 种色 · {total} 颗</span>
        {highlightColorId && (
          <button
            className="text-xs text-emerald-600 hover:underline"
            onClick={() => onHighlight?.(null)}
          >
            取消高亮
          </button>
        )}
      </div>
      <ul className="flex max-h-96 flex-col gap-1 overflow-auto pr-1">
        {palette.map((c) => {
          const count = beadCounts[c.id] ?? 0;
          const done = completedByColor?.[c.id] ?? 0;
          const pct = count > 0 ? Math.round((done / count) * 100) : 0;
          const active = highlightColorId === c.id;
          return (
            <li key={c.id}>
              <button
                onClick={() => onHighlight?.(active ? null : c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition",
                  active
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-slate-200 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="flex-1 truncate text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-1 text-xs text-slate-400">{c.code}</span>
                </span>
                <span className="text-xs tabular-nums text-slate-600">
                  {done}/{count}
                </span>
                <span className="ml-1 inline-block h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
