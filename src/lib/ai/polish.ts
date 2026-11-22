/**
 * 单条 bullet 润色：
 * - 配置 AI：LLM 按 STAR 原则改写（不虚构事实，只优化表述）
 * - 未配置 AI：本地规则引擎给「诊断式」反馈（弱动词、缺量化、长度问题）
 */
import { chatJSON, isAiConfigured } from "./gateway";
import { stripBulletPrefix } from "@/components/templates/RichText";

export type PolishResult = {
  /** 建议文本（AI 模式为改写稿；规则模式返回原文） */
  text: string;
  /** 分析/修改说明 */
  notes: string[];
  /** 是否走了大模型 */
  ai: boolean;
};

const WEAK_START = /^(负责|参与|协助|帮忙|做了|进行|配合|完成了一些)/;
const HAS_NUMBER = /\d|[一两二三四五六七八九十百千万%]/;

const LLM_SYSTEM = `你是资深简历顾问。请优化给定的一条简历工作内容描述：
1. 遵守 STAR：突出动作、技术/方法、量化结果；
2. 绝对不允许虚构任何未提供的事实、数字或成果；
3. 输出 JSON：{"text": "优化后的一句话", "notes": ["修改点1", "修改点2"]}`;

export async function polishBullet(raw: string): Promise<PolishResult> {
  const text = stripBulletPrefix(raw.trim());

  if (await isAiConfigured()) {
    const out = await chatJSON<{ text: string; notes?: string[] }>(
      LLM_SYSTEM,
      `原文：${text}\n\n请严格按下面的 JSON 模板输出，直接以 { 开头、以 } 结尾，不要输出任何解释或 markdown：\n{"text":"优化后的一句话","notes":["修改点1","修改点2"]}`,
    );
    if (out?.text) {
      return {
        text: stripBulletPrefix(out.text),
        notes: out.notes ?? ["AI 已按 STAR 原则改写"],
        ai: true,
      };
    }
  }

  // 本地规则兜底：只诊断不代写，保持内容真实性
  const notes: string[] = [];
  if (WEAK_START.test(text)) {
    notes.push("开头动词偏弱（负责/参与/协助），建议改为更能体现主动性的动词，如主导、搭建、设计");
  }
  if (!HAS_NUMBER.test(text)) {
    notes.push("缺少量化数据，建议补充规模或效果（如用户量、百分比、时长）");
  }
  if (text.length > 80) {
    notes.push("条目过长，建议拆分或压缩到一行以内");
  }
  if (text.length < 12) {
    notes.push("内容过短，建议补充背景与结果");
  }
  if (notes.length === 0) {
    notes.push("表述结构良好：有动作、有细节、有量化。可继续打磨动词力度");
  }
  return { text, notes, ai: false };
}
