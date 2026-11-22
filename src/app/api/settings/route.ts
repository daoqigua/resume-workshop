import { NextRequest, NextResponse } from "next/server";
import { getAiSettingsView, saveAiSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → 当前 AI 配置视图（key 掩码） */
export async function GET() {
  return NextResponse.json(await getAiSettingsView());
}

/** PUT { aiBaseUrl?, aiApiKey?, aiModel? } → 保存（key 留空 = 保留原值） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const patch: { aiBaseUrl?: string; aiApiKey?: string; aiModel?: string } = {};
  if (typeof body.aiBaseUrl === "string") patch.aiBaseUrl = body.aiBaseUrl;
  if (typeof body.aiModel === "string") patch.aiModel = body.aiModel;
  // 空字符串 = 不修改已保存的 key；非空 = 覆盖
  if (typeof body.aiApiKey === "string" && body.aiApiKey.trim()) {
    patch.aiApiKey = body.aiApiKey;
  }
  return NextResponse.json(await saveAiSettings(patch));
}
