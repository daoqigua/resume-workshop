import React from "react";
import type { ResumeData, ResumeSettings } from "@/lib/resume/schema";

/**
 * A4 页面容器 — 预览与打印共用，保证所见即所得。
 *
 * 尺寸基准：A4 = 210mm × 297mm = 794px × 1123px（96dpi）。
 * 预览：外层白纸 + 内层 padding(settings.pageMargin)，缩放由外层 scale 完成。
 * 打印（/print/[id]）：@page margin 提供页边距（每页都有），内容宽度 = 794 - 2*margin，
 *   与预览内层宽度一致，因此分页位置零偏差。
 */

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

export function contentWidth(pageMargin: number): number {
  return PAGE_WIDTH - pageMargin * 2;
}

/** 模板通用：字号阶梯（随 settings.fontSize 缩放） */
export function typeScale(fontSize: number) {
  return {
    h1: Math.round(fontSize * 1.6), // 姓名
    h2: Math.round(fontSize * 1.22), // 节标题
    h3: Math.round(fontSize * 1.0), // 条目标题
    body: fontSize,
    small: Math.round(fontSize * 0.85),
  };
}

export function fontFamilyCss(font: ResumeSettings["fontFamily"]): string {
  return font === "serif"
    ? `"Noto Serif SC", "Source Han Serif SC", serif`
    : `"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif`;
}

/** 打印路由用：注入 @page 规则（Playwright page.pdf 识别） */
export function PrintPageStyle({ pageMargin }: { pageMargin: number }) {
  const css = `@page { size: A4; margin: ${pageMargin}px; }
html, body { margin: 0; padding: 0; background: #fff; }
.resume-root { width: ${contentWidth(pageMargin)}px; }
.resume-item { break-inside: avoid; }
.resume-section-title { break-after: avoid; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/** 预览容器：白纸外观；zoom 缩放（布局尺寸同步缩放，无需手动算高度） */
export function PreviewPage({
  settings,
  children,
  scale = 1,
}: {
  settings: ResumeSettings;
  children: React.ReactNode;
  scale?: number;
}) {
  const innerW = contentWidth(settings.pageMargin);
  return (
    <div
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        zoom: scale,
        background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,.18)",
      }}
    >
      <div style={{ padding: settings.pageMargin }}>
        <div className="resume-root" style={{ width: innerW, fontSize: settings.fontSize }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 打印容器（/print 路由专用，不缩放、不投影） */
export function PrintPage({
  settings,
  children,
}: {
  settings: ResumeSettings;
  children: React.ReactNode;
}) {
  return (
    <div
      className="resume-root"
      style={{
        width: contentWidth(settings.pageMargin),
        fontSize: settings.fontSize,
        fontFamily: fontFamilyCss(settings.fontFamily),
        color: "#1f2328",
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

export type TemplateProps = {
  data: ResumeData;
  settings: ResumeSettings;
  /** 证件照 URL（含缓存穿透参数；空 = 不显示） */
  photoUrl?: string;
};

/**
 * 证件照：一寸照比例（25×35mm ≈ 96×132px @96dpi），右上角 float 排版。
 * float 位于正常内容流内，绘制顺序安全（遵守模板禁用 absolute 约束）。
 */
export function PhotoBox({ url }: { url?: string }) {
  if (!url) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt="证件照"
      style={{
        float: "right",
        width: 96,
        height: 132,
        objectFit: "cover",
        marginLeft: 14,
        borderRadius: 3,
        border: "1px solid #e5e7eb",
      }}
    />
  );
}

/** 清除 float（header 结束处调用，避免分隔线绕排） */
export function ClearFloat() {
  return <div style={{ clear: "both" }} />;
}
