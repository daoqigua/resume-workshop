import { NextRequest, NextResponse } from "next/server";
import { listResumes, createResume } from "@/lib/resume/store";
import type { ResumeDoc } from "@/lib/resume/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listResumes());
}

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    data?: ResumeDoc["data"];
    settings?: ResumeDoc["settings"];
    parentResumeId?: string;
    targetJd?: string;
    jdMatch?: ResumeDoc["jdMatch"];
  } = {};
  try {
    body = await req.json();
  } catch {
    // 允许空 body
  }
  const doc = await createResume(body);
  return NextResponse.json(doc, { status: 201 });
}
