/**
 * DOCX 导出（M2）：ResumeData → Word 文件。
 * 国内 HR 常要求 Word 格式；用 docx 库生成，宋体/黑体标准样式，ATS 可读。
 */
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeData, ResumeSettings } from "@/lib/resume/schema";
import { SECTION_LABELS } from "@/lib/resume/schema";
import { parseBold } from "@/components/templates/RichText";

const FONT = "宋体";
const FONT_HEI = "黑体";

/** 文本段：支持 **加粗** 标记 */
function runs(text: string, opts: { size?: number; bold?: boolean; color?: string } = {}) {
  return parseBold(text).map(
    (p) =>
      new TextRun({
        text: p.text,
        bold: p.bold || opts.bold,
        size: opts.size ?? 21, // 10.5pt
        color: opts.color,
        font: p.bold || opts.bold ? FONT_HEI : FONT,
      }),
  );
}

function sectionTitle(text: string, color: string) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text, bold: true, size: 26, color, font: FONT_HEI }),
    ],
    border: { bottom: { style: "single", size: 6, color } },
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: runs(text),
  });
}

export async function buildDocx(
  data: ResumeData,
  settings: ResumeSettings,
  /** 证件照（可选）：随 Word 导出，右对齐置于姓名上方 */
  photo?: { buf: Buffer; ext: string },
): Promise<Buffer> {
  const color = settings.themeColor.replace("#", "").toUpperCase() || "2F5AA8";
  const b = data.basics;
  const children: Paragraph[] = [];

  // 证件照（Word 段落右对齐近似 PDF 右上角排版）
  if (photo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            type: photo.ext === ".png" ? "png" : "jpg",
            data: photo.buf,
            transformation: { width: 96, height: 132 },
          }),
        ],
      }),
    );
  }

  // 姓名 + 意向 + 联系方式
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: b.name || "简历", bold: true, size: 44, font: FONT_HEI })],
    }),
  );
  if (b.headline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: runs(b.headline, { size: 24, color }),
      }),
    );
  }
  const contact = [b.phone, b.email, b.location, b.website].filter(Boolean).join("  |  ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 18, color: "595959", font: FONT })],
      }),
    );
  }

  if (b.summary) {
    children.push(sectionTitle("个人简介", color));
    children.push(new Paragraph({ children: runs(b.summary) }));
  }

  const range = (r: { start: string; end: string }) =>
    [r.start, r.end].filter(Boolean).join(" – ");

  if (data.education.length) {
    children.push(sectionTitle("教育背景", color));
    for (const e of data.education) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: e.school, bold: true, size: 22, font: FONT_HEI }),
            new TextRun({
              text: `　${[e.degree, e.major].filter(Boolean).join(" · ")}`,
              size: 21,
              font: FONT,
            }),
            new TextRun({ text: `　${range(e.range)}`, size: 18, color: "595959", font: FONT }),
          ],
        }),
      );
      if (e.note) children.push(new Paragraph({ children: runs(e.note) }));
      for (const h of e.highlights) children.push(bullet(h));
    }
  }

  if (data.experience.length) {
    children.push(sectionTitle(SECTION_LABELS.experience, color));
    for (const x of data.experience) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: x.company, bold: true, size: 22, font: FONT_HEI }),
            new TextRun({ text: x.position ? `　${x.position}` : "", size: 21, color, font: FONT }),
            new TextRun({
              text: `　${range(x.range)}${x.location ? " · " + x.location : ""}`,
              size: 18,
              color: "595959",
              font: FONT,
            }),
          ],
        }),
      );
      for (const bl of x.bullets) children.push(bullet(bl));
    }
  }

  if (data.projects.length) {
    children.push(sectionTitle(SECTION_LABELS.projects, color));
    for (const p of data.projects) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: p.name, bold: true, size: 22, font: FONT_HEI }),
            new TextRun({ text: p.role ? `　${p.role}` : "", size: 21, color, font: FONT }),
            new TextRun({ text: `　${range(p.range)}`, size: 18, color: "595959", font: FONT }),
          ],
        }),
      );
      for (const bl of p.bullets) children.push(bullet(bl));
    }
  }

  if (data.skills.length) {
    children.push(sectionTitle(SECTION_LABELS.skills, color));
    children.push(
      new Paragraph({
        children: runs(data.skills.map((s) => (s.detail ? `${s.name}（${s.detail}）` : s.name)).join("；")),
      }),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
