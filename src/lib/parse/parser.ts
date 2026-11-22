import type {
  Basics,
  EduItem,
  ExpItem,
  ProjectItem,
  ResumeData,
  SkillItem,
  SectionKey,
} from "@/lib/resume/schema";
import { DEFAULT_SECTION_ORDER } from "@/lib/resume/schema";
import { stripBulletPrefix } from "@/components/templates/RichText";
import { PHONE_RE, EMAIL_RE, URL_RE } from "./patterns";

export { PHONE_RE, EMAIL_RE, URL_RE };

/**
 * 中文简历规则解析器：纯文本 → ResumeData。
 * 设计目标：常见中文简历（Word/PDF 导出、招聘网站导出、本平台模板）字段级准确率 ≥90%。
 * 结构：① 清洗分节 → ② 头部基本信息 → ③ 各节条目切分 → ④ 字段启发式抽取。
 */

export type ParseResult = {
  data: ResumeData;
  warnings: string[];
  /** 供 AI 兜底解析的原文（仅 dry 模式回传，落库不保存原文） */
  textChars: number;
};

// ---------- 常量 ----------

const SECTION_PATTERNS: { key: SectionKey | "summary"; re: RegExp }[] = [
  { key: "summary", re: /^(个人简介|自我评价|个人总结|个人优势|关于我|个人概述|评价)/ },
  { key: "education", re: /^(教育背景|教育经历|学习经历|教育信息)/ },
  { key: "experience", re: /^(工作经历|实习经历|工作经验|职业经历|任职经历|实习经验|工作与实习经历)/ },
  { key: "projects", re: /^(项目经历|项目经验|项目实践|项目作品)/ },
  { key: "skills", re: /^(技能特长|专业技能|个人技能|IT技能|技能证书|掌握技能|技能)/ },
];

