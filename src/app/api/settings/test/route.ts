import { NextRequest, NextResponse } from "next/server";
import { chatJSON } from "@/lib/ai/gateway";
import type { AiSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { aiBaseUrl, aiApiKey, aiModel } → 用该配置试连一次模型。
 * 留空 aiApiKey 时使用已生效配置（用于验证当前配置可用性）。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let override: AiSettings | undefined;
  if (body.aiApiKey && body.aiBaseUrl && body.aiModel) {
    override = {
      aiBaseUrl: String(body.aiBaseUrl),
      aiApiKey: String(body.aiApiKey),
      aiModel: String(body.aiModel),
    };
  }

  const t0 = Date.now();
  const out = await chatJSON<{ reply: string }>(
    "连通性测试",
    '请输出 JSON：{"reply":"ok"}',
    30_000,
    override,
  );
  const elapsed = Date.now() - t0;

  if (out?.reply) {
    return NextResponse.json({ ok: true, elapsed, reply: out.reply });
  }
  return NextResponse.json(
    { ok: false, elapsed, error: "连接失败：请检查 Base URL / API Key / 模型名，或服务可达性" },
    { status: 200 },
  );
}
