/**
 * JD 对标引擎（M2 核心）：
 * ① matchJd：JD + 简历 → 关键词抽取 + 匹配分 + 缺口报告（AI 优先，规则兜底）
 * ② rewriteForJd：按 JD 定向改写简历 → 新版本（不虚构事实，仅调整表述与排序）
 */
import { chatJSON, isAiConfigured } from "./gateway";
import { normalizeGenerated } from "./generate";
import type { JdKeyword, JdMatchReport, ResumeData } from "@/lib/resume/schema";

const MATCH_SYSTEM = `你是资深 HR 与简历顾问。分析给定职位描述（JD）与候选人简历，输出对标报告。
关键词分三类：hard（硬技能/工具/证书）、soft（软能力）、implicit（隐性要求，如抗压、加班、出差接受度）。
匹配判定依据简历文本是否体现该关键词（同义也算命中），score = 命中加权分（required 权重高）。
只输出 JSON，不要解释。`;

/** 规则兜底：从 JD 抽取常见技术/能力词，与简历全文做包含匹配 */
function ruleMatch(jd: string, resume: ResumeData): JdMatchReport {
  const resumeText = JSON.stringify(resume);
  // 粗抽：英文词组 + 中文 2-6 字术语片段
  const cand = new Set<string>();
  for (const m of jd.matchAll(/[A-Za-z][A-Za-z0-9+#./]{1,20}/g)) cand.add(m[0]);
  for (const m of jd.matchAll(/[\u4e00-\u9fa5]{2,6}(?=：|，|,|、|；|;|经验|能力|优先|熟悉|掌握|了解)/g)) {
    cand.add(m[0]);
  }
  const skip = /^(以上|以下|相关|岗位|工作|公司|能力|候选人|职责|要求|优先|熟悉|掌握)$/;
  const keywords: JdKeyword[] = [...cand]
    .filter((k) => !skip.test(k) && k.length >= 2)
    .slice(0, 25)
    .map((name) => ({
      name,
      type: /[A-Za-z]/.test(name) ? ("hard" as const) : ("soft" as const),
      required: jd.includes(name),
    }));
  const matched = keywords.filter((k) => resumeText.includes(k.name)).map((k) => k.name);
  const missing = keywords.filter((k) => !resumeText.includes(k.name)).map((k) => k.name);
  const reqTotal = keywords.filter((k) => k.required).length || 1;
  const reqHit = keywords.filter((k) => k.required && matched.includes(k.name)).length;
  const score = Math.round((reqHit / reqTotal) * 60 + (matched.length / (keywords.length || 1)) * 40);
  return {
    keywords,
    score: Math.max(10, Math.min(100, score)),
    matched,
    missing,
    suggestions: missing.slice(0, 5).map((k) => `简历中未体现「${k}」，若有相关经历请补充或改写提及`),
  };
}

export async function matchJd(
  jd: string,
  resume: ResumeData,
): Promise<{ report: JdMatchReport; ai: boolean }> {
  if (await isAiConfigured()) {
    const out = await chatJSON<JdMatchReport>(
      MATCH_SYSTEM,
      `职位描述：\n${jd.slice(0, 6000)}\n\n候选人简历：\n${JSON.stringify(resume).slice(0, 6000)}\n\n请严格按以下 JSON 模板输出，直接以 { 开头、以 } 结尾：
{"keywords":[{"name":"关键词","type":"hard|soft|implicit","required":true}],"score":0-100整数,"matched":["已命中关键词"],"missing":["缺失关键词，按重要性排序"],"suggestions":["改写建议1","建议2"]}`,
      120_000,
    );
    if (out && Array.isArray(out.keywords) && typeof out.score === "number") {
      return {
        report: {
          keywords: out.keywords.slice(0, 30),
          score: Math.max(0, Math.min(100, out.score)),
          matched: (out.matched ?? []).slice(0, 30),
          missing: (out.missing ?? []).slice(0, 15),
          suggestions: (out.suggestions ?? []).slice(0, 6),
        },
        ai: true,
      };
    }
  }
  return { report: ruleMatch(jd, resume), ai: false };
}

const REWRITE_SYSTEM = `你是简历定制专家。给定候选人简历与目标 JD，输出一份针对该岗位优化的简历。
铁律：不虚构任何经历、数字、日期、技能；只做：
1. 调整 sectionOrder 与条目顺序，把与 JD 最相关的经历提前；
2. 重写 bullets 表述，优先使用 JD 中出现的相关表述（前提是简历已有对应事实）；
3. headline/summary 向 JD 岗位靠拢；
4. 不删减关键经历。
只输出 JSON。`;

export async function rewriteForJd(
  jd: string,
  resume: ResumeData,
): Promise<{ data: ResumeData | null; ai: boolean }> {
  if (await isAiConfigured()) {
    const out = await chatJSON<Record<string, unknown>>(
      REWRITE_SYSTEM,
      `目标 JD：\n${jd.slice(0, 6000)}\n\n候选人简历 JSON：\n${JSON.stringify(resume).slice(0, 8000)}\n\n请严格按以下 JSON 模板输出完整简历，直接以 { 开头、以 } 结尾：
{"basics":{"name":"","headline":"","phone":"","email":"","location":"","website":"","summary":""},"education":[{"school":"","degree":"","major":"","range":{"start":"","end":""},"note":"","highlights":[]}],"experience":[{"company":"","position":"","location":"","range":{"start":"","end":""},"bullets":[]}],"projects":[{"name":"","role":"","link":"","range":{"start":"","end":""},"bullets":[]}],"skills":[{"name":"","detail":""}],"sectionOrder":["education","experience","projects","skills"]}`,
      180_000,
    );
    const data = normalizeGenerated(out);
    if (data) {
      // 改写不改变身份信息与联系方式（防 LLM 漂移），并保留原顺序约束
      data.basics.phone = resume.basics.phone;
      data.basics.email = resume.basics.email;
      if (!data.sectionOrder?.length) data.sectionOrder = resume.sectionOrder;
      return { data, ai: true };
    }
  }
  // 规则兜底：不改动内容，仅按 JD 关键词命中数重排经历/项目（相关度高的提前）
  const text = jd;
  const rel = (bullets: string[]) =>
    bullets.reduce((n, b) => n + (text.includes(b.slice(0, 6)) ? 1 : 0), 0);
  const sorted: ResumeData = JSON.parse(JSON.stringify(resume));
  sorted.experience.sort((a, b) => rel(b.bullets) - rel(a.bullets));
  sorted.projects.sort((a, b) => rel(b.bullets) - rel(a.bullets));
  return { data: sorted, ai: false };
}
