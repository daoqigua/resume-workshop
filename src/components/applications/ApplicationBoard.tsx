"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/editor/ui";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationDoc,
  type ApplicationStatus,
} from "@/lib/resume/schema";
import {
  listApplications,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
} from "@/lib/data/client";

type ResumeItem = { id: string; title: string };

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  test: "bg-amber-50 text-amber-700 border-amber-200",
  interview: "bg-violet-50 text-violet-700 border-violet-200",
  offer: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  ghost: "bg-gray-100 text-gray-500 border-gray-200",
};

/** 投递追踪看板：记录每份简历（尤其是 JD 对标版本）投了哪家、走到哪一步 */
export function ApplicationBoard({ resumes }: { resumes: ResumeItem[] }) {
  const [items, setItems] = useState<ApplicationDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await listApplications());
    setLoaded(true);
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!company.trim() || !resumeId) return;
    setBusy(true);
    try {
      await createApplication({ resumeId, company, position });
      setCompany("");
      setPosition("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: ApplicationStatus) {
    setItems((arr) => arr.map((a) => (a.id === id ? { ...a, status } : a)));
    await updateApplicationStatus(id, status);
  }

  async function remove(id: string) {
    setItems((arr) => arr.filter((a) => a.id !== id));
    await deleteApplication(id);
  }

  return (
    <div className="space-y-5">
      {/* 新增投递 */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">记录一次投递</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs text-gray-500">使用的简历</span>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="mt-1 w-52 rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">公司 *</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="某公司"
              className="mt-1 w-36 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">岗位</span>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="后端开发工程师"
              className="mt-1 w-44 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <Btn kind="primary" onClick={add} disabled={busy || !company.trim() || !resumeId}>
            {busy ? "保存中…" : "+ 添加"}
          </Btn>
        </div>
        {resumes.length === 0 ? (
          <p className="mt-2 text-xs text-amber-600">
            还没有简历，先 <Link href="/" className="text-blue-700 underline">回首页</Link> 创建一份。
          </p>
        ) : null}
      </div>

      {/* 状态分组看板 */}
      {loaded && items.length === 0 ? (
        <p className="text-sm text-gray-500">还没有投递记录。</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {APPLICATION_STATUSES.map((st) => {
          const group = items.filter((a) => a.status === st);
          if (group.length === 0) return null;
          return (
            <div key={st} className="rounded-lg border bg-white p-3">
              <div className={`mb-2 inline-block rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[st]}`}>
                {APPLICATION_STATUS_LABELS[st]}（{group.length}）
              </div>
              <ul className="space-y-2">
                {group.map((a) => (
                  <li key={a.id} className="rounded border border-gray-100 p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.company}</span>
                      <select
                        value={a.status}
                        onChange={(e) => setStatus(a.id, e.target.value as ApplicationStatus)}
                        className="rounded border border-gray-200 px-1 py-0.5 text-xs"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {APPLICATION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {a.position ? <div className="mt-0.5 text-xs text-gray-500">{a.position}</div> : null}
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                      <Link href={`/editor?id=${a.resumeId}`} className="max-w-[60%] truncate text-blue-600 hover:underline">
                        {resumes.find((r) => r.id === a.resumeId)?.title ?? a.resumeId}
                      </Link>
                      <span>
                        {a.appliedAt}
                        <button onClick={() => remove(a.id)} className="ml-2 text-red-500 hover:underline">删</button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
