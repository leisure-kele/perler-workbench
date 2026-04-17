import { IngestForm } from "@/components/workbench/IngestForm";
import { DemoCards } from "@/components/workbench/DemoCards";

export default function WorkbenchPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <h1 className="text-2xl font-bold">创作工作台</h1>
        <p className="mt-1 text-sm text-slate-500">
          粘贴抖音视频链接，或上传一张拼豆成品图片。AI 会识别网格、量化颜色，并生成一张可玩的图纸。
        </p>
        <div className="mt-6">
          <IngestForm />
        </div>
      </section>
      <aside className="lg:col-span-2">
        <h2 className="text-lg font-semibold">或者，从 demo 开始</h2>
        <p className="mt-1 text-xs text-slate-500">
          先体验预置关卡，看看产出形态。
        </p>
        <div className="mt-4">
          <DemoCards />
        </div>
      </aside>
    </div>
  );
}
