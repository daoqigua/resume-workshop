import { NextRequest, NextResponse } from "next/server";
import { listApplications, createApplication } from "@/lib/resume/applicationStore";
import { getResume } from "@/lib/resume/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listApplications());
}

/** POST { resumeId, company, position, status?, note? } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const resumeId = String(body.resumeId ?? "");
  const company = String(body.company ?? "").trim();
  const position = String(body.position ?? "").trim();
  if (!resumeId || !company) {
    return NextResponse.json({ error: "resumeId 与 company 必填" }, { status: 400 });
  }
  const doc = await getResume(resumeId);
  if (!doc) return NextResponse.json({ error: "简历不存在" }, { status: 404 });

  const created = await createApplication({
    resumeId,
    company,
    position,
    status: body.status,
    note: body.note,
  });
  return NextResponse.json(created, { status: 201 });
}
