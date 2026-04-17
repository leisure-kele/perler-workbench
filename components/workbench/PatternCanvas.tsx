"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface BeadColorLite {
  id: string;
  code: string;
  name: string;
  hex: string;
}

interface PaintProps {
  mode: "paint";
  width: number;
  height: number;
  cells: number[][]; // 正确答案（成品）
  userCells: (number | null)[]; // 用户填的颜色索引，长度 width*height
  paletteDetails: BeadColorLite[];
  currentColorIndex: number | null; // 选中的画笔颜色
  onPaint?: (cellIndex: number) => void; // 点击/拖拽填色（使用 currentColorIndex）
  onErase?: (cellIndex: number) => void; // 右键 / shift 点击清除
  showErrors?: boolean; // 是否高亮错色
  cellSize?: number;
  className?: string;
  showCoordinates?: boolean;
}

interface RevealProps {
  mode: "reveal";
  width: number;
  height: number;
  cells: number[][];
  paletteDetails: BeadColorLite[];
  highlightColorId?: string | null;
  cellSize?: number;
  className?: string;
  showCoordinates?: boolean;
}

type Props = PaintProps | RevealProps;

export function PatternCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragActionRef = useRef<"paint" | "erase" | null>(null);
  const lastIdxRef = useRef<number | null>(null);

  const { width, height, cells, paletteDetails, cellSize = 20, className, showCoordinates = true } = props;

  const paletteMap = useMemo(() => {
    const m = new Map<number, BeadColorLite>();
    paletteDetails.forEach((c, idx) => m.set(idx, c));
    return m;
  }, [paletteDetails]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pxW = width * cellSize;
    const pxH = height * cellSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = pxW * dpr;
    canvas.height = pxH * dpr;
    canvas.style.width = `${pxW}px`;
    canvas.style.height = `${pxH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, pxW, pxH);

    const r = cellSize * 0.4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;

        // 网格边框
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);

        if (props.mode === "reveal") {
          const answerIdx = cells[y][x];
          const color = paletteMap.get(answerIdx);
          const hex = color?.hex ?? "#cccccc";
          const dimmed = props.highlightColorId != null && color?.id !== props.highlightColorId;
          drawBead(ctx, cx, cy, r, dimmed ? "#e5e7eb" : hex, dimmed);
        } else {
          // paint 模式
          const userIdx = props.userCells[idx];
          const answerIdx = cells[y][x];

          if (userIdx == null) {
            // 空格：绘制浅色空圈
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = "#f1f5f9";
            ctx.fill();
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            const color = paletteMap.get(userIdx);
            const hex = color?.hex ?? "#cccccc";
            drawBead(ctx, cx, cy, r, hex, false);

            if (props.showErrors && userIdx !== answerIdx) {
              // 错色红框
              ctx.strokeStyle = "#ef4444";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
              ctx.stroke();
            } else if (userIdx === answerIdx) {
              // 正确：淡绿色对勾
              ctx.strokeStyle = "rgba(34,197,94,0.9)";
              ctx.lineWidth = Math.max(1.2, cellSize * 0.08);
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(cx - r * 0.35, cy + r * 0.05);
              ctx.lineTo(cx - r * 0.05, cy + r * 0.3);
              ctx.lineTo(cx + r * 0.4, cy - r * 0.25);
              ctx.stroke();
            }
          }
        }
      }
    }

    if (showCoordinates && cellSize >= 14) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${Math.max(8, cellSize * 0.35)}px ui-sans-serif, system-ui`;
      for (let x = 0; x < width; x += 5) {
        ctx.fillText(`${x + 1}`, x * cellSize + 2, cellSize * 0.4);
      }
      for (let y = 0; y < height; y += 5) {
        ctx.fillText(`${y + 1}`, 2, y * cellSize + cellSize * 0.4);
      }
    }
  }, [props, width, height, cells, paletteMap, cellSize, showCoordinates]);

  useEffect(() => {
    draw();
  }, [draw]);

  const posToIndex = (e: React.MouseEvent<HTMLCanvasElement>): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return y * width + x;
  };

  const handleDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (props.mode !== "paint") return;
    e.preventDefault();
    const idx = posToIndex(e);
    if (idx == null) return;

    const isErase = e.button === 2 || e.shiftKey || e.altKey;
    isDraggingRef.current = true;
    dragActionRef.current = isErase ? "erase" : "paint";
    lastIdxRef.current = idx;

    if (isErase) {
      props.onErase?.(idx);
    } else if (props.currentColorIndex != null) {
      props.onPaint?.(idx);
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (props.mode !== "paint") return;
    if (!isDraggingRef.current) return;
    const idx = posToIndex(e);
    if (idx == null || idx === lastIdxRef.current) return;
    lastIdxRef.current = idx;
    if (dragActionRef.current === "erase") {
      props.onErase?.(idx);
    } else if (props.currentColorIndex != null) {
      props.onPaint?.(idx);
    }
  };

  const handleUp = () => {
    isDraggingRef.current = false;
    dragActionRef.current = null;
    lastIdxRef.current = null;
  };

  const canInteract = props.mode === "paint";
  const cursor =
    !canInteract
      ? "default"
      : props.currentColorIndex == null
        ? "not-allowed"
        : "crosshair";

  return (
    <div className={cn("relative inline-block", className)}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onContextMenu={(e) => {
          if (props.mode === "paint") e.preventDefault();
        }}
        style={{ cursor }}
        className="select-none rounded-lg border border-slate-200 shadow-sm"
      />
    </div>
  );
}

function drawBead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hex: string,
  dimmed: boolean,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.strokeStyle = dimmed ? "#d1d5db" : "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 中心孔
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
}
