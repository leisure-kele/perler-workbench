/**
 * 抖音解析两步法的中转：第一步抽出的候选帧保留在服务端，第二步只靠 sessionId 回取。
 * 纯内存 Map，30 分钟 TTL。Next dev HMR 会丢失——这是演示/单机使用场景可接受的取舍。
 */

import { nanoid } from "nanoid";

export interface CandidateFrame {
  /** 完整帧 JPG buffer（用于后续裁剪） */
  full: Buffer;
  /** 缩略图 JPG buffer（返回前端展示） */
  thumb: Buffer;
  /** 启发式"成品特征"得分，越大越像成品 */
  score: number;
  /** 帧原始宽高（前端 bbox 换算用） */
  width: number;
  height: number;
}

interface Session {
  frames: CandidateFrame[];
  sourceType: "douyin" | "upload";
  sourceUrl: string | null;
  title?: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, Session>();

function gc() {
  const now = Date.now();
  store.forEach((v, k) => {
    if (now - v.createdAt > TTL_MS) store.delete(k);
  });
}

export function createSession(
  frames: CandidateFrame[],
  sourceType: Session["sourceType"],
  sourceUrl: string | null,
  title?: string,
): string {
  gc();
  const id = nanoid(12);
  store.set(id, { frames, sourceType, sourceUrl, title, createdAt: Date.now() });
  return id;
}

export function getSession(id: string): Session | undefined {
  gc();
  return store.get(id);
}

export function dropSession(id: string) {
  store.delete(id);
}
