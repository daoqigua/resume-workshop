"use client";

import React, { useState } from "react";
import { Btn, Field, RangeFields } from "./ui";
import type {
  EduItem,
  ExpItem,
  ProjectItem,
  SkillItem,
  SectionKey,
} from "@/lib/resume/schema";
import type { EditorStore } from "./EditorStore";

/* ---------- 条目卡片外壳 ---------- */

export function ItemCard({
  title,
  onUp,
  onDown,
  onDelete,
  children,
}: {
  title: string;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="max-w-[60%] truncate text-sm font-medium text-gray-700">{title}</span>
        <span className="flex gap-1">
          <Btn kind="ghost" onClick={onUp} title="上移">↑</Btn>
          <Btn kind="ghost" onClick={onDown} title="下移">↓</Btn>
          <Btn kind="danger" onClick={onDelete} title="删除">删除</Btn>
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** 交换数组两项 */
function swap<T>(arr: T[], i: number, j: number): void {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
}

/* ---------- bullet 列表（每行一个 AI 润色按钮） ---------- */

function BulletList({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
}) {
  const [notes, setNotes] = useState<Record<number, string[]>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});

  async function polish(i: number) {
    setBusy((b) => ({ ...b, [i]: true }));
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bullets[i] }),
      });
      const out = await res.json();
      if (out.ai && out.text) {
        const next = [...bullets];
        next[i] = out.text;
        onChange(next);
      }
      setNotes((n) => ({ ...n, [i]: out.notes ?? [] }));
    } finally {
      setBusy((b) => ({ ...b, [i]: false }));
    }
  }

  return (
    <div className="space-y-1.5">
      {bullets.map((line, i) => (
        <div key={i}>
          <div className="flex items-start gap-1">
            <textarea
              value={line}
              rows={2}
              placeholder="一条描述（支持 **加粗**）"
              onChange={(e) => {
                const next = [...bullets];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm leading-6 focus:border-blue-600 focus:outline-none"
            />
            <span className="flex flex-col gap-1">
              <Btn onClick={() => polish(i)} disabled={busy[i]} title="AI 润色（免费额度）">
                {busy[i] ? "…" : "AI"}
              </Btn>
              <Btn kind="danger" onClick={() => onChange(bullets.filter((_, j) => j !== i))}>
                ✕
              </Btn>
            </span>
          </div>
          {notes[i]?.length ? (
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-700">
              {notes[i].map((n, k) => (
                <li key={k}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      <Btn onClick={() => onChange([...bullets, ""])}>+ 添加一条</Btn>
    </div>
  );
}

/* ---------- 分区表单 ---------- */

function move(store: EditorStore, key: "education" | "experience" | "projects" | "skills", i: number, dir: -1 | 1): void {
  store.getState().mutateData((d) => {
    const arr = d[key];
    const j = i + dir;
    if (j >= 0 && j < arr.length) swap(arr as unknown[], i, j);
  });
}

export function SectionForm({
  store,
  sectionKey,
}: {
  store: EditorStore;
  sectionKey: SectionKey;
}) {
  const { data } = useStoreData(store);

  if (sectionKey === "education") {
    const arr = data.education;
    return (
      <SectionShell>
        {arr.map((e: EduItem, i) => (
          <ItemCard
            key={e.id}
            title={e.school || "新学校"}
            onUp={() => move(store, "education", i, -1)}
            onDown={() => move(store, "education", i, 1)}
            onDelete={() => store.getState().mutateData((d) => void d.education.splice(i, 1))}
          >
            <div className="flex gap-2">
              <Field label="学校" value={e.school} width="half" onChange={(v) => store.getState().mutateData((d) => { d.education[i].school = v; })} />
              <Field label="学历" value={e.degree} width="half" placeholder="本科/硕士" onChange={(v) => store.getState().mutateData((d) => { d.education[i].degree = v; })} />
            </div>
            <Field label="专业" value={e.major} onChange={(v) => store.getState().mutateData((d) => { d.education[i].major = v; })} />
            <RangeFields
              start={e.range.start}
              end={e.range.end}
              onStart={(v) => store.getState().mutateData((d) => { d.education[i].range.start = v; })}
              onEnd={(v) => store.getState().mutateData((d) => { d.education[i].range.end = v; })}
            />
            <Field label="备注（GPA/排名）" value={e.note} onChange={(v) => store.getState().mutateData((d) => { d.education[i].note = v; })} />
            <div className="text-xs text-gray-500">在校亮点</div>
            <BulletList
              bullets={e.highlights}
              onChange={(next) => store.getState().mutateData((d) => { d.education[i].highlights = next; })}
            />
          </ItemCard>
        ))}
        <Btn
          kind="primary"
          onClick={() =>
            store.getState().mutateData((d) => {
              d.education.push({
                id: `edu_${Date.now().toString(36)}`,
                school: "",
                degree: "",
                major: "",
                range: { start: "", end: "" },
                note: "",
                highlights: [],
              });
            })
          }
        >
          + 添加教育经历
        </Btn>
      </SectionShell>
    );
  }

  if (sectionKey === "experience") {
    const arr = data.experience;
    return (
      <SectionShell>
        {arr.map((e: ExpItem, i) => (
          <ItemCard
            key={e.id}
            title={e.company || "新经历"}
            onUp={() => move(store, "experience", i, -1)}
            onDown={() => move(store, "experience", i, 1)}
            onDelete={() => store.getState().mutateData((d) => void d.experience.splice(i, 1))}
          >
            <div className="flex gap-2">
              <Field label="公司/组织" value={e.company} width="half" onChange={(v) => store.getState().mutateData((d) => { d.experience[i].company = v; })} />
              <Field label="职位" value={e.position} width="half" onChange={(v) => store.getState().mutateData((d) => { d.experience[i].position = v; })} />
            </div>
            <div className="flex gap-2">
              <Field label="城市" value={e.location} width="half" onChange={(v) => store.getState().mutateData((d) => { d.experience[i].location = v; })} />
              <RangeFields
                start={e.range.start}
                end={e.range.end}
                onStart={(v) => store.getState().mutateData((d) => { d.experience[i].range.start = v; })}
                onEnd={(v) => store.getState().mutateData((d) => { d.experience[i].range.end = v; })}
              />
            </div>
            <div className="text-xs text-gray-500">工作内容 / 业绩</div>
            <BulletList
              bullets={e.bullets}
              onChange={(next) => store.getState().mutateData((d) => { d.experience[i].bullets = next; })}
            />
          </ItemCard>
        ))}
        <Btn
          kind="primary"
          onClick={() =>
            store.getState().mutateData((d) => {
              d.experience.push({
                id: `exp_${Date.now().toString(36)}`,
                company: "",
                position: "",
                range: { start: "", end: "" },
                location: "",
                bullets: [""],
              });
            })
          }
        >
          + 添加工作经历
        </Btn>
      </SectionShell>
    );
  }

  if (sectionKey === "projects") {
    const arr = data.projects;
    return (
      <SectionShell>
        {arr.map((p: ProjectItem, i) => (
          <ItemCard
            key={p.id}
            title={p.name || "新项目"}
            onUp={() => move(store, "projects", i, -1)}
            onDown={() => move(store, "projects", i, 1)}
            onDelete={() => store.getState().mutateData((d) => void d.projects.splice(i, 1))}
          >
            <div className="flex gap-2">
              <Field label="项目名" value={p.name} width="half" onChange={(v) => store.getState().mutateData((d) => { d.projects[i].name = v; })} />
              <Field label="角色" value={p.role} width="half" onChange={(v) => store.getState().mutateData((d) => { d.projects[i].role = v; })} />
            </div>
            <Field label="链接" value={p.link} placeholder="github.com/…" onChange={(v) => store.getState().mutateData((d) => { d.projects[i].link = v; })} />
            <RangeFields
              start={p.range.start}
              end={p.range.end}
              onStart={(v) => store.getState().mutateData((d) => { d.projects[i].range.start = v; })}
              onEnd={(v) => store.getState().mutateData((d) => { d.projects[i].range.end = v; })}
            />
            <BulletList
              bullets={p.bullets}
              onChange={(next) => store.getState().mutateData((d) => { d.projects[i].bullets = next; })}
            />
          </ItemCard>
        ))}
        <Btn
          kind="primary"
          onClick={() =>
            store.getState().mutateData((d) => {
              d.projects.push({
                id: `proj_${Date.now().toString(36)}`,
                name: "",
                role: "",
                link: "",
                range: { start: "", end: "" },
                bullets: [""],
              });
            })
          }
        >
          + 添加项目经历
        </Btn>
      </SectionShell>
    );
  }

  // skills
  const arr = data.skills;
  return (
    <SectionShell>
      {arr.map((s: SkillItem, i) => (
        <div key={s.id} className="flex items-end gap-2">
          <Field label="技能" value={s.name} width="half" onChange={(v) => store.getState().mutateData((d) => { d.skills[i].name = v; })} />
          <Field label="熟练度/说明" value={s.detail} width="half" placeholder="熟练" onChange={(v) => store.getState().mutateData((d) => { d.skills[i].detail = v; })} />
          <Btn kind="danger" onClick={() => store.getState().mutateData((d) => void d.skills.splice(i, 1))}>✕</Btn>
        </div>
      ))}
      <Btn
        kind="primary"
        onClick={() =>
          store.getState().mutateData((d) => {
            d.skills.push({ id: `sk_${Date.now().toString(36)}`, name: "", detail: "" });
          })
        }
      >
        + 添加技能
      </Btn>
    </SectionShell>
  );
}

/* ---------- 分节外壳 ---------- */

function SectionShell({ children }: { children: React.ReactNode }) {
  return <section className="space-y-2">{children}</section>;
}

/** 订阅 data 的 hook（浅订阅整棵树，编辑器规模足够） */
function useStoreData(store: EditorStore) {
  const data = store((s) => s.data);
  return { data };
}
