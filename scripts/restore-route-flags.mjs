/* 一次性迁移（回滚）：恢复字面量 segment config（Next 编译期检查要求），删除 routeFlags */
import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('git ls-files "src/app/api/**/route.ts" "src/app/print/**/page.tsx"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let src = fs.readFileSync(f, "utf8");
  let changed = false;
  if (src.includes("export const dynamic = ROUTE_DYNAMIC;")) {
    src = src.replace("export const dynamic = ROUTE_DYNAMIC;", 'export const dynamic = "force-dynamic";');
    changed = true;
  }
  if (src.includes("export const maxDuration = ROUTE_MAX_DURATION;")) {
    src = src.replace("export const maxDuration = ROUTE_MAX_DURATION;", "export const maxDuration = 300;");
    changed = true;
  }
  src = src.replace('import { ROUTE_DYNAMIC, ROUTE_MAX_DURATION } from "@/lib/routeFlags";\n', "");
  if (changed) {
    fs.writeFileSync(f, src);
    console.log("restored", f);
  }
}
if (fs.existsSync("src/lib/routeFlags.ts")) {
  fs.unlinkSync("src/lib/routeFlags.ts");
  console.log("routeFlags.ts removed");
}
console.log("done");
