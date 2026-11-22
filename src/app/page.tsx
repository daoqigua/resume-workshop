import Link from "next/link";
import { listResumes } from "@/lib/resume/store";
import { ensureSeed } from "@/lib/seed";
import { HomeActions } from "@/components/home/HomeActions";
import { AiSettingsDialog } from "@/components/settings/AiSettingsDialog";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSeed();
  const resumes = await listResumes();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold tracking-wide">
          简历工坊
          <span className="ml-3 text-xl font-medium text-blue-700">
            免费把简历改好
          </span>
        </h1>
        <p className="mt-4 text-gray-600 leading-7">
          编辑、模板、PDF 导出
          <strong className="text-gray-900"> 永久免费无水印</strong>
          ——不玩「写完才收费」的套路。
          <br />
          上传旧简历自动解析导入 · 所见即所得实时预览 · AI 诊断与润色
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <HomeActions />
        </div>
        <div className="mt-4 flex justify-center">
          <AiSettingsDialog />
        </div>
        <div className="mt-4 text-center">
          <Link href="/applications" className="text-sm text-blue-700 hover:underline">
            📮 投递追踪看板 →
          </Link>
        </div>
      </section>

      {/* 简历列表 */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">我的简历</h2>
        {resumes.length === 0 ? (
          <p className="text-gray-500">还没有简历，点击上方「新建简历」开始。</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {resumes.map((r) => (
              <li
                key={r.id}
                className="border rounded-lg bg-white p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <Link
                    href={`/editor/${r.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="text-xs text-gray-400 mt-1">
                    更新于 {new Date(r.updatedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <Link
                  href={`/editor/${r.id}`}
                  className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
                >
                  打开编辑
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 免费承诺 */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3 text-sm">
        {[
          ["零付费墙", "所有编辑、模板、PDF 导出免费无水印，收入来自高级 AI 与真人服务"],
          ["修改优先", "上传已有简历 AI 解析，诊断报告指出问题，一键优化表述"],
          ["JD 对标", "粘贴职位描述生成匹配分与关键词缺口，一岗一简历"],
        ].map(([t, d]) => (
          <div key={t} className="border rounded-lg bg-white p-4">
            <div className="font-semibold mb-1">{t}</div>
            <div className="text-gray-600 leading-6">{d}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
