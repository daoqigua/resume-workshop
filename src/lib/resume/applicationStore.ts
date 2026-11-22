import fs from "node:fs/promises";
import path from "node:path";
import type { ApplicationDoc, ApplicationStatus } from "./schema";
import { APPLICATION_STATUSES } from "./schema";

/** 投递记录存储（仓库模式，与简历存储同构） */
const DATA_DIR = path.join(process.cwd(), "data", "applications");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("invalid application id");
  return path.join(DATA_DIR, `${id}.json`);
}

export async function listApplications(): Promise<ApplicationDoc[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const docs = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8")) as ApplicationDoc),
  );
  return docs.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function createApplication(input: {
  resumeId: string;
  company: string;
  position: string;
  status?: ApplicationStatus;
  note?: string;
}): Promise<ApplicationDoc> {
  await ensureDir();
  if (!APPLICATION_STATUSES.includes(input.status ?? "applied")) {
    throw new Error("invalid status");
  }
  const doc: ApplicationDoc = {
    id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    resumeId: input.resumeId,
    company: input.company.trim(),
    position: input.position.trim(),
    status: input.status ?? "applied",
    appliedAt: new Date().toISOString().slice(0, 10),
    note: (input.note ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath(doc.id), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<ApplicationDoc | null> {
  try {
    const doc = JSON.parse(await fs.readFile(filePath(id), "utf8")) as ApplicationDoc;
    if (!APPLICATION_STATUSES.includes(status)) throw new Error("invalid status");
    doc.status = status;
    await fs.writeFile(filePath(id), JSON.stringify(doc, null, 2), "utf8");
    return doc;
  } catch {
    return null;
  }
}

export async function deleteApplication(id: string): Promise<boolean> {
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch {
    return false;
  }
}
