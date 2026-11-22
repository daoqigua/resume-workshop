import React from "react";
import type { TemplateProps } from "./ResumePage";
import { typeScale, PhotoBox, ClearFloat } from "./ResumePage";
import { RichText } from "./RichText";
import {
  SECTION_LABELS,
  type SectionKey,
} from "@/lib/resume/schema";

function rangeText(r: { start: string; end: string }): string {
  const s = r.start || "";
  const e = r.end || "";
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** 经典单栏模板：居中抬头 + 分隔线节标题，信息密度均衡，ATS 最友好 */
export function ClassicTemplate({ data, settings, photoUrl }: TemplateProps) {
  const t = typeScale(settings.fontSize);
  const c = settings.themeColor;
  const gray = "#57606a";

  const titleStyle: React.CSSProperties = {
    fontSize: t.h2,
    fontWeight: 700,
    color: c,
    borderBottom: "1.5px solid " + c,
    paddingBottom: 4,
    margin: "14px 0 8px",
    letterSpacing: 1,
  };

  const itemHead: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  };

  const bullet = (line: string, i: number) => (
    <div key={i} className="resume-item" style={{ display: "flex", gap: 6, margin: "3px 0" }}>
      <span style={{ color: c }}>•</span>
      <div style={{ flex: 1 }}>
        <RichText text={line} />
      </div>
    </div>
  );

  const renderSection = (key: SectionKey) => {
    if (key === "education" && data.education.length) {
      return (
        <section key={key}>
          <h2 style={titleStyle}>{SECTION_LABELS.education}</h2>
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
              <div style={{ fontSize: t.body }}>
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
          <h2 style={titleStyle}>{SECTION_LABELS.experience}</h2>
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
          <h2 style={titleStyle}>{SECTION_LABELS.projects}</h2>
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
          <h2 style={titleStyle}>{SECTION_LABELS.skills}</h2>
          {data.skills.map((s) => (
            <div key={s.id} className="resume-item" style={{ margin: "3px 0" }}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              {s.detail ? (
                <span style={{ color: gray }}>：{s.detail}</span>
              ) : null}
            </div>
          ))}
        </section>
      );
    }
    return null;
  };

  return (
    <div>
      <header style={{ textAlign: "center", marginBottom: 6 }}>
        <PhotoBox url={photoUrl} />
        <h1
          style={{
            fontSize: t.h1,
            fontWeight: 700,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          {data.basics.name || " "}
        </h1>
        {data.basics.headline ? (
          <div style={{ color: c, fontSize: t.h3, marginTop: 2 }}>
            {data.basics.headline}
          </div>
        ) : null}
        <div
          style={{
            color: gray,
            fontSize: t.small,
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2px 10px",
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
              <React.Fragment key={i}>
                {i > 0 ? <span style={{ color: "#c9d1d9" }}>|</span> : null}
                <span>{x}</span>
              </React.Fragment>
            ))}
        </div>
        <ClearFloat />
      </header>
      <div style={{ borderTop: `2.5px solid ${c}`, margin: "8px 0 2px" }} />
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
