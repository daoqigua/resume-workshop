"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createEditorStore } from "./EditorStore";
import { SectionForm } from "./forms";
import { Btn, Field, Area } from "./ui";
import { AiSettingsDialog } from "@/components/settings/AiSettingsDialog";
import { JdMatchPanel } from "./JdMatchPanel";
import { PreviewPage, PAGE_WIDTH } from "@/components/templates/ResumePage";
import { TemplateRenderer, TEMPLATE_META, THEME_PRESETS } from "@/components/templates/TemplateRenderer";
import { SECTION_LABELS, type SectionKey } from "@/lib/resume/schema";
import type { ResumeDoc } from "@/lib/resume/schema";
import type { DiagnosisReport } from "@/lib/ai/diagnose";
import {
  IS_STATIC,
  updateResume,
  exportResumePdf,
  exportResumeDocx,
  uploadPhoto as clientUploadPhoto,
  deletePhoto as clientDeletePhoto,
  getPhotoUrl,
} from "@/lib/data/client";

export function Editor({ initial }: { initial: ResumeDoc }) {
  const [store] = useState(() => createEditorStore(initial));
  const [scale, setScale] = useState(0.62);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [jdOpen, setJdOpen] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  /** 证件照缓存穿透时间戳（初值来自文档；上传/删除后本地更新驱动预览刷新） */
  const [photoVersion, setPhotoVersion] = useState(initial.photo ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const title = store((s) => s.title);
  const data = store((s) => s.data);
  const settings = store((s) => s.settings);
  const dirty = store((s) => s.dirty);
  const lastSavedAt = store((s) => s.lastSavedAt);
  dirtyRef.current = dirty;

  /* ---------- 自动保存（防抖 800ms；双模式统一走 client 数据层） ---------- */
  const save = React.useCallback(async () => {
    const s = store.getState();
    await updateResume(s.id, { title: s.title, data: s.data, settings: s.settings });
    store.getState().markSaved();
  }, [store]);

  useEffect(() => {
    const unsub = store.subscribe((s, prev) => {
      if (!s.dirty) return;
      if (s.data === prev.data && s.title === prev.title && s.settings === prev.settings) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void save(), 800);
    });
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [store, save]);

  /* ---------- 预览缩放 ---------- */
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 48;
      setScale(Math.max(0.3, Math.min(1, w / PAGE_WIDTH)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- 导出 PDF ---------- */
  async function exportPdf() {
    setExporting(true);
    try {
      if (dirtyRef.current) await save();
      const s = store.getState();
      await exportResumePdf(s.id, s.title);
      if (IS_STATIC) {
        alert("已调起浏览器打印：在打印对话框中选择「另存为 PDF」，纸张 A4、边距按当前设置。");
      }
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    } finally {
      setExporting(false);
    }
  }

  /* ---------- 证件照 ---------- */
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const photoUrl = IS_STATIC ? (photoDataUrl ?? undefined) : photoVersion ? `/api/photos/${initial.id}?v=${photoVersion}` : undefined;

  useEffect(() => {
    if (!IS_STATIC) return;
    getPhotoUrl(initial.id).then((u) => setPhotoDataUrl(u));
  }, [initial.id]);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoBusy(true);
    try {
      const out = await clientUploadPhoto(initial.id, f);
      if (!out.ok) {
        alert(`上传失败：${out.error}`);
        return;
      }
      setPhotoVersion(out.photo ?? "");
      if (IS_STATIC) setPhotoDataUrl(await getPhotoUrl(initial.id));
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  }

  async function deletePhoto() {
    setPhotoBusy(true);
    try {
      await clientDeletePhoto(initial.id);
      setPhotoVersion("");
      setPhotoDataUrl(null);
    } finally {
      setPhotoBusy(false);
    }
  }

  /* ---------- 导出 Word ---------- */
  async function exportWord() {
    setExportingWord(true);
    try {
      if (dirtyRef.current) await save();
      const s = store.getState();
      await exportResumeDocx(s.id, s.title);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    } finally {
      setExportingWord(false);
    }
  }

  /* ---------- AI 诊断 ---------- */
  async function diagnose() {
    setDiagnosing(true);
    try {
      if (dirtyRef.current) await save();
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: store.getState().id }),
      });
      setReport(await res.json());
    } finally {
      setDiagnosing(false);
    }
  }

  function moveSection(key: SectionKey, dir: -1 | 1) {
    store.getState().mutateData((d) => {
      const order = d.sectionOrder;
      const i = order.indexOf(key);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < order.length) {
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
    });
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 工具栏 */}
      <header className="print-hide border-b bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-sm text-blue-700 hover:underline">
            ← 首页
          </Link>
          <input
            value={title}
            onChange={(e) => store.getState().setTitle(e.target.value)}
            className="w-48 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <span className="text-xs text-gray-400">
            {dirty ? "编辑中…" : lastSavedAt ? `已保存 ${lastSavedAt}` : "自动保存已开启"}
          </span>
          <span className="flex-1" />
          <Btn onClick={() => setJdOpen((v) => !v)} title="粘贴 JD 分析匹配度并生成对标版本">
            JD 对标
          </Btn>
          <AiSettingsDialog />
          <Btn onClick={diagnose} disabled={diagnosing}>
            {diagnosing ? "诊断中…" : "AI 诊断"}
          </Btn>
          <Btn onClick={exportWord} disabled={exportingWord} title="导出 Word 格式（国内 HR 常要）">
            {exportingWord ? "导出中…" : "导出 Word"}
          </Btn>
          <Btn kind="primary" onClick={exportPdf} disabled={exporting}>
            {exporting ? "导出中…" : "导出 PDF（免费无水印）"}
          </Btn>
        </div>
        {/* 样式工具行 */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            {(
              Object.keys(TEMPLATE_META) as (keyof typeof TEMPLATE_META)[]
            ).map((k) => (
              <button
                key={k}
                onClick={() => store.getState().setSettings({ template: k })}
                className={`rounded px-2 py-1 ${
                  settings.template === k
                    ? "bg-blue-700 text-white"
                    : "border border-gray-300 bg-white hover:bg-gray-50"
                }`}
                title={TEMPLATE_META[k].desc}
              >
                {TEMPLATE_META[k].label}
              </button>
            ))}
          </span>
          <label className="flex items-center gap-1">
            字体
            <select
              value={settings.fontFamily}
              onChange={(e) =>
                store.getState().setSettings({ fontFamily: e.target.value as "sans" | "serif" })
              }
              className="rounded border border-gray-300 px-1 py-0.5"
            >
              <option value="sans">思源黑体</option>
              <option value="serif">思源宋体</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            字号 {settings.fontSize}px
            <input
              type="range"
              min={12}
              max={16}
              value={settings.fontSize}
              onChange={(e) => store.getState().setSettings({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-1">
            边距 {settings.pageMargin}px
            <input
              type="range"
              min={32}
              max={64}
              step={4}
              value={settings.pageMargin}
              onChange={(e) => store.getState().setSettings({ pageMargin: Number(e.target.value) })}
            />
          </label>
          <span className="flex items-center gap-1">
            主题色
            {THEME_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => store.getState().setSettings({ themeColor: c })}
                style={{ background: c }}
                className={`h-4 w-4 rounded-full border-2 ${
                  settings.themeColor === c ? "border-gray-800" : "border-white"
                }`}
                title={c}
              />
            ))}
          </span>
        </div>
      </header>

      {/* JD 对标面板 */}
      {jdOpen ? <JdMatchPanel resumeId={initial.id} onClose={() => setJdOpen(false)} /> : null}

      {/* 诊断报告 */}
      {report ? (
        <div className="border-b bg-amber-50 px-4 py-2">
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2 py-0.5 text-sm font-bold text-white ${
                report.score >= 80 ? "bg-green-600" : report.score >= 60 ? "bg-amber-500" : "bg-red-600"
              }`}
            >
              {report.score} 分
            </span>
            {report.aiSummary ? (
              <span className="text-sm text-gray-700">AI 总评：{report.aiSummary}</span>
            ) : (
              <span className="text-xs text-gray-500">
                规则引擎诊断（配置 AI_API_KEY 后可启用大模型总评）
              </span>
            )}
            <span className="flex-1" />
            <Btn kind="ghost" onClick={() => setReport(null)}>关闭</Btn>
          </div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {report.issues.map((is, i) => (
              <li key={i}>
                <span
                  className={
                    is.level === "error"
                      ? "font-semibold text-red-600"
                      : is.level === "warning"
                        ? "font-semibold text-amber-600"
                        : "text-gray-500"
                  }
                >
                  [{is.level === "error" ? "重要" : is.level === "warning" ? "建议" : "提示"}]
                </span>
                <span className="ml-1 text-gray-600">{is.where}：</span>
                {is.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 主体：左表单 / 右预览 */}
      <div className="flex min-h-0 flex-1">
        <div className="print-hide w-[430px] shrink-0 space-y-5 overflow-y-auto bg-gray-100 p-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              {/* 证件照 */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-[100px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="证件照" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-center text-[10px] leading-4 text-gray-400">
                      证件照
                      <br />
                      一寸
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <label
                      className={`cursor-pointer rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 ${
                        photoBusy ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {photoUrl ? "更换照片" : "上传证件照"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        className="hidden"
                        onChange={uploadPhoto}
                      />
                    </label>
                    {photoUrl ? (
                      <Btn kind="danger" onClick={deletePhoto} disabled={photoBusy}>
                        删除
                      </Btn>
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-4 text-gray-400">
                    JPG/PNG，≤5MB
                    <br />
                    按一寸比例裁剪显示，模板右上角
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="姓名" value={data.basics.name} width="full" onChange={(v) => store.getState().setBasics({ name: v })} />
                <Field label="求职意向" value={data.basics.headline} width="full" placeholder="前端开发工程师" onChange={(v) => store.getState().setBasics({ headline: v })} />
                <Field label="电话" value={data.basics.phone} width="full" onChange={(v) => store.getState().setBasics({ phone: v })} />
                <Field label="邮箱" value={data.basics.email} width="full" onChange={(v) => store.getState().setBasics({ email: v })} />
                <Field label="所在地" value={data.basics.location} width="full" placeholder="北京 · 海淀区" onChange={(v) => store.getState().setBasics({ location: v })} />
                <Field label="主页/代码库" value={data.basics.website} width="full" placeholder="github.com/…" onChange={(v) => store.getState().setBasics({ website: v })} />
              </div>
              <div className="mt-2">
                <Area
                  label="个人简介"
                  rows={3}
                  value={data.basics.summary}
                  hint="年限 + 领域 + 最强业绩"
                  onChange={(v) => store.getState().setBasics({ summary: v })}
                />
              </div>
            </div>
          </section>

          {data.sectionOrder.map((key, idx) => (
            <section key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {SECTION_LABELS[key]}
                </h3>
                <span className="flex gap-1">
                  <Btn kind="ghost" onClick={() => moveSection(key, -1)} title="分节上移" disabled={idx === 0}>↑</Btn>
                  <Btn
                    kind="ghost"
                    onClick={() => moveSection(key, 1)}
                    title="分节下移"
                    disabled={idx === data.sectionOrder.length - 1}
                  >
                    ↓
                  </Btn>
                </span>
              </div>
              <SectionForm store={store} sectionKey={key} />
            </section>
          ))}
        </div>

        <div ref={previewBoxRef} className="print-area flex-1 overflow-y-auto bg-gray-200/60 p-6">
          <div className="preview-wrap mx-auto" style={{ width: PAGE_WIDTH * scale }}>
            <PreviewPage settings={settings} scale={scale}>
              <TemplateRenderer data={data} settings={settings} photoUrl={photoUrl} />
            </PreviewPage>
          </div>
        </div>
      </div>
    </div>
  );
}
