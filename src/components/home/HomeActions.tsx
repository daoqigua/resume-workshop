"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** 首页动作：AI 生成 / 新建空白 / 上传解析导入（PDF、Word） */
export function HomeActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  async function createResume() {
    setCreating(true);
    try {
      const res = await fetch("/api/resumes", { method: "POST" });
      const doc = await res.json();
      router.push(`/editor/${doc.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/parse", { method: "POST", body: form });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        alert(`解析失败：${out.error ?? res.status}`);
        return;
      }
      const doc = await res.json();
      router.push(`/editor/${doc.id}`);
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
        onClick={createResume}
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
