import fs from "node:fs/promises";
import path from "node:path";

/**
 * 平台级 AI 配置（单租户 MVP）。
 * 优先级：界面配置（data/settings.json）> 环境变量（.env.local）> 规则引擎兜底。
 * API Key 只存服务端文件，接口返回时掩码，不回显明文。
 */

export type AiSettings = {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
};

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

async function readSettingsFile(): Promise<Partial<AiSettings>> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    return JSON.parse(raw) as Partial<AiSettings>;
  } catch {
    return {};
  }
}

async function writeSettingsFile(s: AiSettings): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(s, null, 2), "utf8");
}

/** 合并优先级后的生效配置（不包含来源信息） */
export async function getEffectiveAiConfig(): Promise<AiSettings | null> {
  const saved = await readSettingsFile();
  const merged: AiSettings = {
    aiBaseUrl: saved.aiBaseUrl || process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
    aiApiKey: saved.aiApiKey || process.env.AI_API_KEY || "",
    aiModel: saved.aiModel || process.env.AI_MODEL || "glm-4-flash",
  };
  if (!merged.aiApiKey) return null;
  return merged;
}

/** 掩码：仅显示前 6 后 4 位 */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return key.slice(0, 2) + "****";
  return `${key.slice(0, 6)}****${key.slice(-4)}`;
}

export type AiSettingsView = {
  configured: boolean;
  /** 配置来源：saved（界面）/ env（环境变量）/ none */
  source: "saved" | "env" | "none";
  aiBaseUrl: string;
  aiModel: string;
  apiKeyMasked: string;
};

export async function getAiSettingsView(): Promise<AiSettingsView> {
  const saved = await readSettingsFile();
  const hasSaved = Boolean(saved.aiApiKey);
  const eff = await getEffectiveAiConfig();
  return {
    configured: Boolean(eff),
    source: hasSaved ? "saved" : eff ? "env" : "none",
    aiBaseUrl: saved.aiBaseUrl || process.env.AI_BASE_URL || "",
    aiModel: saved.aiModel || process.env.AI_MODEL || "",
    apiKeyMasked: maskKey(eff?.aiApiKey ?? ""),
  };
}

export async function saveAiSettings(s: Partial<AiSettings>): Promise<AiSettingsView> {
  const existing = await readSettingsFile();
  const next: AiSettings = {
    aiBaseUrl: (s.aiBaseUrl ?? existing.aiBaseUrl ?? "").trim(),
    aiApiKey: (s.aiApiKey ?? existing.aiApiKey ?? "").trim(),
    aiModel: (s.aiModel ?? existing.aiModel ?? "").trim(),
  };
  await writeSettingsFile(next);
  return getAiSettingsView();
}
