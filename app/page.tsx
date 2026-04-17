import Link from "next/link";
import { DemoCards } from "@/components/workbench/DemoCards";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">
            抖音精选 · 内容重构赛道
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            抖音刷到的拼豆，
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              10 秒变成你的可玩关卡
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-700">
            粘贴一条抖音拼豆视频，或上传成品图片——AI 自动识别网格、算出珠子清单，
            直接在网页上点格子开玩，也可以下载图纸动手拼。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/workbench"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-700"
            >
              开始创作 →
            </Link>
            <Link
              href="/catalog"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              逛逛图鉴
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 grid grid-cols-10 gap-1 opacity-30">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="h-6 w-6 rounded-full"
              style={{
                backgroundColor: `hsl(${(i * 37) % 360} 70% 60%)`,
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">三步，把视频变作品</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StepCard
            num="1"
            title="粘贴 / 上传"
            desc="粘贴抖音拼豆视频链接，或直接上传成品图片"
          />
          <StepCard
            num="2"
            title="AI 生成图纸"
            desc="Claude Vision 识别网格 + MARD 色卡量化 + 珠子清单"
          />
          <StepCard
            num="3"
            title="边玩边学"
            desc="点格子铺豆像数独，完成后可下载图纸动手拼"
          />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">从图鉴挑一关开始</h2>
          <Link href="/catalog" className="text-sm text-emerald-600 hover:underline">
            查看全部 →
          </Link>
        </div>
        <div className="mt-4">
          <DemoCards />
        </div>
      </section>
    </div>
  );
}

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
        {num}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}
