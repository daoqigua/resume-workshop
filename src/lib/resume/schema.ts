/**
 * 简历数据模型 — 参考 JSON Resume 开源标准，结合中文求职场景裁剪。
 * 所有列表项带 id，便于编辑器增删改与拖拽排序。
 */

export type Basics = {
  /** 姓名 */
  name: string;
  /** 求职意向 / 头衔，如「前端开发工程师」 */
  headline: string;
  phone: string;
  email: string;
  /** 所在地，如「北京 · 海淀区」 */
  location: string;
  website: string;
  /** 个人简介 / 自我评价 */
  summary: string;
};

export type DateRange = {
  /** 如 2021.09 / 2021年9月，展示层直接使用原字符串 */
  start: string;
  /** 「至今」或具体月份 */
  end: string;
};

export type EduItem = {
  id: string;
  school: string;
  /** 学历：本科 / 硕士 / 博士 / 大专… */
  degree: string;
  major: string;
  range: DateRange;
  /** 成绩 / 排名 / 主修课程等一行说明 */
  note: string;
  highlights: string[];
};

export type ExpItem = {
  id: string;
  company: string;
  position: string;
  range: DateRange;
  location: string;
  /** 工作内容 / 业绩 bullets，支持 **加粗** 标记 */
  bullets: string[];
};

export type ProjectItem = {
  id: string;
  name: string;
  /** 担任角色，如「负责人 / 后端开发」 */
  role: string;
  link: string;
  range: DateRange;
  bullets: string[];
};

export type SkillItem = {
  id: string;
  /** 技能名或分类名 */
  name: string;
  /** 熟练度或说明，如「熟练 / 了解」 */
  detail: string;
};

export type SectionKey = "education" | "experience" | "projects" | "skills";

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "education",
  "experience",
  "projects",
  "skills",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  education: "教育背景",
  experience: "工作经历",
  projects: "项目经历",
  skills: "技能特长",
};

export type ResumeData = {
  basics: Basics;
  education: EduItem[];
  experience: ExpItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  /** 分节展示顺序（编辑器可拖拽） */
  sectionOrder: SectionKey[];
};

export type TemplateId = "classic" | "modern" | "compact";
export type FontFamily = "sans" | "serif";

export type ResumeSettings = {
  template: TemplateId;
  fontFamily: FontFamily;
  /** 正文字号 px（A4@96dpi 下 14 ≈ 10.5pt） */
  fontSize: number;
  /** 页边距 px */
  pageMargin: number;
  /** 主题色（hex） */
  themeColor: string;
};

export const DEFAULT_SETTINGS: ResumeSettings = {
  template: "classic",
  fontFamily: "sans",
  fontSize: 14,
  pageMargin: 48,
  themeColor: "#2f5aa8",
};

export type JdKeywordType = "hard" | "soft" | "implicit";

export type JdKeyword = {
  name: string;
  type: JdKeywordType;
  /** JD 中是否硬性要求 */
  required: boolean;
};

export type JdMatchReport = {
  keywords: JdKeyword[];
  /** 0-100 匹配分 */
  score: number;
  /** 简历中已体现的关键词 */
  matched: string[];
  /** 缺失关键词（按重要性排序） */
  missing: string[];
  /** 定向改写建议 */
  suggestions: string[];
};

/** 一岗一简历：从主简历派生的 JD 定制版本 */
export type ResumeDoc = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: ResumeData;
  settings: ResumeSettings;
  /** 派生来源简历 id（为空即主简历） */
  parentResumeId?: string;
  /** 本版本对标的目标 JD 原文 */
  targetJd?: string;
  /** 对标报告（派生时快照） */
  jdMatch?: JdMatchReport;
  /** 证件照上传时间戳（有值即有照片，用作缓存穿透参数；空串=无照片） */
  photo?: string;
};

/** 投递状态（追踪看板） */
export const APPLICATION_STATUSES = [
  "applied",
  "test",
  "interview",
  "offer",
  "rejected",
  "ghost",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "已投递",
  test: "笔试",
  interview: "面试中",
  offer: "Offer",
  rejected: "未通过",
  ghost: "已读不回",
};

export type ApplicationDoc = {
  id: string;
  /** 使用的简历版本 id */
  resumeId: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt: string;
  note: string;
  createdAt: string;
};

/** 生成带前缀的短 id（无需额外依赖） */
export function newId(prefix = "s"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function emptyBasics(): Basics {
  return {
    name: "",
    headline: "",
    phone: "",
    email: "",
    location: "",
    website: "",
    summary: "",
  };
}

export function emptyResumeData(): ResumeData {
  return {
    basics: emptyBasics(),
    education: [],
    experience: [],
    projects: [],
    skills: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}
