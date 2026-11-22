/* 一次性迁移：API 路由的 dynamic/maxDuration 改为构建条件值（静态导出兼容） */
import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('git ls-files "src/app/api/**/route.ts"', { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

// 常量模块
fs.writeFileSync(
  "src/lib/routeFlags.ts",
  `/**
 * 路由标记的构建条件值：
 * 静态导出（GitHub Pages）时 API 路由不存在，dynamic/maxDuration 必须为 undefined。
 */
export const ROUTE_DYNAMIC = process.env.NEXT_PUBLIC_STATIC === "1" ? undefined : "force-dynamic";
export const ROUTE_MAX_DURATION = process.env.NEXT_PUBLIC_STATIC === "1" ? undefined : 300;
`,
);

for (const f of files) {
  let src = fs.readFileSync(f, "utf8");
  let changed = false;
  if (src.includes('export const dynamic = "force-dynamic";')) {
    src = src.replace(
      'export const dynamic = "force-dynamic";',
      "export const dynamic = ROUTE_DYNAMIC;",
    );
    // 追加 import（首个 import 之前）
    src = src.replace(
      /^(import .*?\n)/,
      'import { ROUTE_DYNAMIC, ROUTE_MAX_DURATION } from "@/lib/routeFlags";\n$1',
    );
    changed = true;
  }
  if (src.includes("export const maxDuration = 300;")) {
    src = src.replace("export const maxDuration = 300;", "export const maxDuration = ROUTE_MAX_DURATION;");
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(f, src);
    console.log("updated", f);
  }
}
console.log("done");
