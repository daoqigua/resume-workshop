# 简历工坊 — 免费把简历改好

面向所有人的在线简历编辑与修改平台。编辑、模板、PDF 导出**永久免费无水印**；AI 解析导入、诊断、润色开箱即用（本地规则引擎兜底，配置大模型密钥后自动升级为 LLM）。

> 调研与完整规划见上级目录 `简历平台调研与项目规划.md`。

## 快速开始

```bash
cd web
npm install
npx playwright install chromium   # PDF 导出所需（国内可用 PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright）
npm run dev                       # http://localhost:3000
```

AI 能力（可选）：复制 `.env.example` 为 `.env.local`，填入 `AI_API_KEY`（GLM / DeepSeek 等 OpenAI 兼容接口均可）。

## 功能现状（M0 + M1 已完成并验收）

| 功能 | 说明 |
|---|---|
| 双栏实时预览编辑器 | 左表单/右 A4 预览，zoom 缩放自适应，800ms 防抖自动保存 |
| 3 套模板 | 经典单栏 / 现代简约 / 应届紧凑；字体（思源黑/宋）、字号、页边距、主题色可调 |
| PDF 导出 | 服务端 Playwright 渲染 `/print/[id]`（与预览同一套模板组件，零偏差），文本可选中（ATS 友好）、思源字体子集内嵌、精确 A4 |
| 简历解析导入 | 上传 PDF → unpdf 提取文本 → 规则解析器 → 结构化数据直接进编辑器 |
| AI 润色 / 诊断 | LLM（STAR 改写、总评）+ 无密钥时本地规则引擎兜底；诊断五维度评分 |
| 分节排序 / 条目增删 | 分节 ↑↓、条目 ↑↓、技能行编辑 |
| 文件存储 | 仓库模式 `data/resumes/*.json`，接口与 PostgreSQL 方案一致 |

**验收结果**（详见下方验收脚本）：
- M0① PDF 导出：文本提取 13/13、页面尺寸 594.96×841.92pt ≈ A4、视觉校验通过
- M0② 解析准确率：**98.6%（70/71 字段断言）**，语料含 pdfkit 独立生成的「Word 风格」PDF
- M1 GUI 端到端：新建→编辑（实时预览+自动保存）→AI 诊断→导出 PDF→模板切换 全部通过（`gui-test-screenshots/`）

## 关键技术决策

1. **模板内禁用 `position: absolute`**：绝对定位元素会被 Chromium 排入单独的绘制层，导致 PDF 内容流乱序——文本提取（ATS 解析器同款原理）会把节标题读到最后。列表符号用 flex、节标题色条用 borderLeft 实现。
2. **预览与 PDF 同源**：`PreviewPage`（zoom 缩放）与 `PrintPage`（@page margin）共用模板组件，内容宽度一致保证分页零偏差。
3. **AI 网关可插拔**：OpenAI 兼容协议 + JSON 输出，`chatJSON` 失败自动回退规则引擎，产品功能不因无密钥中断。

## 验收脚本

```bash
node scripts/verify-pdf.mjs tmp/test-classic.pdf   # M0① 文本提取
node scripts/make-corpus-c.mjs                     # 生成独立排版语料
node scripts/verify-parse.mjs                      # M0② 三语料字段级准确率
```

## 目录结构

```
src/
├── app/
│   ├── page.tsx                 首页（营销 + 简历列表 + 上传导入）
│   ├── editor/[id]/page.tsx     编辑器
│   ├── print/[id]/page.tsx      打印渲染路由（Playwright 目标）
│   └── api/                     resumes CRUD · pdf · parse · ai/polish · ai/diagnose
├── components/
│   ├── templates/               三套模板 + A4 容器（预览/打印共用）
│   └── editor/                  编辑器表单与状态
└── lib/
    ├── resume/                  schema（JSON Resume 风格）· 示例数据 · 文件存储
    ├── parse/parser.ts          中文简历规则解析器
    ├── ai/                      网关（可换模型）· 润色 · 诊断
    └── playwright.ts            浏览器单例 + PDF 渲染
```

## 生产部署路径（M2 前实施）

- `docker-compose.yml`：PostgreSQL + Redis（BullMQ 队列渲染/批处理）
- `prisma/schema.prisma`：Postgres 数据模型（与当前文件存储同构），切换时仅替换 `lib/resume/store.ts` 实现
- 对象存储替换本地 `data/`；增加认证（微信/手机号）与支付
- ICP 备案 + PIPL 合规（简历属敏感个人信息：单独同意、加密、删除权）

## 后续路线图（见规划文档）

- **M2**：JD 对标评分引擎、一岗一简历版本管理、会员支付、DOCX 导出
- **M3**：真人专家精修市场、中英互译、移动端/微信分享、SEO 内容矩阵
