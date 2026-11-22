import { NextRequest, NextResponse } from "next/server";
import { parseResumeText } from "@/lib/parse/parser";
import { extractFileText } from "@/lib/parse/extract";
import { parseResumeWithAI } from "@/lib/ai/parseResume";
import { isAiConfigured } from "@/lib/ai/gateway";
import { createResume } from "@/lib/resume/store";
import type { ResumeData } from "@/lib/resume/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST multipart/form-data { file } → 解析导入（支持 PDF / Word .docx / TXT）
 * 可选 ?dry=1：仅解析不落库（测试 / 预览用）
 */
export async function POST(req: NextRequest) {
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
  }

  let text = "";
  try {
    text = await extractFileText(file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "文件解析失败" },
      { status: e instanceof Error && e.message.includes("超过") ? 413 : 415 },
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "文件中未提取到文本（PDF 可能是扫描图片版，图片版解析即将上线）" },
      { status: 422 },
    );
  }

  // AI 已配置时优先 LLM 解析（对乱序/无分节标题的第三方 PDF 最鲁棒），失败回退规则引擎
  // ?ai=0 可强制走规则引擎（调试 / 对比用）
  let result: { data: ResumeData; warnings: string[] } | null = null;
  let usedAI = false;
  const aiEnabled = req.nextUrl.searchParams.get("ai") !== "0" && (await isAiConfigured());
  if (aiEnabled) {
    const aiData = await parseResumeWithAI(text);
    if (aiData) {
      result = { data: aiData, warnings: ["AI 解析完成，请核对各字段"] };
      usedAI = true;
    }
  }
  if (!result) {
    result = parseResumeText(text);
  }

  if (dry) {
    return NextResponse.json({ ...result, dry: true, ai: usedAI });
  }

  const doc = await createResume({
    title: `${result.data.basics.name || "导入"}的简历`,
    data: result.data,
  });
  return NextResponse.json({ ...doc, warnings: result.warnings }, { status: 201 });
}
