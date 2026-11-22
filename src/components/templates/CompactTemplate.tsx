import React from "react";
import type { TemplateProps } from "./ResumePage";
import { typeScale } from "./ResumePage";
import { RichText } from "./RichText";
import { SECTION_LABELS, type SectionKey } from "@/lib/resume/schema";

function rangeText(r: { start: string; end: string }): string {
  const s = r.start || "";
  const e = r.end || "";
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** 应届生紧凑模板：左对齐抬头、行距紧凑、单页信息密度最大 */
export function CompactTemplate({ data, settings, photoUrl }: TemplateProps) {
  const t = typeScale(settings.fontSize);
  const c = settings.themeColor;
  const gray = "#57606a";

  const titleStyle: React.CSSProperties = {
    fontSize: t.h2,
    fontWeight: 700,
    margin: "10px 0 5px",
    borderBottom: "1px solid #d0d7de",
    paddingBottom: 2,
  };

  const itemHead: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  };

  const bullet = (line: string, i: number) => (
    <div key={i} className="resume-item" style={{ display: "flex", gap: 6, margin: "2px 0" }}>
      <span style={{ color: gray }}>·</span>
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
            <div key={e.id} className="resume-item" style={{ margin: "4px 0" }}>
              <div style={itemHead}>
                <span>
                  <span style={{ fontWeight: 700 }}>{e.school}</span>
                  <span style={{ marginLeft: 8 }}>
                    {e.degree}
                    {e.major ? ` · ${e.major}` : ""}
                  </span>
                </span>
                <span style={{ color: gray, fontSize: t.small }}>
                  {rangeText(e.range)}
                </span>
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
            <div key={e.id} className="resume-item" style={{ margin: "4px 0" }}>
              <div style={itemHead}>
                <span>
                  <span style={{ fontWeight: 700 }}>{e.company}</span>
                  {e.position ? (
                    <span style={{ marginLeft: 8, color: c }}>{e.position}</span>
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
            <div key={p.id} className="resume-item" style={{ margin: "4px 0" }}>
              <div style={itemHead}>
                <span>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.role ? (
                    <span style={{ marginLeft: 8, color: c }}>{p.role}</span>
                  ) : null}
                </span>
                <span style={{ color: gray, fontSize: t.small }}>
                  {rangeText(p.range)}
                </span>
              </div>
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
          <div style={{ margin: "2px 0" }}>
            {data.skills.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 ? (
                  <span style={{ color: "#c9d1d9", margin: "0 6px" }}>|</span>
                ) : null}
                <span className="resume-item">
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  {s.detail ? (
                    <span style={{ color: gray }}>（{s.detail}）</span>
                  ) : null}
                </span>
              </React.Fragment>
            ))}
          </div>
        </section>
      );
    }
    return null;
  };

  return (
    <div style={{ lineHeight: 1.45 }}>
      <header style={{ ...itemHead, alignItems: "center" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: t.h1, fontWeight: 700, margin: 0, display: "inline" }}>
            {data.basics.name || " "}
          </h1>
          {data.basics.headline ? (
            <span style={{ color: c, marginLeft: 10, fontSize: t.h3 }}>
              {data.basics.headline}
            </span>
          ) : null}
          <div style={{ color: gray, fontSize: t.small, marginTop: 4 }}>
            {[
              data.basics.phone,
              data.basics.email,
              data.basics.location,
              data.basics.website,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </span>
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt="证件照"
            style={{
              width: 84,
              height: 116,
              objectFit: "cover",
              marginLeft: 12,
              borderRadius: 3,
              border: "1px solid #e5e7eb",
            }}
          />
        ) : null}
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
