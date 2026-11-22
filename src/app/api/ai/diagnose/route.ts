import { NextRequest, NextResponse } from "next/server";
import { diagnoseResume } from "@/lib/ai/diagnose";
import { getResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { id } → 诊断报告（免费功能） */
export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({ id: "" }));
  const doc = await getResume(id ?? "");
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });
  return NextResponse.json(await diagnoseResume(doc.data));
}
