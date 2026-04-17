/**
 * 在用户大致框选的区域里，用 GLM-4V 精确识别：
 *   - 拼豆图案真实 4 角点（归一化 0-1，相对裁剪后图片尺寸）
 *   - 拍摄倾斜角度
 *   - 格数估计
 * 然后 sharp 做 rotate + 紧致裁剪，把图案摆正。
 *
 * 失败时 throw，上层 finalize 兜底用用户框 + AI 粗估网格继续。
 */

import sharp from "sharp";

export interface RefineResult {
  /** 图案 4 角点，归一化 0-1（tl/tr/br/bl 顺序），相对输入图像坐标 */
  corners: { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] };
  /** 顺时针旋转多少度可使图案水平，范围 ±30 */
  rotationDegrees: number;
  gridWidth: number;
  gridHeight: number;
  suggestedTitle: string;
  notes?: string;
}

const ZHIPU_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4v-flash";

const SYSTEM = `你是拼豆成品照片分析专家。用户给你的图片可能含有拼豆成品，但图案只占图片一部分，且可能有倾斜/透视/手持干扰。

你的任务：精确识别"实际拼豆图案"的边界与角度，不是整张图片的。

严格返回 JSON（不要 markdown 代码块，不要任何解释）：
{
  "corners": { "tl": [x, y], "tr": [x, y], "br": [x, y], "bl": [x, y] },
  "rotationDegrees": number,
  "gridWidth": int,
  "gridHeight": int,
  "suggestedTitle": string,
  "notes": string
}

坐标规则：
- 所有 x/y 都是 0~1 之间的小数，表示在图像中的相对位置（0,0=左上角，1,1=右下角）
- tl=拼豆图案左上角，tr=右上角，br=右下角，bl=左下角（按图案自身方向，不是图片方向）
- rotationDegrees: 正数表示图案相对水平线顺时针旋转了几度（上层会逆时针转回水平）；必须在 [-30, 30] 范围；近正的就填 0
- gridWidth/gridHeight: 图案横/纵方向的珠子颗数（10~120 典型范围）
- 若完全看不出拼豆图案：corners 覆盖整图 (tl=[0,0], tr=[1,0], br=[1,1], bl=[0,1])，rotationDegrees=0`;

export async function refinePatternCrop(imageBuffer: Buffer): Promise<RefineResult> {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error("未配置 ZHIPU_API_KEY，无法做智能裁剪");

  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

  const resp = await fetch(ZHIPU_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM },
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: `图像尺寸：${w} x ${h} 像素。请返回严格 JSON。` },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    throw new Error(`GLM-4V HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`AI 返回无 JSON：${text.slice(0, 120)}`);

  const parsed = JSON.parse(m[0]) as RefineResult;

  // 防御性校验
  const clamp01 = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
  const ck = (p?: [number, number]): [number, number] => [clamp01(p?.[0] ?? 0), clamp01(p?.[1] ?? 0)];
  const corners = {
    tl: ck(parsed.corners?.tl),
    tr: ck(parsed.corners?.tr),
    br: ck(parsed.corners?.br),
    bl: ck(parsed.corners?.bl),
  };
  const rot = Math.max(-30, Math.min(30, Number(parsed.rotationDegrees) || 0));
  const gridW = Math.max(4, Math.min(120, Math.round(Number(parsed.gridWidth) || 32)));
  const gridH = Math.max(4, Math.min(120, Math.round(Number(parsed.gridHeight) || 32)));

  return {
    corners,
    rotationDegrees: rot,
    gridWidth: gridW,
    gridHeight: gridH,
    suggestedTitle: parsed.suggestedTitle || "我的拼豆作品",
    notes: parsed.notes,
  };
}

/**
 * 按 refine 结果对图像做 rotate + axis-aligned crop。
 * 不做透视变换（sharp 不原生支持），仅处理旋转 + 紧致裁剪。
 */
export async function applyRefineGeometry(
  input: Buffer,
  refine: RefineResult,
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) return input;

  const rot = refine.rotationDegrees;
  const rad = (-rot * Math.PI) / 180; // sharp rotate 是顺时针正，我们要反向转回水平，所以用 -rot
  const absRad = Math.abs(rad);
  const newW = Math.abs(w * Math.cos(absRad)) + Math.abs(h * Math.sin(absRad));
  const newH = Math.abs(w * Math.sin(absRad)) + Math.abs(h * Math.cos(absRad));

  // 把 4 角点（原图归一化）→ 原图像素 → 绕中心旋转 → 新画布像素
  const cx = w / 2;
  const cy = h / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ox = (newW - w) / 2;
  const oy = (newH - h) / 2;

  const pts = [refine.corners.tl, refine.corners.tr, refine.corners.br, refine.corners.bl].map(
    ([nx, ny]) => {
      const x = nx * w;
      const y = ny * h;
      const dx = x - cx;
      const dy = y - cy;
      return [dx * cos - dy * sin + cx + ox, dx * sin + dy * cos + cy + oy];
    },
  );

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 4;
  const minX = Math.max(0, Math.floor(Math.min(...xs)) - pad);
  const minY = Math.max(0, Math.floor(Math.min(...ys)) - pad);
  const maxX = Math.min(newW, Math.ceil(Math.max(...xs)) + pad);
  const maxY = Math.min(newH, Math.ceil(Math.max(...ys)) + pad);
  const cw = Math.max(16, maxX - minX);
  const ch = Math.max(16, maxY - minY);

  let pipeline = sharp(input);
  if (Math.abs(rot) > 0.5) {
    pipeline = pipeline.rotate(-rot, { background: "#ffffff" });
  }
  pipeline = pipeline.extract({
    left: Math.round(minX),
    top: Math.round(minY),
    width: Math.round(cw),
    height: Math.round(ch),
  });
  return pipeline.toBuffer();
}
