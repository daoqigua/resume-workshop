import { NextRequest, NextResponse } from "next/server";
import { renderResumePdf } from "@/lib/playwright";
import { getResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { id } → PDF 文件流（免费无水印） */
export async function POST(req: NextRequest) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const doc = await getResume(id);
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const pdf = await renderResumePdf(`${origin}/print/${id}`);

  const filename = encodeURIComponent(`${doc.title || "简历"}.pdf`);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume-${id}.pdf"; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
