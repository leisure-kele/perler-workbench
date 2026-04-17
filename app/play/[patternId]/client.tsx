"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { PatternCanvas } from "@/components/workbench/PatternCanvas";
import { ColorPalette } from "@/components/workbench/ColorPalette";
import { getAnonymousUserId } from "@/lib/user-id";

interface BeadColorLite {
  id: string;
  code: string;
  name: string;
  hex: string;
}

interface Props {
  patternId: string;
  title: string;
  width: number;
  height: number;
  cells: number[][];
  palette: string[];
  paletteDetails: BeadColorLite[];
  beadCounts: Record<string, number>;
  thumbnail: string | null;
  sourceType: string;
  videoUrl: string | null;
  videoTitle: string | null;
}

export function PlayClient({
  patternId,
  title,
  width,
  height,
  cells,
  paletteDetails,
  beadCounts,
  thumbnail,
  sourceType,
  videoUrl,
  videoTitle,
}: Props) {
  const total = width * height;
  const [filledCells, setFilledCells] = useState<(number | null)[]>(() =>
    new Array(total).fill(null),
  );
  const [currentColorIndex, setCurrentColorIndex] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(true);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [cellSize, setCellSize] = useState(22);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 默认选中第一个颜色
  useEffect(() => {
    if (paletteDetails.length > 0 && currentColorIndex == null) {
      setCurrentColorIndex(0);
    }
  }, [paletteDetails.length, currentColorIndex]);

  // 加载进度
  useEffect(() => {
    const id = getAnonymousUserId();
    setUserId(id);
    fetch(`/api/progress?userId=${id}&patternId=${patternId}`)
      .then((r) => r.json())
      .then((d) => {
        const saved = d.filledCells;
        if (Array.isArray(saved) && saved.length === total) {
          setFilledCells(saved);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [patternId, total]);

  // 自动保存（防抖）
  useEffect(() => {
    if (!loaded || !userId) return;
    const correct = countCorrect(filledCells, cells, width);
    const status = correct >= total ? "completed" : "in_progress";
    const handle = setTimeout(() => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          patternId,
          filledCells,
          status,
        }),
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [filledCells, loaded, userId, patternId, cells, width, total]);

  const handlePaint = useCallback(
    (cellIndex: number) => {
      if (currentColorIndex == null) return;
      setFilledCells((prev) => {
        if (prev[cellIndex] === currentColorIndex) return prev;
        const next = prev.slice();
        next[cellIndex] = currentColorIndex;
        return next;
      });
    },
    [currentColorIndex],
  );

  const handleErase = useCallback((cellIndex: number) => {
    setFilledCells((prev) => {
      if (prev[cellIndex] == null) return prev;
      const next = prev.slice();
      next[cellIndex] = null;
      return next;
    });
  }, []);

  const { correct, filled, filledByColor } = useMemo(() => {
    const byColor: Record<string, number> = {};
    let c = 0;
    let f = 0;
    for (let i = 0; i < total; i++) {
      const u = filledCells[i];
      if (u == null) continue;
      f++;
      const y = Math.floor(i / width);
      const x = i % width;
      const answer = cells[y][x];
      if (u === answer) {
        c++;
        const cid = paletteDetails[answer]?.id;
        if (cid) byColor[cid] = (byColor[cid] ?? 0) + 1;
      }
    }
    return { correct: c, filled: f, filledByColor: byColor };
  }, [filledCells, cells, width, total, paletteDetails]);

  const pct = Math.round((correct / total) * 100);
  const isComplete = correct >= total;
  const wrong = filled - correct;

  async function handleDownloadPng() {
    const res = await fetch(`/api/patterns/${patternId}`);
    const data = await res.json();
    const { width: w, height: h } = data;
    const cellPx = 32;
    const canvas = document.createElement("canvas");
    canvas.width = w * cellPx;
    canvas.height = h * cellPx;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const paletteLookup = data.paletteDetails as BeadColorLite[];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = paletteLookup[data.cells[y][x]];
        ctx.fillStyle = color?.hex ?? "#cccccc";
        ctx.beginPath();
        ctx.arc(
          x * cellPx + cellPx / 2,
          y * cellPx + cellPx / 2,
          cellPx * 0.4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * cellPx, 0);
      ctx.lineTo(gx * cellPx, h * cellPx);
      ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * cellPx);
      ctx.lineTo(w * cellPx, gy * cellPx);
      ctx.stroke();
    }
    const link = document.createElement("a");
    link.download = `${title}-${w}x${h}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleReset() {
    if (!confirm("确认清空所有已填的格子？")) return;
    setFilledCells(new Array(total).fill(null));
  }

  function handleAutoFill() {
    if (currentColorIndex == null) return;
    // 一键填完当前色（把所有答案为当前颜色的格子都填上）
    setFilledCells((prev) => {
      const next = prev.slice();
      for (let i = 0; i < total; i++) {
        const y = Math.floor(i / width);
        const x = i % width;
        if (cells[y][x] === currentColorIndex) {
          next[i] = currentColorIndex;
        }
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            {sourceType === "preset" ? "图鉴关卡" : sourceType === "upload" ? "我的上传" : "抖音生成"}
          </p>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500">
            {width}×{height} 格 · 共 {total} 颗 · {paletteDetails.length} 种色
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/workbench"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-slate-400"
          >
            ← 回工作台
          </Link>
          <button
            onClick={handleDownloadPng}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            下载 PNG 图纸
          </button>
        </div>
      </header>

      {videoUrl && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <span className="mr-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
            配套视频
          </span>
          <a href={videoUrl} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
            {videoTitle ?? "打开教程视频"}
          </a>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-700">
              正确 {correct}/{total}
              <span className="ml-2 text-xs text-slate-400">({pct}%)</span>
            </span>
            {wrong > 0 && (
              <span className="text-xs text-rose-600">错色 {wrong} 格</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1 text-slate-500">
              <input
                type="checkbox"
                checked={showErrors}
                onChange={(e) => setShowErrors(e.target.checked)}
              />
              错色提示
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              格子尺寸
              <input
                type="range"
                min={10}
                max={36}
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
              />
            </label>
            <button
              onClick={handleAutoFill}
              disabled={currentColorIndex == null}
              className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:border-slate-400 disabled:opacity-40"
              title="一键填完当前颜色应在的所有格子"
            >
              自动填完当前色
            </button>
            <button
              onClick={handleReset}
              className="text-rose-600 hover:underline"
            >
              清空
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete ? "bg-emerald-500" : "bg-sky-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isComplete && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          🎉 完美还原！你已经把这个拼豆作品一格一格「画」出来了。下载图纸就可以动手拼实体啦。
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {revealAnswer ? "成品参考" : "填色画布"}
            </p>
            <button
              onMouseDown={() => setRevealAnswer(true)}
              onMouseUp={() => setRevealAnswer(false)}
              onMouseLeave={() => setRevealAnswer(false)}
              onTouchStart={() => setRevealAnswer(true)}
              onTouchEnd={() => setRevealAnswer(false)}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
            >
              按住预览答案
            </button>
          </div>
          <div className="overflow-auto">
            {revealAnswer ? (
              <PatternCanvas
                mode="reveal"
                width={width}
                height={height}
                cells={cells}
                paletteDetails={paletteDetails}
                cellSize={cellSize}
              />
            ) : (
              <PatternCanvas
                mode="paint"
                width={width}
                height={height}
                cells={cells}
                userCells={filledCells}
                paletteDetails={paletteDetails}
                currentColorIndex={currentColorIndex}
                onPaint={handlePaint}
                onErase={handleErase}
                showErrors={showErrors}
                cellSize={cellSize}
              />
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            玩法：右侧选颜色 → 点击格子填色（可拖拽连填）· 右键 / Shift 点击清除单格 · 按住右上按钮可瞄一眼答案
          </p>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span>调色板</span>
              {currentColorIndex != null && (
                <span
                  className="inline-block h-4 w-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: paletteDetails[currentColorIndex]?.hex }}
                />
              )}
            </h3>
            <ColorPalette
              palette={paletteDetails}
              beadCounts={beadCounts}
              filledByColor={filledByColor}
              currentColorIndex={currentColorIndex}
              onSelect={setCurrentColorIndex}
            />
          </div>
          {thumbnail && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">成品缩略图</h3>
              <img
                src={thumbnail}
                alt={title}
                className="mx-auto max-h-48 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <p className="mt-1 text-center text-xs text-slate-400">
                参照这张图还原作品
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function countCorrect(filled: (number | null)[], cells: number[][], width: number): number {
  let c = 0;
  for (let i = 0; i < filled.length; i++) {
    const u = filled[i];
    if (u == null) continue;
    const y = Math.floor(i / width);
    const x = i % width;
    if (u === cells[y][x]) c++;
  }
  return c;
}
