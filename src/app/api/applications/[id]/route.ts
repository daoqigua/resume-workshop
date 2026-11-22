import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus, deleteApplication } from "@/lib/resume/applicationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { status } → 更新投递状态 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const doc = await updateApplicationStatus(id, body.status);
  if (!doc) return NextResponse.json({ error: "not found or invalid status" }, { status: 400 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json({ ok: await deleteApplication(id) });
}
