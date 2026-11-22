"use client";

import { create } from "zustand";
import type { ResumeData, ResumeSettings, ResumeDoc } from "@/lib/resume/schema";

type EditorState = {
  id: string;
  title: string;
  data: ResumeData;
  settings: ResumeSettings;
  dirty: boolean;
  lastSavedAt: string | null;

  setTitle: (t: string) => void;
  setBasics: (patch: Partial<ResumeData["basics"]>) => void;
  mutateData: (fn: (d: ResumeData) => void) => void;
  setSettings: (patch: Partial<ResumeSettings>) => void;
  markSaved: () => void;
};

/** 编辑器状态：任何变更标记 dirty，由根组件防抖自动保存 */
export function createEditorStore(initial: ResumeDoc) {
  return create<EditorState>((set) => ({
    id: initial.id,
    title: initial.title,
    data: initial.data,
    settings: initial.settings,
    dirty: false,
    lastSavedAt: null,

    setTitle: (t) => set({ title: t, dirty: true }),
    setBasics: (patch) =>
      set((s) => ({ data: { ...s.data, basics: { ...s.data.basics, ...patch } }, dirty: true })),
    mutateData: (fn) =>
      set((s) => {
        // 结构化克隆后原地修改，保证 React 引用变化
        const next: ResumeData = structuredClone(s.data);
        fn(next);
        return { data: next, dirty: true };
      }),
    setSettings: (patch) =>
      set((s) => ({ settings: { ...s.settings, ...patch }, dirty: true })),
    markSaved: () => set({ dirty: false, lastSavedAt: new Date().toLocaleTimeString("zh-CN") }),
  }));
}

export type EditorStore = ReturnType<typeof createEditorStore>;
