"use client";

import { useState } from "react";
import { Btn } from "@/components/editor/ui";
import { getAiSettingsView, saveAiSettingsClient, testAiConnection } from "@/lib/data/client";

type SettingsView = {
  configured: boolean;
  source: "saved" | "env" | "none";
  aiBaseUrl: string;
  aiModel: string;
  apiKeyMasked: string;
};

/**
 * AI 设置弹窗：配置大模型 API（OpenAI 兼容）。
 * 完整版存服务端；静态演示版存浏览器本地（AI 由浏览器直连）。
 * API Key 掩码显示，不回显明文；留空保存 = 保留原值。
 */
export function AiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SettingsView | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function openDialog() {
    setOpen(true);
    setMsg(null);
    setBusy(true);
    try {
      const v = await getAiSettingsView();
      setView(v);
      setBaseUrl(v.aiBaseUrl);
      setModel(v.aiModel);
      setApiKey("");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setMsg({ kind: "info", text: "测试中…（最长 30 秒）" });
    setBusy(true);
    try {
      const out = await testAiConnection({ aiBaseUrl: baseUrl, aiApiKey: apiKey, aiModel: model });
      setMsg(
        out.ok
          ? { kind: "ok", text: `连接成功（${(out.elapsed / 1000).toFixed(1)}s），模型返回正常` }
          : { kind: "err", text: out.error ?? "连接失败" },
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const v = await saveAiSettingsClient({ aiBaseUrl: baseUrl, aiApiKey: apiKey, aiModel: model });
      setView(v);
      setApiKey("");
      setMsg({ kind: "ok", text: "已保存，AI 功能立即生效" });
    } catch {
      setMsg({ kind: "err", text: "保存失败，请重试" });
    } finally {
      setBusy(false);
    }
  }

  const sourceText =
    view?.source === "saved" ? "界面配置" : view?.source === "env" ? "环境变量" : "未配置";

  return (
    <>
      <Btn onClick={openDialog} title="配置 AI 大模型 API">
        AI 设置
      </Btn>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">AI 设置（OpenAI 兼容接口）</h3>
              <Btn kind="ghost" onClick={() => setOpen(false)}>
                ✕
              </Btn>
            </div>
            <p className="mb-3 text-xs leading-5 text-gray-500">
              当前状态：
              {view?.configured ? (
                <span className="text-green-700">
                  已启用（来源：{sourceText}，Key {view.apiKeyMasked}）
                </span>
              ) : (
                <span className="text-amber-700">未配置——AI 功能使用本地规则引擎兜底</span>
              )}
              <br />
              兼容 GLM / DeepSeek / 通义等 OpenAI 格式接口；Key 不会回显明文。
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-500">API Base URL</span>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">API Key（已配置时留空 = 保留原值）</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={view?.configured ? view.apiKeyMasked : "sk-…"}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">模型名</span>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="glm-4-flash / deepseek-chat …"
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </label>
            </div>
            {msg ? (
              <div
                className={`mt-3 rounded px-2 py-1.5 text-xs ${
                  msg.kind === "ok"
                    ? "bg-green-50 text-green-700"
                    : msg.kind === "err"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-50 text-gray-600"
                }`}
              >
                {msg.text}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={testConnection} disabled={busy}>
                测试连接
              </Btn>
              <Btn kind="primary" onClick={save} disabled={busy}>
                保存
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
