/* 诊断：银行 PDF 视觉重建行序 + 规则解析输出 */
import fs from "node:fs";
import { extractPdfText } from "../src/lib/parse/extract.ts";
import { parseResumeText } from "../src/lib/parse/parser.ts";

const buf = new Uint8Array(fs.readFileSync("tmp/bank.pdf"));
const text = await extractPdfText(buf);
console.log("=== 重建行序（前 32 行）===");
text.split("\n").slice(0, 32).forEach((l, i) => console.log(String(i + 1).padStart(2), l.slice(0, 60)));

console.log("\n=== 规则解析 ===");
const r = parseResumeText(text);
const d = r.data;
console.log("edu:", d.education.map((e) => e.school + "/" + e.degree + "/" + e.major).join(" | "));
console.log("exp:", d.experience.map((e) => e.company + "/" + e.position + " b:" + e.bullets.length).join(" | "));
console.log("proj:", d.projects.map((p) => p.name + "/" + p.role + " b:" + p.bullets.length).join(" | "));
console.log("skills:", d.skills.map((s) => s.name).join(","));
console.log("summary:", d.basics.summary.slice(0, 60));
