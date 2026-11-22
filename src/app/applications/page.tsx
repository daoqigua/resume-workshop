import { listResumes } from "@/lib/resume/store";
import { ensureSeed } from "@/lib/seed";
import { ApplicationBoard } from "@/components/applications/ApplicationBoard";
import { BackBar } from "@/components/nav/BackBar";

export const metadata = { title: "投递追踪 — 简历工坊" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  await ensureSeed();
  const resumes = await listResumes();
  return (
    <>
      <BackBar title="一岗一简历 · 投递状态追踪" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ApplicationBoard resumes={resumes} />
      </main>
    </>
  );
}
