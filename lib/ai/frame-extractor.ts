/**
 * 视频帧抽取：ffmpeg-static 二进制 → 均匀抽 N 张 JPG。
 * 不写入仓库，只在 OS 临时目录落盘后立刻清理。
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";

function runFfmpeg(
  bin: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.stdout.on("data", (d) => (stdout += d.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stderr, stdout });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: stderr + "\n" + e.message, stdout });
    });
  });
}

const DOUYIN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  Referer: "https://www.iesdouyin.com/",
};

export async function downloadVideo(url: string): Promise<Buffer> {
  const resp = await fetch(url, { headers: DOUYIN_HEADERS, redirect: "follow" });
  if (!resp.ok) {
    throw new Error(`视频下载失败 HTTP ${resp.status}`);
  }
  const contentType = resp.headers.get("content-type") ?? "";
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.byteLength < 10_000) {
    throw new Error(`视频数据过小 (${buf.byteLength}B, content-type=${contentType})——反爬返回了错误页`);
  }
  // mp4 容器头：'ftyp' 出现在前 64 字节；抖音有时会回 HTML/JSON 反爬
  const head = buf.subarray(0, 64).toString("ascii");
  if (!head.includes("ftyp") && !head.includes("moov") && !contentType.includes("video")) {
    const preview = buf.subarray(0, 200).toString("utf8").replace(/\s+/g, " ");
    throw new Error(
      `下载到的不是视频（content-type=${contentType}），片段预览：${preview.slice(0, 120)}`,
    );
  }
  return buf;
}

/**
 * 均匀覆盖整段视频抽 count 帧。
 * 先用 fps=1 抽最多 60 帧（覆盖 1 分钟视频），再等距采样到 count 张。
 * 返回的 Buffer 为 JPG。
 */
export async function extractFramesEvenly(
  videoBuffer: Buffer,
  count = 10,
): Promise<Buffer[]> {
  const raw = await extractFramesRaw(videoBuffer, 60);
  if (raw.length <= count) return raw;
  const picked: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (raw.length - 1)) / (count - 1));
    picked.push(raw[idx]);
  }
  return picked;
}

export async function extractFrames(
  videoBuffer: Buffer,
  count = 5,
): Promise<Buffer[]> {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  if (!ffmpegPath) throw new Error("ffmpeg-static 未提供可用二进制");

  const workDir = path.join(tmpdir(), `perler-${nanoid(8)}`);
  await mkdir(workDir, { recursive: true });

  try {
    const inPath = path.join(workDir, "in.mp4");
    await writeFile(inPath, videoBuffer);
    const sizeMB = (videoBuffer.byteLength / 1024 / 1024).toFixed(2);
    const magic = videoBuffer.subarray(0, 16).toString("hex");

    const outPattern = path.join(workDir, "frame-%03d.jpg");
    const result = await runFfmpeg(
      ffmpegPath,
      [
        "-y",
        "-hide_banner",
        "-i",
        inPath,
        "-vf",
        "fps=1/2,scale=960:-1",
        "-vframes",
        String(count),
        "-q:v",
        "3",
        outPattern,
      ],
      45_000,
    );
    if (result.code !== 0) {
      const tail = (s: string) => s.trim().split(/\r?\n/).slice(-20).join(" | ");
      throw new Error(
        `ffmpeg 抽帧失败 (exit=${result.code}, size=${sizeMB}MB, head=${magic}): ${tail(result.stderr).slice(0, 500)}`,
      );
    }

    const files = (await readdir(workDir))
      .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
      .sort();

    if (files.length === 0) {
      throw new Error("ffmpeg 未抽取到任何帧——视频可能损坏或不支持");
    }

    const buffers: Buffer[] = [];
    for (const f of files) {
      buffers.push(await readFile(path.join(workDir, f)));
    }
    return buffers;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 简单启发式：挑最中间一帧作为"成品展示帧"。
 * 抖音拼豆视频常见结构：开头教程 → 中段铺豆 → 结尾成品特写，
 * 中间帧最有可能是半成品或完成品；退而求其次也比首尾黑屏强。
 */
export function pickFrameForAnalysis(frames: Buffer[]): Buffer {
  if (frames.length === 0) throw new Error("没有可用帧");
  return frames[Math.floor(frames.length / 2)];
}

/** 内部使用：抽最多 maxFrames 张，每秒 1 帧。 */
async function extractFramesRaw(videoBuffer: Buffer, maxFrames: number): Promise<Buffer[]> {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  if (!ffmpegPath) throw new Error("ffmpeg-static 未提供可用二进制");

  const workDir = path.join(tmpdir(), `perler-${nanoid(8)}`);
  await mkdir(workDir, { recursive: true });

  try {
    const inPath = path.join(workDir, "in.mp4");
    await writeFile(inPath, videoBuffer);
    const sizeMB = (videoBuffer.byteLength / 1024 / 1024).toFixed(2);
    const magic = videoBuffer.subarray(0, 16).toString("hex");

    const outPattern = path.join(workDir, "frame-%03d.jpg");
    const result = await runFfmpeg(
      ffmpegPath,
      [
        "-y",
        "-hide_banner",
        "-i",
        inPath,
        "-vf",
        "fps=1,scale=960:-1",
        "-vframes",
        String(maxFrames),
        "-q:v",
        "4",
        outPattern,
      ],
      60_000,
    );
    if (result.code !== 0) {
      const tail = (s: string) => s.trim().split(/\r?\n/).slice(-20).join(" | ");
      throw new Error(
        `ffmpeg 抽帧失败 (exit=${result.code}, size=${sizeMB}MB, head=${magic}): ${tail(result.stderr).slice(0, 500)}`,
      );
    }
    const files = (await readdir(workDir))
      .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
      .sort();
    if (files.length === 0) {
      throw new Error("ffmpeg 未抽取到任何帧——视频可能损坏或不支持");
    }
    const buffers: Buffer[] = [];
    for (const f of files) buffers.push(await readFile(path.join(workDir, f)));
    return buffers;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
