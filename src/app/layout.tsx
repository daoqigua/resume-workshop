import type { Metadata } from "next";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "简历工坊 — 免费把简历改好",
  description:
    "免费在线简历编辑与修改平台：上传旧简历 AI 解析导入、实时预览、免费导出无水印 PDF、JD 对标优化。编辑与导出永远免费。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
