"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnonymousUserId } from "@/lib/user-id";
import { cn } from "@/lib/utils";
import { FramePicker, type FrameOption } from "./FramePicker";
import { BBoxPicker, type NormBBox } from "./BBoxPicker";

type Stage =
  | "idle"
  | "fetching"
  | "choose-frame"
  | "choose-bbox"
  | "generating"
  | "done"
  | "error";

const STAGE_TEXT: Record<Stage, string> = {
  idle: "",
  fetching: "解析链接 + 抽取候选帧…",
  "choose-frame": "选一张最像成品的帧",
  "choose-bbox": "框出成品范围（可选）",
  generating: "AI 识别 + 量化色号…",
  done: "生成完成！",
  error: "出错了",
};

export function IngestForm() {
  const router = useRouter();
  const [douyinUrl, setDouyinUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<number | "">("");
  const fileRef = useRef<HTMLInputElement>(null);

  // 多步向导状态
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bbox, setBbox] = useState<NormBBox | null>(null);
  const [rotation, setRotation] = useState(0);

  const busy =
    stage === "fetching" || stage === "generating";

  const selectedFrame = useMemo(
    () => frames.find((f) => f.index === selectedIndex) ?? null,
    [frames, selectedIndex],
  );

  function resetAll() {
    setSessionId(null);
    setFrames([]);
    setSelectedIndex(null);
    setBbox(null);
    setRotation(0);
    setErrorMsg(null);
    setStage("idle");
  }

  async function postCandidates(form: FormData) {
    setErrorMsg(null);
    setStage("fetching");
    try {
      const res = await fetch("/api/ingest/candidates", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrorMsg(j.error ?? "抽帧失败");
        setStage("error");
        return;
      }
      const data = (await res.json()) as {
        sessionId: string;
        frames: FrameOption[];
      };
      setSessionId(data.sessionId);
      setFrames(data.frames);
      setSelectedIndex(data.frames[0]?.index ?? null);
      setBbox(null);
      setStage("choose-frame");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "网络错误");
      setStage("error");
    }
  }

  async function handleDouyin() {
    if (!douyinUrl.trim()) return;
    const form = new FormData();
    form.append("douyinUrl", douyinUrl.trim());
    await postCandidates(form);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      const form = new FormData();
      form.append("image", f);
      postCandidates(form);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      const form = new FormData();
      form.append("image", f);
      postCandidates(form);
    }
  }

  async function handleFinalize() {
    if (!sessionId || selectedIndex == null) return;
    setStage("generating");
    setErrorMsg(null);
    try {
      const ownerId = getAnonymousUserId();
      const res = await fetch("/api/ingest/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          frameIndex: selectedIndex,
          bbox: bbox ?? undefined,
          rotationDegrees: rotation,
          gridWidth: gridSize && Number(gridSize) >= 4 ? Number(gridSize) : undefined,
          gridHeight: gridSize && Number(gridSize) >= 4 ? Number(gridSize) : undefined,
          ownerId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrorMsg(j.error ?? "生成失败");
        setStage("error");
        return;
      }
      const data = (await res.json()) as { patternId: string };
      setStage("done");
      setTimeout(() => router.push(`/play/${data.patternId}`), 400);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "网络错误");
      setStage("error");
    }
  }

  // === 渲染 ===

  if (stage === "choose-frame" || stage === "choose-bbox" || stage === "generating") {
    return (
      <div className="space-y-5">
        <StepBar current={stage === "choose-frame" ? 1 : stage === "choose-bbox" ? 2 : 3} />

        {stage === "choose-frame" && (
          <>
            <FramePicker
              frames={frames}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
            <div className="flex justify-between">
              <button
                onClick={resetAll}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                重新开始
              </button>
              <button
                onClick={() => setStage("choose-bbox")}
                disabled={selectedIndex == null}
                className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                用这一帧 →
              </button>
            </div>
          </>
        )}

        {stage === "choose-bbox" && selectedFrame && (
          <>
            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <BBoxPicker
                imageUrl={selectedFrame.thumbnail}
                rotationDegrees={rotation}
                value={bbox}
                onChange={setBbox}
              />
              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-700">旋转图像</p>
                    <button
                      onClick={() => setRotation(0)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      归零
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={0.5}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>-45°</span>
                    <span className="tabular-nums font-mono text-slate-700">
                      {rotation.toFixed(1)}°
                    </span>
                    <span>+45°</span>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-slate-700">可选：网格尺寸</p>
                  <input
                    type="number"
                    min={4}
                    max={120}
                    value={gridSize}
                    onChange={(e) => setGridSize(e.target.value ? Number(e.target.value) : "")}
                    placeholder="AI 自动估计"
                    className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-emerald-400"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    如 32 表示 32×32 格；留空由 AI 看图估算。
                  </p>
                </div>

                {bbox && (
                  <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-800">
                    已框定 {Math.round(bbox.w * 100)}% × {Math.round(bbox.h * 100)}% 区域
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStage("choose-frame")}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                ← 换一帧
              </button>
              <button
                onClick={handleFinalize}
                className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                生成图纸 →
              </button>
            </div>
          </>
        )}

        {stage === "generating" && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-6 text-center text-sm text-sky-800">
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            {STAGE_TEXT.generating}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-700">粘贴抖音视频链接</label>
        <div className="mt-2 flex gap-2">
          <input
            value={douyinUrl}
            onChange={(e) => setDouyinUrl(e.target.value)}
            placeholder="https://v.douyin.com/xxxxx/"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            disabled={busy}
          />
          <button
            onClick={handleDouyin}
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "处理中…" : "识别"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          粘贴抖音 App 「分享 → 复制链接」的完整文本。会抽取 10 张候选帧让你挑最像成品的那张。
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !busy && fileRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed bg-gradient-to-br from-slate-50 to-white p-8 text-center transition",
          busy
            ? "pointer-events-none opacity-60"
            : "border-slate-300 hover:border-emerald-400",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <div className="text-4xl">📷</div>
        <p className="mt-2 text-sm font-medium text-slate-700">
          上传一张拼豆成品图片（或拖到这里）
        </p>
        <p className="mt-1 text-xs text-slate-400">
          JPG / PNG / WebP —— 上传后可手动框选成品区域再量化
        </p>
      </div>

      {(stage === "fetching" || stage === "error" || stage === "done") && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            stage === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : stage === "done"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-sky-200 bg-sky-50 text-sky-800",
          )}
        >
          <div className="flex items-center gap-2">
            {stage === "fetching" && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            )}
            <span className="font-medium">{STAGE_TEXT[stage]}</span>
            {errorMsg && <span>· {errorMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["选帧", "框选范围", "生成图纸"];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((t, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={t} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                active
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-400",
              )}
            >
              {n}
            </span>
            <span className={cn(active ? "font-medium text-slate-700" : "text-slate-400")}>
              {t}
            </span>
            {n < 3 && <span className="text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
