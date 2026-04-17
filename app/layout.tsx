import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "拼豆搭子 · 把抖音拼豆视频变成你的可玩关卡",
  description:
    "粘贴抖音拼豆视频或上传成品图，AI 秒生像素图纸 + 珠子清单，直接在网页上开玩。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-emerald-400 to-sky-500" />
              拼豆搭子
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/workbench">工作台</NavLink>
              <NavLink href="/catalog">图鉴</NavLink>
              <NavLink href="/mine">我的作品</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-slate-400">
          拼豆搭子 · 抖音精选内容重构赛道作品 · 生成的图纸仅供个人手作参考
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
