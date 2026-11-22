/* 跨平台静态演示版构建：
   1. 设置 NEXT_PUBLIC_STATIC=1
   2. 临时移出 src/app/api（静态导出不支持 Route Handlers）
   3. next build → out/
   4. 还原 src/app/api（try/finally 保证） */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const moveDirs = ["src/app/api", "src/app/print"];
const hidden = ".static-hidden";
process.env.NEXT_PUBLIC_STATIC = "1";

const moved = [];
for (const dir of moveDirs) {
  if (existsSync(dir)) {
    const dest = hidden + "/" + dir.replace(/[/]/g, "_");
    mkdirSync(path.dirname(dest), { recursive: true });
    renameSync(dir, dest);
    moved.push([dir, dest]);
    console.log("temporarily hidden:", dir);
  }
}
try {
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(cmd, ["next", "build"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  process.exitCode = result.status ?? 1;
} finally {
  for (const [dir, dest] of moved.reverse()) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    renameSync(dest, dir);
    console.log("restored:", dir);
  }
}
