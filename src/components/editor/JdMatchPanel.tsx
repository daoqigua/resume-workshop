"use client";

import { useState } from "react";
import { Btn } from "./ui";
import { matchJd, rewriteForJd } from "@/lib/ai/jdMatch";
import { createResume, appPath } from "@/lib/data/client";
import type { JdMatchReport } from "@/lib/resume/schema";

const TYPE_LABEL: Record<string, string> = { hard: "硬技能", soft: "软能力", implicit: "隐性要求" };

/**
 * JD 对标面板（M2）：粘贴职位描述 → 匹配分 + 关键词缺口 + 改写建议 → 一键生成对标版本。
 * AI 调用走 isomorphic 网关（完整版服务端 / 静态版浏览器直连）。
 */
export function JdMatchPanel({
  resumeId,
  onClose,
}: {
  resumeId: string;
  onClose: () => void;
}) {
  const [jd, setJd] = useState("");
  const [report, setReport] = useState<JdMatchReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [note, setNote] = useState("");
  const [aiFlag, setAiFlag] = useState(true);

  async function analyze() {
    if (!jd.trim()) {
      setNote("请先粘贴职位描述（JD）");
      return;
    }
    setAnalyzing(true);
    setNote("");
    try {
      const { getResume } = await import("@/lib/data/client");
      const doc = await getResume(resumeId);
      if (!doc) {
        setNote("简历不存在");
        return;
      }
      const out = await matchJd(jd, doc.data);
      setReport(out.report);
      setAiFlag(out.ai);
    } catch (e) {
      setNote(`分析失败：${String(e).slice(0, 80)}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function createVersion() {
    setRewriting(true);
    setNote("正在按 JD 定向改写并创建新版本…（约 1 分钟）");
    try {
      const { getResume } = await import("@/lib/data/client");
      const doc = await getResume(resumeId);
      if (!doc) {
        setNote("简历不存在");
        return;
      }
      const { report: snap } = await matchJd(jd, doc.data);
      const { data } = await rewriteForJd(jd, doc.data);
      const newDoc = await createResume({
        title: `【JD 版】${doc.data.basics.headline || doc.title}`,
        data: data ?? doc.data,
        settings: doc.settings,
        parentResumeId: doc.id,
        targetJd: jd,
        jdMatch: snap,
      });
      window.open(appPath(`/editor?id=${newDoc.id}`), "_blank");
      setNote(`已生成对标版本（匹配分 ${snap.score}）：${newDoc.title}，已在新页打开`);
    } catch (e) {
      setNote(`生成失败：${String(e).slice(0, 80)}`);
    } finally {
      setRewriting(false);
    }
  }

  const scoreColor =
    !report ? "bg-gray-400" : report.score >= 75 ? "bg-green-600" : report.score >= 50 ? "bg-amber-500" : "bg-red-600";

  return (
    <div className="border-b bg-indigo-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-indigo-800">JD 对标</span>
        <span className="flex-1" />
        <Btn kind="ghost" onClick={onClose}>关闭</Btn>
      </div>
      <div className="mt-2 flex gap-3">
        <textarea
          rows={4}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="粘贴目标岗位的职位描述（JD），例如从招聘网站复制的任职要求…"
          className="w-1/2 rounded border border-gray-300 px-2 py-1.5 text-xs leading-5 focus:border-indigo-600 focus:outline-none"
        />
        <div className="flex w-1/2 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Btn kind="primary" onClick={analyze} disabled={analyzing}>
              {analyzing ? "分析中…（最长 2 分钟）" : "① 对标分析"}
            </Btn>
            <Btn onClick={createVersion} disabled={!report || rewriting} title="按 JD 定向改写并生成新版本">
              {rewriting ? "生成中…" : "② 生成对标版本"}
            </Btn>
            {report ? (
              <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${scoreColor}`}>
                匹配分 {report.score}
              </span>
            ) : null}
          </div>
          {report ? (
            <div className="max-h-[180px] space-y-1.5 overflow-y-auto rounded bg-white p-2 text-xs">
              <div>
                <span className="font-semibold text-gray-600">已命中（{report.matched.length}）：</span>
                <span className="text-green-700">{report.matched.join("、") || "无"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">缺失（{report.missing.length}）：</span>
                <span className="text-red-600">{report.missing.join("、") || "无"}</span>
              </div>
              {report.suggestions.length ? (
                <ul className="list-disc pl-5 text-gray-600">
                  {report.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : null}
              <div className="pt-1 text-gray-400">
                关键词分布：{report.keywords.map((k) => `${k.name}(${TYPE_LABEL[k.type] ?? k.type})`).join("、")}
              </div>
              {!aiFlag ? (
                <div className="text-amber-600">本次为规则引擎结果（AI 未配置或调用失败），精度有限</div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              分析结果将展示：硬技能/软能力/隐性要求关键词、匹配分、已命中与缺失清单、定向改写建议。
              生成的新版本可独立编辑导出（一岗一简历）。
            </p>
          )}
        </div>
      </div>
      {note ? <div className="mt-2 rounded bg-indigo-100 px-2 py-1.5 text-xs text-indigo-800">{note}</div> : null}
    </div>
  );
}
