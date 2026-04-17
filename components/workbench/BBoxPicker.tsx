"use client";

import { useEffect, useRef, useState } from "react";

export interface NormBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  imageUrl: string;
  rotationDegrees: number; // 顺时针旋转，[-45, 45]
  value: NormBBox | null;
  onChange: (bbox: NormBBox | null) => void;
}

/**
 * Canvas-based bbox picker：先把图像按 rotationDegrees 渲染到 canvas，
 * 用户在旋转后的视图上拖矩形。bbox 直接相对 canvas 归一化，后端走 sharp.rotate + extract 即可匹配。
 */
export function BBoxPicker({ imageUrl, rotationDegrees, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [drag, setDrag] = useState<{ x0: number; y0: number } | null>(null);

  // 加载一次原图
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // rotation 或 value 变时重绘
  useEffect(() => {
    if (!ready || !imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const rad = (rotationDegrees * Math.PI) / 180;
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const absRad = Math.abs(rad);
    const nw = sw * Math.cos(absRad) + sh * Math.sin(absRad);
    const nh = sw * Math.sin(absRad) + sh * Math.cos(absRad);
    canvas.width = Math.round(nw);
    canvas.height = Math.round(nh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -sw / 2, -sh / 2);
    ctx.restore();
    if (value && value.w > 0 && value.h > 0) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.fillRect(
        value.x * canvas.width,
        value.y * canvas.height,
        value.w * canvas.width,
        value.h * canvas.height,
      );
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        value.x * canvas.width,
        value.y * canvas.height,
        value.w * canvas.width,
        value.h * canvas.height,
      );
    }
  }, [ready, rotationDegrees, value]);

  function eventToNorm(e: React.PointerEvent): { x: number; y: number } | null {
    const c = canvasRef.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }

  function onDown(e: React.PointerEvent) {
    const p = eventToNorm(e);
    if (!p) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ x0: p.x, y0: p.y });
    onChange({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = eventToNorm(e);
    if (!p) return;
    onChange({
      x: Math.min(drag.x0, p.x),
      y: Math.min(drag.y0, p.y),
      w: Math.abs(p.x - drag.x0),
      h: Math.abs(p.y - drag.y0),
    });
  }
  function onUp() {
    setDrag(null);
    if (value && (value.w < 0.03 || value.h < 0.03)) onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="block w-full select-none touch-none"
          style={{ cursor: "crosshair" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>拖矩形圈出拼豆图案；用滑块转正图片</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
        >
          清除框
        </button>
      </div>
    </div>
  );
}
