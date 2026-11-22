/**
 * LLM 简历解析：上传简历的原始文本 → ResumeData。
 * 相比规则引擎：对内容流乱序、无分节标题、复杂版式天然免疫（第三方 PDF 常态）。
 * AI 未配置或解析失败时由调用方回退到规则引擎。
 */
import { chatJSON } from "./gateway";
import { normalizeGenerated } from "./generate";
import type { ResumeData } from "@/lib/resume/schema";

const LLM_SYSTEM = `你是简历解析引擎。将给定简历文本解析为结构化 JSON。
要求：
1. 严格使用文本中出现的信息，不推测、不虚构；模板占位符（如【姓名】【手机号】）对应字段留空字符串；
2. 文本可能乱序或缺少分节标题，请根据内容语义归类（教育/工作/实习/项目/技能/自我评价）；
3. 日期规范为 "2023.09" 或 "至今"；经历 bullets 每条一行；自我评价合并到 basics.summary。
只输出 JSON，不要任何解释。`;

export async function parseResumeWithAI(text: string): Promise<ResumeData | null> {
  const out = await chatJSON<Record<string, unknown>>(
    LLM_SYSTEM,
    `简历文本：\n${text.slice(0, 12000)}\n\n请严格按以下 JSON 模板输出，直接以 { 开头、以 } 结尾：
{"basics":{"name":"","headline":"求职意向","phone":"","email":"","location":"","website":"","summary":"自我评价合并"},"education":[{"school":"","degree":"本科","major":"","range":{"start":"","end":""},"note":"","highlights":["在校亮点"]}],"experience":[{"company":"","position":"","location":"","range":{"start":"","end":""},"bullets":["内容"]}],"projects":[{"name":"","role":"","link":"","range":{"start":"","end":""},"bullets":["内容"]}],"skills":[{"name":"技能名","detail":"熟练度"}]}`,
    120_000,
  );
  return normalizeGenerated(out);
}
