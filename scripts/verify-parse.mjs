/* M0 验收②：简历解析准确率测试
   语料 A：本平台经典模板导出 PDF
   语料 B：本平台现代模板导出 PDF
   语料 C：pdfkit 独立生成的 Word 风格 PDF（先运行 make-corpus-c.mjs）
   通过标准：字段级准确率 ≥ 90%
   输出写入 tmp/verify-out.txt（避免 Windows 控制台 GBK 乱码） */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const truth = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts/sample-data.json"), "utf8"),
);

const out = [];
const log = (...a) => {
  const line = a.join(" ");
  out.push(line);
};

async function exportPdf(data, template, title) {
  const doc = await fetch(`${BASE}/api/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  }).then((r) => r.json());
  await fetch(`${BASE}/api/resumes/${doc.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, settings: { template } }),
  });
  const res = await fetch(`${BASE}/api/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: doc.id }),
  });
  if (!res.ok) throw new Error(`pdf export failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function parsePdf(buf, name) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "application/pdf" }), name);
  const res = await fetch(`${BASE}/api/parse?dry=1`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`parse failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const city = (loc) => (loc || "").split("·")[0].trim();

function checksForAB(parsed, label) {
  const d = parsed.data;
  const c = [];
  const add = (desc, ok, got = "") => c.push({ label, desc, ok, got });
  add("姓名", d.basics.name === truth.basics.name, d.basics.name);
  add("求职意向", d.basics.headline.includes("前端开发"), d.basics.headline);
  add("电话", d.basics.phone === truth.basics.phone, d.basics.phone);
  add("邮箱", d.basics.email === truth.basics.email, d.basics.email);
  add("所在地", city(d.basics.location) === "北京", d.basics.location);
  add("教育条数", d.education.length === 1, String(d.education.length));
  const e = d.education[0] || {};
  add("学校", e.school === truth.education[0].school, e.school);
  add("学历", e.degree === truth.education[0].degree, e.degree);
  add("专业", (e.major || "").includes("计算机"), e.major);
  add("入学时间", e.range?.start === "2017.09", e.range?.start);
  add("毕业时间", e.range?.end === "2021.06", e.range?.end);
  add(
    "教育亮点数",
    (e.highlights || []).length === 2,
    JSON.stringify(e.highlights || []),
  );
  add("工作条数", d.experience.length === 2, String(d.experience.length));
  const x0 = d.experience[0] || {};
  add("公司1", x0.company === truth.experience[0].company, x0.company);
  add("职位1", x0.position === truth.experience[0].position, x0.position);
  add("工作时间1起", x0.range?.start === "2023.07", x0.range?.start);
  add("工作时间1止", x0.range?.end === "至今", x0.range?.end);
  add(
    "工作1条目数",
    (x0.bullets || []).length === 3,
    JSON.stringify(x0.bullets || []),
  );
  add("公司2", (d.experience[1] || {}).company === truth.experience[1].company, d.experience[1]?.company);
  add("项目条数", d.projects.length === 1, String(d.projects.length));
  add("项目名", (d.projects[0]?.name || "").includes("resume-kit"), d.projects[0]?.name);
  add("项目起始", d.projects[0]?.range?.start === "2024.03", d.projects[0]?.range?.start);
  add(
    "技能条数",
    label === "B" ? d.skills.length >= 1 : d.skills.length === 5,
    String(d.skills.length),
  );
  add("技能含React", d.skills.some((s) => s.name.includes("React")), d.skills.map((s) => s.name).join("|"));
  add("个人简介", d.basics.summary.includes("前端开发经验"), d.basics.summary.slice(0, 30));
  return c;
}

function checksForC(parsed) {
  const d = parsed.data;
  const c = [];
  const add = (desc, ok, got = "") => c.push({ label: "C", desc, ok, got });
  add("姓名", d.basics.name === "李华", d.basics.name);
  add("求职意向", d.basics.headline === "数据分析专员", d.basics.headline);
  add("电话", d.basics.phone === "139-1234-5678", d.basics.phone);
  add("邮箱", d.basics.email === "lihua@example.com", d.basics.email);
  add("所在地", (d.basics.location || "").startsWith("上海市"), d.basics.location);
  add("教育条数", d.education.length === 1, String(d.education.length));
  const e = d.education[0] || {};
  add("学校", e.school === "复旦大学", e.school);
  add("学历", e.degree === "本科", e.degree);
  add("专业", (e.major || "").includes("统计学"), e.major);
  add("入学时间", e.range?.start === "2018.09", e.range?.start);
  add("毕业时间", e.range?.end === "2022.06", e.range?.end);
  add("实习条数", d.experience.length === 1, String(d.experience.length));
  const x = d.experience[0] || {};
  add("实习公司", (x.company || "").includes("咨询"), x.company);
  add("实习职位", x.position === "数据分析实习生", x.position);
  add("实习起止", x.range?.start === "2021.06" && x.range?.end === "2021.12", `${x.range?.start}~${x.range?.end}`);
  add("实习条目数", (x.bullets || []).length === 2, JSON.stringify(x.bullets || []));
  add("项目条数", d.projects.length === 1, String(d.projects.length));
  add("项目名", (d.projects[0]?.name || "").includes("电商用户行为分析"), d.projects[0]?.name);
  add("技能条数", d.skills.length === 4, String(d.skills.length));
  add("技能熟练度", d.skills.filter((s) => s.detail === "熟练").length === 2, d.skills.map((s) => `${s.name}(${s.detail})`).join("|"));
  add("自我评价", d.basics.summary.includes("数据敏感"), d.basics.summary.slice(0, 30));
  return c;
}

// --- 生成 A/B 卷 PDF ---
const pdfA = await exportPdf(truth, "classic", "语料A 经典模板");
fs.writeFileSync("tmp/test-classic.pdf", pdfA);
const pdfB = await exportPdf(truth, "modern", "语料B 现代模板");
fs.writeFileSync("tmp/test-modern.pdf", pdfB);
log(`corpus A: ${pdfA.length} bytes, corpus B: ${pdfB.length} bytes`);

// --- 解析与断言 ---
const results = [];
const ra = await parsePdf(pdfA, "test-classic.pdf");
const rb = await parsePdf(pdfB, "test-modern.pdf");
const rc = await parsePdf(fs.readFileSync("tmp/corpus-c.pdf"), "corpus-c.pdf");
results.push(...checksForAB(ra, "A"));
results.push(...checksForAB(rb, "B"));
results.push(...checksForC(rc));

let pass = 0;
const perCorpus = { A: [0, 0], B: [0, 0], C: [0, 0] };
for (const r of results) {
  if (r.ok) {
    pass++;
    perCorpus[r.label][0]++;
  }
  perCorpus[r.label][1]++;
  log(`${r.ok ? "✓" : "✗"} [${r.label}] ${r.desc}${r.ok ? "" : `  ← got: ${r.got}`}`);
}
const acc = ((pass / results.length) * 100).toFixed(1);
log("");
for (const [k, [p, t]] of Object.entries(perCorpus)) {
  log(`语料${k}: ${p}/${t}`);
}
log(`\n字段级准确率: ${pass}/${results.length} = ${acc}%`);
log(acc >= 90 ? "M0-② PASS (≥90%)" : "M0-② FAIL (<90%)");

fs.writeFileSync("tmp/verify-out.txt", out.join("\n"), "utf8");
console.log(`done: ${pass}/${results.length} = ${acc}% → tmp/verify-out.txt`);
process.exit(acc >= 90 ? 0 : 1);
