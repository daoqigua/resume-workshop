import { CreateResumeClient } from "@/components/create/CreateResumeClient";
import { BackBar } from "@/components/nav/BackBar";

export const metadata = { title: "AI 生成简历 — 简历工坊" };

export default function CreatePage() {
  return (
    <>
      <BackBar title="从零生成，也可以先用 AI 帮你起草" />
      <CreateResumeClient />
    </>
  );
}
