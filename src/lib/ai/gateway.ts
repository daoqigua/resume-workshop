/**
 * AI 网关 — 统一封装大模型调用（OpenAI 兼容协议，GLM / DeepSeek / 通义 均可用）。
 * 配置优先级：界面配置（data/settings.json，见 lib/settings.ts）> 环境变量 > 规则引擎兜底。
 * 未配置密钥时，业务层回退到本地规则引擎，产品功能不中断。
 */

import { getEffectiveAiConfig, type AiSettings } from "@/lib/settings";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function isAiConfigured(): Promise<boolean> {
  return (await getEffectiveAiConfig()) !== null;
}

/** 从模型输出中提取第一个完整 JSON 对象（容错散文包裹） */
function extractJson(content: string): string | null {
  const start = content.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

/** 请求 JSON 结构化输出；失败返回 null（调用方走兜底） */
export async function chatJSON<T>(
  system: string,
  user: string,
  timeoutMs = 60_000, // reasoning 模型思考链较长，60s 起步
  configOverride?: AiSettings, // 设置测试接口用：用未保存的配置试连
): Promise<T | null> {
  const cfg = configOverride ?? (await getEffectiveAiConfig());
  if (!cfg?.aiApiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.aiApiKey}`,
      },
      body: JSON.stringify({
        model: cfg.aiModel,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${system}\n只输出一个合法 JSON 对象，不要输出任何解释、markdown 或 JSON 以外的内容。`,
          },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const raw = extractJson(content) ?? content;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