/** 装饰性分隔行（-----、====、【教育背景】等） */
const DECOR_RE = /^[-=_—―·•*#]{3,}$/;
const BRACKET_HEADER_RE = /^[【\[]\s*(.+?)\s*[】\]]$/;

const CITY_RE =
  /(北京|上海|广州|深圳|杭州|武汉|成都|南京|西安|重庆|苏州|天津|长沙|郑州|青岛|合肥|福州|厦门|济南|大连|宁波|无锡|佛山|东莞|沈阳|哈尔滨|昆明|石家庄|南昌|贵阳|太原|南宁|兰州|海口|乌鲁木齐|银川|西宁|拉萨|呼和浩特|长春)/;

const DEGREE_RE = /(博士|硕士|MBA|研究生|本科|双学位|辅修|大专|专科|中专|高中)/;

const DATE_RANGE_RE =
  /((?:19|20)\d{2})\s*[.年/\-]\s*(?:(\d{1,2})\s*月?)?\s*[至到~～\-–—]{1,2}\s*(?:(?:(19|20)\d{2})\s*[.年/\-]\s*(?:(\d{1,2})\s*月?)?|至今|现在|目前|present)/i;

const BARE_DATE_RE = /((?:19|20)\d{2})\s*[.年/\-]\s*(\d{1,2})?/;

const BULLET_MARK_RE = /^\s*[•·●▪◦‣⁃*\-–—>＞✦✧]/;

const HEADLINE_HINT_RE =
  /(工程师|开发|产品经理|运营|设计师|分析师|经理|专员|助理|实习|教师|会计|审计|律师|销售|市场|运营|编辑|记者|翻译|护士|医生|咨询|顾问|管理培训生|管培生)/;

// ---------- 工具 ----------

function cleanLine(line: string): string {
  return line
    .replace(/[\u3000\u200b\u200e\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "2017年9月" / "2017.09" / "2017-09" → "2017.09" */
function normDate(y?: string, m?: string): string {
  if (!y) return "";
  const yy = y.replace(/[^0-9]/g, "");
  if (!m) return yy;
  const mm = String(Number(m.replace(/[^0-9]/g, "")));
  return `${yy}.${mm.padStart(2, "0")}`;
}

function extractRange(line: string): { start: string; end: string; rest: string } | null {
  const m = DATE_RANGE_RE.exec(line);
  if (m) {
    const start = normDate(m[1], m[2]);
    let end = "至今";
    if (m[3] || m[4]) {
      // 完整结束日期：m[3] 可能带 "19|20" 前缀捕获，重取整段
      const tail = line.slice(m.index + m[0].length);
      const endFull = /((?:19|20)\d{2})\s*[.年/\-]\s*(\d{1,2})?/.exec(
        line.slice(m.index, m.index + m[0].length).split(/[至到~～\-–—]{1,2}/)[1] || "",
      );
      end = endFull ? normDate(endFull[1], endFull[2]) : end;
      void tail;
    }
    const rest = (line.slice(0, m.index) + " " + line.slice(m.index + m[0].length))
      .replace(/^[·•●▪\s]+/, "")
      .replace(/[·•●▪\s]+$/, "")
      .trim();
    return { start, end, rest };
  }
  // 仅起始日期（教育行常见 "2018.09-2022.06" 已覆盖；裸日期行另处理）
  return null;
}

function splitMeta(rest: string): string[] {
  return rest
    .split(/[|｜/／|,，;；]| {2,}|\s{1}(?=\S)/)
    .map((s) => s.trim())
    .filter((s) => s && !/^[·•●▪]+$/.test(s));
}

/** meta 行拼接：日期行剩余部分 + 后续非 bullet 行 */
function joinMeta(r: { rest: string } | null, dateLine: string, chunk: Chunk): string {
  const rest = r ? r.rest : "";
  return [rest, ...chunk.meta.slice(1)].filter(Boolean).join(" ") || dateLine;
}

// ---------- 主流程 ----------

export function parseResumeText(rawText: string): ParseResult {
  const warnings: string[] = [];
  const PH_RE = /【[^】]*】/; // 模板占位符，如【姓名】

  // ① 清洗：合并断行、去页眉页脚
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(cleanLine)
    .filter((l) => l.length > 0 && !DECOR_RE.test(l) && !/第\s*\d+\s*页|共\s*\d+\s*页/.test(l));

  // ② 分节
  const sections: { key: SectionKey | "summary"; lines: string[] }[] = [];
  const header: string[] = [];
  let current: { key: SectionKey | "summary"; lines: string[] } | null = null;
  for (const line of lines) {
    const bracket = BRACKET_HEADER_RE.exec(line);
    const cand = bracket ? bracket[1] : line;
    const hit = SECTION_PATTERNS.find((p) => p.re.test(cand) && cand.length <= 12);
    if (hit) {
      if (current) sections.push(current);
      current = { key: hit.key, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else header.push(line);
  }
  if (current) sections.push(current);

  // ③ 头部 → basics
  const basics = parseBasics(header.join("\n"), warnings, PH_RE);

  // 无任何分节标题（第三方 PDF 常态）：按日期行切块 + 语义归类
  if (sections.length === 0) {
    const flat = parseFlat(lines);
    const data: ResumeData = {
      basics,
      education: flat.education,
      experience: flat.experience,
      projects: flat.projects,
      skills: flat.skills,
      sectionOrder: [...DEFAULT_SECTION_ORDER],
    };
    if (flat.summary && !basics.summary) basics.summary = flat.summary;
    warnings.push(...flat.warnings);
    if (!basics.name) warnings.push("未识别到姓名，请手动补全");
    if (!basics.phone && !basics.email) warnings.push("未识别到联系方式，请手动补全");
    return { data, warnings, textChars: rawText.length };
  }

  // ④ 各节
  const education: EduItem[] = [];
  const experience: ExpItem[] = [];
  const projects: ProjectItem[] = [];
  const skills: SkillItem[] = [];
  const found = new Set<SectionKey | "summary">();

  for (const sec of sections) {
    found.add(sec.key);
    if (sec.key === "summary") {
      const text = sec.lines.join(" ");
      if (text && !basics.summary) basics.summary = text;
    } else if (sec.key === "education") {
      parseEducation(sec.lines, education);
    } else if (sec.key === "experience") {
      parseExperience(sec.lines, experience);
    } else if (sec.key === "projects") {
      parseProjects(sec.lines, projects);
    } else if (sec.key === "skills") {
      parseSkills(sec.lines, skills);
    }
  }

  if (!basics.name) warnings.push("未识别到姓名，请手动补全");
  if (!basics.phone && !basics.email) warnings.push("未识别到联系方式，请手动补全");
  if (education.length === 0 && experience.length === 0) {
    warnings.push("未识别到教育/工作经历，请检查简历结构或手动填写");
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!found.has(key)) {
      const label: Record<SectionKey, string> = {
        education: "教育背景",
        experience: "工作经历",
        projects: "项目经历",
        skills: "技能特长",
      };
      warnings.push(`未识别到「${label[key]}」分节`);
    }
  }

  return {
    data: {
      basics,
      education,
      experience,
      projects,
      skills,
      sectionOrder: [...DEFAULT_SECTION_ORDER],
    },
    warnings,
    textChars: rawText.length,
  };
}

// ---------- basics ----------

function parseBasics(
  block: string,
  warnings: string[],
  PH_RE: RegExp,
): Basics {
  const b: Basics = {
    name: "",
    headline: "",
    phone: "",
    email: "",
    location: "",
    website: "",
    summary: "",
  };
  const lines = block.split("\n").filter(Boolean);
  if (lines.length === 0) return b;

  const labeled = (re: RegExp): string | null => {
    const m = re.exec(block);
    return m ? m[1].trim() : null;
  };
  /** 标签值若为模板占位符（如【姓名】）则置空并提示 */
  const setIfReal = (field: keyof Basics, value: string | null): void => {
    if (!value) return;
    if (PH_RE.test(value)) {
      warnings.push(`「${field === "name" ? "姓名" : field}」为模板占位符，请填写真实内容`);
      return;
    }
    (b[field] as string) = value;
  };

  setIfReal(
    "phone",
    labeled(/(?:电\s*话|手\s*机|联\s*系\s*方\s*式|tel|mobile)\s*[:：]\s*([\d\- +()]{7,20})/i),
  );
  if (!b.phone) {
    const m = PHONE_RE.exec(block);
    if (m) b.phone = m[0];
  }
  b.email = EMAIL_RE.exec(block)?.[0] ?? "";
  b.website = URL_RE.exec(block)?.[1] ?? "";
  setIfReal(
    "location",
    labeled(/(?:现\s*居|常\s*住|所\s*在\s*地|坐\s*标|地\s*址)\s*[:：]\s*(.+)/),
  );
  if (!b.location) {
    // 逐行剥离电话/邮箱/链接等已知 token，剩余片段含城市 → 所在地
    for (const l of lines) {
      const frag = l
        .replace(PHONE_RE, " ")
        .replace(EMAIL_RE, " ")
        .replace(URL_RE, " ")
        .replace(/(?:电\s*话|手\s*机|邮\s*箱|email|tel|联\s*系\s*方\s*式)\s*[:：]/gi, " ")
        .replace(/^[·•\s|｜]+/, "")
        .replace(/[·•\s|｜]+$/, "")
        .trim();
      if (CITY_RE.test(frag) && frag.length <= 20 && !PH_RE.test(frag)) {
        b.location = frag;
        break;
      }
    }
  }

  setIfReal(
    "headline",
    labeled(
      /(?:求\s*职\s*意\s*向|意\s*向\s*岗\s*位|应\s*聘\s*岗\s*位|目\s*标\s*岗\s*位|期\s*望\s*职\s*位)\s*[:：]\s*(.+)/,
    )?.split(/[|｜,，;；]/)[0].trim() ?? null,
  );

  // 姓名：优先「姓名：」标签，否则第一行（2-4 个汉字）；排除文档标题（如「个人简历」）
  const nameLabeled = labeled(/姓\s*名\s*[:：]\s*(.+)/);
  if (nameLabeled && !PH_RE.test(nameLabeled)) {
    b.name = nameLabeled;
  } else if (nameLabeled) {
    warnings.push("姓名为模板占位符，请填写真实姓名");
  } else {
    const first = lines[0];
    if (
      first &&
      /^[\u4e00-\u9fa5·]{2,4}$/.test(first.replace(/\s/g, "")) &&
      !/^(个人简历|个人简介|简历|resume)$/i.test(first.replace(/\s/g, ""))
    ) {
      b.name = first.replace(/\s/g, "");
    }
  }

  // 求职意向：无标签时找含岗位关键词且不含日期的短行（跳过姓名行）
  if (!b.headline) {
    const cand = lines.find(
      (l, i) =>
        i > 0 &&
        l.length <= 20 &&
        HEADLINE_HINT_RE.test(l) &&
        !PHONE_RE.test(l) &&
        !EMAIL_RE.test(l) &&
        !BARE_DATE_RE.test(l) &&
        !/^(个人简历|个人简介|简历)$/i.test(l),
    );
    if (cand) b.headline = cand;
  }

  return b;
}

// ---------- 无分节扁平模式（第三方 PDF：无栏目文字、内容流乱序重建后按语义归类） ----------

function parseFlat(lines: string[]): {
  education: EduItem[];
  experience: ExpItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  summary: string;
  warnings: string[];
} {
  const education: EduItem[] = [];
  const experience: ExpItem[] = [];
  const projects: ProjectItem[] = [];
  const skills: SkillItem[] = [];
  let summary = "";
  const warnings: string[] = [];

  const EDU_HINT = /(大学|学院|学校)/;
  const EXP_HINT =
    /(公司|企业|集团|有限|银行|事务所|研究院|工厂|工作室|党支部|党总支|学生会|社团|协会|办公室|部门)/;
  const POSITION_HINT =
    /(负责人|培养人|干事|助理|实习|专员|经理|工程师|主管|组长|队长|成员|总监|教师)/;
  const COMP_HINT = /(大赛|竞赛|挑战杯|比赛|三创赛)/;
  const CERT_TAG = /^(获得证书|证书|技能证书|专业技能|IT技能|掌握技能|个人技能|技能特长|技能)\s*[:：]/;
  const SUM_TAG =
    /^(自我评价|个人评价|个人优势|个人总结|专业对口|严谨合规|沟通抗压|学习能力强|性格)/;
  const TITLE_RE = /^(个人简历|个人简介|resume)$/i;

  type Mode = "edu" | "exp" | "proj" | "skill" | "sum" | null;
  let mode: Mode = null;

  for (const line of lines) {
    if (TITLE_RE.test(line)) continue;
    const hasDate = DATE_RANGE_RE.test(line) || BARE_DATE_RE.test(line);

    if (hasDate) {
      const r = extractRange(line);
      const meta = (r ? r.rest : line) || line;
      const parts = splitMeta(meta);
      const range = { start: r?.start ?? "", end: r?.end ?? "" };
      if (!EXP_HINT.test(meta) && EDU_HINT.test(meta)) {
        const item: EduItem = {
          id: `edu_${education.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          school: "",
          degree: "",
          major: "",
          range,
          note: "",
          highlights: [],
        };
        for (const p of parts) {
          const deg = DEGREE_RE.exec(p)?.[1];
          if (deg && !item.degree) {
            item.degree = deg;
            const rest2 = p.replace(DEGREE_RE, "").replace(/[·\s]+/g, " ").trim();
            if (rest2 && rest2 !== deg && !item.major) item.major = rest2;
            continue;
          }
          if (!item.school && EDU_HINT.test(p)) {
            item.school = p;
            continue;
          }
          if (!item.major && p.length <= 20 && !PHONE_RE.test(p)) {
            item.major = p;
            continue;
          }
          if (!item.note) item.note = p;
        }
        education.push(item);
        mode = "edu";
      } else {
        const item: ExpItem = {
          id: `exp_${experience.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          company: "",
          position: "",
          location: "",
          range,
          bullets: [],
        };
        for (const p of parts) {
          if (CITY_RE.test(p) && p.length <= 12 && item.company) {
            item.location = p;
            continue;
          }
          if (!item.position && POSITION_HINT.test(p)) {
            item.position = p;
            continue;
          }
          if (!item.company) {
            item.company = p;
            continue;
          }
          if (!item.position) {
            item.position = p;
            continue;
          }
          item.position = `${item.position} ${p}`.trim();
        }
        experience.push(item);
        mode = "exp";
      }
      continue;
    }

    // 竞赛/大赛行（含｜分隔）→ 项目
    if (COMP_HINT.test(line) && /[｜|]/.test(line) && !CERT_TAG.test(line) && !SUM_TAG.test(line)) {
      const [namePart, rolePart] = line.split(/[｜|]/);
      projects.push({
        id: `proj_${projects.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
        name: namePart.trim(),
        role: (rolePart ?? "").trim(),
        link: "",
        range: { start: "", end: "" },
        bullets: [],
      });
      mode = "proj";
      continue;
    }
    // 证书 / 专业技能标签行
    if (CERT_TAG.test(line)) {
      const label = CERT_TAG.exec(line)![1];
      const content = line.slice(label.length).replace(/^[:：]\s*/, "").trim();
      if (/证书|CET|资格/.test(content) || /证书/.test(label)) {
        for (const p of content.split(/[；;]/).map((s) => s.trim()).filter(Boolean)) {
          skills.push({
            id: `sk_${skills.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
            name: p,
            detail: "",
          });
        }
      } else {
        skills.push({
          id: `sk_${skills.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          name: label,
          detail: content,
        });
      }
      mode = "skill";
      continue;
    }
    // 评价类标签行 → summary
    if (SUM_TAG.test(line)) {
      const idx = line.search(/[:：]/);
      summary += (summary ? " " : "") + (idx >= 0 ? line.slice(idx + 1).trim() : line.trim());
      mode = "sum";
      continue;
    }

    const content = stripBulletPrefix(line);
    if (!content) continue;
    if (mode === "edu" && education.length) education[education.length - 1].highlights.push(content);
    else if (mode === "exp" && experience.length) experience[experience.length - 1].bullets.push(content);
    else if (mode === "proj" && projects.length) projects[projects.length - 1].bullets.push(content);
    else if (mode === "skill") {
      const m2 = /^(.+?)[:：]\s*(.+)$/.exec(content);
      if (m2 && m2[1].length <= 12) {
        skills.push({
          id: `sk_${skills.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          name: m2[1],
          detail: m2[2],
        });
      } else {
        skills.push({
          id: `sk_${skills.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          name: content.slice(0, 30),
          detail: "",
        });
      }
    } else if (mode === "sum") {
      summary += (summary ? " " : "") + content;
    }
  }
  return { education, experience, projects, skills, summary, warnings };
}

// ---------- 条目切分 ----------

type Chunk = { meta: string[]; bullets: string[] };

function splitChunks(lines: string[], requireDate: boolean): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Chunk | null = null;
  for (const line of lines) {
    const hasDate = DATE_RANGE_RE.test(line) || BARE_DATE_RE.test(line);
    if (!cur || (requireDate ? DATE_RANGE_RE.test(line) : hasDate)) {
      if (requireDate && !DATE_RANGE_RE.test(line) && cur) {
        // 非日期行：归入当前 chunk
        if (BULLET_MARK_RE.test(line)) cur.bullets.push(stripBulletPrefix(line));
        else cur.meta.push(line);
        continue;
      }
      cur = { meta: [line], bullets: [] };
      chunks.push(cur);
      continue;
    }
    if (BULLET_MARK_RE.test(line)) cur.bullets.push(stripBulletPrefix(line));
    else cur.meta.push(line);
  }
  return chunks;
}

// ---------- 教育 ----------

function parseEducation(lines: string[], out: EduItem[]): void {
  for (const chunk of splitChunks(lines, true)) {
    const dateLine = chunk.meta[0] ?? "";
    const r = extractRange(dateLine);
    const meta = joinMeta(r, dateLine, chunk);
    const parts = splitMeta(meta);
    const item: EduItem = {
      id: `edu_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      school: "",
      degree: "",
      major: "",
      range: { start: r?.start ?? "", end: r?.end ?? "" },
      note: "",
      highlights: chunk.bullets,
    };
    for (const p of parts) {
      const deg = DEGREE_RE.exec(p)?.[1];
      if (deg && !item.degree) {
        item.degree = deg;
        // "统计学 本科" → 去掉学位词后剩余为专业
        const rest = p.replace(DEGREE_RE, "").replace(/[·\s]+/g, " ").trim();
        if (rest && rest !== deg && !item.major) item.major = rest;
        continue;
      }
      if (!item.school && /(大学|学院|学校|中学|小学)/.test(p)) {
        item.school = p;
        continue;
      }
      if (!item.major && p.length <= 20 && !PHONE_RE.test(p)) {
        item.major = p;
        continue;
      }
      if (!item.note) item.note = p;
    }
    if (item.school || item.major || item.degree) out.push(item);
  }
}

// ---------- 工作 ----------

function parseExperience(lines: string[], out: ExpItem[]): void {
  for (const chunk of splitChunks(lines, true)) {
    const dateLine = chunk.meta[0] ?? "";
    const r = extractRange(dateLine);
    const meta = joinMeta(r, dateLine, chunk);
    const parts = splitMeta(meta);
    const item: ExpItem = {
      id: `exp_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      company: "",
      position: "",
      range: { start: r?.start ?? "", end: r?.end ?? "" },
      location: "",
      bullets: chunk.bullets,
    };
    for (const p of parts) {
      if (CITY_RE.test(p) && p.length <= 12 && item.company) {
        item.location = p;
        continue;
      }
      if (!item.company && /(公司|集团|企业|银行|事务所|研究院|工厂|工作室|科技|网络|信息|传媒|文化|教育|医院|学校)/.test(p)) {
        item.company = p;
        continue;
      }
      if (!item.position) {
        item.position = p;
        continue;
      }
      if (!item.company) item.company = p;
      else item.position = `${item.position} ${p}`.trim(); // 职位名含空格（如 Java 开发实习生）
    }
    if (item.company || item.position) out.push(item);
  }
}

// ---------- 项目 ----------

function parseProjects(lines: string[], out: ProjectItem[]): void {
  // 角色关键词需出现在词首或分隔符之后，避免「毕业设计」误切
  const ROLE_RE = /(?:^|[\s·•|｜/／])(负责|主导|参与|开发|组长|负责人|成员|发起人)/;
  for (const chunk of splitChunks(lines, true)) {
    const dateLine = chunk.meta[0] ?? "";
    const r = extractRange(dateLine);
    const meta = joinMeta(r, dateLine, chunk);
    const item: ProjectItem = {
      id: `proj_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      role: "",
      link: "",
      range: { start: r?.start ?? "", end: r?.end ?? "" },
      bullets: chunk.bullets,
    };
    // 链接单独剥离后，按「角色关键词」切分 name / role（名称可含空格，如「开源项目 resume-kit」）
    const withoutLink = meta.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
    const roleM = ROLE_RE.exec(withoutLink);
    if (roleM && roleM.index > 0) {
      item.name = withoutLink.slice(0, roleM.index).trim();
      item.role = withoutLink.slice(roleM.index).trim();
    } else {
      item.name = withoutLink;
    }
    if (item.name) out.push(item);
  }
}

// ---------- 技能 ----------

function parseSkills(lines: string[], out: SkillItem[]): void {
  for (const line of lines) {
    const labeled = /^(.+?)[:：]\s*(.+)$/.exec(line);
    if (labeled && labeled[1].length <= 12) {
      out.push({
        id: `sk_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
        name: labeled[1],
        detail: labeled[2],
      });
      continue;
    }
    // "SQL（熟练）、Python（掌握）" → 括号作为熟练度
    const parts = line.split(/[、，,;；]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const paren = /^(.+?)[（(](.+?)[）)]\s*$/.exec(p);
      if (paren) {
        out.push({
          id: `sk_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          name: paren[1].trim(),
          detail: paren[2].trim(),
        });
      } else if (p.length <= 30) {
        out.push({
          id: `sk_${out.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          name: p,
          detail: "",
        });
      }
    }
  }
}
