import { NextRequest, NextResponse } from "next/server";
import { listResumes, createResume } from "@/lib/resume/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listResumes());
}

export async function POST(req: NextRequest) {
  let body: { title?: string } = {};
  try {
    body = await req.json();
  } catch {
    // 允许空 body
  }
  const doc = await createResume({ title: body.title });
  return NextResponse.json(doc, { status: 201 });
}
