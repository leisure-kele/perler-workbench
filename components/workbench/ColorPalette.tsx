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
  filledByColor: Record<string, number>; // 用户已正确填入的每色数量
  currentColorIndex: number | null;
  onSelect: (index: number | null) => void;
}

/**
 * 调色板：用户点击一个颜色作为当前画笔。
 * 每个色块显示：色号 · 中文名 · 已填/总数 · 进度条。
 */
export function ColorPalette({
  palette,
  beadCounts,
  filledByColor,
  currentColorIndex,
  onSelect,
}: Props) {
  const totalBeads = palette.reduce((s, c) => s + (beadCounts[c.id] ?? 0), 0);
  const totalFilled = palette.reduce((s, c) => s + (filledByColor[c.id] ?? 0), 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs text-slate-500">
          {palette.length} 种色 · {totalFilled}/{totalBeads}
        </span>
        {currentColorIndex != null && (
          <button
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => onSelect(null)}
          >
            取消选色
          </button>
        )}
      </div>
      <ul className="grid max-h-[32rem] grid-cols-1 gap-1 overflow-auto pr-1">
        {palette.map((c, idx) => {
          const total = beadCounts[c.id] ?? 0;
          const filled = filledByColor[c.id] ?? 0;
          const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
          const active = currentColorIndex === idx;
          const done = filled >= total && total > 0;
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(active ? null : idx)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition",
                  active
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300"
                    : done
                      ? "border-emerald-200 bg-emerald-50/50 opacity-70"
                      : "border-slate-200 bg-white hover:border-slate-400",
                )}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-slate-200 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="flex-1 truncate text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-1 text-xs text-slate-400">{c.code}</span>
                </span>
                <span className="text-xs tabular-nums text-slate-600">
                  {filled}/{total}
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
