import { NextRequest, NextResponse } from "next/server";
import { matchJd } from "@/lib/ai/jdMatch";
import { getResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST { resumeId, jd } → { report, ai }（不落库，展示用；派生版本时快照） */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const jd = String(body.jd ?? "").trim();
  if (!jd) return NextResponse.json({ error: "jd required" }, { status: 400 });
  const doc = await getResume(String(body.resumeId ?? ""));
  if (!doc) return NextResponse.json({ error: "resume not found" }, { status: 404 });

  const { report, ai } = await matchJd(jd, doc.data);
  return NextResponse.json({ report, ai });
}
