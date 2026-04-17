/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 避免 Next/webpack 把这些包打进 chunk —— ffmpeg-static 和 sharp 都依赖
    // 自身模块目录下的原生文件（二进制 / .node），打包后路径会指向 .next/server/vendor-chunks
    serverComponentsExternalPackages: ["ffmpeg-static", "sharp"],
  },
};

export default nextConfig;
