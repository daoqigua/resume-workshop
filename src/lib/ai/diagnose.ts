/**
 * 简历全文诊断（免费引流功能）：
 * 五个维度：完整度 / 量化 / 动词力度 / 篇幅 / 关键词密度。
 * AI 可用时叠加 LLM 总评；无 AI 时纯规则引擎（结果可直接可用）。
 */
import type { ResumeData } from "@/lib/resume/schema";
import { chatJSON, isAiConfigured } from "./gateway";

export type DiagnosisIssue = {
  /** error | warning | info */
  level: "error" | "warning" | "info";
  where: string;
  message: string;
};

export type DiagnosisReport = {
  score: number;
  issues: DiagnosisIssue[];
  aiSummary?: string;
};

const WEAK_START = /^(负责|参与|协助|帮忙|做了|进行|配合)/;
const HAS_NUMBER = /\d/;

export async function diagnoseResume(data: ResumeData): Promise<DiagnosisReport> {
  const issues: DiagnosisIssue[] = [];
  let score = 100;

  // ① 完整度
  const b = data.basics;
  const contactMissing: string[] = [];
  if (!b.phone) contactMissing.push("电话");
  if (!b.email) contactMissing.push("邮箱");
  if (!b.location) contactMissing.push("所在地");
  if (contactMissing.length) {
    score -= 6 * contactMissing.length;
    issues.push({
      level: "error",
      where: "基本信息",
      message: `缺少联系方式：${contactMissing.join("、")}——HR 可能无法联系到你`,
    });
  }
  if (!b.headline) {
    score -= 5;
    issues.push({ level: "warning", where: "基本信息", message: "缺少求职意向，HR 快速筛选时无法定位你的目标岗位" });
  }
  if (data.education.length === 0) {
    score -= 10;
    issues.push({ level: "error", where: "教育背景", message: "教育背景为空" });
  }
  if (data.experience.length === 0 && data.projects.length === 0) {
    score -= 15;
    issues.push({ level: "error", where: "经历", message: "工作经历与项目经历均为空" });
  }

  // ② 量化
  const bullets = [
    ...data.experience.flatMap((e) => e.bullets),
    ...data.projects.flatMap((p) => p.bullets),
  ];
  const unquantified = bullets.filter((x) => !HAS_NUMBER.test(x));
  if (bullets.length > 0) {
    const ratio = unquantified.length / bullets.length;
    if (ratio > 0.5) {
      score -= 12;
      issues.push({
        level: "warning",
        where: "量化",
        message: `${unquantified.length}/${bullets.length} 条描述缺少数字量化（如：提升 30%、服务 10w 用户）。量化是简历筛选中最强信号`,
      });
    }
  } else {
    score -= 10;
    issues.push({ level: "warning", where: "量化", message: "还没有任何经历描述条目" });
  }

  // ③ 动词力度
  const weak = bullets.filter((x) => WEAK_START.test(x.trim()));
  if (weak.length > 0) {
    score -= Math.min(10, weak.length * 3);
    issues.push({
      level: "info",
      where: "动词",
      message: `${weak.length} 条以弱动词开头（负责/参与/协助），建议改为主导、搭建、设计、落地等主动性更强的词`,
    });
  }

  // ④ 篇幅
  if (b.summary && b.summary.length < 30) {
    score -= 5;
    issues.push({ level: "info", where: "个人简介", message: "个人简介过短，建议 2-3 句话概括亮点：年限 + 领域 + 最强业绩" });
  }
  if (bullets.some((x) => x.length > 80)) {
    score -= 4;
    issues.push({ level: "info", where: "篇幅", message: "存在超过 80 字的条目，建议一行以内，控制信息密度" });
  }

  // ⑤ 技能
  const bareSkills = data.skills.filter((s) => !s.detail);
  if (data.skills.length === 0) {
    score -= 8;
    issues.push({ level: "warning", where: "技能特长", message: "技能特长为空" });
  } else if (bareSkills.length > data.skills.length / 2) {
    issues.push({ level: "info", where: "技能特长", message: "多数技能未标明熟练度，建议注明（精通/熟练/掌握/了解）" });
  }

  if (issues.length === 0) {
    issues.push({ level: "info", where: "总评", message: "结构完整、量化充分，是一份扎实的简历" });
  }
  score = Math.max(20, Math.min(100, score));

  let aiSummary: string | undefined;
  if (await isAiConfigured()) {
    const out = await chatJSON<{ summary: string }>(
      `你是简历评审专家`,
      `简历数据：${JSON.stringify({ basics: b, bullets: bullets.slice(0, 15) })}\n\n请严格按下面的 JSON 模板输出，直接以 { 开头、以 } 结尾，不要输出任何解释或 markdown：\n{"summary":"80字内的中文总评，指出最值得改进的一点"}`,
    );
    aiSummary = out?.summary;
  }

  return { score, issues, aiSummary };
}
