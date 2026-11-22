import React from "react";

/**
 * 轻量富文本：仅支持 **加粗** 标记。
 * 编辑器用 textarea 输入（**文字**），模板渲染时转为 <strong>。
 * React 文本节点自动转义，无 XSS 风险。
 */
export function parseBold(text: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}

export function RichText({ text }: { text: string }) {
  const parts = parseBold(text);
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? <strong key={i}>{p.text}</strong> : <React.Fragment key={i}>{p.text}</React.Fragment>,
      )}
    </>
  );
}

/** 去掉列表符号前缀（• · - ● ▪ 等），导入解析时用 */
export function stripBulletPrefix(line: string): string {
  return line.replace(/^\s*[•·●▪◦◦‣⁃*\-–—>＞✦✧]+\s*/, "").trim();
}
