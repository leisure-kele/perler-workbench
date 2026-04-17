/**
 * 抖音分享文本 → 可下载 mp4 URL。
 *
 * 流程：
 *   1. 从用户粘贴的分享文本中正则提取 `v.douyin.com/XXX` 短链
 *   2. iOS UA 访问短链，拿到 302 后的 iesdouyin 分享页
 *   3. 从页面 HTML 里嗅 `playAddr / play_addr / play_url` 里的 mp4 URL
 *
 * 抖音反爬随时会变，任一步失败都 throw 清晰错误让上层兜底。
 */

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

const SHORT_URL_RE = /https?:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/?/;

export interface DouyinVideoMeta {
  videoId: string;
  playUrl: string;
  title?: string;
  cover?: string;
}

export function extractShortUrl(text: string): string | null {
  const m = text.match(SHORT_URL_RE);
  return m ? m[0] : null;
}

export async function resolveDouyin(input: string): Promise<DouyinVideoMeta> {
  const shortUrl = extractShortUrl(input);
  if (!shortUrl) {
    throw new Error(
      "未在文本中找到 v.douyin.com 短链。请粘贴抖音 App「分享 → 复制链接」的完整文本。",
    );
  }

  // 1) 跟随短链跳转
  const redirectResp = await fetch(shortUrl, {
    method: "GET",
    headers: { "User-Agent": IOS_UA, Accept: "text/html" },
    redirect: "follow",
  });
  const finalUrl = redirectResp.url;
  const idMatch = finalUrl.match(/\/video\/(\d+)/) || finalUrl.match(/(\d{15,})/);
  if (!idMatch) {
    throw new Error(`抖音短链跳转后未找到视频 ID：${finalUrl}`);
  }
  const videoId = idMatch[1];

  // 短链跳转结果里很多情况直接是分享页，复用这个 html
  let html = await redirectResp.text();

  // 如果第一次跳转结果不像分享页，则再请求一次 iesdouyin
  if (!html.includes("playAddr") && !html.includes("play_addr") && !html.includes("play_url")) {
    const pageResp = await fetch(`https://www.iesdouyin.com/share/video/${videoId}/`, {
      headers: { "User-Agent": IOS_UA, Accept: "text/html" },
    });
    html = await pageResp.text();
  }

  const playUrl = sniffPlayUrl(html);
  if (!playUrl) {
    throw new Error(
      "抖音页面结构可能已变或需要登录 Cookie——未能提取 mp4 URL。请改用「上传成品图片」。",
    );
  }

  return {
    videoId,
    playUrl,
    title: sniffTitle(html),
    cover: sniffCover(html),
  };
}

function sniffPlayUrl(html: string): string | null {
  const patterns: RegExp[] = [
    /"playAddr":\s*\[\s*\{\s*"src":\s*"([^"]+)"/,
    /"play_addr":\s*\{[^}]*?"url_list":\s*\[\s*"([^"]+)"/,
    /"play_url":\s*\{[^}]*?"url_list":\s*\[\s*"([^"]+)"/,
    /"video":\s*\{[^}]*?"playAddr":\s*"([^"]+)"/,
    /"downloadAddr":\s*"([^"]+)"/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      let url = m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/");
      if (url.startsWith("//")) url = "https:" + url;
      // 抖音返回的 playwm=0（无水印）优先
      url = url.replace("/playwm/", "/play/");
      return url;
    }
  }
  return null;
}

function sniffTitle(html: string): string | undefined {
  const m =
    html.match(/"desc":\s*"([^"]{1,80})"/) || html.match(/<title>([^<]+)<\/title>/);
  return m ? m[1].trim() : undefined;
}

function sniffCover(html: string): string | undefined {
  const m =
    html.match(/"coverUrl":\s*"([^"]+)"/) ||
    html.match(/"cover":\s*\{[^}]*?"url_list":\s*\[\s*"([^"]+)"/);
  if (!m) return undefined;
  let url = m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  if (url.startsWith("//")) url = "https:" + url;
  return url;
}
