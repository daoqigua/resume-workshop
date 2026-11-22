import { NextRequest, NextResponse } from "next/server";
import { getResume, updateResume, deleteResume } from "@/lib/resume/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const doc = await getResume(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let patch: { title?: string; data?: never; settings?: never };
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // data / settings 已在编辑器端做 schema 化处理，此处信任结构后透传
  const doc = await updateResume(id, patch);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteResume(id);
  return NextResponse.json({ ok });
}
