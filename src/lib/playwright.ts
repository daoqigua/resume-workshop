import { chromium, type Browser } from "playwright";

/**
 * Playwright 浏览器单例：首次调用启动，进程内复用。
 * 渲染链路：/print/[id]（与编辑器同一套模板组件 SSR）→ page.pdf → 零偏差 PDF。
 */
let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--font-render-hinting=none", "--disable-font-subpixel-positioning"],
    });
  }
  return browserPromise;
}

export async function renderResumePdf(
  url: string,
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    // 等待中文字体（思源黑体/宋体）全部就绪，避免 PDF 内字体替换
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, // 使用模板注入的 @page { size: A4; margin: … }
    });
    return Buffer.from(buf);
  } finally {
    await page.close();
  }
}
