/* M0 验收①：PDF 结构与文本可提取性验证 */
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const file = process.argv[2] || "tmp/test-classic.pdf";
const buf = readFileSync(file);
const pdf = await getDocumentProxy(new Uint8Array(buf));
const { text, totalPages } = await extractText(pdf, { mergePages: true });

console.log("pages:", totalPages, "bytes:", buf.length);
const mustHave = [
  "王小明",
  "前端开发工程师",
  "华中科技大学",
  "计算机科学与技术",
  "某互联网科技有限公司",
  "高级前端工程师",
  "首屏加载时间从",
  "React / Next.js",
  "个人简介",
  "教育背景",
  "工作经历",
  "138-0013-8000",
  "wangxiaoming@example.com",
];
let pass = true;
for (const s of mustHave) {
  const ok = text.includes(s);
  if (!ok) pass = false;
  console.log(ok ? "  ✓" : "  ✗", s);
}
console.log(pass ? "TEXT-EXTRACT PASS" : "TEXT-EXTRACT FAIL");
console.log("---first 600 chars---");
console.log(text.slice(0, 600));
