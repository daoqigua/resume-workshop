/**
 * AI 生成简历：用户文字描述自身情况（+ 可选上传资料文本）→ ResumeData。
 * 真实性约束：只根据用户提供的信息组织与润色，不虚构经历/数字；
 * 缺失字段留空由用户补全。无 AI 密钥时规则兜底（尽力提取联系方式与简介）。
 */
import { chatJSON, isAiConfigured } from "./gateway";
import { emptyResumeData, newId } from "@/lib/resume/schema";
import type { ResumeData } from "@/lib/resume/schema";
import { parseResumeText } from "@/lib/parse/parser";
import { PHONE_RE, EMAIL_RE } from "@/lib/parse/patterns";

export type GenerateInput = {
  description: string;
  /** 上传辅助资料提取出的文本（旧简历/证书/项目材料等，已截断） */
  materials: { name: string; text: string }[];
};

export type GenerateResult = {
  data: ResumeData;
  ai: boolean;
  notes: string[];
};

const LLM_SYSTEM = `你是资深简历顾问。根据用户提供的个人情况与资料，生成一份中文简历的结构化数据。
要求：
1. 只使用用户提供的信息，不虚构经历、数字、日期；信息不足的字段留空字符串；
2. 经历条目按 STAR 优化表述，支持 **加粗** 标记关键词；
3. bullets 每条一行、突出动作与结果；summary 为 2-3 句个人简介（年限+领域+最强亮点）。`;

export async function generateResume(input: GenerateInput): Promise<GenerateResult> {
  const notes: string[] = [];
  const materialBlock = input.materials
    .map((m) => `【资料：${m.name}】\n${m.text}`)
    .join("\n\n")
    .slice(0, 12000);

  if (await isAiConfigured()) {
    const out = await chatJSON<Record<string, unknown>>(
      LLM_SYSTEM,
      `用户自述：\n${input.description}\n\n${materialBlock ? `补充资料：\n${materialBlock}\n\n` : ""}请严格按以下 JSON 模板输出，直接以 { 开头、以 } 结尾，不要任何解释或 markdown：
{"basics":{"name":"","headline":"求职意向","phone":"","email":"","location":"","website":"","summary":"个人简介"},"education":[{"school":"","degree":"本科","major":"","range":{"start":"2020.09","end":"2024.06"},"note":"","highlights":["在校亮点"]}],"experience":[{"company":"","position":"","location":"","range":{"start":"2023.07","end":"至今"},"bullets":["工作内容一条，可含 **加粗**"]}],"projects":[{"name":"","role":"","link":"","range":{"start":"","end":""},"bullets":["项目内容"]}],"skills":[{"name":"技能","detail":"熟练度"}]}`,
      120_000, // 生成整份简历，reasoning 模型耗时更长
    );
    const data = normalizeGenerated(out);
    if (data) {
      notes.push("AI 已根据你的描述生成简历草稿，请核对每一条信息（AI 不会虚构，缺失处需补全）");
      return { data, ai: true, notes };
    }
    notes.push("AI 生成失败，已使用基础解析结果");
  }

  // 规则兜底：把描述+资料当文本做一次解析（提取联系方式等），全文进简介
  const merged = [input.description, ...input.materials.map((m) => m.text)].join("\n");
  const parsed = parseResumeText(merged);
  const data = parsed.data;
  if (!data.basics.summary) {
    data.basics.summary = input.description.slice(0, 300);
  }
  if (!data.basics.phone && PHONE_RE.test(merged)) data.basics.phone = PHONE_RE.exec(merged)![0];
  if (!data.basics.email && EMAIL_RE.test(merged)) data.basics.email = EMAIL_RE.exec(merged)![0];
  notes.push("未配置 AI 或生成失败：已按文本规则提取基本信息，请在编辑器中完善");
  return { data, ai: false, notes };
}

/** 校验并规范 LLM 输出为合法 ResumeData；失败返回 null */
export function normalizeGenerated(out: Record<string, unknown> | null): ResumeData | null {
  if (!out || typeof out !== "object") return null;
  const b = out.basics as Record<string, unknown> | undefined;
  if (!b || typeof b !== "object") return null;
  const str = (v: unknown, fb = "") => {
    if (typeof v !== "string") return fb;
    // 模板占位符（【姓名】【手机号】等）一律清空，避免污染简历
    return /【[^】]*】/.test(v) ? "" : v;
  };
  const data = emptyResumeData();
  data.basics = {
    name: str(b.name),
    headline: str(b.headline),
    phone: str(b.phone),
    email: str(b.email),
    location: str(b.location),
    website: str(b.website),
    summary: str(b.summary),
  };
  const edu = (out.education as Record<string, unknown>[] | undefined) ?? [];
  data.education = edu.slice(0, 5).map((e) => ({
    id: newId("edu"),
    school: str(e.school),
    degree: str(e.degree),
    major: str(e.major),
    range: { start: str((e.range as Record<string, unknown>)?.start), end: str((e.range as Record<string, unknown>)?.end) },
    note: str(e.note),
    highlights: Array.isArray(e.highlights) ? (e.highlights as unknown[]).map(String).slice(0, 6) : [],
  }));
  const exp = (out.experience as Record<string, unknown>[] | undefined) ?? [];
  data.experience = exp.slice(0, 6).map((e) => ({
    id: newId("exp"),
    company: str(e.company),
    position: str(e.position),
    location: str(e.location),
    range: { start: str((e.range as Record<string, unknown>)?.start), end: str((e.range as Record<string, unknown>)?.end) },
    bullets: Array.isArray(e.bullets) ? (e.bullets as unknown[]).map(String).slice(0, 8) : [],
  }));
  const proj = (out.projects as Record<string, unknown>[] | undefined) ?? [];
  data.projects = proj.slice(0, 5).map((p) => ({
    id: newId("proj"),
    name: str(p.name),
    role: str(p.role),
    link: str(p.link),
    range: { start: str((p.range as Record<string, unknown>)?.start), end: str((p.range as Record<string, unknown>)?.end) },
    bullets: Array.isArray(p.bullets) ? (p.bullets as unknown[]).map(String).slice(0, 8) : [],
  }));
  const sk = (out.skills as Record<string, unknown>[] | undefined) ?? [];
  data.skills = sk.slice(0, 12).map((s) => ({
    id: newId("sk"),
    name: str(s.name),
    detail: str(s.detail),
  }));
  if (!data.basics.name && data.experience.length === 0 && data.education.length === 0) return null;
  return data;
}
