import { NextRequest, NextResponse } from "next/server";
import { matchJd, rewriteForJd } from "@/lib/ai/jdMatch";
import { getResume, createResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST { resumeId, jd } → 按 JD 定向改写并创建「一岗一简历」版本（独立简历，可编辑/导出）。
 * 返回 { id, title, ai, matchScore }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const jd = String(body.jd ?? "").trim();
  if (!jd) return NextResponse.json({ error: "jd required" }, { status: 400 });
  const doc = await getResume(String(body.resumeId ?? ""));
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });

  // 先算对标报告（作为版本快照），再定向改写
  const { report } = await matchJd(jd, doc.data);
  const { data, ai } = await rewriteForJd(jd, doc.data);

  const title = `【JD 版】${doc.data.basics.headline || doc.title}`;
  const newDoc = await createResume({
    title,
    data: data ?? doc.data,
    settings: doc.settings,
    parentResumeId: doc.id,
    targetJd: jd,
    jdMatch: report,
  });

  return NextResponse.json(
    { id: newDoc.id, title: newDoc.title, ai, matchScore: report.score },
    { status: 201 },
  );
}
