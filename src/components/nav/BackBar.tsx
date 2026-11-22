import Link from "next/link";
import type { ReactNode } from "react";

/** 子页面统一顶栏：返回首页 + 标题 + 右侧扩展区 */
export function BackBar({
  title,
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-6 py-2.5">
      <Link href="/" className="text-sm text-blue-700 hover:underline">
        ← 返回首页
      </Link>
      {title ? <span className="text-sm font-medium text-gray-600">{title}</span> : null}
      <span className="flex-1" />
      {children}
    </div>
  );
}
