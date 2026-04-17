"use client";

import { cn } from "@/lib/utils";

export interface FrameOption {
  index: number;
  score: number;
  width: number;
  height: number;
  thumbnail: string;
}

interface Props {
  frames: FrameOption[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

/**
 * 候选帧 9 宫格：按"成品分"降序，第一张默认推荐。
 */
export function FramePicker({ frames, selectedIndex, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        AI 从视频里抽出了 <b>{frames.length}</b> 张候选帧，按「成品特征分」排序。点一张最像成品定格的：
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {frames.map((f, rank) => {
          const active = selectedIndex === f.index;
          return (
            <li key={f.index}>
              <button
                onClick={() => onSelect(f.index)}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-lg border-2 transition",
                  active
                    ? "border-emerald-500 ring-2 ring-emerald-300"
                    : "border-slate-200 hover:border-slate-400",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.thumbnail}
                  alt={`帧 #${f.index}`}
                  className="aspect-square w-full object-cover"
                />
                <span
                  className={cn(
                    "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    rank === 0 ? "bg-emerald-500 text-white" : "bg-black/60 text-white",
                  )}
                >
                  {rank === 0 ? "推荐" : `#${rank + 1}`}
                </span>
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {f.score}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
