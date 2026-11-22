import { notFound } from "next/navigation";
import { getResume } from "@/lib/resume/store";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { PrintPage, PrintPageStyle } from "@/components/templates/ResumePage";

/** 打印渲染路由：Playwright 的目标页面，与编辑器预览共用同一套模板组件 */
export const dynamic = "force-dynamic";

export default async function PrintView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getResume(id);
  if (!doc) notFound();

  return (
    <>
      <PrintPageStyle pageMargin={doc.settings.pageMargin} />
      <PrintPage settings={doc.settings}>
        <TemplateRenderer
          data={doc.data}
          settings={doc.settings}
          photoUrl={doc.photo ? `/api/photos/${doc.id}?v=${doc.photo}` : undefined}
        />
      </PrintPage>
    </>
  );
}
