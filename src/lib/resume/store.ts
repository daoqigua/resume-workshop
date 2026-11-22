import fs from "node:fs/promises";
import path from "node:path";
import type { ResumeDoc, ResumeData, ResumeSettings } from "./schema";
import { DEFAULT_SETTINGS, emptyResumeData } from "./schema";

/**
 * MVP 存储层 — 仓库模式。
 * 当前实现：本地 JSON 文件存储（data/resumes/*.json），零外部依赖、离线可用。
 * 接口签名与规划中的 PostgreSQL(Prisma) 方案一致，后续切换只需换实现，
 * schema.prisma 与 docker-compose.yml 已随仓库提供。
 */

const DATA_DIR = path.join(process.cwd(), "data", "resumes");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function safeId(id: string): string {
  // 防路径穿越：只允许字母数字、下划线、连字符
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("invalid resume id");
  return id;
}

function filePath(id: string): string {
  return path.join(DATA_DIR, `${safeId(id)}.json`);
}

function nowISO(): string {
  return new Date().toISOString();
}

export async function listResumes(): Promise<
  Pick<ResumeDoc, "id" | "title" | "updatedAt">[]
> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const docs = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
        return JSON.parse(raw) as ResumeDoc;
      }),
  );
  return docs
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((d) => ({ id: d.id, title: d.title, updatedAt: d.updatedAt }));
}

export async function getResume(id: string): Promise<ResumeDoc | null> {
  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    return JSON.parse(raw) as ResumeDoc;
  } catch {
    return null;
  }
}

export async function createResume(input: {
  title?: string;
  data?: ResumeData;
  settings?: Partial<ResumeSettings>;
  /** 一岗一简历：派生元数据 */
  parentResumeId?: string;
  targetJd?: string;
  jdMatch?: ResumeDoc["jdMatch"];
}): Promise<ResumeDoc> {
  await ensureDir();
  const id = `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const doc: ResumeDoc = {
    id,
    title: input.title ?? "我的简历",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    data: input.data ?? emptyResumeData(),
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
  };
  if (input.parentResumeId) doc.parentResumeId = input.parentResumeId;
  if (input.targetJd) doc.targetJd = input.targetJd;
  if (input.jdMatch) doc.jdMatch = input.jdMatch;
  await fs.writeFile(filePath(id), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export async function updateResume(
  id: string,
  patch: {
    title?: string;
    data?: ResumeData;
    settings?: ResumeSettings;
    targetJd?: string;
    jdMatch?: ResumeDoc["jdMatch"];
    /** 证件照时间戳；空串清除 */
    photo?: string;
  },
): Promise<ResumeDoc | null> {
  const doc = await getResume(id);
  if (!doc) return null;
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.data !== undefined) doc.data = patch.data;
  if (patch.settings !== undefined) {
    // 局部更新：与默认值/现有值合并，避免替换后丢失 themeColor 等字段
    doc.settings = { ...DEFAULT_SETTINGS, ...doc.settings, ...patch.settings };
  }
  if (patch.targetJd !== undefined) doc.targetJd = patch.targetJd;
  if (patch.jdMatch !== undefined) doc.jdMatch = patch.jdMatch;
  if (patch.photo !== undefined) doc.photo = patch.photo || undefined;
  doc.updatedAt = nowISO();
  await fs.writeFile(filePath(id), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export async function deleteResume(id: string): Promise<boolean> {
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch {
    return false;
  }
}
