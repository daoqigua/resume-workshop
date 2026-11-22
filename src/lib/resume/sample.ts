import type { ResumeData } from "./schema";

/** 内置示例简历（中文真实感数据，用于演示 / 新建默认内容） */
export const SAMPLE_RESUME: ResumeData = {
  basics: {
    name: "王小明",
    headline: "前端开发工程师",
    phone: "138-0013-8000",
    email: "wangxiaoming@example.com",
    location: "北京 · 海淀区",
    website: "github.com/wangxiaoming",
    summary:
      "4 年前端开发经验，熟悉 React / TypeScript 技术栈，主导过日活 50w+ 的 C 端产品重构，关注性能优化与工程化建设，多次获得公司季度之星。",
  },
  education: [
    {
      id: "edu_1",
      school: "华中科技大学",
      degree: "本科",
      major: "计算机科学与技术",
      range: { start: "2017.09", end: "2021.06" },
      note: "GPA 3.7 / 4.0，专业排名前 10%",
      highlights: [
        "获国家励志奖学金 2 次、校一等奖学金 3 次",
        "ACM 校队成员，亚洲区域赛铜牌",
      ],
    },
  ],
  experience: [
    {
      id: "exp_1",
      company: "某互联网科技有限公司",
      position: "高级前端工程师",
      range: { start: "2023.07", end: "至今" },
      location: "北京",
      bullets: [
        "**主导**核心 C 端产品首页重构，首屏加载时间从 **3.2s 降至 1.1s**，转化率提升 12%",
        "搭建团队前端监控体系，线上白屏率由 0.8% 降至 0.05%，故障平均定位时间缩短 60%",
        "带教 3 名初级工程师，制定组件库与 Code Review 规范，团队需求交付周期缩短 20%",
      ],
    },
    {
      id: "exp_2",
      company: "某电商科技公司",
      position: "前端工程师",
      range: { start: "2021.07", end: "2023.06" },
      location: "武汉",
      bullets: [
        "负责营销活动页低代码平台开发，支撑运营 **自助上线 200+ 场次**活动，人力成本降低 70%",
        "优化秒杀场景前端链路，接口错误兜底与限流策略使高峰期崩溃投诉下降 90%",
        "参与开源组件库建设，贡献 15+ 个通用组件，获公司年度技术创新奖",
      ],
    },
  ],
  projects: [
    {
      id: "proj_1",
      name: "开源项目 resume-kit",
      role: "发起人",
      link: "github.com/wangxiaoming/resume-kit",
      range: { start: "2024.03", end: "至今" },
      bullets: [
        "基于 React 的中文简历生成器，GitHub **1.2k Star**，周下载量 3000+",
        "设计 JSON Schema 驱动的模板系统，支持 6 套模板与中英文切换",
      ],
    },
  ],
  skills: [
    { id: "sk_1", name: "React / Next.js", detail: "熟练" },
    { id: "sk_2", name: "TypeScript", detail: "熟练" },
    { id: "sk_3", name: "性能优化", detail: "熟练（SSR、懒加载、缓存策略）" },
    { id: "sk_4", name: "Node.js", detail: "掌握" },
    { id: "sk_5", name: "英语", detail: "CET-6，可阅读英文文档" },
  ],
  sectionOrder: ["education", "experience", "projects", "skills"],
};
