import { NextRequest, NextResponse } from "next/server";
import { generateResume } from "@/lib/ai/generate";
import { extractFileText } from "@/lib/parse/extract";
import { createResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST multipart/form-data { description, files?[] } → AI 生成简历并落库
 * 返回 { id, ai, notes }
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const description = String(form.get("description") ?? "").trim();
  if (!description && !form.get("file")) {
    return NextResponse.json(
      { error: "请填写你的个人情况描述，或上传辅助资料" },
      { status: 400 },
    );
  }

  // 收集上传辅助资料（多文件），逐个提取文本
  const materials: { name: string; text: string }[] = [];
  const errors: string[] = [];
  for (const entry of form.getAll("file")) {
    if (!(entry instanceof File)) continue;
    try {
      const text = await extractFileText(entry);
      if (text.trim()) materials.push({ name: entry.name, text: text.trim() });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const result = await generateResume({
    description,
    materials,
  });

  const doc = await createResume({
    title: `${result.data.basics.name || "AI"}的简历`,
    data: result.data,
  });

  return NextResponse.json(
    { id: doc.id, ai: result.ai, notes: [...result.notes, ...errors] },
    { status: 201 },
  );
}
