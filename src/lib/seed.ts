import { listResumes, createResume } from "./resume/store";
import { SAMPLE_RESUME } from "./resume/sample";

/** 首次访问自动创建一份示例简历，便于开箱即用 */
export async function ensureSeed(): Promise<void> {
  try {
    const list = await listResumes();
    if (list.length === 0) {
      await createResume({
        title: "示例简历 · 前端工程师",
        data: SAMPLE_RESUME,
      });
    }
  } catch (err) {
    console.error("seed failed:", err);
  }
}
