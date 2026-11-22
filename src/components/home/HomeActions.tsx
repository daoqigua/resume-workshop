"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createResume } from "@/lib/data/client";

/** 首页动作：AI 生成 / 新建空白 / 上传解析导入（PDF、Word）——双模式 */
export function HomeActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  async function onCreateResume() {
    setCreating(true);
    try {
      const doc = await createResume({});
      router.push(`/editor?id=${doc.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const { extractFileText } = await import("@/lib/parse/extract");
      const { parseResumeText } = await import("@/lib/parse/parser");
      const { parseResumeWithAI } = await import("@/lib/ai/parseResume");
      const { isAiConfigured } = await import("@/lib/ai/gateway");

      const text = await extractFileText(f);
      if (!text.trim()) {
        alert("文件中未提取到文本（PDF 可能是扫描图片版）");
        return;
      }
      let data;
      if (await isAiConfigured()) {
        const aiData = await parseResumeWithAI(text);
        if (aiData) data = aiData;
      }
      const result = data ?? parseResumeText(text).data;
      const doc = await createResume({
        title: `${result.basics.name || "导入"}的简历`,
        data: result,
      });
      router.push(`/editor?id=${doc.id}`);
    } catch (err) {
      alert(`解析失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <a
        href="/create"
        className="rounded-lg bg-blue-700 px-6 py-2.5 text-white hover:bg-blue-800"
      >
        ✨ AI 生成简历
      </a>
      <button
        onClick={onCreateResume}
        disabled={creating}
        className="rounded-lg border border-blue-700 px-6 py-2.5 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        {creating ? "创建中…" : "新建空白简历"}
      </button>
      <label
        className={`cursor-pointer rounded-lg border border-gray-300 px-6 py-2.5 text-gray-700 hover:bg-gray-50 ${
          importing ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {importing ? "解析中…" : "上传简历导入（PDF / Word）"}
        <input
          type="file"
          accept=".pdf,.docx,.txt,application/pdf"
          className="hidden"
          onChange={onFile}
        />
      </label>
    </>
  );
}
