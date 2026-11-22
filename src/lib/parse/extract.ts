/**
 * 上传文件 → 纯文本提取。支持：PDF（unpdf）、Word .docx（mammoth）、.txt。
 * 注意：旧版二进制 .doc 不支持，前端会提示转换。
 */
import { getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB / 文件

/**
 * PDF → 按视觉顺序重建的文本。
 * 很多简历生成器导出的 PDF「内容流顺序 ≠ 视觉顺序」（绝对定位元素被排到最后），
 * 直接按流序解析会全乱。用 pdf.js 文本项坐标：按 y 分行（容差内合并）、行内按 x 排序。
 */
export async function extractPdfText(buf: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buf);
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    type Item = { x: number; y: number; str: string };
    const items: Item[] = [];
    for (const it of tc.items as unknown[]) {
      const t = it as { str?: string; transform?: number[] };
      if (typeof t.str === "string" && t.str.trim() && Array.isArray(t.transform)) {
        items.push({ x: t.transform[4], y: t.transform[5], str: t.str });
      }
    }
    // 按 y 聚行（容差 3pt）
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Item[][] = [];
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r[0].y - it.y) <= 3);
      if (row) row.push(it);
      else rows.push([it]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      // 拼接：相邻片段间距大则补空格，避免词粘连
      let line = "";
      let prevEnd = -Infinity;
      for (const it of row) {
        if (line && it.x - prevEnd > 12) line += " ";
        line += it.str;
        prevEnd = it.x + it.str.length * 5.5; // 粗略估计片段结束位置
      }
      const cleaned = line.trim();
      if (cleaned) lines.push(cleaned);
    }
  }
  return lines.join("\n");
}

export async function extractFileText(file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error(`「${file.name}」超过 10MB 限制`);
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(buf);
  }
  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return result.value;
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return Buffer.from(buf).toString("utf8");
  }
  throw new Error(
    `「${file.name}」格式暂不支持（支持 PDF / Word .docx / TXT）。旧版 .doc 请先另存为 .docx`,
  );
}
