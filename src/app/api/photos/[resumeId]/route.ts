import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getResume, updateResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "photos");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const EXT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function sanitizeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("invalid resume id");
  return id;
}

/** 找到该简历当前照片文件名（任意支持的后缀） */
async function findPhoto(id: string): Promise<string | null> {
  try {
    const files = await fs.readdir(DIR);
    return files.find((f) => f.startsWith(id + ".") && EXT_TYPE[path.extname(f)]) ?? null;
  } catch {
    return null;
  }
}

/** GET → 返回照片文件（编辑器 <img> 与打印路由共用） */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  const file = await findPhoto(sanitizeId(resumeId));
  if (!file) return NextResponse.json({ error: "no photo" }, { status: 404 });
  const buf = await fs.readFile(path.join(DIR, file));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": EXT_TYPE[path.extname(file)],
      "Cache-Control": "no-store",
    },
  });
}

/** PUT multipart { file } → 保存证件照（JPG/PNG/WebP ≤5MB），覆盖旧照片 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  const id = sanitizeId(resumeId);
  const doc = await getResume(id);
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "照片超过 5MB 限制" }, { status: 413 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!EXT_TYPE[ext]) {
    return NextResponse.json({ error: "仅支持 JPG / PNG 格式" }, { status: 415 });
  }

  await fs.mkdir(DIR, { recursive: true });
  // 覆盖前清理旧后缀文件
  const old = await findPhoto(id);
  if (old) await fs.unlink(path.join(DIR, old)).catch(() => {});
  await fs.writeFile(path.join(DIR, `${id}${ext}`), Buffer.from(await file.arrayBuffer()));

  // 时间戳作为缓存穿透参数写回简历文档
  await updateResume(id, { photo: String(Date.now()) });
  return NextResponse.json({ ok: true, photo: String(Date.now()) });
}

/** DELETE → 删除证件照 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;
  const id = sanitizeId(resumeId);
  const old = await findPhoto(id);
  if (old) await fs.unlink(path.join(DIR, old)).catch(() => {});
  await updateResume(id, { photo: "" });
  return NextResponse.json({ ok: true });
}
