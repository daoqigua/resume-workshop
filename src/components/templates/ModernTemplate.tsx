import React from "react";
import type { TemplateProps } from "./ResumePage";
import { typeScale, PhotoBox, ClearFloat } from "./ResumePage";
import { RichText } from "./RichText";
import { SECTION_LABELS, type SectionKey } from "@/lib/resume/schema";

function rangeText(r: { start: string; end: string }): string {
  const s = r.start || "";
  const e = r.end || "";
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** hex → 透明度色值（技能胶囊 / 头部色带底色）；非法输入回退默认蓝 */
function tint(hex: string | undefined, alpha: number): string {
  const n = (hex ?? "").replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) || 0x2f;
  const g = parseInt(n.slice(2, 4), 16) || 0x5a;
  const b = parseInt(n.slice(4, 6), 16) || 0xa8;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 现代简约模板：主题色头部色带 + 左侧色条节标题 + 标签化技能。
 * 注：为保证多页打印零偏差，采用单栏结构（双栏跨页打印是行业难题，
 * Reactive Resume 亦需手动分页），视觉现代度通过色彩与排版实现。
 */
export function ModernTemplate({ data, settings, photoUrl }: TemplateProps) {
  const t = typeScale(settings.fontSize);
  const c = settings.themeColor;
  const gray = "#57606a";

  // 节标题用 borderLeft 色条（禁止 absolute 定位：会打乱 PDF 内容流顺序，ATS/解析器读取受影响）
  const titleStyle: React.CSSProperties = {
    fontSize: t.h2,
    fontWeight: 700,
    margin: "14px 0 8px",
    paddingLeft: 10,
    borderLeft: `5px solid ${c}`,
  };

  const itemHead: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  };

  const bullet = (line: string, i: number) => (
    <div key={i} className="resume-item" style={{ display: "flex", gap: 6, margin: "3px 0" }}>
      <span style={{ color: c }}>▪</span>
      <div style={{ flex: 1 }}>
        <RichText text={line} />
      </div>
    </div>
  );

  const renderSection = (key: SectionKey) => {
    if (key === "education" && data.education.length) {
      return (
        <section key={key}>
          <h2 style={titleStyle}>{SECTION_LABELS.education}
          </h2>
          {data.education.map((e) => (
            <div key={e.id} className="resume-item" style={{ margin: "6px 0" }}>
              <div style={itemHead}>
                <span style={{ fontWeight: 700, fontSize: t.h3 }}>
                  {e.school}
                </span>
                <span style={{ color: gray, fontSize: t.small }}>
                  {rangeText(e.range)}
                </span>
              </div>
              <div>
                {e.degree}
                {e.major ? ` · ${e.major}` : ""}
              </div>
              {e.note ? (
                <div style={{ color: gray, fontSize: t.small }}>{e.note}</div>
              ) : null}
              {e.highlights.map((h, i) => bullet(h, i))}
            </div>
          ))}
        </section>
      );
    }
    if (key === "experience" && data.experience.length) {
      return (
        <section key={key}>
          <h2 style={titleStyle}>{SECTION_LABELS.experience}
          </h2>
          {data.experience.map((e) => (
            <div key={e.id} className="resume-item" style={{ margin: "6px 0" }}>
              <div style={itemHead}>
                <span>
                  <span style={{ fontWeight: 700, fontSize: t.h3 }}>
                    {e.company}
                  </span>
                  {e.position ? (
                    <span style={{ color: c, marginLeft: 8 }}>{e.position}</span>
                  ) : null}
                </span>
                <span style={{ color: gray, fontSize: t.small }}>
                  {rangeText(e.range)}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </div>
              {e.bullets.map((b, i) => bullet(b, i))}
            </div>
          ))}
        </section>
      );
    }
    if (key === "projects" && data.projects.length) {
      return (
        <section key={key}>
          <h2 style={titleStyle}>{SECTION_LABELS.projects}
          </h2>
          {data.projects.map((p) => (
            <div key={p.id} className="resume-item" style={{ margin: "6px 0" }}>
              <div style={itemHead}>
                <span>
                  <span style={{ fontWeight: 700, fontSize: t.h3 }}>{p.name}</span>
                  {p.role ? (
                    <span style={{ color: c, marginLeft: 8 }}>{p.role}</span>
                  ) : null}
                </span>
                <span style={{ color: gray, fontSize: t.small }}>
                  {rangeText(p.range)}
                </span>
              </div>
              {p.link ? (
                <div style={{ color: gray, fontSize: t.small }}>{p.link}</div>
              ) : null}
              {p.bullets.map((b, i) => bullet(b, i))}
            </div>
          ))}
        </section>
      );
    }
    if (key === "skills" && data.skills.length) {
      return (
        <section key={key}>
          <h2 style={titleStyle}>{SECTION_LABELS.skills}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.skills.map((s) => (
              <span
                key={s.id}
                className="resume-item"
                style={{
                  border: `1px solid ${c}`,
                  color: c,
                  background: tint(c, 0.07),
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: t.small,
                }}
                title={s.detail}
              >
                {s.name}
                {s.detail ? ` · ${s.detail}` : ""}
              </span>
            ))}
          </div>
        </section>
      );
    }
    return null;
  };

  return (
    <div>
      <header
        style={{
          background: tint(c, 0.1),
          borderRadius: 6,
          padding: "18px 20px",
          marginBottom: 8,
        }}
      >
        <PhotoBox url={photoUrl} />
        <h1 style={{ fontSize: t.h1, fontWeight: 700, margin: 0, color: c }}>
          {data.basics.name || " "}
        </h1>
        {data.basics.headline ? (
          <div style={{ fontSize: t.h3, color: "#1f2328", marginTop: 2 }}>
            {data.basics.headline}
          </div>
        ) : null}
        <div
          style={{
            color: gray,
            fontSize: t.small,
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 14px",
          }}
        >
          {[
            data.basics.phone,
            data.basics.email,
            data.basics.location,
            data.basics.website,
          ]
            .filter(Boolean)
            .map((x, i) => (
              <span key={i}>{x}</span>
            ))}
        </div>
        <ClearFloat />
      </header>
      {data.basics.summary ? (
        <section>
          <h2 style={titleStyle}>个人简介</h2>
          <p className="resume-item" style={{ margin: 0, textAlign: "justify" }}>
            <RichText text={data.basics.summary} />
          </p>
        </section>
      ) : null}
      {data.sectionOrder.map(renderSection)}
    </div>
  );
}
