import { notFound } from "next/navigation";
import { getResume } from "@/lib/resume/store";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { PrintPage, PrintPageStyle } from "@/components/templates/ResumePage";

/**
 * 打印渲染路由：完整版由 Playwright 调用生成 PDF（与编辑器预览共用模板组件，零偏差）。
 * 静态导出模式不参与（GitHub Pages 无服务端），构建时该路由不生成任何页面。
 */
export const dynamic = "force-dynamic";

/** 静态导出（GitHub Pages）时返回空集，该路由不生成静态页 */
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

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
