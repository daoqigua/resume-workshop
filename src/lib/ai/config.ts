/**
 * AI 运行配置解析（isomorphic，无 Node 依赖，可进 client bundle）：
 * - 浏览器（静态演示版）：localStorage「rw:ai-settings」（用户在 AI 设置弹窗填写）
 * - 服务端（完整版）：环境变量 AI_API_KEY / AI_BASE_URL / AI_MODEL
 * - 界面配置文件（data/settings.json）由 API 路由层优先合并（见 lib/settings.ts）
 */
import type { AiSettings } from "@/lib/settings";

export const LS_AI_SETTINGS = "rw:ai-settings";

const DEFAULT_BASE = "https://open.bigmodel.cn/api/paas/v4";
const DEFAULT_MODEL = "glm-4-flash";

export async function resolveAiConfig(
  override?: Partial<AiSettings>,
): Promise<AiSettings | null> {
  if (override?.aiApiKey) {
    return {
      aiBaseUrl: override.aiBaseUrl || DEFAULT_BASE,
      aiApiKey: override.aiApiKey,
      aiModel: override.aiModel || DEFAULT_MODEL,
    };
  }
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_AI_SETTINGS);
      if (!raw) return null;
      const s = JSON.parse(raw) as Partial<AiSettings>;
      if (!s.aiApiKey) return null;
      return {
        aiBaseUrl: s.aiBaseUrl || DEFAULT_BASE,
        aiApiKey: s.aiApiKey,
        aiModel: s.aiModel || DEFAULT_MODEL,
      };
    } catch {
      return null;
    }
  }
  // 服务端：环境变量
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  return {
    aiBaseUrl: process.env.AI_BASE_URL || DEFAULT_BASE,
    aiApiKey: key,
    aiModel: process.env.AI_MODEL || DEFAULT_MODEL,
  };
}

export async function isAiConfiguredRuntime(): Promise<boolean> {
  return (await resolveAiConfig()) !== null;
}
