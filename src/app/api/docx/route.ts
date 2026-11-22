import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { buildDocx } from "@/lib/export/docx";
import { getResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT_TYPE: Record<string, string> = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".webp": "webp",
};

/** POST { id } → Word (.docx) 文件流（免费，含证件照） */
export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  const doc = await getResume(String(id ?? ""));
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });

  // 读取证件照（若有）
  let photo: { buf: Uint8Array; ext: string } | undefined;
  if (doc.photo) {
    try {
      const dir = path.join(process.cwd(), "data", "photos");
      const file = (await fs.readdir(dir)).find(
        (f) => f.startsWith(`${doc.id}.`) && EXT_TYPE[path.extname(f)],
      );
      if (file) {
        photo = {
          buf: new Uint8Array(await fs.readFile(path.join(dir, file))),
          ext: path.extname(file),
        };
      }
    } catch {
      // 照片缺失不阻塞 Word 导出
    }
  }

  const blob = await buildDocx(doc.data, doc.settings, photo);
  const buf = Buffer.from(await blob.arrayBuffer());
  const filename = encodeURIComponent(`${doc.title || "简历"}.docx`);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="resume-${doc.id}.docx"; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
