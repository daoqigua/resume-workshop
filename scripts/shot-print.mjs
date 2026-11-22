/* 打印路由截图：用于视觉验收 */
import { chromium } from "playwright";

const [, , urlArg, outArg] = process.argv;
const url = urlArg || "http://localhost:3001";
const out = outArg || "tmp/print-shot.png";

// 通过 API 取第一份简历 id
const list = await fetch(`${url}/api/resumes`).then((r) => r.json());
if (!list.length) throw new Error("no resumes");
const id = list[0].id;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
await page.goto(`${url}/print/${id}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved:", out, "resume:", id);
