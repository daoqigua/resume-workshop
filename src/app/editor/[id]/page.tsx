import { notFound } from "next/navigation";
import { getResume } from "@/lib/resume/store";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getResume(id);
  if (!doc) notFound();
  return <Editor initial={doc} />;
}
