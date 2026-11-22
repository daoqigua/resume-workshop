"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateResume } from "@/lib/ai/generate";
import { createResume } from "@/lib/data/client";
import { extractFileText } from "@/lib/parse/extract";

/**
 * AI 生成简历页：用户文字描述自身情况（可多传辅助资料）→ AI 生成草稿 → 进入编辑器。
 * AI 未配置时自动退化为规则解析（提取联系方式等），页面会提示。
 */
export function CreateResumeClient() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function submit() {
    if (!description.trim() && files.length === 0) {
      setNote("请先描述你的情况，或上传资料");
      return;
    }
    setBusy(true);
    setNote("AI 正在生成简历草稿，约需 30–90 秒…");
    try {
      const materials: { name: string; text: string }[] = [];
      for (const f of files.slice(0, 5)) {
        try {
          const text = await extractFileText(f);
          if (text.trim()) materials.push({ name: f.name, text: text.trim() });
        } catch (err) {
          setNote(err instanceof Error ? err.message : String(err));
          return;
        }
      }
      const result = await generateResume({ description, materials });
      const doc = await createResume({
        title: `${result.data.basics.name || "AI"}的简历`,
        data: result.data,
      });
      router.push(`/editor?id=${doc.id}`);
    } catch (e) {
      setNote(`生成失败：${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">AI 生成简历</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        用一段话描述你的情况（学历、经历、技能、目标岗位），也可以上传旧简历或证书、项目材料等辅助资料。
        AI 只会根据你提供的信息组织成简历，<strong>不会虚构任何内容</strong>；生成后可随时在编辑器中修改。
      </p>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">我的情况描述</span>
          <textarea
            rows={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              "示例：\n我是张三，2023 年本科毕业于XX大学计算机专业。毕业后在XX公司做了2年后端开发，主要用 Java/Spring Boot，负责过订单系统的重构，QPS 从 800 提到 3000，带过 2 个实习生。熟练 MySQL、Redis、Kafka。想找后端开发岗位。电话 138-xxxx-xxxx，邮箱 zhangsan@example.com。"
            }
            className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-blue-600 focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">辅助资料（可选，最多 5 个文件）</span>
          <span className="ml-2 text-xs text-gray-400">旧简历 / 证书 / 项目材料，支持 PDF、Word(.docx)、TXT</span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            className="mt-2 block w-full rounded border border-dashed border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700"
          />
        </label>
        {files.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-gray-500">
            {files.map((f) => (
              <li key={f.name}>
                📄 {f.name}（{(f.size / 1024).toFixed(0)} KB）
              </li>
            ))}
          </ul>
        ) : null}

        {note ? <div className="mt-3 rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">{note}</div> : null}

        <div className="mt-4 flex justify-end">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? "生成中…" : "生成简历草稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
