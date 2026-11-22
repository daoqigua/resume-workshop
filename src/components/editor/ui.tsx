"use client";

import React from "react";

/** 编辑器表单原语 */

export function Field({
  label,
  value,
  onChange,
  placeholder,
  width = "full",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: "full" | "half";
}) {
  return (
    <label className={`block ${width === "half" ? "w-[calc(50%-6px)]" : ""}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
      />
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">
        {label}
        {hint ? <span className="ml-2 text-gray-400">{hint}</span> : null}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm leading-6 focus:border-blue-600 focus:outline-none"
      />
    </label>
  );
}

export function Btn({
  children,
  onClick,
  kind = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const cls = {
    default: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
    primary: "bg-blue-700 text-white hover:bg-blue-800 border border-blue-700",
    ghost: "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent",
    danger: "text-red-600 hover:bg-red-50 border border-transparent",
  }[kind];
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

/** 日期区间两个字段 */
export function RangeFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Field label="开始" value={start} onChange={onStart} placeholder="2021.09" width="half" />
      <Field label="结束" value={end} onChange={onEnd} placeholder="至今" width="half" />
    </div>
  );
}
