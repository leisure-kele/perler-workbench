import { extractShortUrl } from "./lib/douyin/resolver.ts";
const cases = [
  "8.97 x@s.rr gba:/ 09/11 万能拼豆公式！来啦！！  # 手工大神请支招# 宝藏生活家企",
  "8.97 xyz abc:/ 万能拼豆公式 https://v.douyin.com/ABC123/ 复制打开抖音",
  "复制打开抖音：https://v.douyin.com/iRxKN9o2/ 看这个",
  "https://www.douyin.com/video/7123456789012345678",
];
for (const s of cases) console.log(JSON.stringify({ in: s.slice(0, 40), out: extractShortUrl(s) }));
