import { NextRequest, NextResponse } from "next/server";
import { polishBullet } from "@/lib/ai/polish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { text } → { text, notes, ai } */
export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  return NextResponse.json(await polishBullet(text));
}
