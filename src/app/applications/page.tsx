"use client";

import { useEffect, useState } from "react";
import { listResumes } from "@/lib/data/client";
import { ApplicationBoard } from "@/components/applications/ApplicationBoard";
import { BackBar } from "@/components/nav/BackBar";

export default function ApplicationsPage() {
  const [resumes, setResumes] = useState<{ id: string; title: string }[] | null>(null);

  useEffect(() => {
    listResumes().then(setResumes);
  }, []);

  return (
    <>
      <BackBar title="一岗一简历 · 投递状态追踪" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {resumes === null ? (
          <p className="text-sm text-gray-500">加载中…</p>
        ) : (
          <ApplicationBoard resumes={resumes} />
        )}
      </main>
    </>
  );
}
