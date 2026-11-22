import type { NextConfig } from "next";

/**
 * 双模式构建：
 * - 默认：完整版（服务端 API / Playwright PDF / 文件存储）
 * - NEXT_PUBLIC_STATIC=1：GitHub Pages 静态演示版（客户端 localStorage + 浏览器打印 + AI 直连）
 */
const isStatic = process.env.NEXT_PUBLIC_STATIC === "1";

const nextConfig: NextConfig = {
  // 关闭开发模式右下角的 Next.js DevTools 悬浮徽章（生产环境本就不显示）
  devIndicators: false,
  ...(isStatic
    ? {
        output: "export" as const,
        basePath: "/resume-workshop",
        env: { NEXT_PUBLIC_BASE_PATH: "/resume-workshop" },
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
