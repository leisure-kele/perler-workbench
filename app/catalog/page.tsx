import { DemoCards } from "@/components/workbench/DemoCards";

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">图鉴关卡</h1>
        <p className="mt-1 text-sm text-slate-500">
          精选拼豆作品，从入门到进阶，每一关都配有教程视频和可玩图纸。
        </p>
      </header>
      <DemoCards />
    </div>
  );
}
