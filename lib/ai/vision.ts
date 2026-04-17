/**
 * 使用智谱 GLM-4V-Flash 进行拼豆成品识别（OpenAI 兼容接口）。
 * 免费无限量：https://bigmodel.cn
 * 无 ZHIPU_API_KEY 时走启发式兜底（默认 32x32 网格）。
 */

export interface PatternAnalysis {
  bbox: { x: number; y: number; w: number; h: number };
  gridWidth: number;
  gridHeight: number;
  suggestedTitle: string;
  notes?: string;
}

const SYSTEM_PROMPT = `你是一位拼豆（Perler Beads）作品分析专家。用户会上传一张拼豆成品照片或视频截图。
你的任务是识别成品区域并估计拼豆网格的宽高（以珠子数计）。

严格返回 JSON，不要任何额外文字或 markdown 代码块：
{
  "bbox": {"x": int, "y": int, "w": int, "h": int},
  "gridWidth": int,
  "gridHeight": int,
  "suggestedTitle": string,
  "notes": string
}

字段说明：
- bbox: 成品在图中的像素位置（左上角 x, y 和宽高 w, h）
- gridWidth/gridHeight: 横向/纵向可见的珠子格数（单颗珠为一格）
- suggestedTitle: 根据题材起一个简短中文名，如"皮卡丘"、"小樱花"、"卡通猫"
- notes: 可选，需要提醒用户的注意事项

估算参考：常见拼豆作品网格 14x14、20x20、24x24、29x29、50x50；超过 80x80 较少。
若图像非拼豆作品，bbox 覆盖整图，gridWidth/gridHeight 返回 32x32 作为默认像素化粒度。`;

const ZHIPU_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4v-flash";

export async function analyzePatternImage(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
): Promise<PatternAnalysis> {
  const dims = await getImageDims(imageBuffer);
  const apiKey = process.env.ZHIPU_API_KEY;

  if (!apiKey) {
    return {
      bbox: { x: 0, y: 0, w: dims.width, h: dims.height },
      gridWidth: 32,
      gridHeight: 32,
      suggestedTitle: "我的拼豆作品",
      notes: "未配置 ZHIPU_API_KEY，已使用默认 32x32 网格；可在上传表单手动指定网格大小。",
    };
  }

  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  let text = "";
  try {
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
              { type: "text", text: SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text: `图像实际尺寸：${dims.width} x ${dims.height} 像素。请分析并返回严格 JSON。`,
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`GLM-4V HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    text = data.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      bbox: { x: 0, y: 0, w: dims.width, h: dims.height },
      gridWidth: 32,
      gridHeight: 32,
      suggestedTitle: "我的拼豆作品",
      notes: `AI 调用失败，已回退默认网格：${msg}`,
    };
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      bbox: { x: 0, y: 0, w: dims.width, h: dims.height },
      gridWidth: 32,
      gridHeight: 32,
      suggestedTitle: "我的拼豆作品",
      notes: "AI 返回解析失败，已回退到默认网格。",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const bbox = parsed.bbox ?? { x: 0, y: 0, w: dims.width, h: dims.height };
    return {
      bbox: {
        x: clamp(bbox.x ?? 0, 0, dims.width),
        y: clamp(bbox.y ?? 0, 0, dims.height),
        w: clamp(bbox.w ?? dims.width, 1, dims.width),
        h: clamp(bbox.h ?? dims.height, 1, dims.height),
      },
      gridWidth: clamp(parsed.gridWidth ?? 32, 4, 120),
      gridHeight: clamp(parsed.gridHeight ?? 32, 4, 120),
      suggestedTitle: parsed.suggestedTitle ?? "我的拼豆作品",
      notes: parsed.notes,
    };
  } catch {
    return {
      bbox: { x: 0, y: 0, w: dims.width, h: dims.height },
      gridWidth: 32,
      gridHeight: 32,
      suggestedTitle: "我的拼豆作品",
      notes: "AI 返回 JSON 解析失败，已使用默认网格。",
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

async function getImageDims(buf: Buffer): Promise<{ width: number; height: number }> {
  const { default: sharp } = await import("sharp");
  const meta = await sharp(buf).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}
