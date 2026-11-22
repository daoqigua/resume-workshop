import type { ResumeData, ResumeSettings, TemplateId } from "@/lib/resume/schema";
import { ClassicTemplate } from "./ClassicTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { CompactTemplate } from "./CompactTemplate";

export const TEMPLATE_META: Record<
  TemplateId,
  { label: string; desc: string }
> = {
  classic: { label: "经典单栏", desc: "居中抬头 · 分隔线标题 · ATS 最友好" },
  modern: { label: "现代简约", desc: "主题色头部 · 标签化技能 · 视觉现代" },
  compact: { label: "应届紧凑", desc: "左对齐抬头 · 高信息密度 · 单页最佳" },
};

export const THEME_PRESETS = [
  "#2f5aa8",
  "#1a7f5a",
  "#b3541e",
  "#7c3aed",
  "#2563eb",
  "#111827",
];

export function TemplateRenderer({
  data,
  settings,
  photoUrl,
}: {
  data: ResumeData;
  settings: ResumeSettings;
  photoUrl?: string;
}) {
  switch (settings.template) {
    case "modern":
      return <ModernTemplate data={data} settings={settings} photoUrl={photoUrl} />;
    case "compact":
      return <CompactTemplate data={data} settings={settings} photoUrl={photoUrl} />;
    case "classic":
    default:
      return <ClassicTemplate data={data} settings={settings} photoUrl={photoUrl} />;
  }
}
