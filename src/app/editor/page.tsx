"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getResume } from "@/lib/data/client";
import { Editor } from "@/components/editor/Editor";
import type { ResumeDoc } from "@/lib/resume/schema";

/**
 * 编辑器入口。完整版与静态版统一使用 query 参数（/editor?id=…），
 * 静态导出下动态路径段无法在 GitHub Pages 上服务。
 * useSearchParams 需要 Suspense 边界（静态导出 prerender 要求）。
 */
function EditorInner() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [doc, setDoc] = useState<ResumeDoc | null | "loading">("loading");

  useEffect(() => {
    if (!id) {
      setDoc(null);
      return;
    }
    getResume(id).then(setDoc);
  }, [id]);

  if (doc === "loading") {
    return <p className="p-10 text-gray-500">加载中…</p>;
  }
  if (!doc) {
    return (
      <p className="p-10 text-gray-600">
        未找到简历（{id ?? "缺少 id 参数"}）。
        <Link href="/" className="ml-2 text-blue-700 hover:underline">
          ← 返回首页
        </Link>
      </p>
    );
  }
  return <Editor initial={doc} />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="p-10 text-gray-500">加载中…</p>}>
      <EditorInner />
    </Suspense>
  );
}
